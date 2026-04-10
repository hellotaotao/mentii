import type { ScalesQuestion } from '../../../types/questions'

type ScalesPhoneProps = {
  isSubmitting: boolean
  onVote: (rating: number) => void
  question: ScalesQuestion
}

export default function ScalesPhone({ isSubmitting, onVote, question }: ScalesPhoneProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            aria-label={`Rate ${rating} out of 5`}
            className="flex aspect-square items-center justify-center rounded-3xl border border-white/10 bg-white/10 text-2xl font-semibold text-white transition hover:border-cyan-300 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            key={`${question.id}-scales-${rating}`}
            onClick={() => onVote(rating)}
            type="button"
          >
            {rating}
          </button>
        ))}
      </div>

      <div className="flex items-start justify-between gap-4 text-sm text-slate-300">
        <span className="max-w-[45%]">{question.config.leftLabel}</span>
        <span className="max-w-[45%] text-right">{question.config.rightLabel}</span>
      </div>
    </div>
  )
}
