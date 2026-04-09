import { describe, expect, it } from 'vitest'
import { mapQuestionRow } from './questions'

describe('mapQuestionRow', () => {
  it('preserves an explicit false word-cloud submission setting', () => {
    const question = mapQuestionRow({
      config: {
        allowMultipleSubmissions: false,
      },
      created_at: '2026-04-09T00:00:00.000Z',
      id: 'question-1',
      order_index: 0,
      session_id: 'session-1',
      title: 'Share one word',
      type: 'word_cloud',
    })

    expect(question).toMatchObject({
      config: {
        allowMultipleSubmissions: false,
      },
      type: 'word_cloud',
    })
  })
})
