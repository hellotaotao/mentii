import { describe, expect, it } from 'vitest'
import { getRequiredEnv } from './env'

describe('getRequiredEnv', () => {
  it('returns the requested env value when present', () => {
    expect(
      getRequiredEnv(
        {
          VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
        },
        'VITE_SUPABASE_URL',
      ),
    ).toBe('http://127.0.0.1:54321')
  })

  it('throws when the required env value is missing', () => {
    expect(() => getRequiredEnv({}, 'VITE_SUPABASE_URL')).toThrowError(
      'VITE_SUPABASE_URL is required',
    )
  })
})
