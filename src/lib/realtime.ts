import { getSupabaseClient } from './supabase'

export function getSessionChannelTopic(sessionId: string) {
  return `session:${sessionId}`
}

export function createSessionChannel(sessionId: string) {
  return getSupabaseClient().channel(getSessionChannelTopic(sessionId))
}
