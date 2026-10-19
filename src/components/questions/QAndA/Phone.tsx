import { Check, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import type { QAndAQuestion, QAndAResults } from '../../../types/questions'
import { PhoneButton, PhoneNotice, PhoneTextArea } from '../../audience/PhoneUI'

type QAndAPhoneProps = {
  actionEntryId: string | null
  isLoadingEntries: boolean
  isSubmitting: boolean
  onSubmit: (text: string) => Promise<void>
  onUpvote: (entryId: string) => Promise<void>
  question: QAndAQuestion
  results: QAndAResults | null
  successMessage: string | null
}

export default function QAndAPhone({
  actionEntryId,
  isLoadingEntries,
  isSubmitting,
  onSubmit,
  onUpvote,
  question,
  results,
  successMessage,
}: QAndAPhoneProps) {
  const [draftQuestion, setDraftQuestion] = useState('')

  return (
    <div className="space-y-8">
      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault()

          const trimmedQuestion = draftQuestion.trim()

          if (trimmedQuestion) {
            await onSubmit(trimmedQuestion)
            setDraftQuestion('')
          }
        }}
      >
        <label className="sr-only" htmlFor={`${question.id}-q-and-a-input`}>
          Your question
        </label>
        <PhoneTextArea
          className="min-h-28"
          id={`${question.id}-q-and-a-input`}
          maxLength={280}
          onChange={(event) => setDraftQuestion(event.target.value)}
          placeholder="Ask a question"
          value={draftQuestion}
        />
        <PhoneButton disabled={isSubmitting || draftQuestion.trim().length === 0} type="submit">
          Send question
        </PhoneButton>
        {successMessage ? <PhoneNotice tone="success">{successMessage}</PhoneNotice> : null}
      </form>

      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold">
          {results && results.entries.length > 0 ? `Questions from the room (${results.entries.length})` : 'Questions from the room'}
        </h2>

        {isLoadingEntries ? (
          <PhoneNotice>Loading questions…</PhoneNotice>
        ) : !results || results.entries.length === 0 ? (
          <PhoneNotice>No questions yet. Be the first to ask.</PhoneNotice>
        ) : (
          <ul className="divide-y divide-slide-line">
            {results.entries.map((entry) => {
              const isDisabled =
                isSubmitting || actionEntryId === entry.id || entry.isOwnEntry || entry.hasUpvoted

              return (
                <li className={`flex items-start gap-3 py-3 ${entry.answered ? 'opacity-50' : ''}`} key={entry.id}>
                  <p className="min-w-0 flex-1 pt-1.5 text-[16px] leading-snug">
                    {entry.text}
                    {entry.answered ? (
                      <span className="ml-2 inline-flex items-center gap-1 text-[13px] font-semibold text-slide-muted">
                        <Check className="size-3.5" />
                        Answered
                      </span>
                    ) : null}
                  </p>
                  <button
                    aria-label={
                      entry.isOwnEntry
                        ? `Asked by you ${entry.text}`
                        : `${entry.hasUpvoted ? 'Upvoted' : 'Upvote'} ${entry.text}`
                    }
                    className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold tabular-nums transition ${
                      entry.hasUpvoted
                        ? 'bg-slide-accent text-slide-accent-fg'
                        : 'border-2 border-slide-line text-slide-fg disabled:text-slide-muted'
                    }`}
                    disabled={isDisabled}
                    onClick={() => {
                      void onUpvote(entry.id)
                    }}
                    type="button"
                  >
                    <ThumbsUp aria-hidden="true" className="size-4" />
                    <span>{entry.upvoteCount}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
