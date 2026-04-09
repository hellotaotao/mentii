import { describe, expect, it } from 'vitest'
import { buildSupabaseClientOptions } from './supabase'

describe('buildSupabaseClientOptions', () => {
  it('adds the participant header and browser auth flags', () => {
    expect(buildSupabaseClientOptions('participant-123')).toMatchObject({
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          'x-participant-id': 'participant-123',
        },
      },
    })
  })
})
