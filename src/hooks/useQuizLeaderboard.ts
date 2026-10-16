import { useEffect, useState } from 'react'
import { getQuizLeaderboard, type QuizLeaderboard } from '../lib/quizGame'

type UseQuizLeaderboardOptions = {
  enabled: boolean
  maxEntries?: number
  // Any change to this key triggers a refetch (slide change, reveal, new votes).
  refreshKey: string
  sessionId: string | null
}

export function useQuizLeaderboard({ enabled, maxEntries = 10, refreshKey, sessionId }: UseQuizLeaderboardOptions) {
  const [leaderboard, setLeaderboard] = useState<QuizLeaderboard | null>(null)

  useEffect(() => {
    if (!enabled || !sessionId) {
      return
    }

    let isActive = true
    const debounceTimer = setTimeout(() => {
      void getQuizLeaderboard(sessionId, maxEntries)
        .then((nextLeaderboard) => {
          if (isActive) {
            setLeaderboard(nextLeaderboard)
          }
        })
        .catch(() => {
          // Keep the last good leaderboard on transient failures.
        })
    }, 150)

    return () => {
      isActive = false
      clearTimeout(debounceTimer)
    }
  }, [enabled, maxEntries, refreshKey, sessionId])

  return enabled ? leaderboard : null
}
