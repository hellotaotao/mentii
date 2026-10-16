import { useState } from 'react'
import { formatPoints, formatRank, type MyQuizStatus } from '../../../lib/quizGame'
import type { LeaderboardQuestion } from '../../../types/questions'

type LeaderboardPhoneProps = {
  onSaveRealName: (realName: string) => Promise<void>
  question: LeaderboardQuestion
  status: MyQuizStatus | null
}

const PODIUM_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

function RealNameForm({ initialRealName, onSave }: { initialRealName: string | null; onSave: (realName: string) => Promise<void> }) {
  const [realName, setRealName] = useState(initialRealName ?? '')
  const [saveState, setSaveState] = useState<'error' | 'idle' | 'saved' | 'saving'>(initialRealName ? 'saved' : 'idle')

  async function handleSave() {
    setSaveState('saving')

    try {
      await onSave(realName)
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  return (
    <form
      className="mt-6 space-y-3 rounded-3xl border border-amber-300/30 bg-amber-400/10 p-5 text-left"
      onSubmit={(event) => {
        event.preventDefault()
        void handleSave()
      }}
    >
      <label className="block space-y-2" htmlFor="participant-real-name">
        <span className="block text-base font-semibold text-amber-100">You made the podium!</span>
        <span className="block text-sm text-amber-100/80">
          Add your real name so everyone knows who to cheer for. Optional.
        </span>
        <input
          autoComplete="name"
          className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-amber-300"
          id="participant-real-name"
          maxLength={60}
          onChange={(event) => {
            setRealName(event.target.value)
            setSaveState('idle')
          }}
          placeholder="Your name"
          value={realName}
        />
      </label>
      <button
        className="w-full rounded-full bg-amber-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
        disabled={saveState === 'saving'}
        type="submit"
      >
        {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : 'Show my name'}
      </button>
      {saveState === 'error' ? <p className="text-sm text-rose-200">Could not save. Try again.</p> : null}
    </form>
  )
}

export default function LeaderboardPhone({ onSaveRealName, question, status }: LeaderboardPhoneProps) {
  if (!status) {
    return (
      <div className="py-10 text-center">
        <p className="text-xl font-semibold">{question.title}</p>
        <p className="mt-2 text-slate-300">Watch the big screen for the standings.</p>
      </div>
    )
  }

  const isOnPodium = question.config.podium && status.rank >= 1 && status.rank <= 3 && status.score > 0

  return (
    <div className="text-center">
      <p className="mentii-pop-in text-7xl" aria-hidden="true">
        {isOnPodium ? PODIUM_MEDALS[status.rank] : status.emoji}
      </p>
      <p className="mt-4 text-lg text-slate-300">{status.nickname}</p>
      <p className="mt-1 text-4xl font-bold">
        {status.rank > 0 ? formatRank(status.rank) : '–'}
        <span className="text-xl font-medium text-slate-400">{` of ${status.totalPlayers}`}</span>
      </p>
      <p className="mt-2 text-xl tabular-nums text-cyan-200">{`${formatPoints(status.score)} pts`}</p>

      {isOnPodium ? <RealNameForm initialRealName={status.realName} onSave={onSaveRealName} /> : null}
    </div>
  )
}
