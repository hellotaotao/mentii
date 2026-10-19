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
        <p className="text-[15px] font-medium text-slide-muted">{roomName}</p>
        <h1 className="mt-3 text-3xl font-semibold">Pick your player name</h1>
        <p className="mt-2 text-base text-slide-muted">It shows on the big screen and the leaderboard.</p>
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
                candidate === emoji ? 'bg-[color-mix(in_srgb,var(--slide-accent)_12%,transparent)] ring-2 ring-slide-accent' : 'bg-slide-subtle'
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
        <label className="block text-sm font-semibold text-slide-fg" htmlFor="participant-nickname">
          Nickname
        </label>
        <div className="flex gap-2">
          <input
            autoComplete="off"
            className="min-w-0 flex-1 rounded-2xl border-2 border-slide-line bg-slide-bg px-4 py-3 text-lg text-slide-fg outline-none transition focus:border-slide-accent"
            id="participant-nickname"
            maxLength={MAX_NICKNAME_LENGTH}
            onChange={(event) => setNickname(event.target.value)}
            value={nickname}
          />
          <button
            aria-label="Shuffle nickname"
            className="rounded-2xl border-2 border-slide-line px-4 text-slide-muted transition"
            onClick={handleShuffle}
            type="button"
          >
            <Shuffle className="size-5" />
          </button>
        </div>
      </div>

      {errorMessage ? (
        <p className="rounded-2xl bg-[#fdecea] px-4 py-3 text-sm text-[#b42318]">
          {errorMessage}
        </p>
      ) : null}

      <button
        className="w-full flex h-14 items-center justify-center rounded-2xl bg-slide-accent px-6 text-[17px] font-semibold text-slide-accent-fg transition disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'Joining…' : "Let's play"}
      </button>
    </form>
  )
}
