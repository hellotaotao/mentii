import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import VotePage from './VotePage'

const {
  mockGetQuestionResults,
  mockGetSessionByCode,
  mockSubmitMultipleChoiceVote,
  mockSubmitOpenEndedVote,
  mockSubmitQAndAEntry,
  mockSubmitQuizVote,
  mockSubmitScalesVote,
  mockSubmitWordCloudVote,
  mockSubscribeToQuestionResultSignals,
  mockSubscribeToSessionQuestionChanges,
  mockSubscribeToSessionUpdates,
  mockTrackAudiencePresence,
  mockUpvoteQAndAEntry,
} = vi.hoisted(() => ({
  mockGetQuestionResults: vi.fn(),
  mockGetSessionByCode: vi.fn(),
  mockSubmitMultipleChoiceVote: vi.fn(),
  mockSubmitOpenEndedVote: vi.fn(),
  mockSubmitQAndAEntry: vi.fn(),
  mockSubmitQuizVote: vi.fn(),
  mockSubmitScalesVote: vi.fn(),
  mockSubmitWordCloudVote: vi.fn(),
  mockSubscribeToQuestionResultSignals: vi.fn(),
  mockSubscribeToSessionQuestionChanges: vi.fn(),
  mockSubscribeToSessionUpdates: vi.fn(),
  mockTrackAudiencePresence: vi.fn(),
  mockUpvoteQAndAEntry: vi.fn(),
}))

vi.mock('../lib/supabaseQueries', () => ({
  getQuestionResults: mockGetQuestionResults,
  getSessionByCode: mockGetSessionByCode,
  submitMultipleChoiceVote: mockSubmitMultipleChoiceVote,
  submitOpenEndedVote: mockSubmitOpenEndedVote,
  submitQAndAEntry: mockSubmitQAndAEntry,
  submitQuizVote: mockSubmitQuizVote,
  submitScalesVote: mockSubmitScalesVote,
  submitWordCloudVote: mockSubmitWordCloudVote,
  upvoteQAndAEntry: mockUpvoteQAndAEntry,
}))

vi.mock('../lib/realtime', () => ({
  subscribeToQuestionResultSignals: mockSubscribeToQuestionResultSignals,
  subscribeToSessionQuestionChanges: mockSubscribeToSessionQuestionChanges,
  subscribeToSessionUpdates: mockSubscribeToSessionUpdates,
  trackAudiencePresence: mockTrackAudiencePresence,
}))

const liveSession = {
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

const draftSession = {
  ...liveSession,
  state: 'draft',
}

const question = {
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

const singleSubmitWordCloudQuestion = {
  ...wordCloudQuestion,
  config: {
    allowMultipleSubmissions: false,
  },
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
    leftLabel: 'Not at all',
    rightLabel: 'Absolutely',
  },
  id: 'question-5',
  orderIndex: 4,
  sessionId: 'session-1',
  title: 'How confident are you in the rollout plan?',
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

const qAndAResults = {
  config: qAndAQuestion.config,
  entries: [
    {
      answered: false,
      createdAt: '2026-04-09T00:00:00.000Z',
      hasUpvoted: false,
      id: 'entry-1',
      isOwnEntry: false,
      text: 'How do we measure launch success?',
      upvoteCount: 3,
    },
    {
      answered: false,
      createdAt: '2026-04-09T00:01:00.000Z',
      hasUpvoted: true,
      id: 'entry-2',
      isOwnEntry: true,
      text: 'Can we share a rollback checklist?',
      upvoteCount: 1,
    },
  ],
  questionId: qAndAQuestion.id,
  title: qAndAQuestion.title,
  type: 'q_and_a' as const,
}

const updatedQAndAResults = {
  ...qAndAResults,
  entries: qAndAResults.entries.map((entry) =>
    entry.id === 'entry-1'
      ? {
          ...entry,
          upvoteCount: 4,
        }
      : entry,
  ),
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

function renderVotePage(path = '/vote/482176') {
  window.history.pushState({}, '', path)

  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/vote/:sessionCode" element={<VotePage />} />
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
  mockGetQuestionResults.mockReset()
  mockGetSessionByCode.mockReset()
  mockSubmitMultipleChoiceVote.mockReset()
  mockSubmitOpenEndedVote.mockReset()
  mockSubmitQAndAEntry.mockReset()
  mockSubmitQuizVote.mockReset()
  mockSubmitScalesVote.mockReset()
  mockSubmitWordCloudVote.mockReset()
  mockSubscribeToQuestionResultSignals.mockReset()
  mockSubscribeToSessionQuestionChanges.mockReset()
  mockSubscribeToSessionUpdates.mockReset()
  mockTrackAudiencePresence.mockReset()
  mockUpvoteQAndAEntry.mockReset()

  mockGetSessionByCode.mockResolvedValue({
    questions: [question, secondQuestion],
    session: liveSession,
  })
  mockGetQuestionResults.mockResolvedValue(qAndAResults)
  mockSubmitMultipleChoiceVote.mockResolvedValue(undefined)
  mockSubmitOpenEndedVote.mockResolvedValue(undefined)
  mockSubmitQAndAEntry.mockResolvedValue('entry-3')
  mockSubmitQuizVote.mockResolvedValue(undefined)
  mockSubmitScalesVote.mockResolvedValue(undefined)
  mockSubmitWordCloudVote.mockResolvedValue(undefined)
  mockSubscribeToQuestionResultSignals.mockReturnValue(vi.fn())
  mockSubscribeToSessionQuestionChanges.mockReturnValue(vi.fn())
  mockSubscribeToSessionUpdates.mockReturnValue(vi.fn())
  mockTrackAudiencePresence.mockReturnValue(vi.fn())
  mockUpvoteQAndAEntry.mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  window.history.pushState({}, '', '/')
})

describe('VotePage', () => {
  it('shows a waiting message before the presenter starts', async () => {
    mockGetSessionByCode.mockResolvedValueOnce({
      questions: [question, secondQuestion],
      session: draftSession,
    })

    renderVotePage()

    expect(await screen.findByText(/waiting for the presenter to start/i)).toBeInTheDocument()
  })

  it('renders the current multiple-choice question and thanks the participant after voting', async () => {
    renderVotePage()

    expect(
      await screen.findByRole('heading', {
        name: /which roadmap theme matters most next quarter\?/i,
      }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: /velocity/i,
      }),
    )

    await waitFor(() => expect(mockSubmitMultipleChoiceVote).toHaveBeenCalledWith('question-1', 0))
    expect(screen.getByText(/thanks for voting/i)).toBeInTheDocument()
  })

  it('follows presenter slide and voting updates over realtime', async () => {
    let sessionListener: ((nextSession: typeof liveSession) => void) | null = null

    mockSubscribeToSessionUpdates.mockImplementation((_sessionId, callback) => {
      sessionListener = callback
      return vi.fn()
    })

    renderVotePage()

    await screen.findByRole('heading', {
      name: /which roadmap theme matters most next quarter\?/i,
    })

    await act(async () => {
      sessionListener?.({
        ...liveSession,
        current_question_id: 'question-2',
      })
    })

    expect(
      await screen.findByRole('heading', {
        name: /how should we handle onboarding help\?/i,
      }),
    ).toBeInTheDocument()

    await act(async () => {
      sessionListener?.({
        ...liveSession,
        current_question_id: 'question-2',
        voting_open: false,
      })
    })

    expect(await screen.findByText(/voting is closed/i)).toBeInTheDocument()
  })

  it('unlocks a single-response prompt when the presenter starts a new cycle on the same slide', async () => {
    let sessionListener: ((nextSession: typeof liveSession) => void) | null = null

    mockSubscribeToSessionUpdates.mockImplementation((_sessionId, callback) => {
      sessionListener = callback
      return vi.fn()
    })

    renderVotePage()

    expect(
      await screen.findByRole('heading', {
        name: /which roadmap theme matters most next quarter\?/i,
      }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: /velocity/i,
      }),
    )

    await waitFor(() => expect(mockSubmitMultipleChoiceVote).toHaveBeenCalledWith('question-1', 0))
    expect(screen.getByText(/thanks for voting/i)).toBeInTheDocument()

    await act(async () => {
      sessionListener?.({
        ...liveSession,
        question_cycle_started_at: '2026-04-09T00:03:00.000Z',
      })
    })

    expect(
      await screen.findByRole('button', {
        name: /velocity/i,
      }),
    ).toBeInTheDocument()
  })

  it('submits word-cloud responses without locking the participant out', async () => {
    mockGetSessionByCode.mockResolvedValueOnce({
      questions: [wordCloudQuestion],
      session: {
        ...liveSession,
        current_question_id: 'question-3',
      },
    })

    renderVotePage()

    expect(
      await screen.findByRole('heading', {
        name: /share one word for this sprint/i,
      }),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/your word/i), {
      target: { value: 'productive' },
    })
    fireEvent.click(screen.getByRole('button', { name: /submit word/i }))

    await waitFor(() => expect(mockSubmitWordCloudVote).toHaveBeenCalledWith('question-3', 'productive'))
    expect(screen.getByText(/thanks for sharing/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/your word/i)).toHaveValue('')
  })

  it('locks a single-submit word-cloud prompt after the participant answers', async () => {
    mockGetSessionByCode.mockResolvedValueOnce({
      questions: [singleSubmitWordCloudQuestion],
      session: {
        ...liveSession,
        current_question_id: 'question-3',
      },
    })

    renderVotePage()

    expect(
      await screen.findByRole('heading', {
        name: /share one word for this sprint/i,
      }),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/your word/i), {
      target: { value: 'productive' },
    })
    fireEvent.click(screen.getByRole('button', { name: /submit word/i }))

    await waitFor(() => expect(mockSubmitWordCloudVote).toHaveBeenCalledWith('question-3', 'productive'))
    expect(screen.getByText(/thanks for voting/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/your word/i)).not.toBeInTheDocument()
  })

  it('submits an open-ended response and shows the confirmation state', async () => {
    mockGetSessionByCode.mockResolvedValueOnce({
      questions: [openEndedQuestion],
      session: {
        ...liveSession,
        current_question_id: 'question-4',
      },
    })

    renderVotePage()

    expect(
      await screen.findByRole('heading', {
        name: /what should we improve next sprint\?/i,
      }),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/your response/i), {
      target: { value: 'Clearer sprint goals' },
    })
    fireEvent.click(screen.getByRole('button', { name: /submit response/i }))

    await waitFor(() =>
      expect(mockSubmitOpenEndedVote).toHaveBeenCalledWith('question-4', 'Clearer sprint goals'),
    )
    expect(screen.getByText(/thanks for sharing/i)).toBeInTheDocument()
  })

  it('submits a scales response and shows the confirmation state', async () => {
    mockGetSessionByCode.mockResolvedValueOnce({
      questions: [scalesQuestion],
      session: {
        ...liveSession,
        current_question_id: 'question-5',
      },
    })

    renderVotePage()

    expect(
      await screen.findByRole('heading', {
        name: /how confident are you in the rollout plan\?/i,
      }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: /rate 4 out of 5/i,
      }),
    )

    await waitFor(() => expect(mockSubmitScalesVote).toHaveBeenCalledWith('question-5', 4))
    expect(screen.getByText(/thanks for voting/i)).toBeInTheDocument()
  })

  it('submits a q&a question while keeping the live queue visible', async () => {
    mockGetSessionByCode.mockResolvedValueOnce({
      questions: [qAndAQuestion],
      session: {
        ...liveSession,
        current_question_id: 'question-6',
      },
    })

    renderVotePage()

    expect(
      await screen.findByRole('heading', {
        name: /what should we clarify before launch\?/i,
      }),
    ).toBeInTheDocument()
    expect(await screen.findByText('How do we measure launch success?')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/your question/i), {
      target: { value: 'What is our rollback plan?' },
    })
    fireEvent.click(screen.getByRole('button', { name: /submit question/i }))

    await waitFor(() =>
      expect(mockSubmitQAndAEntry).toHaveBeenCalledWith('question-6', 'What is our rollback plan?'),
    )
    expect(screen.getByText(/question submitted/i)).toBeInTheDocument()
  })

  it('lets the audience upvote an existing q&a entry', async () => {
    mockGetSessionByCode.mockResolvedValueOnce({
      questions: [qAndAQuestion],
      session: {
        ...liveSession,
        current_question_id: 'question-6',
      },
    })

    renderVotePage()

    expect(await screen.findByText('How do we measure launch success?')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: /upvote how do we measure launch success\?/i,
      }),
    )

    await waitFor(() => expect(mockUpvoteQAndAEntry).toHaveBeenCalledWith('entry-1'))
  })

  it('keeps the freshest q&a feed when an older refresh resolves late', async () => {
    let resultsSignalListener: (() => void) | null = null

    const initialRequest = createDeferred<typeof qAndAResults>()
    const refreshRequest = createDeferred<typeof updatedQAndAResults>()

    mockGetSessionByCode.mockResolvedValueOnce({
      questions: [qAndAQuestion],
      session: {
        ...liveSession,
        current_question_id: 'question-6',
      },
    })
    mockSubscribeToQuestionResultSignals.mockImplementation((_questionId, callback) => {
      resultsSignalListener = callback
      return vi.fn()
    })
    mockGetQuestionResults
      .mockImplementationOnce(() => initialRequest.promise)
      .mockImplementationOnce(() => refreshRequest.promise)

    renderVotePage()

    await screen.findByRole('heading', {
      name: /what should we clarify before launch\?/i,
    })
    await waitFor(() => expect(resultsSignalListener).not.toBeNull())

    await act(async () => {
      resultsSignalListener?.()
    })

    await act(async () => {
      refreshRequest.resolve(updatedQAndAResults)
    })

    await screen.findByText('4 upvotes')

    await act(async () => {
      initialRequest.resolve(qAndAResults)
    })

    await waitFor(() => expect(screen.getByText('4 upvotes')).toBeInTheDocument())
  })

  it('submits a quiz answer and shows the confirmation state', async () => {
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-09T00:00:10.000Z').getTime())

    mockGetSessionByCode.mockResolvedValueOnce({
      questions: [quizQuestion],
      session: {
        ...liveSession,
        current_question_id: 'question-7',
        question_cycle_started_at: '2026-04-09T00:00:00.000Z',
      },
    })

    renderVotePage()

    expect(
      await screen.findByRole('heading', {
        name: /which outcome matters most for launch readiness\?/i,
      }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: /reliability/i,
      }),
    )

    await waitFor(() => expect(mockSubmitQuizVote).toHaveBeenCalledWith('question-7', 1))
    expect(screen.getByText(/thanks for voting/i)).toBeInTheDocument()
    dateNowSpy.mockRestore()
  })

  it('shows quiz countdown and locks answers after time runs out', async () => {
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-09T00:00:45.000Z').getTime())

    mockGetSessionByCode.mockResolvedValueOnce({
      questions: [quizQuestion],
      session: {
        ...liveSession,
        current_question_id: 'question-7',
        question_cycle_started_at: '2026-04-09T00:00:00.000Z',
      },
    })

    renderVotePage()

    expect(
      await screen.findByRole('heading', {
        name: /which outcome matters most for launch readiness\?/i,
      }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText(/time's up\. waiting for the next question\./i)).toBeInTheDocument(),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: /reliability/i,
      }),
    )

    expect(mockSubmitQuizVote).not.toHaveBeenCalled()
    dateNowSpy.mockRestore()
  })

  it('refreshes questions when the host adds or edits slides', async () => {
    let questionChangeListener: (() => void) | null = null

    mockSubscribeToSessionQuestionChanges.mockImplementation((_sessionId, callback) => {
      questionChangeListener = callback
      return vi.fn()
    })
    mockGetSessionByCode
      .mockResolvedValueOnce({
        questions: [question, secondQuestion],
        session: liveSession,
      })
      .mockResolvedValueOnce({
        questions: [question, secondQuestion, wordCloudQuestion],
        session: {
          ...liveSession,
          current_question_id: 'question-3',
        },
      })

    renderVotePage()

    await screen.findByRole('heading', {
      name: /which roadmap theme matters most next quarter\?/i,
    })

    await act(async () => {
      questionChangeListener?.()
    })

    expect(
      await screen.findByRole('heading', {
        name: /share one word for this sprint/i,
      }),
    ).toBeInTheDocument()
  })
})
