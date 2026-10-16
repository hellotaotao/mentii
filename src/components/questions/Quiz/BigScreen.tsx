import type { QuizLeaderboard } from '../../../lib/quizGame'
import type { QuizQuestion, QuizResults } from '../../../types/questions'
import { LeaderboardRows } from '../Leaderboard/BigScreen'
import { getQuizAnswerStyle } from './answerStyles'

type QuizBigScreenProps = {
  isVotingOpen: boolean
  leaderboard?: QuizLeaderboard | null
  playerCount?: number
  question: QuizQuestion
  remainingSeconds: number | null
  results: QuizResults
}

function CountdownRing({ remainingSeconds, totalSeconds }: { remainingSeconds: number; totalSeconds: number }) {
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const progress = totalSeconds > 0 ? Math.max(0, Math.min(1, remainingSeconds / totalSeconds)) : 0
  const isUrgent = remainingSeconds <= 5

  return (
    <div className="relative size-28" role="timer" aria-label={`${remainingSeconds} seconds remaining`}>
      <svg className="size-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" fill="none" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
        <circle
          className="transition-[stroke-dashoffset] duration-300 ease-linear"
          cx="50"
          cy="50"
          fill="none"
          r={radius}
          stroke={isUrgent ? '#fb7185' : '#22d3ee'}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          strokeWidth="8"
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center text-4xl font-bold tabular-nums ${
          isUrgent ? 'text-rose-300' : 'text-white'
        }`}
      >
        {remainingSeconds}
      </span>
    </div>
  )
}

export default function QuizBigScreen({
  isVotingOpen,
  leaderboard = null,
  playerCount,
  question,
  remainingSeconds,
  results,
}: QuizBigScreenProps) {
  const correctOptionIdx = results.correctOptionIdx ?? question.config.correctOptionIdx
  const answeredCount = results.totals.reduce((sum, total) => sum + total.count, 0)
  const maxCount = Math.max(...results.totals.map((total) => total.count), 0)
  const secondsLeft = remainingSeconds ?? question.config.durationSeconds
  const isAnswering = isVotingOpen && secondsLeft > 0
  const totalPlayers = Math.max(playerCount ?? 0, leaderboard?.totalPlayers ?? 0)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      {/* Status sits left of the title so the floating join card never covers it. */}
      <div className="flex items-center gap-6">
        {isAnswering ? (
          <div className="flex shrink-0 flex-col items-center gap-2">
            <CountdownRing remainingSeconds={secondsLeft} totalSeconds={question.config.durationSeconds} />
            <p className="text-sm tabular-nums text-slate-300">
              {totalPlayers > 0 ? `${answeredCount} / ${totalPlayers} answered` : `${answeredCount} answered`}
            </p>
          </div>
        ) : null}

        <div className="min-w-0 space-y-3">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">
            {isAnswering ? 'Quiz' : (
              <span className="mentii-pop-in inline-block">{`Quiz · Time's up · ${answeredCount} answered`}</span>
            )}
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">{question.title}</h1>
        </div>
      </div>

      <div className={`grid gap-6 ${isAnswering ? '' : 'lg:grid-cols-[minmax(0,1fr)_360px]'}`}>
        <section className="grid gap-4 sm:grid-cols-2">
          {results.totals.map((total) => {
            const answerStyle = getQuizAnswerStyle(total.optionIdx)
            const isCorrect = total.optionIdx === correctOptionIdx

            return (
              <article
                className={`relative overflow-hidden rounded-3xl px-6 py-5 text-white shadow-lg transition duration-500 ${
                  answerStyle.tileClassName
                } ${!isAnswering && !isCorrect ? 'opacity-35 saturate-50' : ''} ${
                  !isAnswering && isCorrect ? 'ring-4 ring-white/80' : ''
                }`}
                key={`${question.id}-quiz-total-${total.optionIdx}`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl" aria-hidden="true">
                    {answerStyle.shape}
                  </span>
                  <p className="min-w-0 flex-1 text-2xl font-semibold">{total.label}</p>
                  {!isAnswering ? (
                    <span className="flex items-center gap-2 text-2xl font-bold tabular-nums">
                      {isCorrect ? <span aria-label="Correct answer">✓</span> : null}
                      {total.count}
                    </span>
                  ) : null}
                </div>

                {!isAnswering ? (
                  <div className="mt-4 h-2 rounded-full bg-black/20">
                    <div
                      className="h-full rounded-full bg-white/80 transition-all duration-700"
                      style={{
                        width: total.count === 0 || maxCount === 0 ? '0%' : `${(total.count / maxCount) * 100}%`,
                      }}
                    />
                  </div>
                ) : null}
              </article>
            )
          })}
        </section>

        {!isAnswering ? (
          <aside className="rounded-[32px] border border-white/10 bg-white/5 p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-amber-300">Top players</p>
            <div className="mt-4">
              {leaderboard && leaderboard.entries.length > 0 ? (
                <LeaderboardRows compact entries={leaderboard.entries.slice(0, 5)} showLastPoints />
              ) : (
                <p className="text-sm text-slate-400">Scores will appear once players answer.</p>
              )}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  )
}
