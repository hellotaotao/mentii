import { useEffect, useState } from 'react'
import { formatPoints, type QuizLeaderboard, type QuizLeaderboardRow } from '../../../lib/quizGame'
import type { LeaderboardQuestion } from '../../../types/questions'
import Confetti from '../../quiz/Confetti'
import { ResponseCount, SlideEmptyState, SlideLayout } from '../../slides/SlideChrome'

type LeaderboardBigScreenProps = {
  // Disabled in the host preview so confetti does not cover the editor.
  celebrate?: boolean
  leaderboard: QuizLeaderboard | null
  question: LeaderboardQuestion
}

// Reveal order on the podium: third, then second, then the winner.
const PODIUM_REVEAL_DELAYS_MS = [600, 1800, 3200]

const PODIUM_LAYOUT = [
  { columnHeight: 220, medal: '🥈', place: 2 },
  { columnHeight: 300, medal: '🥇', place: 1 },
  { columnHeight: 160, medal: '🥉', place: 3 },
]

export function RankChange({ entry }: { entry: QuizLeaderboardRow }) {
  const delta = entry.previousRank - entry.rank

  // Before a player has any points their previous rank only reflects join order.
  if (entry.score - entry.lastPoints <= 0 || delta === 0) {
    return <span className="w-14" />
  }

  return (
    <span className={`w-14 text-[22px] font-semibold tabular-nums ${delta > 0 ? 'text-[var(--slide-c4)]' : 'text-slide-muted'}`}>
      {delta > 0 ? `▲ ${delta}` : `▼ ${Math.abs(delta)}`}
    </span>
  )
}

export function LeaderboardRows({
  columns = 1,
  compact = false,
  entries,
  showLastPoints,
}: {
  columns?: 1 | 2
  compact?: boolean
  entries: QuizLeaderboardRow[]
  showLastPoints: boolean
}) {
  return (
    <ol className={columns === 2 ? 'grid grid-flow-col grid-cols-2 grid-rows-5 gap-x-10 gap-y-3' : 'space-y-3'}>
      {entries.map((entry, index) => (
        <li
          className={`mentii-rise-in flex items-center rounded-2xl bg-slide-subtle ${
            compact ? 'h-[68px] gap-3 px-4 text-[24px]' : 'h-[84px] gap-5 px-6 text-[30px]'
          }`}
          key={entry.participantId}
          style={{ animationDelay: `${index * 70}ms` }}
        >
          <span className={`font-bold tabular-nums text-slide-muted ${compact ? 'w-6' : 'w-10'}`}>{entry.rank}</span>
          <span className={compact ? 'text-[30px]' : 'text-[38px]'} aria-hidden="true">
            {entry.emoji}
          </span>
          <span className="min-w-0 flex-1 truncate font-semibold">{entry.nickname}</span>
          {showLastPoints && entry.lastPoints > 0 ? (
            <span className="text-[22px] font-semibold tabular-nums text-[var(--slide-c4)]">
              {`+${formatPoints(entry.lastPoints)}`}
            </span>
          ) : null}
          {compact ? null : <RankChange entry={entry} />}
          <span className={`text-right font-bold tabular-nums ${compact ? 'w-20' : 'w-28'}`}>
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
      <div className="flex h-full items-end justify-center gap-8">
        {PODIUM_LAYOUT.map((slot) => {
          const entry = entries.find((candidate) => candidate.rank === slot.place)
          // Places are revealed 3 -> 2 -> 1.
          const isRevealed = revealedCount >= 4 - slot.place

          return (
            <div className="flex w-[340px] flex-col items-center" key={slot.place}>
              <div
                className={`flex flex-col items-center pb-5 text-center ${isRevealed ? 'mentii-pop-in' : 'opacity-0'}`}
              >
                {entry ? (
                  <>
                    <span className="text-[88px] leading-none" aria-hidden="true">
                      {entry.emoji}
                    </span>
                    <span className="mt-3 max-w-[320px] truncate text-[36px] font-bold">{entry.nickname}</span>
                    {entry.realName ? (
                      <span className="max-w-[320px] truncate text-[24px] text-slide-muted">{entry.realName}</span>
                    ) : null}
                    <span className="mt-1 text-[26px] font-semibold tabular-nums text-slide-accent">
                      {`${formatPoints(entry.score)} pts`}
                    </span>
                  </>
                ) : null}
              </div>
              <div
                className="mentii-podium-column flex w-full items-start justify-center rounded-t-3xl bg-slide-subtle pt-6"
                style={{
                  animationDelay: `${PODIUM_REVEAL_DELAYS_MS[3 - slot.place] - 400}ms`,
                  height: slot.columnHeight,
                }}
              >
                <span className="text-[64px]" aria-label={`Place ${slot.place}`}>
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
    <SlideLayout
      footer={leaderboard ? <ResponseCount count={leaderboard.totalPlayers} label="players" /> : null}
      title={question.title}
      titleAlign="center"
    >
      {!leaderboard ? (
        <SlideEmptyState>Loading scores…</SlideEmptyState>
      ) : entries.length === 0 ? (
        <SlideEmptyState>Scores appear here once players join and answer.</SlideEmptyState>
      ) : question.config.podium ? (
        <Podium
          celebrate={celebrate}
          entries={entries}
          key={entries
            .slice(0, 3)
            .map((entry) => entry.participantId)
            .join(',')}
        />
      ) : (
        <LeaderboardRows columns={2} entries={entries.slice(0, 10)} showLastPoints />
      )}
    </SlideLayout>
  )
}
