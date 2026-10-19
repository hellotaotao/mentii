import { useState } from 'react'
import type { WordCloudQuestion } from '../../../types/questions'
import { PhoneButton, PhoneNotice } from '../../audience/PhoneUI'

type WordCloudPhoneProps = {
  isSubmitting: boolean
  onSubmit: (word: string) => Promise<void>
  question: WordCloudQuestion
  showSuccess: boolean
}

export default function WordCloudPhone({ isSubmitting, onSubmit, question, showSuccess }: WordCloudPhoneProps) {
  const [draftWord, setDraftWord] = useState('')
  const trimmedWord = draftWord.trim()

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault()

        if (!trimmedWord) {
          return
        }

        await onSubmit(trimmedWord)
        setDraftWord('')
      }}
    >
      <label className="sr-only" htmlFor={`${question.id}-word-input`}>
        Your word
      </label>
      <input
        autoComplete="off"
        className="h-14 w-full rounded-2xl border-2 border-slide-line bg-slide-bg px-4 text-[17px] text-slide-fg outline-none transition placeholder:text-slide-muted focus:border-slide-accent"
        id={`${question.id}-word-input`}
        maxLength={48}
        onChange={(event) => setDraftWord(event.target.value)}
        placeholder="Type a word"
        value={draftWord}
      />
      <PhoneButton disabled={isSubmitting || trimmedWord.length === 0} type="submit">
        Submit
      </PhoneButton>
      {showSuccess ? (
        <PhoneNotice tone="success">Added to the cloud. Send another word any time.</PhoneNotice>
      ) : question.config.allowMultipleSubmissions ? (
        <p className="text-center text-[13px] text-slide-muted">You can send more than one word.</p>
      ) : null}
    </form>
  )
}
