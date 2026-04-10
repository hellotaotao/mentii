import type { MultipleChoiceQuestion } from '../../../types/questions'

type MultipleChoicePhoneProps = {
  isSubmitting: boolean
  onVote: (optionIdx: number) => void
  question: MultipleChoiceQuestion
}

export default function MultipleChoicePhone({
  isSubmitting,
  onVote,
  question,
}: MultipleChoicePhoneProps) {
  return (
    <div className="space-y-3">
      {question.config.options.map((option, optionIdx) => (
        <button
          className="flex w-full items-center justify-between rounded-3xl border border-white/10 bg-white/10 px-5 py-4 text-left text-base font-medium text-white transition hover:border-cyan-300 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          key={`${question.id}-phone-option-${optionIdx}`}
          onClick={() => onVote(optionIdx)}
          type="button"
        >
          <span>{option}</span>
          <span className="text-sm uppercase tracking-[0.3em] text-slate-400">{optionIdx + 1}</span>
        </button>
      ))}
    </div>
  )
}
