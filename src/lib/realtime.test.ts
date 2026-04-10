import { describe, expect, it } from 'vitest'
import { getQuestionResultsChannelTopic, getSessionChannelTopic, getSessionPresenceChannelTopic } from './realtime'

describe('getSessionChannelTopic', () => {
  it('creates a stable topic name for a session id', () => {
    expect(getSessionChannelTopic('session-42')).toBe('session:session-42')
  })
})

describe('getSessionPresenceChannelTopic', () => {
  it('creates a stable presence topic name for a session id', () => {
    expect(getSessionPresenceChannelTopic('session-42')).toBe('session:session-42:presence')
  })
})

describe('getQuestionResultsChannelTopic', () => {
  it('creates a stable results topic name for a question id', () => {
    expect(getQuestionResultsChannelTopic('question-7')).toBe('question:question-7:results')
  })
})
