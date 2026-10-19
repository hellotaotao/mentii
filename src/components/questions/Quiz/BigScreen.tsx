import type { QuizLeaderboard } from '../../../lib/quizGame'
import type { QuizQuestion, QuizResults } from '../../../types/questions'
import { JoinInstructions, ResponseCount } from '../../slides/SlideChrome'
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
    <div className="relative size-[150px]" role="timer" aria-label={`${remainingSeconds} seconds remaining`}>
      <svg className="size-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" fill="none" r={radius} stroke="var(--slide-line)" strokeWidth="7" />
        <circle
          className="transition-[stroke-dashoffset] duration-300 ease-linear"
          cx="50"
          cy="50"
          fill="none"
          r={radius}
          stroke={isUrgent ? 'var(--slide-c6)' : 'var(--slide-accent)'}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          strokeWidth="7"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[56px] font-bold tabular-nums">
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
    <div className="flex h-full flex-col px-24 pb-12 pt-12">
      <div className="h-10">
        <JoinInstructions />
      </div>

      <div className="mt-8 flex items-start gap-12">
        <div className="min-w-0 flex-1">
          {!isAnswering ? (
            <p className="mentii-pop-in mb-3 text-[26px] font-semibold text-slide-accent">Time&apos;s up</p>
          ) : null}
          <h1 className="line-clamp-3 text-[56px] font-bold leading-[1.1] tracking-[-0.025em]">{question.title}</h1>
        </div>
        {isAnswering ? (
          <CountdownRing remainingSeconds={secondsLeft} totalSeconds={question.config.durationSeconds} />
        ) : null}
      </div>

      <div className={`mt-10 grid min-h-0 flex-1 gap-10 ${isAnswering ? '' : 'grid-cols-[minmax(0,1fr)_480px]'}`}>
        <section className="grid auto-rows-min grid-cols-2 gap-5">
          {results.totals.map((total) => {
            const answerStyle = getQuizAnswerStyle(total.optionIdx)
            const isCorrect = total.optionIdx === correctOptionIdx

            return (
              <article
                className={`relative flex flex-col justify-center overflow-hidden rounded-3xl px-8 text-white transition duration-500 ${
                  answerStyle.tileClassName
                } ${isAnswering ? 'h-[120px]' : 'h-[104px]'} ${!isAnswering && !isCorrect ? 'opacity-30 saturate-50' : ''}`}
                key={`${question.id}-quiz-total-${total.optionIdx}`}
              >
                <div className="flex items-center gap-5">
                  <span className="text-[34px]" aria-hidden="true">
                    {answerStyle.shape}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-[32px] font-semibold">{total.label}</p>
                  {!isAnswering ? (
                    <span className="flex items-center gap-3 text-[34px] font-bold tabular-nums">
                      {isCorrect ? <span aria-label="Correct answer">✓</span> : null}
                      {total.count}
                    </span>
                  ) : null}
                </div>
                {!isAnswering ? (
                  <div className="absolute inset-x-0 bottom-0 h-2 bg-black/15">
                    <div
                      className="h-full bg-white/80 transition-[width] duration-700"
                      style={{ width: maxCount === 0 ? '0%' : `${(total.count / maxCount) * 100}%` }}
                    />
                  </div>
                ) : null}
              </article>
            )
          })}
        </section>

        {!isAnswering ? (
          <aside className="min-h-0">
            <p className="mb-4 text-[24px] font-semibold text-slide-muted">Top players</p>
            {leaderboard && leaderboard.entries.length > 0 ? (
              <LeaderboardRows compact entries={leaderboard.entries.slice(0, 5)} showLastPoints />
            ) : (
              <p className="text-[24px] text-slide-muted">Scores appear once players answer.</p>
            )}
          </aside>
        ) : null}
      </div>

      <div className="flex h-10 items-center justify-end">
        <ResponseCount
          count={answeredCount}
          label={isAnswering && totalPlayers > 0 ? `of ${totalPlayers} answered` : 'answered'}
        />
      </div>
    </div>
  )
}
