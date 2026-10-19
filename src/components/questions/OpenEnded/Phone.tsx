import { useState } from 'react'
import type { OpenEndedQuestion } from '../../../types/questions'
import { PhoneButton, PhoneTextArea } from '../../audience/PhoneUI'

type OpenEndedPhoneProps = {
  isSubmitting: boolean
  onSubmit: (text: string) => Promise<void>
  question: OpenEndedQuestion
}

export default function OpenEndedPhone({ isSubmitting, onSubmit, question }: OpenEndedPhoneProps) {
  const [draftResponse, setDraftResponse] = useState('')
  const trimmedResponse = draftResponse.trim()
  const remainingCharacters = question.config.maxLength - draftResponse.length

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault()

        if (trimmedResponse) {
          await onSubmit(trimmedResponse)
        }
      }}
    >
      <label className="sr-only" htmlFor={`${question.id}-open-ended-input`}>
        Your response
      </label>
      <PhoneTextArea
        className="min-h-36"
        id={`${question.id}-open-ended-input`}
        maxLength={question.config.maxLength}
        onChange={(event) => setDraftResponse(event.target.value)}
        placeholder="Type your answer"
        value={draftResponse}
      />
      <p className="text-right text-[13px] tabular-nums text-slide-muted">{`${remainingCharacters} characters left`}</p>
      <PhoneButton disabled={isSubmitting || trimmedResponse.length === 0} type="submit">
        Submit
      </PhoneButton>
    </form>
  )
}
