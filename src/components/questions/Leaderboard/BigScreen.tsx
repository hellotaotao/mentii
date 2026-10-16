import { useEffect, useState } from 'react'
import { formatPoints, type QuizLeaderboard, type QuizLeaderboardRow } from '../../../lib/quizGame'
import type { LeaderboardQuestion } from '../../../types/questions'
import Confetti from '../../quiz/Confetti'

type LeaderboardBigScreenProps = {
  // Disabled in the host preview so confetti does not cover the editor.
  celebrate?: boolean
  leaderboard: QuizLeaderboard | null
  question: LeaderboardQuestion
}

// Reveal order on the podium: third, then second, then the winner.
const PODIUM_REVEAL_DELAYS_MS = [600, 1800, 3200]

const PODIUM_LAYOUT = [
  { heightClassName: 'h-40', medal: '🥈', place: 2, tintClassName: 'from-slate-300/30 to-slate-400/10' },
  { heightClassName: 'h-56', medal: '🥇', place: 1, tintClassName: 'from-amber-300/40 to-amber-500/10' },
  { heightClassName: 'h-28', medal: '🥉', place: 3, tintClassName: 'from-orange-400/30 to-orange-600/10' },
]

export function RankChange({ entry }: { entry: QuizLeaderboardRow }) {
  const delta = entry.previousRank - entry.rank

  // Before a player has any points their previous rank only reflects join order.
  if (entry.score - entry.lastPoints <= 0) {
    return null
  }

  if (delta > 0) {
    return <span className="text-sm font-semibold text-emerald-300">{`▲ ${delta}`}</span>
  }

  if (delta < 0) {
    return <span className="text-sm font-semibold text-rose-300">{`▼ ${Math.abs(delta)}`}</span>
  }

  return <span className="text-sm text-slate-500">–</span>
}

export function LeaderboardRows({
  compact = false,
  entries,
  showLastPoints,
}: {
  compact?: boolean
  entries: QuizLeaderboardRow[]
  showLastPoints: boolean
}) {
  return (
    <ol className={compact ? 'space-y-2' : 'space-y-3'}>
      {entries.map((entry, index) => (
        <li
          className={`mentii-rise-in flex items-center rounded-2xl border border-white/10 bg-white/5 ${
            compact ? 'gap-2 px-3 py-2' : 'gap-4 px-5 py-3'
          }`}
          key={entry.participantId}
          style={{ animationDelay: `${index * 90}ms` }}
        >
          <span className={`font-bold tabular-nums text-slate-300 ${compact ? 'w-5 text-base' : 'w-10 text-2xl'}`}>
            {entry.rank}
          </span>
          <span className={compact ? 'text-xl' : 'text-3xl'} aria-hidden="true">
            {entry.emoji}
          </span>
          <span className={`min-w-0 flex-1 truncate font-semibold text-white ${compact ? 'text-base' : 'text-xl'}`}>
            {entry.nickname}
          </span>
          {showLastPoints && entry.lastPoints > 0 ? (
            <span className="text-sm font-medium text-emerald-300">{`+${formatPoints(entry.lastPoints)}`}</span>
          ) : null}
          <RankChange entry={entry} />
          <span
            className={`text-right font-bold tabular-nums text-white ${compact ? 'w-16 text-base' : 'w-28 text-xl'}`}
          >
            {formatPoints(entry.score)}
          </span>
        </li>
      ))}
    </ol>
  )
}

function Podium({ celebrate, entries }: { celebrate: boolean; entries: QuizLeaderboardRow[] }) {
  // The parent remounts this component (via key) whenever the top three change.
  const [revealedCount, setRevealedCount] = useState(0)

  useEffect(() => {
    const timers = PODIUM_REVEAL_DELAYS_MS.map((delay, index) => setTimeout(() => setRevealedCount(index + 1), delay))

    return () => {
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  const winnerRevealed = revealedCount >= 3

  return (
    <>
      {celebrate && winnerRevealed ? <Confetti burstKey="podium" /> : null}
      <div className="flex items-end justify-center gap-4 sm:gap-6">
        {PODIUM_LAYOUT.map((slot) => {
          const entry = entries.find((candidate) => candidate.rank === slot.place)
          // Places are revealed 3 -> 2 -> 1.
          const isRevealed = revealedCount >= 4 - slot.place

          return (
            <div className="flex w-44 flex-col items-center sm:w-56" key={slot.place}>
              <div className={`flex min-h-36 flex-col items-center justify-end pb-3 text-center ${isRevealed ? 'mentii-pop-in' : 'opacity-0'}`}>
                {entry ? (
                  <>
                    <span className="text-6xl" aria-hidden="true">
                      {entry.emoji}
                    </span>
                    <span className="mt-2 max-w-full truncate text-2xl font-bold text-white">{entry.nickname}</span>
                    {entry.realName ? (
                      <span className="max-w-full truncate text-base text-slate-300">{entry.realName}</span>
                    ) : null}
                    <span className="mt-1 text-lg font-semibold tabular-nums text-amber-200">
                      {`${formatPoints(entry.score)} pts`}
                    </span>
                  </>
                ) : null}
              </div>
              <div
                className={`mentii-podium-column flex w-full items-start justify-center rounded-t-3xl border border-white/10 bg-gradient-to-b pt-4 ${slot.heightClassName} ${slot.tintClassName}`}
                style={{ animationDelay: `${PODIUM_REVEAL_DELAYS_MS[3 - slot.place] - 400}ms` }}
              >
                <span className="text-5xl" aria-label={`Place ${slot.place}`}>
                  {slot.medal}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

export default function LeaderboardBigScreen({ celebrate = true, leaderboard, question }: LeaderboardBigScreenProps) {
  const entries = leaderboard?.entries ?? []

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
      <div className="space-y-3 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-amber-300">
          {question.config.podium ? 'Final results' : 'Leaderboard'}
        </p>
        <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">{question.title}</h1>
        {leaderboard ? (
          <p className="text-base text-slate-400">{`${leaderboard.totalPlayers} players`}</p>
        ) : null}
      </div>

      {!leaderboard ? (
        <p className="text-center text-lg text-slate-400">Loading scores…</p>
      ) : entries.length === 0 ? (
        <p className="text-center text-lg text-slate-400">No players have joined yet.</p>
      ) : question.config.podium ? (
        <div className="space-y-10">
          <Podium
            celebrate={celebrate}
            entries={entries}
            key={entries
              .slice(0, 3)
              .map((entry) => entry.participantId)
              .join(',')}
          />
          {entries.length > 3 ? (
            <div className="mx-auto w-full max-w-3xl">
              <LeaderboardRows entries={entries.slice(3, 8)} showLastPoints={false} />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mx-auto w-full max-w-3xl">
          <LeaderboardRows entries={entries.slice(0, 8)} showLastPoints />
        </div>
      )}
    </div>
  )
}
