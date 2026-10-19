import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { PresentationTheme } from '../lib/presentationTheme'
import type { EditorQuestion, QuestionType } from '../types/questions'
import SlideRenderer from './slides/SlideRenderer'
import SlideStage from './slides/SlideStage'
import { getSlideTypeMeta, SLIDE_TYPES } from './slides/slideTypes'

type SlideListProps = {
  liveQuestionId?: string | null
  onAddSlide: (type: QuestionType) => void
  onDelete: (questionId: string) => void
  onReorder: (orderedQuestionIds: string[]) => void
  onSelect: (questionId: string) => void
  questions: EditorQuestion[]
  selectedQuestionId: string | null
  theme?: PresentationTheme
}

const SLIDE_TYPE_GROUPS = ['Questions', 'Quiz competition'] as const

function AddSlideMenu({ onAddSlide }: { onAddSlide: (type: QuestionType) => void }) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-label="Add slide"
        className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <Plus className="size-4" />
        New slide
      </button>

      {isOpen ? (
        <div className="mentii-slide-down absolute left-0 top-12 z-30 w-[300px] rounded-2xl border border-line bg-surface p-2 shadow-[0_16px_48px_rgba(28,18,12,0.14)]">
          {SLIDE_TYPE_GROUPS.map((group) => (
            <div className="py-1" key={group}>
              <p className="px-3 pb-1 pt-2 text-xs font-semibold text-ink-3">{group}</p>
              <ul>
                {SLIDE_TYPES.filter((meta) => meta.group === group).map((meta) => (
                  <li key={meta.type}>
                    <button
                      aria-label={`Add ${meta.title.toLowerCase()} slide`}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-sunken"
                      onClick={() => {
                        onAddSlide(meta.type)
                        setIsOpen(false)
                      }}
                      type="button"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                        <meta.Icon className="size-[18px]" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">{meta.title}</span>
                        <span className="block text-xs text-ink-3">{meta.description}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default function SlideList({
  liveQuestionId = null,
  onAddSlide,
  onDelete,
  onReorder,
  onSelect,
  questions,
  selectedQuestionId,
  theme = 'light',
}: SlideListProps) {
  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  function handleDrop(targetQuestionId: string) {
    setDropTargetId(null)

    if (!draggedQuestionId || draggedQuestionId === targetQuestionId) {
      setDraggedQuestionId(null)
      return
    }

    const reorderedQuestionIds = questions.map((question) => question.id)
    const sourceIndex = reorderedQuestionIds.indexOf(draggedQuestionId)
    const targetIndex = reorderedQuestionIds.indexOf(targetQuestionId)

    if (sourceIndex < 0 || targetIndex < 0) {
      setDraggedQuestionId(null)
      return
    }

    reorderedQuestionIds.splice(sourceIndex, 1)
    reorderedQuestionIds.splice(targetIndex, 0, draggedQuestionId)

    onReorder(reorderedQuestionIds)
    setDraggedQuestionId(null)
  }

  return (
    <aside className="flex h-full min-h-0 flex-col bg-surface">
      <div className="p-4">
        <AddSlideMenu onAddSlide={onAddSlide} />
      </div>

      <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-6">
        {questions.map((question, index) => {
          const isSelected = question.id === selectedQuestionId
          const meta = getSlideTypeMeta(question.type)

          return (
            <li
              className={`group relative flex gap-2 rounded-xl p-1.5 transition ${
                dropTargetId === question.id && draggedQuestionId !== question.id ? 'bg-brand-soft' : ''
              } ${draggedQuestionId === question.id ? 'opacity-40' : ''}`}
              draggable
              key={question.id}
              onDragEnd={() => {
                setDraggedQuestionId(null)
                setDropTargetId(null)
              }}
              onDragOver={(event) => {
                event.preventDefault()
                setDropTargetId(question.id)
              }}
              onDragStart={() => setDraggedQuestionId(question.id)}
              onDrop={() => handleDrop(question.id)}
            >
              <span className="w-5 pt-1 text-right text-xs font-semibold tabular-nums text-ink-3">{index + 1}</span>

              <div className="relative min-w-0 flex-1">
                <button
                  aria-current={isSelected ? 'true' : undefined}
                  aria-label={`Slide ${index + 1}: ${question.title}`}
                  className={`block w-full overflow-hidden rounded-lg text-left ring-offset-2 ring-offset-surface transition focus-visible:outline-none ${
                    isSelected ? 'ring-2 ring-brand' : 'ring-1 ring-line hover:ring-line-strong'
                  }`}
                  onClick={() => onSelect(question.id)}
                  type="button"
                >
                  <SlideStage ariaHidden className="pointer-events-none aspect-video w-full" theme={theme}>
                    <SlideRenderer preview question={question} results={null} />
                  </SlideStage>
                </button>

                <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex size-5 items-center justify-center rounded-md bg-surface/95 text-ink-2 shadow-sm ring-1 ring-line">
                  <meta.Icon aria-hidden="true" className="size-3" />
                </span>

                {question.id === liveQuestionId ? (
                  <span className="pointer-events-none absolute right-1.5 top-1.5 rounded-full bg-live px-1.5 py-0.5 text-[10px] font-bold text-white">
                    Live
                  </span>
                ) : null}

                <button
                  aria-label={`Delete slide ${index + 1}`}
                  className="absolute bottom-1.5 right-1.5 flex size-6 items-center justify-center rounded-md bg-surface/95 text-ink-3 opacity-0 shadow-sm ring-1 ring-line transition hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 disabled:hidden"
                  disabled={questions.length === 1}
                  onClick={() => onDelete(question.id)}
                  title="Delete slide"
                  type="button"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
