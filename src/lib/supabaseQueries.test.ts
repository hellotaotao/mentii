import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}))

vi.mock('./participantId', () => ({
  getParticipantId: () => 'participant-1',
}))

vi.mock('./supabase', () => ({
  getSupabaseClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
  }),
}))

import {
  reorderQuestions,
  resetQuestionResults,
  setQAndAEntryAnswered,
  submitOpenEndedVote,
  submitQAndAEntry,
  submitQuizVote,
  submitScalesVote,
  submitWordCloudVote,
  upvoteQAndAEntry,
  updateSession,
} from './supabaseQueries'

describe('supabaseQueries', () => {
  beforeEach(() => {
    mockFrom.mockReset()
    mockRpc.mockReset()
  })

  it('reorders slides through the secure rpc', async () => {
    mockRpc.mockResolvedValue({ error: null })
    await reorderQuestions('session-1', ['question-2', 'question-1'])

    expect(mockRpc).toHaveBeenCalledWith('reorder_questions', {
      ordered_question_ids: ['question-2', 'question-1'],
      target_session_id: 'session-1',
    })
  })

  it('updates session presentation fields', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'sessions') {
        throw new Error('Unexpected table: ' + table)
      }

      return { update: updateMock }
    })

    await updateSession('session-1', {
      current_question_id: 'question-2',
      question_cycle_started_at: '2026-04-09T00:00:30.000Z',
      state: 'live',
    })

    expect(updateMock).toHaveBeenCalledWith({
      current_question_id: 'question-2',
      question_cycle_started_at: '2026-04-09T00:00:30.000Z',
      state: 'live',
    })
    expect(eqMock).toHaveBeenCalledWith('id', 'session-1')
  })

  it('resets question results through the secure rpc', async () => {
    mockRpc.mockResolvedValue({ error: null })

    await resetQuestionResults('question-1')

    expect(mockRpc).toHaveBeenCalledWith('reset_question_results', {
      target_question_id: 'question-1',
    })
  })

  it('submits a trimmed word-cloud response', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'votes') {
        throw new Error('Unexpected table: ' + table)
      }

      return { insert: insertMock }
    })

    await submitWordCloudVote('question-3', '  productive  ')

    expect(insertMock).toHaveBeenCalledWith({
      participant_id: 'participant-1',
      question_id: 'question-3',
      value: {
        word: 'productive',
      },
    })
  })

  it('submits a trimmed open-ended response', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'votes') {
        throw new Error('Unexpected table: ' + table)
      }

      return { insert: insertMock }
    })

    await submitOpenEndedVote('question-4', '  We need clearer ownership.  ')

    expect(insertMock).toHaveBeenCalledWith({
      participant_id: 'participant-1',
      question_id: 'question-4',
      value: {
        text: 'We need clearer ownership.',
      },
    })
  })

  it('submits a scale rating vote', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'votes') {
        throw new Error('Unexpected table: ' + table)
      }

      return { insert: insertMock }
    })

    await submitScalesVote('question-5', 4)

    expect(insertMock).toHaveBeenCalledWith({
      participant_id: 'participant-1',
      question_id: 'question-5',
      value: {
        rating: 4,
      },
    })
  })

  it('rejects a scale rating outside the supported range', async () => {
    await expect(submitScalesVote('question-5', 6)).rejects.toThrow(/1 and 5/i)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('submits a q&a question through the secure rpc', async () => {
    mockRpc.mockResolvedValue({ data: 'entry-1', error: null })

    await submitQAndAEntry('question-6', '  What is the rollback plan?  ')

    expect(mockRpc).toHaveBeenCalledWith('submit_q_and_a_entry', {
      entry_text: 'What is the rollback plan?',
      target_question_id: 'question-6',
    })
  })

  it('upvotes a q&a entry through the secure rpc', async () => {
    mockRpc.mockResolvedValue({ error: null })

    await upvoteQAndAEntry('entry-1')

    expect(mockRpc).toHaveBeenCalledWith('upvote_q_and_a_entry', {
      target_entry_id: 'entry-1',
    })
  })

  it('marks a q&a entry as answered through the secure rpc', async () => {
    mockRpc.mockResolvedValue({ error: null })

    await setQAndAEntryAnswered('entry-1', true)

    expect(mockRpc).toHaveBeenCalledWith('set_q_and_a_entry_answered', {
      next_answered: true,
      target_entry_id: 'entry-1',
    })
  })

  it('submits a quiz answer vote', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'votes') {
        throw new Error('Unexpected table: ' + table)
      }

      return { insert: insertMock }
    })

    await submitQuizVote('question-7', 2)

    expect(insertMock).toHaveBeenCalledWith({
      participant_id: 'participant-1',
      question_id: 'question-7',
      value: {
        optionIdx: 2,
      },
    })
  })
})
