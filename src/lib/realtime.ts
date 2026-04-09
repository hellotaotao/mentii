import type { Tables } from '../types/database'
import { getSupabaseClient } from './supabase'

export function getSessionChannelTopic(sessionId: string) {
  return `session:${sessionId}`
}

export function createSessionChannel(sessionId: string) {
  return getSupabaseClient().channel(getSessionChannelTopic(sessionId))
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

export function subscribeToQuestionVotes(questionId: string, onVote: () => void) {
  const channel = getSupabaseClient()
    .channel(`question:${questionId}:votes`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        filter: `question_id=eq.${questionId}`,
        schema: 'public',
        table: 'votes',
      },
      () => {
        onVote()
      },
    )
    .subscribe()

  return () => {
    void getSupabaseClient().removeChannel(channel)
  }
}
