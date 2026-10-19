import { useState } from 'react'
import type { MultipleChoiceQuestion } from '../../../types/questions'
import { PhoneButton } from '../../audience/PhoneUI'

type MultipleChoicePhoneProps = {
  isSubmitting: boolean
  onVote: (optionIdx: number) => void
  question: MultipleChoiceQuestion
}

export default function MultipleChoicePhone({ isSubmitting, onVote, question }: MultipleChoicePhoneProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  return (
    <div className="space-y-6">
      <div className="space-y-3" role="radiogroup" aria-label="Answer options">
        {question.config.options.map((option, optionIdx) => {
          const isSelected = selectedIdx === optionIdx

          return (
            <button
              aria-checked={isSelected}
              className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-[17px] font-medium transition ${
                isSelected
                  ? 'border-slide-accent bg-[color-mix(in_srgb,var(--slide-accent)_8%,transparent)]'
                  : 'border-slide-line'
              }`}
              disabled={isSubmitting}
              key={`${question.id}-phone-option-${optionIdx}`}
              onClick={() => setSelectedIdx(optionIdx)}
              role="radio"
              type="button"
            >
              <span
                aria-hidden="true"
                className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  isSelected ? 'border-slide-accent' : 'border-slide-line'
                }`}
              >
                {isSelected ? <span className="size-2.5 rounded-full bg-slide-accent" /> : null}
              </span>
              {option}
            </button>
          )
        })}
      </div>

      <PhoneButton disabled={isSubmitting || selectedIdx === null} onClick={() => selectedIdx !== null && onVote(selectedIdx)}>
        {isSubmitting ? 'Submitting…' : 'Submit'}
      </PhoneButton>
    </div>
  )
}
