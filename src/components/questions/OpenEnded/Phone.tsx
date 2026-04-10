import { useState } from 'react'
import type { OpenEndedQuestion } from '../../../types/questions'

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

        if (!trimmedResponse) {
          return
        }

        await onSubmit(trimmedResponse)
      }}
    >
      <label className="block space-y-2" htmlFor={`${question.id}-open-ended-input`}>
        <span className="text-sm font-medium text-slate-200">Your response</span>
        <textarea
          className="min-h-40 w-full rounded-3xl border border-white/10 bg-slate-950 px-5 py-4 text-base text-white outline-none transition focus:border-cyan-300"
          id={`${question.id}-open-ended-input`}
          maxLength={question.config.maxLength}
          onChange={(event) => setDraftResponse(event.target.value)}
          placeholder="Share your answer here"
          value={draftResponse}
        />
      </label>

      <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
        <span>{`Up to ${question.config.maxLength} characters`}</span>
        <span>{`${remainingCharacters} left`}</span>
      </div>

      <button
        className="w-full rounded-3xl bg-cyan-400 px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting || trimmedResponse.length === 0}
        type="submit"
      >
        Submit response
      </button>
    </form>
  )
}
