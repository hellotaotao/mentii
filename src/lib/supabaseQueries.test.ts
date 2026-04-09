import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}))

vi.mock('./supabase', () => ({
  getSupabaseClient: () => ({
    from: mockFrom,
  }),
}))

import { reorderQuestions } from './supabaseQueries'

describe('reorderQuestions', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('uses a two-phase reindex to avoid unique (session_id, order_index) collisions', async () => {
    const questionRows = [
      {
        config: { chartType: 'bar', options: ['A', 'B'] },
        created_at: '2026-04-09T00:00:00.000Z',
        id: 'question-1',
        order_index: 0,
        session_id: 'session-1',
        title: 'Question one',
        type: 'multiple_choice',
      },
      {
        config: { chartType: 'bar', options: ['C', 'D'] },
        created_at: '2026-04-09T00:00:00.000Z',
        id: 'question-2',
        order_index: 1,
        session_id: 'session-1',
        title: 'Question two',
        type: 'multiple_choice',
      },
    ]

    const eqAfterUpdateMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: eqAfterUpdateMock })

    const orderMock = vi.fn().mockResolvedValue({ data: questionRows, error: null })
    const eqAfterSelectMock = vi.fn().mockReturnValue({ order: orderMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqAfterSelectMock })

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'questions') {
        throw new Error('Unexpected table: ' + table)
      }
      return { select: selectMock, update: updateMock }
    })

    await reorderQuestions('session-1', ['question-2', 'question-1'])

    // Phase 1: temporary high indexes to clear the unique constraint
    expect(updateMock).toHaveBeenCalledWith({ order_index: 10000 })
    expect(updateMock).toHaveBeenCalledWith({ order_index: 10001 })

    // Phase 2: final indexes
    expect(updateMock).toHaveBeenCalledWith({ order_index: 0 })
    expect(updateMock).toHaveBeenCalledWith({ order_index: 1 })

    // Two rows x two phases = four update calls
    expect(updateMock).toHaveBeenCalledTimes(4)

    // .eq() filters target the correct row ids
    expect(eqAfterUpdateMock).toHaveBeenCalledWith('id', 'question-2')
    expect(eqAfterUpdateMock).toHaveBeenCalledWith('id', 'question-1')
  })
})
