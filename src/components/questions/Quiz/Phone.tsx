import { formatPoints, formatRank, type MyQuizStatus } from '../../../lib/quizGame'
import type { QuizQuestion } from '../../../types/questions'
import { getQuizAnswerStyle } from './answerStyles'

export type QuizPhonePhase = 'answering' | 'locked' | 'revealed'

type QuizPhoneProps = {
  isSubmitting: boolean
  onVote: (optionIdx: number) => void
  phase: QuizPhonePhase
  question: QuizQuestion
  remainingSeconds: number | null
  status: MyQuizStatus | null
  submittedOptionIdx: number | null
}

function StandingLine({ status }: { status: MyQuizStatus }) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 text-center">
      <div className="rounded-2xl border border-slide-line bg-slide-subtle px-4 py-3">
        <p className="text-[13px] font-medium text-slide-muted">Score</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{formatPoints(status.score)}</p>
      </div>
      <div className="rounded-2xl border border-slide-line bg-slide-subtle px-4 py-3">
        <p className="text-[13px] font-medium text-slide-muted">Rank</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">
          {status.rank > 0 ? `${formatRank(status.rank)}` : '–'}
          <span className="text-base font-medium text-slide-muted">{` / ${status.totalPlayers}`}</span>
        </p>
      </div>
    </div>
  )
}

function RevealCard({ question, status }: { question: QuizQuestion; status: MyQuizStatus | null }) {
  const answer = status?.currentAnswer?.questionId === question.id ? status.currentAnswer : null

  if (!status || !answer || !answer.revealed) {
    return (
      <div className="py-10 text-center">
        <p className="text-5xl" aria-hidden="true">
          ⏳
        </p>
        <p className="mt-4 text-xl font-semibold">Time&apos;s up!</p>
        <p className="mt-2 text-slide-muted">Revealing the answer…</p>
      </div>
    )
  }

  const correctLabel =
    answer.correctOptionIdx !== null ? question.config.options[answer.correctOptionIdx] ?? null : null

  if (!answer.answered) {
    return (
      <div className="mentii-pop-in text-center">
        <p className="text-6xl" aria-hidden="true">
          🐢
        </p>
        <p className="mt-4 text-2xl font-semibold">Too slow this time</p>
        {correctLabel ? <p className="mt-2 text-slide-muted">{`The answer was “${correctLabel}”.`}</p> : null}
        <StandingLine status={status} />
      </div>
    )
  }

  return (
    <div
      className={`mentii-pop-in rounded-3xl p-6 text-center ${
        answer.correct ? 'bg-[color-mix(in_srgb,var(--slide-c4)_14%,transparent)]' : 'bg-[color-mix(in_srgb,var(--slide-c6)_12%,transparent)]'
      }`}
    >
      <p className="text-6xl" aria-hidden="true">
        {answer.correct ? '🎉' : '😅'}
      </p>
      <p className="mt-3 text-3xl font-bold">{answer.correct ? 'Correct!' : 'Not quite'}</p>
      {answer.correct ? (
        <p className="mt-2 text-2xl font-semibold text-[var(--slide-c4)]">{`+${formatPoints(answer.points ?? 0)}`}</p>
      ) : correctLabel ? (
        <p className="mt-2 text-slide-fg">{`The answer was “${correctLabel}”.`}</p>
      ) : null}
      <StandingLine status={status} />
    </div>
  )
}

export default function QuizPhone({
  isSubmitting,
  onVote,
  phase,
  question,
  remainingSeconds,
  status,
  submittedOptionIdx,
}: QuizPhoneProps) {
  if (phase === 'revealed') {
    return <RevealCard question={question} status={status} />
  }

  if (phase === 'locked') {
    const lockedIdx = submittedOptionIdx ?? status?.currentAnswer?.optionIdx ?? null
    const lockedStyle = lockedIdx !== null ? getQuizAnswerStyle(lockedIdx) : null

    return (
      <div className="py-6 text-center">
        {lockedStyle && lockedIdx !== null ? (
          <div
            className={`mentii-pop-in mx-auto flex size-28 items-center justify-center rounded-3xl text-5xl text-white ${lockedStyle.tileClassName}`}
          >
            {lockedStyle.shape}
          </div>
        ) : null}
        <p className="mt-5 text-2xl font-semibold">Answer locked in</p>
        <p className="mt-2 text-slide-muted">
          {lockedIdx !== null ? `“${question.config.options[lockedIdx]}”` : 'Waiting for everyone else…'}
        </p>
        <p className="mt-6 text-sm tabular-nums text-slide-muted">
          {remainingSeconds !== null ? `${remainingSeconds}s left` : 'Waiting for the reveal…'}
        </p>
      </div>
    )
  }

  const secondsLeft = remainingSeconds ?? question.config.durationSeconds
  const progress = Math.max(0, Math.min(1, secondsLeft / question.config.durationSeconds))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slide-line">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ease-linear ${
              secondsLeft <= 5 ? 'bg-[var(--slide-c6)]' : 'bg-slide-accent'
            }`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="w-10 text-right text-sm font-semibold tabular-nums text-slide-fg">{`${secondsLeft}s`}</span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {question.config.options.map((option, optionIdx) => {
          const answerStyle = getQuizAnswerStyle(optionIdx)

          return (
            <button
              className={`flex min-h-16 w-full items-center gap-4 rounded-3xl px-5 py-4 text-left text-lg font-semibold text-white shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${answerStyle.tileClassName}`}
              disabled={isSubmitting}
              key={`${question.id}-quiz-phone-option-${optionIdx}`}
              onClick={() => onVote(optionIdx)}
              type="button"
            >
              <span className="text-2xl" aria-hidden="true">
                {answerStyle.shape}
              </span>
              <span>{option}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
