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

  it('maps legacy single-submit word-cloud configs to the current boolean flag', () => {
    const question = mapQuestionRow({
      config: {
        submissionMode: 'single',
      },
      created_at: '2026-04-09T00:00:00.000Z',
      id: 'question-legacy-word-cloud',
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

  it('parses open-ended responses into a presenter-friendly stream', () => {
    const question = mapQuestionRow({
      config: {
        maxLength: 280,
      },
      created_at: '2026-04-09T00:00:00.000Z',
      id: 'question-3',
      order_index: 0,
      session_id: 'session-1',
      title: 'What should we improve next sprint?',
      type: 'open_ended',
    })

    const results = parseQuestionResults(question, {
      responses: [
        {
          createdAt: '2026-04-09T00:00:00.000Z',
          id: 'response-1',
          text: 'Tighter release notes',
        },
      ],
    })

    expect(results).toMatchObject({
      config: {
        maxLength: 280,
      },
      responses: [
        {
          id: 'response-1',
          text: 'Tighter release notes',
        },
      ],
      type: 'open_ended',
    })
  })

  it('parses scales results into a fixed five-point distribution', () => {
    const question = mapQuestionRow({
      config: {
        leftLabel: 'Strongly disagree',
        rightLabel: 'Strongly agree',
      },
      created_at: '2026-04-09T00:00:00.000Z',
      id: 'question-4',
      order_index: 0,
      session_id: 'session-1',
      title: 'How clear was the strategy update?',
      type: 'scales',
    })

    const results = parseQuestionResults(question, {
      average: 3.67,
      distribution: [
        { count: 1, rating: 1 },
        { count: 2, rating: 3 },
        { count: 3, rating: 5 },
      ],
    })

    expect(results).toMatchObject({
      average: 3.67,
      config: {
        leftLabel: 'Strongly disagree',
        rightLabel: 'Strongly agree',
      },
      distribution: [
        { count: 1, rating: 1 },
        { count: 0, rating: 2 },
        { count: 2, rating: 3 },
        { count: 0, rating: 4 },
        { count: 3, rating: 5 },
      ],
      type: 'scales',
    })
  })

  it('parses q-and-a entries with upvote and answered state for the presenter feed', () => {
    const question = mapQuestionRow({
      config: {},
      created_at: '2026-04-09T00:00:00.000Z',
      id: 'question-5',
      order_index: 0,
      session_id: 'session-1',
      title: 'What should we clarify before launch?',
      type: 'q_and_a',
    })

    const results = parseQuestionResults(question, {
      entries: [
        {
          answered: false,
          createdAt: '2026-04-09T00:00:00.000Z',
          hasUpvoted: true,
          id: 'entry-1',
          isOwnEntry: false,
          text: 'How will support handle rollout issues?',
          upvoteCount: 4,
        },
      ],
    })

    expect(results).toMatchObject({
      entries: [
        {
          answered: false,
          hasUpvoted: true,
          id: 'entry-1',
          isOwnEntry: false,
          text: 'How will support handle rollout issues?',
          upvoteCount: 4,
        },
      ],
      type: 'q_and_a',
    })
  })

  it('parses quiz totals and leaderboard entries for the presenter screen', () => {
    const question = mapQuestionRow({
      config: {
        correctOptionIdx: 1,
        durationSeconds: 30,
        options: ['Discovery', 'Reliability', 'Adoption'],
      },
      created_at: '2026-04-09T00:00:00.000Z',
      id: 'question-6',
      order_index: 0,
      session_id: 'session-1',
      title: 'Which outcome matters most for launch readiness?',
      type: 'quiz',
    })

    const results = parseQuestionResults(question, {
      leaderboard: [
        {
          answeredAt: '2026-04-09T00:00:00.000Z',
          label: 'Player 1',
          participantId: 'participant-1',
        },
      ],
      totals: [
        { count: 1, optionIdx: 0 },
        { count: 2, optionIdx: 1 },
      ],
    })

    expect(results).toMatchObject({
      config: {
        correctOptionIdx: 1,
        durationSeconds: 30,
        options: ['Discovery', 'Reliability', 'Adoption'],
      },
      leaderboard: [
        {
          label: 'Player 1',
          participantId: 'participant-1',
        },
      ],
      totals: [
        { count: 1, label: 'Discovery', optionIdx: 0 },
        { count: 2, label: 'Reliability', optionIdx: 1 },
        { count: 0, label: 'Adoption', optionIdx: 2 },
      ],
      type: 'quiz',
    })
  })
})
