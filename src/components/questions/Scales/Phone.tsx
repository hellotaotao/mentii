import { useState } from 'react'
import type { ScalesQuestion } from '../../../types/questions'
import { PhoneButton } from '../../audience/PhoneUI'

type ScalesPhoneProps = {
  isSubmitting: boolean
  onVote: (rating: number) => void
  question: ScalesQuestion
}

export default function ScalesPhone({ isSubmitting, onVote, question }: ScalesPhoneProps) {
  const [rating, setRating] = useState<number | null>(null)

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              aria-checked={rating === value}
              aria-label={`Rate ${value} out of 5`}
              className={`flex aspect-square items-center justify-center rounded-2xl border-2 text-[22px] font-bold transition ${
                rating === value
                  ? 'border-slide-accent bg-slide-accent text-slide-accent-fg'
                  : 'border-slide-line'
              }`}
              disabled={isSubmitting}
              key={`${question.id}-scales-${value}`}
              onClick={() => setRating(value)}
              role="radio"
              type="button"
            >
              {value}
            </button>
          ))}
        </div>
        <div className="flex items-start justify-between gap-4 text-[13px] text-slide-muted">
          <span className="max-w-[45%]">{question.config.leftLabel}</span>
          <span className="max-w-[45%] text-right">{question.config.rightLabel}</span>
        </div>
      </div>

      <PhoneButton disabled={isSubmitting || rating === null} onClick={() => rating !== null && onVote(rating)}>
        Submit
      </PhoneButton>
    </div>
  )
}
