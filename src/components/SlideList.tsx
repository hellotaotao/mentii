import {
  BarChart3,
  Cloud,
  FileText,
  GripVertical,
  MessageSquare,
  Plus,
  SlidersHorizontal,
  Trash2,
  Trophy,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getQuestionTypeLabel, type EditorQuestion, type QuestionType } from '../types/questions'

const slideTypeOptions: Array<{
  actionLabel: string
  description: string
  Icon: typeof BarChart3
  title: string
  type: QuestionType
}> = [
  {
    actionLabel: 'Add multiple choice slide',
    description: 'Collect votes with predefined options.',
    Icon: BarChart3,
    title: 'Multiple choice',
    type: 'multiple_choice',
  },
  {
    actionLabel: 'Add scales slide',
    description: 'Capture sentiment on a 1-5 scale.',
    Icon: SlidersHorizontal,
    title: 'Scales',
    type: 'scales',
  },
  {
    actionLabel: 'Add Q&A slide',
    description: 'Let the audience submit and upvote questions.',
    Icon: MessageSquare,
    title: 'Q&A',
    type: 'q_and_a',
  },
  {
    actionLabel: 'Add quiz slide',
    description: 'Run a timed question with a correct answer.',
    Icon: Trophy,
    title: 'Quiz',
    type: 'quiz',
  },
  {
    actionLabel: 'Add open ended slide',
    description: 'Collect free-text responses from everyone.',
    Icon: FileText,
    title: 'Open ended',
    type: 'open_ended',
  },
  {
    actionLabel: 'Add word cloud slide',
    description: 'Visualize frequent words from the room.',
    Icon: Cloud,
    title: 'Word cloud',
    type: 'word_cloud',
  },
]

type SlideListProps = {
  onAddSlide: (type: QuestionType) => void
  onDelete: (questionId: string) => void
  onReorder: (orderedQuestionIds: string[]) => void
  onSelect: (questionId: string) => void
  questions: EditorQuestion[]
  selectedQuestionId: string | null
}

export default function SlideList({
  onAddSlide,
  onDelete,
  onReorder,
  onSelect,
  questions,
  selectedQuestionId,
}: SlideListProps) {
  const addMenuRef = useRef<HTMLDivElement | null>(null)
  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(null)
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!isAddMenuOpen) {
        return
      }

      if (addMenuRef.current?.contains(event.target as Node)) {
        return
      }

      setIsAddMenuOpen(false)
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsAddMenuOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isAddMenuOpen])

  function handleDrop(targetQuestionId: string) {
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
    <aside className="flex min-h-[640px] flex-col rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Slides</p>
          <h2 className="mt-2 text-xl font-semibold">Question flow</h2>
        </div>

        <div className="relative" ref={addMenuRef}>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/15"
            onClick={() => setIsAddMenuOpen((currentState) => !currentState)}
            type="button"
          >
            <Plus className="size-4" />
            Add slide
          </button>

          {isAddMenuOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl">
              <ul className="space-y-1">
                {slideTypeOptions.map((option) => (
                  <li key={option.type}>
                    <button
                      aria-label={option.actionLabel}
                      className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-white/10"
                      onClick={() => {
                        onAddSlide(option.type)
                        setIsAddMenuOpen(false)
                      }}
                      type="button"
                    >
                      <span className="mt-1 rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300">
                        <option.Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-white">{option.title}</span>
                        <span className="mt-1 block text-xs text-slate-400">{option.description}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <ol className="mt-6 flex-1 space-y-3">
        {questions.map((question, index) => {
          const isSelected = question.id === selectedQuestionId

          return (
            <li
              className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 shadow-sm"
              draggable
              key={question.id}
              onDragEnd={() => setDraggedQuestionId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={() => setDraggedQuestionId(question.id)}
              onDrop={() => handleDrop(question.id)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-full border border-white/10 bg-white/5 p-2 text-slate-400">
                  <GripVertical className="size-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <button
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? 'border-cyan-300 bg-cyan-400/10 text-white'
                        : 'border-white/10 bg-white/5 text-slate-100 hover:border-white/20'
                    }`}
                    onClick={() => onSelect(question.id)}
                    type="button"
                  >
                    <span className="block text-xs uppercase tracking-[0.25em] text-slate-400">
                      {getQuestionTypeLabel(question.type)}
                    </span>
                    <span className="mt-2 block truncate text-sm font-semibold">
                      {`Slide ${index + 1}: ${question.title}`}
                    </span>
                  </button>
                </div>

                <button
                  aria-label={`Delete slide ${index + 1}`}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-rose-300 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={questions.length === 1}
                  onClick={() => onDelete(question.id)}
                  type="button"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
