import { useState } from 'react'
import type { WordCloudQuestion } from '../../../types/questions'

type WordCloudPhoneProps = {
  isSubmitting: boolean
  onSubmit: (word: string) => Promise<void>
  question: WordCloudQuestion
  showSuccess: boolean
}

export default function WordCloudPhone({
  isSubmitting,
  onSubmit,
  question,
  showSuccess,
}: WordCloudPhoneProps) {
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
      <label className="block space-y-2" htmlFor={`${question.id}-word-input`}>
        <span className="text-sm font-medium text-slate-200">Your word</span>
        <input
          autoComplete="off"
          className="w-full rounded-3xl border border-white/10 bg-slate-950 px-5 py-4 text-lg text-white outline-none transition focus:border-cyan-300"
          id={`${question.id}-word-input`}
          maxLength={48}
          onChange={(event) => setDraftWord(event.target.value)}
          placeholder="productive"
          value={draftWord}
        />
      </label>

      <button
        className="w-full rounded-3xl bg-cyan-400 px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting || trimmedWord.length === 0}
        type="submit"
      >
        Submit word
      </button>

      <p className="text-sm text-slate-300">
        {question.config.allowMultipleSubmissions
          ? 'Participants can submit as many words as they like.'
          : 'Each participant can send one word for this prompt.'}
      </p>

      {showSuccess ? (
        <div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          Thanks for sharing! Add another word any time.
        </div>
      ) : null}
    </form>
  )
}
