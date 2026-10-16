import type { Tables } from '../types/database'
import { getSupabaseClient } from './supabase'

type SessionPresencePayload = {
  emoji?: string
  nickname?: string
  participantId: string
  role: 'audience'
}

export type AudienceMember = {
  emoji: string | null
  nickname: string | null
  participantId: string
}

export type AudienceProfile = {
  emoji: string
  nickname: string
}

export const REACTION_EMOJIS = ['👏', '❤️', '😂', '🔥', '🎉'] as const

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number]

function isReactionEmoji(value: unknown): value is ReactionEmoji {
  return REACTION_EMOJIS.some((emoji) => emoji === value)
}

export function getSessionChannelTopic(sessionId: string) {
  return `session:${sessionId}`
}

export function createSessionChannel(sessionId: string) {
  return getSupabaseClient().channel(getSessionChannelTopic(sessionId))
}

export function getSessionPresenceChannelTopic(sessionId: string) {
  return `${getSessionChannelTopic(sessionId)}:presence`
}

export function getQuestionResultsChannelTopic(questionId: string) {
  return `question:${questionId}:results`
}

export function getSessionQuestionsChannelTopic(sessionId: string) {
  return `${getSessionChannelTopic(sessionId)}:questions`
}

export function subscribeToSessionUpdates(
  sessionId: string,
  onSessionUpdate: (session: Tables<'sessions'>) => void,
) {
  const channel = createSessionChannel(sessionId)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        filter: `id=eq.${sessionId}`,
        schema: 'public',
        table: 'sessions',
      },
      (payload) => {
        onSessionUpdate(payload.new as Tables<'sessions'>)
      },
    )
    .subscribe()

  return () => {
    void getSupabaseClient().removeChannel(channel)
  }
}

export function subscribeToSessionQuestionChanges(sessionId: string, onQuestionsChange: () => void) {
  const channel = getSupabaseClient()
    .channel(getSessionQuestionsChannelTopic(sessionId))
    .on(
      'postgres_changes',
      {
        event: '*',
        filter: `session_id=eq.${sessionId}`,
        schema: 'public',
        table: 'questions',
      },
      () => {
        onQuestionsChange()
      },
    )
    .subscribe()

  return () => {
    void getSupabaseClient().removeChannel(channel)
  }
}

export function subscribeToQuestionResultSignals(questionId: string, onChange: () => void) {
  const channel = getSupabaseClient()
    .channel(getQuestionResultsChannelTopic(questionId))
    .on(
      'postgres_changes',
      {
        event: '*',
        filter: `question_id=eq.${questionId}`,
        schema: 'public',
        table: 'question_result_signals',
      },
      () => {
        onChange()
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        onChange()
      }
    })

  return () => {
    void getSupabaseClient().removeChannel(channel)
  }
}

export function subscribeToSessionAudience(sessionId: string, onAudienceChange: (members: AudienceMember[]) => void) {
  const channel = getSupabaseClient()
    .channel(getSessionPresenceChannelTopic(sessionId))
    .on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState<SessionPresencePayload>()
      const members = Object.entries(presenceState).flatMap(([presenceKey, presenceEntries]) => {
        const audienceEntries = presenceEntries.filter((entry) => entry.role === 'audience')

        if (audienceEntries.length === 0) {
          return []
        }

        const namedEntry = audienceEntries.find((entry) => entry.nickname) ?? audienceEntries[0]

        return [
          {
            emoji: namedEntry.emoji ?? null,
            nickname: namedEntry.nickname ?? null,
            participantId: namedEntry.participantId ?? presenceKey,
          },
        ]
      })

      onAudienceChange(members)
    })
    .subscribe()

  return () => {
    void getSupabaseClient().removeChannel(channel)
  }
}

export function subscribeToSessionPresenceCount(sessionId: string, onCountChange: (count: number) => void) {
  return subscribeToSessionAudience(sessionId, (members) => onCountChange(members.length))
}

export function getSessionReactionsChannelTopic(sessionId: string) {
  return `${getSessionChannelTopic(sessionId)}:reactions`
}

export function subscribeToReactions(sessionId: string, onReaction: (emoji: ReactionEmoji) => void) {
  const channel = getSupabaseClient()
    .channel(getSessionReactionsChannelTopic(sessionId))
    .on('broadcast', { event: 'reaction' }, ({ payload }) => {
      const emoji = (payload as { emoji?: unknown } | null)?.emoji

      if (isReactionEmoji(emoji)) {
        onReaction(emoji)
      }
    })
    .subscribe()

  return () => {
    void getSupabaseClient().removeChannel(channel)
  }
}

// Phones send reactions over HTTP without joining the channel, so a full room
// does not fan every reaction out to every other phone.
export function createReactionSender(sessionId: string) {
  const channel = getSupabaseClient().channel(getSessionReactionsChannelTopic(sessionId))

  return {
    close() {
      void getSupabaseClient().removeChannel(channel)
    },
    send(emoji: ReactionEmoji) {
      void channel.httpSend('reaction', { emoji }).catch(() => {
        // Reactions are fire-and-forget.
      })
    },
  }
}

export function trackAudiencePresence(sessionId: string, participantId: string, profile: AudienceProfile | null = null) {
  const channel = getSupabaseClient().channel(getSessionPresenceChannelTopic(sessionId), {
    config: {
      presence: {
        key: participantId,
      },
    },
  })

  channel.subscribe(async (status) => {
    if (status !== 'SUBSCRIBED') {
      return
    }

    await channel.track({
      ...(profile ? { emoji: profile.emoji, nickname: profile.nickname } : {}),
      participantId,
      role: 'audience',
    } satisfies SessionPresencePayload)
  })

  return () => {
    void channel.untrack()
    void getSupabaseClient().removeChannel(channel)
  }
}
