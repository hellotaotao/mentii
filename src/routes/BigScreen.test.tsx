import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import BigScreen from './BigScreen'

const {
  mockGetQuestionResults,
  mockGetSessionEditorData,
  mockSubscribeToQuestionVotes,
  mockSubscribeToSessionUpdates,
} = vi.hoisted(() => ({
  mockGetQuestionResults: vi.fn(),
  mockGetSessionEditorData: vi.fn(),
  mockSubscribeToQuestionVotes: vi.fn(),
  mockSubscribeToSessionUpdates: vi.fn(),
}))

vi.mock('../lib/supabaseQueries', () => ({
  getQuestionResults: mockGetQuestionResults,
  getSessionEditorData: mockGetSessionEditorData,
}))

vi.mock('../lib/realtime', () => ({
  subscribeToQuestionVotes: mockSubscribeToQuestionVotes,
  subscribeToSessionUpdates: mockSubscribeToSessionUpdates,
}))

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <div data-testid="session-qr-code">{value}</div>,
}))

const session = {
  code: '482176',
  created_at: '2026-04-09T00:00:00.000Z',
  current_question_id: 'question-1',
  host_id: 'host-1',
  id: 'session-1',
  results_hidden: false,
  state: 'live',
  voting_open: true,
}

const firstQuestion = {
  config: {
    chartType: 'bar' as const,
    options: ['Velocity', 'Reliability', 'AI features'],
  },
  id: 'question-1',
  orderIndex: 0,
  sessionId: 'session-1',
  title: 'Which roadmap theme matters most next quarter?',
  type: 'multiple_choice' as const,
}

const secondQuestion = {
  config: {
    chartType: 'donut' as const,
    options: ['Support', 'Self-serve'],
  },
  id: 'question-2',
  orderIndex: 1,
  sessionId: 'session-1',
  title: 'How should we handle onboarding help?',
  type: 'multiple_choice' as const,
}

const firstResults = {
  config: firstQuestion.config,
  questionId: firstQuestion.id,
  title: firstQuestion.title,
  totals: [
    { count: 3, label: 'Velocity', optionIdx: 0 },
    { count: 1, label: 'Reliability', optionIdx: 1 },
    { count: 0, label: 'AI features', optionIdx: 2 },
  ],
  type: 'multiple_choice' as const,
}

const secondResults = {
  config: secondQuestion.config,
  questionId: secondQuestion.id,
  title: secondQuestion.title,
  totals: [
    { count: 2, label: 'Support', optionIdx: 0 },
    { count: 1, label: 'Self-serve', optionIdx: 1 },
  ],
  type: 'multiple_choice' as const,
}

const updatedSecondResults = {
  ...secondResults,
  totals: [
    { count: 4, label: 'Support', optionIdx: 0 },
    { count: 1, label: 'Self-serve', optionIdx: 1 },
  ],
}

function renderBigScreen(path = '/present/session-1') {
  window.history.pushState({}, '', path)

  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/present/:sessionId" element={<BigScreen />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockGetSessionEditorData.mockReset()
  mockGetQuestionResults.mockReset()
  mockSubscribeToSessionUpdates.mockReset()
  mockSubscribeToQuestionVotes.mockReset()

  mockGetSessionEditorData.mockResolvedValue({
    questions: [firstQuestion, secondQuestion],
    session,
  })
  mockGetQuestionResults.mockResolvedValue(firstResults)
  mockSubscribeToSessionUpdates.mockReturnValue(vi.fn())
  mockSubscribeToQuestionVotes.mockReturnValue(vi.fn())
})

afterEach(() => {
  cleanup()
  window.history.pushState({}, '', '/')
})

describe('BigScreen', () => {
  it('renders the session code bar, current question title, and aggregated multiple-choice results', async () => {
    renderBigScreen()

    expect(await screen.findByText(/go to www\.menti\.com/i)).toBeInTheDocument()
    expect(screen.getByText('4821 76')).toBeInTheDocument()
    expect(screen.getByTestId('session-qr-code')).toHaveTextContent('/?code=482176')
    expect(
      screen.getByRole('heading', {
        name: /which roadmap theme matters most next quarter\?/i,
      }),
    ).toBeInTheDocument()
    expect(within(await screen.findByTestId('results-summary')).getByText('Velocity')).toBeInTheDocument()
    expect(within(screen.getByTestId('results-summary')).getByText('3 votes')).toBeInTheDocument()
  })

  it('refreshes when the current slide changes and when new votes arrive', async () => {
    let sessionListener: ((nextSession: typeof session) => void) | null = null
    let voteListener: (() => void) | null = null

    mockSubscribeToSessionUpdates.mockImplementation((_sessionId, callback) => {
      sessionListener = callback
      return vi.fn()
    })
    mockSubscribeToQuestionVotes.mockImplementation((_questionId, callback) => {
      voteListener = callback
      return vi.fn()
    })
    mockGetQuestionResults
      .mockResolvedValueOnce(firstResults)
      .mockResolvedValueOnce(secondResults)
      .mockResolvedValueOnce(updatedSecondResults)

    renderBigScreen()

    await screen.findByRole('heading', {
      name: /which roadmap theme matters most next quarter\?/i,
    })

    await act(async () => {
      sessionListener?.({
        ...session,
        current_question_id: secondQuestion.id,
      })
    })

    expect(
      await screen.findByRole('heading', {
        name: /how should we handle onboarding help\?/i,
      }),
    ).toBeInTheDocument()
    expect(mockSubscribeToQuestionVotes).toHaveBeenLastCalledWith('question-2', expect.any(Function))

    await act(async () => {
      voteListener?.()
    })

    await waitFor(() => expect(screen.getByText('4 votes')).toBeInTheDocument())
  })
})
