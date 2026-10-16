import { useEffect, useRef, useState } from 'react'
import { subscribeToReactions, type ReactionEmoji } from '../lib/realtime'

const MAX_VISIBLE_REACTIONS = 40
const REACTION_LIFETIME_MS = 3200

type FloatingReaction = {
  driftPx: number
  emoji: ReactionEmoji
  id: number
  leftPercent: number
}

export default function ReactionLayer({ sessionId }: { sessionId: string }) {
  const [reactions, setReactions] = useState<FloatingReaction[]>([])
  const nextIdRef = useRef(0)

  useEffect(() => {
    if (!sessionId) {
      return
    }

    const timers = new Set<ReturnType<typeof setTimeout>>()
    const unsubscribe = subscribeToReactions(sessionId, (emoji) => {
      nextIdRef.current += 1
      const reaction: FloatingReaction = {
        driftPx: Math.round((Math.random() - 0.5) * 160),
        emoji,
        id: nextIdRef.current,
        leftPercent: 6 + Math.random() * 22,
      }

      setReactions((current) => [...current, reaction].slice(-MAX_VISIBLE_REACTIONS))

      const timer = setTimeout(() => {
        timers.delete(timer)
        setReactions((current) => current.filter((candidate) => candidate.id !== reaction.id))
      }, REACTION_LIFETIME_MS)
      timers.add(timer)
    })

    return () => {
      unsubscribe()
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [sessionId])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
      {reactions.map((reaction) => (
        <span
          className="mentii-reaction absolute bottom-6 text-5xl"
          key={reaction.id}
          style={
            {
              '--mentii-drift': `${reaction.driftPx}px`,
              left: `${reaction.leftPercent}%`,
            } as React.CSSProperties
          }
        >
          {reaction.emoji}
        </span>
      ))}
    </div>
  )
}
