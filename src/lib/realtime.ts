import type { Tables } from '../types/database'
import { getSupabaseClient } from './supabase'

type SessionPresencePayload = {
  participantId: string
  role: 'audience'
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

export function subscribeToSessionPresenceCount(sessionId: string, onCountChange: (count: number) => void) {
  const channel = getSupabaseClient()
    .channel(getSessionPresenceChannelTopic(sessionId))
    .on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState<SessionPresencePayload>()
      const participantCount = Object.values(presenceState).reduce((count, presenceEntries) => {
        return count + (presenceEntries.some((entry) => entry.role === 'audience') ? 1 : 0)
      }, 0)

      onCountChange(participantCount)
    })
    .subscribe()

  return () => {
    void getSupabaseClient().removeChannel(channel)
  }
}

export function trackAudiencePresence(sessionId: string, participantId: string) {
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
      participantId,
      role: 'audience',
    })
  })

  return () => {
    void channel.untrack()
    void getSupabaseClient().removeChannel(channel)
  }
}
