import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import BigScreen from './BigScreen'

const {
  mockGetQuestionResults,
  mockGetSessionEditorData,
  mockResetQuestionResults,
  mockSetQAndAEntryAnswered,
  mockSubscribeToQuestionResultSignals,
  mockSubscribeToSessionQuestionChanges,
  mockSubscribeToSessionPresenceCount,
  mockSubscribeToSessionUpdates,
  mockUpdateSession,
} = vi.hoisted(() => ({
  mockGetQuestionResults: vi.fn(),
  mockGetSessionEditorData: vi.fn(),
  mockResetQuestionResults: vi.fn(),
  mockSetQAndAEntryAnswered: vi.fn(),
  mockSubscribeToQuestionResultSignals: vi.fn(),
  mockSubscribeToSessionQuestionChanges: vi.fn(),
  mockSubscribeToSessionPresenceCount: vi.fn(),
  mockSubscribeToSessionUpdates: vi.fn(),
  mockUpdateSession: vi.fn(),
}))

vi.mock('../lib/supabaseQueries', () => ({
  getQuestionResults: mockGetQuestionResults,
  getSessionEditorData: mockGetSessionEditorData,
  resetQuestionResults: mockResetQuestionResults,
  setQAndAEntryAnswered: mockSetQAndAEntryAnswered,
  updateSession: mockUpdateSession,
}))

vi.mock('../lib/realtime', () => ({
  subscribeToQuestionResultSignals: mockSubscribeToQuestionResultSignals,
  subscribeToSessionQuestionChanges: mockSubscribeToSessionQuestionChanges,
  subscribeToSessionPresenceCount: mockSubscribeToSessionPresenceCount,
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
  question_cycle_started_at: '2026-04-09T00:00:00.000Z',
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

const wordCloudQuestion = {
  config: {
    allowMultipleSubmissions: true,
  },
  id: 'question-3',
  orderIndex: 2,
  sessionId: 'session-1',
  title: 'Share one word for this sprint',
  type: 'word_cloud' as const,
}

const openEndedQuestion = {
  config: {
    maxLength: 280,
  },
  id: 'question-4',
  orderIndex: 3,
  sessionId: 'session-1',
  title: 'What should we improve next sprint?',
  type: 'open_ended' as const,
}

const scalesQuestion = {
  config: {
    leftLabel: 'Strongly disagree',
    rightLabel: 'Strongly agree',
  },
  id: 'question-5',
  orderIndex: 4,
  sessionId: 'session-1',
  title: 'How confident are you in the plan?',
  type: 'scales' as const,
}

const qAndAQuestion = {
  config: {},
  id: 'question-6',
  orderIndex: 5,
  sessionId: 'session-1',
  title: 'What should we clarify before launch?',
  type: 'q_and_a' as const,
}

const quizQuestion = {
  config: {
    correctOptionIdx: 1,
    durationSeconds: 30,
    options: ['Discovery', 'Reliability', 'Adoption'],
  },
  id: 'question-7',
  orderIndex: 6,
  sessionId: 'session-1',
  title: 'Which outcome matters most for launch readiness?',
  type: 'quiz' as const,
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

const updatedFirstResults = {
  ...firstResults,
  totals: [
    { count: 4, label: 'Velocity', optionIdx: 0 },
    { count: 1, label: 'Reliability', optionIdx: 1 },
    { count: 0, label: 'AI features', optionIdx: 2 },
  ],
}

const wordCloudResults = {
  config: wordCloudQuestion.config,
  questionId: wordCloudQuestion.id,
  title: wordCloudQuestion.title,
  type: 'word_cloud' as const,
  words: [
    { count: 4, word: 'productive' },
    { count: 2, word: 'focused' },
    { count: 1, word: 'calm' },
  ],
}

const openEndedResults = {
  config: openEndedQuestion.config,
  questionId: openEndedQuestion.id,
  responses: [
    {
      createdAt: '2026-04-09T00:00:00.000Z',
      id: 'response-1',
      text: 'Clearer sprint goals',
    },
    {
      createdAt: '2026-04-09T00:01:00.000Z',
      id: 'response-2',
      text: 'Shorter standups',
    },
  ],
  title: openEndedQuestion.title,
  type: 'open_ended' as const,
}

const scalesResults = {
  average: 3.6,
  config: scalesQuestion.config,
  distribution: [
    { count: 1, rating: 1 },
    { count: 0, rating: 2 },
    { count: 2, rating: 3 },
    { count: 1, rating: 4 },
    { count: 1, rating: 5 },
  ],
  questionId: scalesQuestion.id,
  title: scalesQuestion.title,
  type: 'scales' as const,
}

const qAndAResults = {
  config: qAndAQuestion.config,
  entries: [
    {
      answered: false,
      createdAt: '2026-04-09T00:00:00.000Z',
      hasUpvoted: false,
      id: 'entry-1',
      isOwnEntry: false,
      text: 'How will support handle launch issues?',
      upvoteCount: 3,
    },
    {
      answered: true,
      createdAt: '2026-04-09T00:01:00.000Z',
      hasUpvoted: false,
      id: 'entry-2',
      isOwnEntry: false,
      text: 'Can we publish a rollback checklist?',
      upvoteCount: 1,
    },
  ],
  questionId: qAndAQuestion.id,
  title: qAndAQuestion.title,
  type: 'q_and_a' as const,
}

const answeredQAndAResults = {
  ...qAndAResults,
  entries: qAndAResults.entries.map((entry) =>
    entry.id === 'entry-1'
      ? {
          ...entry,
          answered: true,
        }
      : entry,
  ),
}

const quizResults = {
  config: quizQuestion.config,
  leaderboard: [
    {
      answeredAt: '2026-04-09T00:00:10.000Z',
      label: 'Player 1',
      participantId: 'participant-1',
    },
    {
      answeredAt: '2026-04-09T00:00:12.000Z',
      label: 'Player 2',
      participantId: 'participant-2',
    },
  ],
  questionId: quizQuestion.id,
  title: quizQuestion.title,
  totals: [
    { count: 1, label: 'Discovery', optionIdx: 0 },
    { count: 2, label: 'Reliability', optionIdx: 1 },
    { count: 0, label: 'Adoption', optionIdx: 2 },
  ],
  type: 'quiz' as const,
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

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })

  return {
    promise,
    reject,
    resolve,
  }
}

beforeEach(() => {
  mockGetSessionEditorData.mockReset()
  mockGetQuestionResults.mockReset()
  mockResetQuestionResults.mockReset()
  mockSetQAndAEntryAnswered.mockReset()
  mockSubscribeToQuestionResultSignals.mockReset()
  mockSubscribeToSessionQuestionChanges.mockReset()
  mockSubscribeToSessionPresenceCount.mockReset()
  mockSubscribeToSessionUpdates.mockReset()
  mockUpdateSession.mockReset()

  mockGetSessionEditorData.mockResolvedValue({
    questions: [firstQuestion, secondQuestion],
    session,
  })
  mockGetQuestionResults.mockResolvedValue(firstResults)
  mockResetQuestionResults.mockResolvedValue(undefined)
  mockSetQAndAEntryAnswered.mockResolvedValue(undefined)
  mockSubscribeToQuestionResultSignals.mockImplementation((_questionId, callback) => {
    callback()
    return vi.fn()
  })
  mockSubscribeToSessionQuestionChanges.mockReturnValue(vi.fn())
  mockSubscribeToSessionPresenceCount.mockReturnValue(vi.fn())
  mockSubscribeToSessionUpdates.mockReturnValue(vi.fn())
  mockUpdateSession.mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  window.history.pushState({}, '', '/')
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('BigScreen', () => {
  it('renders the session code bar, current question title, and aggregated multiple-choice results', async () => {
    renderBigScreen()

    expect(await screen.findByText(/go to localhost/i)).toBeInTheDocument()
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
    let resultsSignalListener: (() => void) | null = null

    mockSubscribeToSessionUpdates.mockImplementation((_sessionId, callback) => {
      sessionListener = callback
      return vi.fn()
    })
    mockSubscribeToQuestionResultSignals.mockImplementation((_questionId, callback) => {
      resultsSignalListener = callback
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
    expect(mockSubscribeToQuestionResultSignals).toHaveBeenLastCalledWith('question-2', expect.any(Function))

    await act(async () => {
      resultsSignalListener?.()
    })

    await waitFor(() => expect(screen.getByText('4 votes')).toBeInTheDocument())
  })

  it('keeps the freshest results when an older request resolves late', async () => {
    let resultsSignalListener: (() => void) | null = null

    const initialRequest = createDeferred<typeof firstResults>()
    const refreshRequest = createDeferred<typeof updatedFirstResults>()

    mockSubscribeToQuestionResultSignals.mockImplementation((_questionId, callback) => {
      resultsSignalListener = callback
      return vi.fn()
    })
    mockGetQuestionResults
      .mockImplementationOnce(() => initialRequest.promise)
      .mockImplementationOnce(() => refreshRequest.promise)

    renderBigScreen()

    await waitFor(() => expect(resultsSignalListener).not.toBeNull())

    await act(async () => {
      resultsSignalListener?.()
    })

    await act(async () => {
      refreshRequest.resolve(updatedFirstResults)
    })

    await screen.findByText('5 total responses')

    await act(async () => {
      initialRequest.resolve(firstResults)
    })

    await waitFor(() => expect(screen.getByText('5 total responses')).toBeInTheDocument())
  })

  it('waits for the post-subscribe sync before showing the first result snapshot', async () => {
    let resultsSignalListener: (() => void) | null = null

    const initialRequest = createDeferred<typeof firstResults>()
    const syncedRequest = createDeferred<typeof updatedFirstResults>()

    mockSubscribeToQuestionResultSignals.mockImplementation((_questionId, callback) => {
      resultsSignalListener = callback
      return vi.fn()
    })
    mockGetQuestionResults
      .mockImplementationOnce(() => initialRequest.promise)
      .mockImplementationOnce(() => syncedRequest.promise)

    renderBigScreen()

    await waitFor(() => expect(resultsSignalListener).not.toBeNull())

    await act(async () => {
      initialRequest.resolve(firstResults)
    })

    expect(await screen.findByText('Loading the latest audience responses…')).toBeInTheDocument()
    expect(screen.queryByText('4 total responses')).not.toBeInTheDocument()

    await act(async () => {
      resultsSignalListener?.()
    })

    await act(async () => {
      syncedRequest.resolve(updatedFirstResults)
    })

    await screen.findByText('5 total responses')
  })

  it('reveals presenter controls on mouse movement and supports keyboard shortcuts', async () => {
    mockGetSessionEditorData.mockResolvedValueOnce({
      questions: [firstQuestion, secondQuestion],
      session: {
        ...session,
        question_cycle_started_at: '2026-04-09T00:00:00.000Z',
        results_hidden: true,
        voting_open: false,
      },
    })
    const requestFullscreenMock = vi.fn().mockResolvedValue(undefined)

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    })
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreenMock,
    })

    mockGetQuestionResults.mockResolvedValue(firstResults)

    renderBigScreen()

    await screen.findByRole('heading', {
      name: /which roadmap theme matters most next quarter\?/i,
    })

    expect(screen.queryByRole('button', { name: /next slide/i })).not.toBeInTheDocument()

    fireEvent.mouseMove(screen.getByTestId('big-screen-shell'), { clientY: 120 })

    expect(await screen.findByRole('button', { name: /next slide/i })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'ArrowRight' })

    await waitFor(() =>
      expect(mockUpdateSession).toHaveBeenCalledWith('session-1', {
        current_question_id: 'question-2',
        question_cycle_started_at: expect.any(String),
        results_hidden: false,
        voting_open: true,
      }),
    )
    expect(
      await screen.findByRole('heading', {
        name: /how should we handle onboarding help\?/i,
      }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /close voting/i }))

    await waitFor(() =>
      expect(mockUpdateSession).toHaveBeenCalledWith('session-1', {
        voting_open: false,
      }),
    )

    fireEvent.keyDown(window, { key: 'h' })

    await waitFor(() =>
      expect(mockUpdateSession).toHaveBeenCalledWith('session-1', {
        results_hidden: true,
      }),
    )
    expect(screen.getByText(/results are hidden/i)).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'r' })

    await waitFor(() => expect(mockResetQuestionResults).toHaveBeenCalledWith('question-2'))

    fireEvent.keyDown(window, { key: 'f' })

    expect(requestFullscreenMock).toHaveBeenCalled()
  })

  it('derives the quiz countdown from the persisted question cycle start time', async () => {
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-09T00:00:10.000Z').getTime())

    mockGetSessionEditorData.mockResolvedValueOnce({
      questions: [quizQuestion],
      session: {
        ...session,
        current_question_id: quizQuestion.id,
        question_cycle_started_at: '2026-04-09T00:00:05.000Z',
      },
    })
    mockGetQuestionResults.mockResolvedValue(quizResults)

    renderBigScreen()

    expect(await screen.findByText('25s remaining')).toBeInTheDocument()
    dateNowSpy.mockRestore()
  })

  it('renders live word-cloud responses', async () => {
    mockGetSessionEditorData.mockResolvedValueOnce({
      questions: [firstQuestion, wordCloudQuestion],
      session: {
        ...session,
        current_question_id: 'question-3',
      },
    })
    mockGetQuestionResults.mockResolvedValue(wordCloudResults)

    renderBigScreen()

    expect(await screen.findByText('productive')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: /share one word for this sprint/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('focused')).toBeInTheDocument()
    expect(screen.getByText('calm')).toBeInTheDocument()
  })

  it('renders open-ended responses as a live card stream', async () => {
    mockGetSessionEditorData.mockResolvedValueOnce({
      questions: [firstQuestion, openEndedQuestion],
      session: {
        ...session,
        current_question_id: 'question-4',
      },
    })
    mockGetQuestionResults.mockResolvedValue(openEndedResults)

    renderBigScreen()

    expect(await screen.findByText('Clearer sprint goals')).toBeInTheDocument()
    expect(screen.getByText('Shorter standups')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: /what should we improve next sprint\?/i,
      }),
    ).toBeInTheDocument()
  })

  it('renders scale averages and the five-point distribution', async () => {
    mockGetSessionEditorData.mockResolvedValueOnce({
      questions: [firstQuestion, scalesQuestion],
      session: {
        ...session,
        current_question_id: 'question-5',
      },
    })
    mockGetQuestionResults.mockResolvedValue(scalesResults)

    renderBigScreen()

    expect(await screen.findByText('3.6 / 5')).toBeInTheDocument()
    expect(screen.getByText(/average score/i)).toBeInTheDocument()
    expect(screen.getByText('Strongly disagree')).toBeInTheDocument()
    expect(screen.getByText('Strongly agree')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: /how confident are you in the plan\?/i,
      }),
    ).toBeInTheDocument()
  })

  it('renders q&a entries and lets the presenter mark one as answered', async () => {
    mockGetSessionEditorData.mockResolvedValueOnce({
      questions: [firstQuestion, qAndAQuestion],
      session: {
        ...session,
        current_question_id: 'question-6',
      },
    })
    mockGetQuestionResults
      .mockResolvedValueOnce(qAndAResults)
      .mockResolvedValueOnce(qAndAResults)
      .mockResolvedValueOnce(answeredQAndAResults)
      .mockResolvedValueOnce(answeredQAndAResults)

    renderBigScreen()

    expect(await screen.findByText('How will support handle launch issues?')).toBeInTheDocument()
    expect(screen.getByText('Can we publish a rollback checklist?')).toBeInTheDocument()
    expect(screen.getByText(/3 upvotes/i)).toBeInTheDocument()
    expect(screen.getByText('Answered')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /mark answered/i }))

    await waitFor(() => expect(mockSetQAndAEntryAnswered).toHaveBeenCalledWith('entry-1', true))
    await waitFor(() => expect(screen.getAllByText('Answered')).toHaveLength(2))
  })

  it('renders quiz countdown and leaderboard details', async () => {
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-09T00:00:00.000Z').getTime())

    mockGetSessionEditorData.mockResolvedValueOnce({
      questions: [firstQuestion, quizQuestion],
      session: {
        ...session,
        current_question_id: 'question-7',
        question_cycle_started_at: '2026-04-09T00:00:00.000Z',
      },
    })
    mockGetQuestionResults.mockResolvedValue(quizResults)

    renderBigScreen()

    expect(await screen.findByText(/30s remaining/i)).toBeInTheDocument()
    expect(screen.getByText('Player 1')).toBeInTheDocument()
    expect(screen.getByText('Player 2')).toBeInTheDocument()
    expect(screen.getByText(/correct answer/i)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: /which outcome matters most for launch readiness\?/i,
      }),
    ).toBeInTheDocument()
    dateNowSpy.mockRestore()
  })

  it('shows the live participant count from presence updates', async () => {
    let presenceListener: ((count: number) => void) | null = null

    mockSubscribeToSessionPresenceCount.mockImplementation((_sessionId, callback) => {
      presenceListener = callback
      return vi.fn()
    })

    renderBigScreen()

    await screen.findByRole('heading', {
      name: /which roadmap theme matters most next quarter\?/i,
    })

    await act(async () => {
      presenceListener?.(2)
    })

    expect(screen.getByText(/2 participants/i)).toBeInTheDocument()
  })
})
