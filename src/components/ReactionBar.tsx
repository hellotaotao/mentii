import { useEffect, useRef, useState } from 'react'
import { createReactionSender, REACTION_EMOJIS, type ReactionEmoji } from '../lib/realtime'

// Light client-side throttle so one excited phone cannot flood the big screen.
const MIN_REACTION_INTERVAL_MS = 700

export default function ReactionBar({ sessionId }: { sessionId: string }) {
  const senderRef = useRef<ReturnType<typeof createReactionSender> | null>(null)
  const lastSentAtRef = useRef(0)
  const [lastEmoji, setLastEmoji] = useState<{ emoji: ReactionEmoji; key: number } | null>(null)

  useEffect(() => {
    const sender = createReactionSender(sessionId)
    senderRef.current = sender

    return () => {
      sender.close()
      senderRef.current = null
    }
  }, [sessionId])

  function handleReaction(emoji: ReactionEmoji, now: number) {
    if (now - lastSentAtRef.current < MIN_REACTION_INTERVAL_MS) {
      return
    }

    lastSentAtRef.current = now
    senderRef.current?.send(emoji)
    setLastEmoji({ emoji, key: now })
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-slate-900/90 px-2 py-1.5 shadow-2xl backdrop-blur">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            aria-label={`Send ${emoji} reaction`}
            className={`rounded-full px-2.5 py-1.5 text-2xl transition active:scale-125 ${
              lastEmoji?.emoji === emoji ? 'bg-white/10' : 'hover:bg-white/10'
            }`}
            key={emoji}
            onClick={(event) => handleReaction(emoji, event.timeStamp)}
            type="button"
          >
            <span className="inline-block" key={lastEmoji?.emoji === emoji ? lastEmoji.key : emoji}>
              {emoji}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
