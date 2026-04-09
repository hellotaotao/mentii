import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { getBrowserEnv } from './env'
import { getParticipantId } from './participantId'

export function buildSupabaseClientOptions(participantId: string) {
  return {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'x-participant-id': participantId,
      },
    },
  }
}

let client: ReturnType<typeof createClient<Database>> | null = null

export function getSupabaseClient() {
  const env = getBrowserEnv()

  client ??= createClient<Database>(
    env.supabaseUrl,
    env.supabaseAnonKey,
    buildSupabaseClientOptions(getParticipantId()),
  )

  return client
}
