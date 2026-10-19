import { Check, ThumbsUp } from 'lucide-react'
import type { QAndAQuestion, QAndAResults } from '../../../types/questions'
import { ResponseCount, SlideEmptyState, SlideLayout } from '../../slides/SlideChrome'

type QAndABigScreenProps = {
  actionEntryId: string | null
  onToggleAnswered: (entryId: string, nextAnswered: boolean) => void
  question: QAndAQuestion
  results: QAndAResults
}

const MAX_VISIBLE_ENTRIES = 5

export default function QAndABigScreen({ actionEntryId, onToggleAnswered, question, results }: QAndABigScreenProps) {
  const visibleEntries = results.entries.slice(0, MAX_VISIBLE_ENTRIES)

  return (
    <SlideLayout
      footer={<ResponseCount count={results.entries.length} label="questions" />}
      title={question.title}
    >
      {visibleEntries.length === 0 ? (
        <SlideEmptyState>Audience questions will appear here, most upvoted first.</SlideEmptyState>
      ) : (
        <ol className="space-y-4 overflow-hidden">
          {visibleEntries.map((entry, index) => (
            <li
              className={`flex items-center gap-8 rounded-3xl px-8 ${index === 0 && !entry.answered ? 'bg-slide-subtle py-7' : 'py-4'} ${
                entry.answered ? 'opacity-45' : ''
              }`}
              key={entry.id}
            >
              <span className="flex w-24 shrink-0 items-center gap-3 text-[28px] font-semibold tabular-nums text-slide-muted">
                <ThumbsUp aria-hidden="true" className="size-7" />
                <span aria-label={`${entry.upvoteCount} upvotes`}>{entry.upvoteCount}</span>
              </span>
              <p
                className={`min-w-0 flex-1 leading-snug ${
                  index === 0 && !entry.answered ? 'text-[40px] font-semibold' : 'text-[30px]'
                } ${entry.answered ? 'line-through decoration-2' : ''}`}
              >
                {entry.text}
              </p>
              <button
                className="flex shrink-0 items-center gap-2 rounded-full border-2 border-slide-line px-6 py-3 text-[22px] font-semibold transition hover:border-slide-accent hover:text-slide-accent disabled:opacity-50"
                disabled={actionEntryId === entry.id}
                onClick={() => onToggleAnswered(entry.id, !entry.answered)}
                type="button"
              >
                {entry.answered ? (
                  'Reopen'
                ) : (
                  <>
                    <Check aria-hidden="true" className="size-6" />
                    Mark answered
                  </>
                )}
              </button>
            </li>
          ))}
        </ol>
      )}
    </SlideLayout>
  )
}
