import type { QuizQuestion, QuizResults } from '../../../types/questions'

type QuizBigScreenProps = {
  isVotingOpen: boolean
  question: QuizQuestion
  remainingSeconds: number | null
  results: QuizResults
}

export default function QuizBigScreen({
  isVotingOpen,
  question,
  remainingSeconds,
  results,
}: QuizBigScreenProps) {
  const maxCount = Math.max(...results.totals.map((total) => total.count), 0)
  const correctOptionIdx = results.correctOptionIdx ?? question.config.correctOptionIdx

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <div className="space-y-4 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">quiz</p>
        <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">{question.title}</h1>
        <p className="text-base text-slate-300">
          {isVotingOpen ? `${remainingSeconds ?? question.config.durationSeconds}s remaining` : 'Voting closed'}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4 rounded-[32px] border border-white/10 bg-white/5 p-6">
          {results.totals.map((total) => (
            <article
              className={`rounded-3xl border px-5 py-4 ${
                total.optionIdx === correctOptionIdx
                  ? 'border-emerald-300/30 bg-emerald-400/10'
                  : 'border-white/10 bg-slate-950/70'
              }`}
              key={`${question.id}-quiz-total-${total.optionIdx}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{`${total.count} votes`}</p>
                  <p className="mt-3 text-lg text-slate-100">{total.label}</p>
                </div>
                {total.optionIdx === correctOptionIdx ? (
                  <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-100">
                    Correct answer
                  </span>
                ) : null}
              </div>
              <div className="mt-4 h-3 rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    total.optionIdx === correctOptionIdx ? 'bg-emerald-400' : 'bg-cyan-400'
                  }`}
                  style={{
                    width:
                      total.count === 0 || maxCount === 0
                        ? '0%'
                        : `${Math.max(10, (total.count / maxCount) * 100)}%`,
                  }}
                />
              </div>
            </article>
          ))}
        </section>

        <aside className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Leaderboard</p>
          {results.leaderboard.length === 0 ? (
            <p className="mt-6 text-sm text-slate-300">No correct answers yet.</p>
          ) : (
            <ol className="mt-6 space-y-3">
              {results.leaderboard.map((entry, index) => (
                <li
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3"
                  key={entry.participantId}
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{`Rank ${index + 1}`}</p>
                    <p className="mt-1 text-base font-medium text-white">{entry.label}</p>
                  </div>
                  <p className="text-sm text-slate-300">Correct</p>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </div>
  )
}
