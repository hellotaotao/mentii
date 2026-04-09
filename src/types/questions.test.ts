import { describe, expect, it } from 'vitest'
import { mapQuestionRow, parseQuestionResults } from './questions'

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

  it('uses the question config labels for multiple-choice result labels', () => {
    const question = mapQuestionRow({
      config: {
        chartType: 'bar',
        options: ['Velocity', 'Reliability'],
      },
      created_at: '2026-04-09T00:00:00.000Z',
      id: 'question-2',
      order_index: 0,
      session_id: 'session-1',
      title: 'Which roadmap theme matters most?',
      type: 'multiple_choice',
    })

    const results = parseQuestionResults(question, {
      totals: [
        { count: 3, label: 'Option 1', optionIdx: 0 },
        { count: 1, label: 'Option 2', optionIdx: 1 },
      ],
    })

    expect(results).toMatchObject({
      totals: [
        { count: 3, label: 'Velocity' },
        { count: 1, label: 'Reliability' },
      ],
      type: 'multiple_choice',
    })
  })
})
