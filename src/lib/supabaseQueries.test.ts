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

  it('upserts the reordered question rows in a single write', async () => {
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

    const orderMock = vi.fn().mockResolvedValue({
      data: questionRows,
      error: null,
    })
    const eqMock = vi.fn().mockReturnValue({
      order: orderMock,
    })
    const selectMock = vi.fn().mockReturnValue({
      eq: eqMock,
    })
    const upsertMock = vi.fn().mockResolvedValue({
      error: null,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'questions') {
        throw new Error(`Unexpected table: ${table}`)
      }

      return {
        select: selectMock,
        upsert: upsertMock,
      }
    })

    await reorderQuestions('session-1', ['question-2', 'question-1'])

    expect(upsertMock).toHaveBeenCalledTimes(1)
    expect(upsertMock).toHaveBeenCalledWith([
      {
        ...questionRows[1],
        order_index: 0,
      },
      {
        ...questionRows[0],
        order_index: 1,
      },
    ])
  })
})
