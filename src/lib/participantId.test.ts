import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getParticipantId } from './participantId'

describe('getParticipantId', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates and stores a participant id when one does not exist', () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('11111111-1111-4111-8111-111111111111')

    expect(getParticipantId()).toBe('11111111-1111-4111-8111-111111111111')
    expect(window.localStorage.getItem('mentii.participant-id')).toBe(
      '11111111-1111-4111-8111-111111111111',
    )
  })

  it('reuses an existing participant id from localStorage', () => {
    window.localStorage.setItem('mentii.participant-id', 'existing-participant')

    expect(getParticipantId()).toBe('existing-participant')
  })
})
