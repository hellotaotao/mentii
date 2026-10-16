import { Shuffle } from 'lucide-react'
import { useState } from 'react'
import { PARTICIPANT_EMOJIS, suggestParticipantProfile } from '../../lib/quizGame'

type NicknameFormProps = {
  onSubmit: (nickname: string, emoji: string) => Promise<void>
  roomName: string
}

const MAX_NICKNAME_LENGTH = 24

export default function NicknameForm({ onSubmit, roomName }: NicknameFormProps) {
  const [suggestion] = useState(() => suggestParticipantProfile())
  const [nickname, setNickname] = useState(suggestion.nickname)
  const [emoji, setEmoji] = useState<string>(suggestion.emoji)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    if (!nickname.trim()) {
      setErrorMessage('Pick a nickname first.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await onSubmit(nickname.trim(), emoji)
    } catch (error) {
      setErrorMessage(error instanceof Error && error.message ? error.message : 'Unable to join right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleShuffle() {
    const nextSuggestion = suggestParticipantProfile()
    setNickname(nextSuggestion.nickname)
    setEmoji(nextSuggestion.emoji)
    setErrorMessage(null)
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault()
        void handleSubmit()
      }}
    >
      <div className="text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">{roomName}</p>
        <h1 className="mt-3 text-3xl font-semibold">Pick your player name</h1>
        <p className="mt-2 text-base text-slate-300">It shows on the big screen and the leaderboard.</p>
      </div>

      <div className="flex justify-center">
        <span className="mentii-pop-in text-7xl" key={emoji} aria-hidden="true">
          {emoji}
        </span>
      </div>

      <fieldset>
        <legend className="sr-only">Choose an avatar</legend>
        <div className="grid grid-cols-6 gap-2">
          {PARTICIPANT_EMOJIS.map((candidate) => (
            <button
              aria-label={`Avatar ${candidate}`}
              aria-pressed={candidate === emoji}
              className={`rounded-2xl py-2 text-2xl transition ${
                candidate === emoji ? 'bg-emerald-400/20 ring-2 ring-emerald-300' : 'bg-white/5 hover:bg-white/10'
              }`}
              key={candidate}
              onClick={() => setEmoji(candidate)}
              type="button"
            >
              {candidate}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-200" htmlFor="participant-nickname">
          Nickname
        </label>
        <div className="flex gap-2">
          <input
            autoComplete="off"
            className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-lg text-white outline-none transition focus:border-emerald-300"
            id="participant-nickname"
            maxLength={MAX_NICKNAME_LENGTH}
            onChange={(event) => setNickname(event.target.value)}
            value={nickname}
          />
          <button
            aria-label="Shuffle nickname"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 text-slate-200 transition hover:bg-white/10"
            onClick={handleShuffle}
            type="button"
          >
            <Shuffle className="size-5" />
          </button>
        </div>
      </div>

      {errorMessage ? (
        <p className="rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </p>
      ) : null}

      <button
        className="w-full rounded-full bg-emerald-400 px-6 py-4 text-lg font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Joining…' : "Let's play"}
      </button>
    </form>
  )
}
