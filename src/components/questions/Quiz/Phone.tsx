import type { QuizQuestion } from '../../../types/questions'

type QuizPhoneProps = {
  isSubmitting: boolean
  onVote: (optionIdx: number) => void
  question: QuizQuestion
}

export default function QuizPhone({ isSubmitting, onVote, question }: QuizPhoneProps) {
  return (
    <div className="space-y-4">
      {question.config.options.map((option, optionIdx) => (
        <button
          className="flex w-full items-center justify-between rounded-3xl border border-white/10 bg-white/10 px-5 py-4 text-left text-base font-medium text-white transition hover:border-cyan-300 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          key={`${question.id}-quiz-phone-option-${optionIdx}`}
          onClick={() => onVote(optionIdx)}
          type="button"
        >
          <span>{option}</span>
          <span className="text-sm uppercase tracking-[0.3em] text-slate-400">{optionIdx + 1}</span>
        </button>
      ))}

      <p className="text-sm text-slate-300">Answer before the presenter timer runs out.</p>
    </div>
  )
}
