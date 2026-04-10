import type { QAndAQuestion, QAndAResults } from '../../../types/questions'

type QAndABigScreenProps = {
  actionEntryId: string | null
  onToggleAnswered: (entryId: string, nextAnswered: boolean) => void
  question: QAndAQuestion
  results: QAndAResults
}

export default function QAndABigScreen({
  actionEntryId,
  onToggleAnswered,
  question,
  results,
}: QAndABigScreenProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <div className="space-y-4 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">q&amp;a</p>
        <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">{question.title}</h1>
        <p className="text-base text-slate-300">{`${results.entries.length} audience questions`}</p>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
        {results.entries.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center text-center text-slate-300">
            Waiting for the first audience question…
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {results.entries.map((entry) => (
              <article
                className={`rounded-3xl border px-5 py-4 ${
                  entry.answered
                    ? 'border-emerald-300/30 bg-emerald-400/10'
                    : 'border-white/10 bg-slate-950/70'
                }`}
                key={entry.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{`${entry.upvoteCount} upvotes`}</p>
                    <p className="mt-3 text-lg leading-8 text-slate-100">{entry.text}</p>
                  </div>

                  {entry.answered ? (
                    <span className="shrink-0 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-100">
                      Answered
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-cyan-300 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={actionEntryId === entry.id}
                    onClick={() => onToggleAnswered(entry.id, !entry.answered)}
                    type="button"
                  >
                    {entry.answered ? 'Reopen' : 'Mark answered'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
