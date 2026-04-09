import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { getQuestionTypeLabel, type EditorQuestion } from '../types/questions'

type SlideListProps = {
  onAdd: () => void
  onDelete: (questionId: string) => void
  onReorder: (orderedQuestionIds: string[]) => void
  onSelect: (questionId: string) => void
  questions: EditorQuestion[]
  selectedQuestionId: string | null
}

export default function SlideList({
  onAdd,
  onDelete,
  onReorder,
  onSelect,
  questions,
  selectedQuestionId,
}: SlideListProps) {
  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(null)

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
        <button
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/15"
          onClick={onAdd}
          type="button"
        >
          <Plus className="size-4" />
          Add slide
        </button>
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
                    aria-pressed={isSelected}
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
