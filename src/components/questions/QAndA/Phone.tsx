import { useState } from 'react'
import type { QAndAQuestion, QAndAResults } from '../../../types/questions'

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
    <div className="space-y-6">
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault()

          const trimmedQuestion = draftQuestion.trim()
          if (!trimmedQuestion) {
            return
          }

          await onSubmit(trimmedQuestion)
          setDraftQuestion('')
        }}
      >
        <label className="block space-y-2" htmlFor={`${question.id}-q-and-a-input`}>
          <span className="text-sm font-medium text-slate-200">Your question</span>
          <textarea
            className="min-h-32 w-full rounded-3xl border border-white/10 bg-slate-950 px-5 py-4 text-base text-white outline-none transition focus:border-cyan-300"
            id={`${question.id}-q-and-a-input`}
            maxLength={280}
            onChange={(event) => setDraftQuestion(event.target.value)}
            placeholder="Ask your question here"
            value={draftQuestion}
          />
        </label>

        <button
          className="w-full rounded-3xl bg-cyan-400 px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting || draftQuestion.trim().length === 0}
          type="submit"
        >
          Submit question
        </button>
      </form>

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {successMessage}
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">Live queue</h2>
          {results ? <span className="text-sm text-slate-400">{`${results.entries.length} questions`}</span> : null}
        </div>

        {isLoadingEntries ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-6 text-sm text-slate-300">
            Loading audience questions…
          </div>
        ) : !results || results.entries.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-6 text-sm text-slate-300">
            No questions yet. Submit the first one from your phone.
          </div>
        ) : (
          <div className="space-y-3">
            {results.entries.map((entry) => {
              const buttonLabel = entry.isOwnEntry
                ? 'Asked by you'
                : entry.hasUpvoted
                  ? 'Upvoted'
                  : 'Upvote'

              return (
                <article
                  className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4"
                  key={entry.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-base leading-7 text-slate-100">{entry.text}</p>
                    {entry.answered ? (
                      <span className="shrink-0 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-100">
                        Answered
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-300">{`${entry.upvoteCount} upvotes`}</span>
                    <button
                      aria-label={
                        entry.isOwnEntry
                          ? `Asked by you ${entry.text}`
                          : `${entry.hasUpvoted ? 'Upvoted' : 'Upvote'} ${entry.text}`
                      }
                      className="rounded-full border border-white/10 bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:border-cyan-300 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={
                        isSubmitting ||
                        actionEntryId === entry.id ||
                        entry.isOwnEntry ||
                        entry.hasUpvoted
                      }
                      onClick={() => {
                        void onUpvote(entry.id)
                      }}
                      type="button"
                    >
                      {buttonLabel}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
