import { describe, expect, it } from 'vitest'
import { getSessionChannelTopic } from './realtime'

describe('getSessionChannelTopic', () => {
  it('creates a stable topic name for a session id', () => {
    expect(getSessionChannelTopic('session-42')).toBe('session:session-42')
  })
})
