import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import HostConsole from './HostConsole'

const {
  mockCreateQuestion,
  mockDeleteQuestion,
  mockGetSessionEditorData,
  mockReorderQuestions,
  mockSubscribeToSessionPresenceCount,
  mockUpdateRoomName,
  mockUpdateSession,
  mockUpdateQuestion,
} = vi.hoisted(() => ({
  mockCreateQuestion: vi.fn(),
  mockDeleteQuestion: vi.fn(),
  mockGetSessionEditorData: vi.fn(),
  mockReorderQuestions: vi.fn(),
  mockSubscribeToSessionPresenceCount: vi.fn(),
  mockUpdateRoomName: vi.fn(),
  mockUpdateSession: vi.fn(),
  mockUpdateQuestion: vi.fn(),
}))

vi.mock('../lib/supabaseQueries', () => ({
  createQuestion: mockCreateQuestion,
  deleteQuestion: mockDeleteQuestion,
  getSessionEditorData: mockGetSessionEditorData,
  reorderQuestions: mockReorderQuestions,
  updateRoomName: mockUpdateRoomName,
  updateSession: mockUpdateSession,
  updateQuestion: mockUpdateQuestion,
}))

vi.mock('../lib/realtime', () => ({
  subscribeToSessionPresenceCount: mockSubscribeToSessionPresenceCount,
}))

const hostUser = {
  id: 'host-1',
}

const session = {
  code: '482176',
  created_at: '2026-04-09T00:00:00.000Z',
  current_question_id: 'question-1',
  host_id: 'host-1',
  id: 'session-1',
  name: 'Weekly standup',
  question_cycle_started_at: '2026-04-09T00:00:00.000Z',
  results_hidden: false,
  state: 'draft',
  voting_open: true,
}

const firstQuestion = {
  config: {
    chartType: 'bar',
    options: ['Velocity', 'Reliability', 'AI features', 'Collaboration'],
  },
  id: 'question-1',
  orderIndex: 0,
  sessionId: 'session-1',
  title: 'Which roadmap theme matters most next quarter?',
  type: 'multiple_choice' as const,
}

const secondQuestion = {
  config: {
    chartType: 'bar',
    options: ['Engineering', 'Design', 'Sales'],
  },
  id: 'question-2',
  orderIndex: 1,
  sessionId: 'session-1',
  title: 'Which team should receive the next headcount?',
  type: 'multiple_choice' as const,
}

const thirdQuestion = {
  config: {
    chartType: 'donut',
    options: ['Morning', 'Afternoon'],
  },
  id: 'question-3',
  orderIndex: 2,
  sessionId: 'session-1',
  title: 'When should the all-hands happen?',
  type: 'multiple_choice' as const,
}

const wordCloudQuestion = {
  config: {
    allowMultipleSubmissions: true,
  },
  id: 'question-4',
  orderIndex: 3,
  sessionId: 'session-1',
  title: 'Share one word for this sprint',
  type: 'word_cloud' as const,
}

const openEndedQuestion = {
  config: {
    maxLength: 280,
  },
  id: 'question-5',
  orderIndex: 4,
  sessionId: 'session-1',
  title: 'What should we improve next sprint?',
  type: 'open_ended' as const,
}

const scalesQuestion = {
  config: {
    leftLabel: 'Not useful',
    rightLabel: 'Very useful',
  },
  id: 'question-6',
  orderIndex: 5,
  sessionId: 'session-1',
  title: 'How useful was this session?',
  type: 'scales' as const,
}

const qAndAQuestion = {
  config: {},
  id: 'question-7',
  orderIndex: 6,
  sessionId: 'session-1',
  title: 'What would you like us to clarify?',
  type: 'q_and_a' as const,
}

const quizQuestion = {
  config: {
    correctOptionIdx: 1,
    durationSeconds: 30,
    options: ['Discovery', 'Reliability', 'Adoption'],
  },
  id: 'question-8',
  orderIndex: 7,
  sessionId: 'session-1',
  title: 'Which outcome matters most for launch readiness?',
  type: 'quiz' as const,
}

function renderHostConsole(path: string) {
  window.history.pushState({}, '', path)

  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Outlet context={{ user: hostUser }} />}>
          <Route path="/host" element={<p data-testid="host-dashboard-route">Host dashboard route</p>} />
          <Route path="/host/:sessionId" element={<HostConsole />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

function createDeferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })

  return { promise, resolve }
}

beforeEach(() => {
  mockGetSessionEditorData.mockReset()
  mockCreateQuestion.mockReset()
  mockUpdateQuestion.mockReset()
  mockDeleteQuestion.mockReset()
  mockReorderQuestions.mockReset()
  mockSubscribeToSessionPresenceCount.mockReset()
  mockUpdateRoomName.mockReset()
  mockUpdateSession.mockReset()

  mockGetSessionEditorData.mockResolvedValue({
    questions: [firstQuestion, secondQuestion],
    session,
  })
  mockCreateQuestion.mockResolvedValue(thirdQuestion)
  mockUpdateQuestion.mockResolvedValue(undefined)
  mockDeleteQuestion.mockResolvedValue(undefined)
  mockReorderQuestions.mockResolvedValue(undefined)
  mockSubscribeToSessionPresenceCount.mockReturnValue(vi.fn())
  mockUpdateRoomName.mockResolvedValue(undefined)
  mockUpdateSession.mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  window.history.pushState({}, '', '/')
})

describe('HostConsole', () => {
  it('navigates back to the host dashboard', async () => {
    renderHostConsole('/host/session-1')

    await screen.findByLabelText(/question title/i)

    fireEvent.click(screen.getByRole('button', { name: /back to rooms/i }))

    expect(await screen.findByTestId('host-dashboard-route')).toBeInTheDocument()
  })

  it('renames the room and persists the new name', async () => {
    renderHostConsole('/host/session-1')

    const roomNameInput = await screen.findByLabelText(/room name/i)
    fireEvent.change(roomNameInput, {
      target: { value: 'Quarterly planning' },
    })
    fireEvent.blur(roomNameInput)

    await waitFor(() =>
      expect(mockUpdateRoomName).toHaveBeenCalledWith('session-1', 'Quarterly planning'),
    )
  })

  it('loads the host console for an existing session', async () => {
    renderHostConsole('/host/session-1')

    expect(await screen.findByLabelText(/question title/i)).toHaveValue(firstQuestion.title)
    expect(mockGetSessionEditorData).toHaveBeenCalledWith('session-1')
    expect(screen.getByText('4821 76')).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /slide 1: which roadmap theme matters most next quarter\?/i,
      }),
    ).toBeInTheDocument()
  })

  it('lets the host select a slide, edit content, and persist changes', async () => {
    renderHostConsole('/host/session-1')

    await screen.findByLabelText(/question title/i)

    fireEvent.click(
      screen.getByRole('button', {
        name: /slide 2: which team should receive the next headcount\?/i,
      }),
    )
    expect(screen.getByLabelText(/question title/i)).toHaveValue(secondQuestion.title)

    fireEvent.change(screen.getByLabelText(/question title/i), {
      target: { value: 'Which team should get the next headcount?' },
    })

    await waitFor(() =>
      expect(mockUpdateQuestion).toHaveBeenCalledWith('question-2', {
        config: {
          chartType: 'bar',
          options: ['Engineering', 'Design', 'Sales'],
        },
        title: 'Which team should get the next headcount?',
      }),
    )

    fireEvent.change(screen.getByRole('textbox', { name: /option 1/i }), {
      target: { value: 'Product' },
    })

    await waitFor(() =>
      expect(mockUpdateQuestion).toHaveBeenCalledWith('question-2', {
        config: {
          chartType: 'bar',
          options: ['Product', 'Design', 'Sales'],
        },
        title: 'Which team should get the next headcount?',
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /customize/i }))
    fireEvent.change(screen.getByLabelText(/chart style/i), {
      target: { value: 'pie' },
    })

    await waitFor(() =>
      expect(mockUpdateQuestion).toHaveBeenLastCalledWith('question-2', {
        config: {
          chartType: 'pie',
          options: ['Product', 'Design', 'Sales'],
        },
        title: 'Which team should get the next headcount?',
      }),
    )

    expect(
      screen.getByRole('heading', {
        name: /which team should get the next headcount\?/i,
      }),
    ).toBeInTheDocument()
  })

  it('adds, reorders, and deletes slides', async () => {
    renderHostConsole('/host/session-1')

    await screen.findByLabelText(/question title/i)

    fireEvent.click(screen.getByRole('button', { name: /add slide/i }))
    fireEvent.click(screen.getByRole('button', { name: /add multiple choice slide/i }))

    await waitFor(() =>
      expect(mockCreateQuestion).toHaveBeenCalledWith('session-1', 'multiple_choice'),
    )
    expect(
      await screen.findByRole('button', {
        name: /slide 3: when should the all-hands happen\?/i,
      }),
    ).toBeInTheDocument()

    const slideOne = screen
      .getByRole('button', {
        name: /slide 1: which roadmap theme matters most next quarter\?/i,
      })
      .closest('li')
    const slideTwo = screen
      .getByRole('button', {
        name: /slide 2: which team should receive the next headcount\?/i,
      })
      .closest('li')

    if (!slideOne || !slideTwo) {
      throw new Error('Expected slide list items to be present')
    }

    fireEvent.dragStart(slideTwo)
    fireEvent.dragOver(slideOne)
    fireEvent.drop(slideOne)

    await waitFor(() =>
      expect(mockReorderQuestions).toHaveBeenCalledWith('session-1', [
        'question-2',
        'question-1',
        'question-3',
      ]),
    )

    fireEvent.click(screen.getByRole('button', { name: /delete slide 3/i }))

    await waitFor(() => expect(mockDeleteQuestion).toHaveBeenCalledWith('session-1', 'question-3'))
    expect(
      screen.queryByRole('button', {
        name: /slide 3: when should the all-hands happen\?/i,
      }),
    ).not.toBeInTheDocument()
  })

  it('preserves a newly added slide when a delete finishes later', async () => {
    const createQuestionRequest = createDeferredPromise<typeof thirdQuestion>()
    const deleteQuestionRequest = createDeferredPromise<void>()

    mockCreateQuestion.mockReturnValueOnce(createQuestionRequest.promise)
    mockDeleteQuestion.mockReturnValueOnce(deleteQuestionRequest.promise)

    renderHostConsole('/host/session-1')

    await screen.findByLabelText(/question title/i)

    fireEvent.click(screen.getByRole('button', { name: /add slide/i }))
    fireEvent.click(screen.getByRole('button', { name: /add multiple choice slide/i }))
    fireEvent.click(screen.getByRole('button', { name: /delete slide 1/i }))

    createQuestionRequest.resolve(thirdQuestion)

    expect(
      await screen.findByRole('button', {
        name: /slide 3: when should the all-hands happen\?/i,
      }),
    ).toBeInTheDocument()

    deleteQuestionRequest.resolve()

    await waitFor(() =>
      expect(
        screen.queryByRole('button', {
          name: /slide 1: which roadmap theme matters most next quarter\?/i,
        }),
      ).not.toBeInTheDocument(),
    )

    expect(
      screen.getByRole('button', {
        name: /slide 1: which team should receive the next headcount\?/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /slide 2: when should the all-hands happen\?/i,
      }),
    ).toBeInTheDocument()
  })

  it('starts the presentation and advances slides from the host console', async () => {
    const openWindowMock = vi.spyOn(window, 'open').mockImplementation(() => null)

    renderHostConsole('/host/session-1')

    await screen.findByLabelText(/question title/i)

    fireEvent.click(screen.getByRole('button', { name: /present/i }))

    await waitFor(() =>
      expect(mockUpdateSession).toHaveBeenCalledWith('session-1', {
        current_question_id: 'question-1',
        question_cycle_started_at: expect.any(String),
        results_hidden: false,
        state: 'live',
        voting_open: true,
      }),
    )
    expect(openWindowMock).toHaveBeenCalledWith('/present/session-1', '_blank', 'noopener,noreferrer')

    fireEvent.click(screen.getByRole('button', { name: /next slide/i }))

    await waitFor(() =>
      expect(mockUpdateSession).toHaveBeenLastCalledWith('session-1', {
        current_question_id: 'question-2',
        question_cycle_started_at: expect.any(String),
        results_hidden: false,
        voting_open: true,
      }),
    )
    expect(screen.getByLabelText(/question title/i)).toHaveValue(secondQuestion.title)

    openWindowMock.mockRestore()
  })

  it('adds and edits a word-cloud slide', async () => {
    mockCreateQuestion.mockResolvedValueOnce(wordCloudQuestion)

    renderHostConsole('/host/session-1')

    await screen.findByLabelText(/question title/i)

    fireEvent.click(screen.getByRole('button', { name: /add slide/i }))
    fireEvent.click(screen.getByRole('button', { name: /add word cloud slide/i }))

    await waitFor(() =>
      expect(mockCreateQuestion).toHaveBeenCalledWith('session-1', 'word_cloud'),
    )
    expect(
      await screen.findByRole('button', {
        name: /slide 3: share one word for this sprint/i,
      }),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/question title/i), {
      target: { value: 'Describe today in one word' },
    })

    await waitFor(() =>
      expect(mockUpdateQuestion).toHaveBeenCalledWith('question-4', {
        config: {
          allowMultipleSubmissions: true,
        },
        title: 'Describe today in one word',
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /customize/i }))
    fireEvent.click(screen.getByLabelText(/allow repeated submissions/i))

    await waitFor(() =>
      expect(mockUpdateQuestion).toHaveBeenLastCalledWith('question-4', {
        config: {
          allowMultipleSubmissions: false,
        },
        title: 'Describe today in one word',
      }),
    )
  })

  it('adds and edits an open-ended slide', async () => {
    mockCreateQuestion.mockResolvedValueOnce(openEndedQuestion)

    renderHostConsole('/host/session-1')

    await screen.findByLabelText(/question title/i)

    fireEvent.click(screen.getByRole('button', { name: /add slide/i }))
    fireEvent.click(screen.getByRole('button', { name: /add open ended slide/i }))

    await waitFor(() =>
      expect(mockCreateQuestion).toHaveBeenCalledWith('session-1', 'open_ended'),
    )
    expect(
      await screen.findByRole('button', {
        name: /slide 3: what should we improve next sprint\?/i,
      }),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/question title/i), {
      target: { value: 'What would make the next sprint smoother?' },
    })

    await waitFor(() =>
      expect(mockUpdateQuestion).toHaveBeenCalledWith('question-5', {
        config: {
          maxLength: 280,
        },
        title: 'What would make the next sprint smoother?',
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /customize/i }))
    fireEvent.change(screen.getByLabelText(/maximum response length/i), {
      target: { value: '400' },
    })

    await waitFor(() =>
      expect(mockUpdateQuestion).toHaveBeenLastCalledWith('question-5', {
        config: {
          maxLength: 400,
        },
        title: 'What would make the next sprint smoother?',
      }),
    )
  })

  it('adds and edits a scales slide', async () => {
    mockCreateQuestion.mockResolvedValueOnce(scalesQuestion)

    renderHostConsole('/host/session-1')

    await screen.findByLabelText(/question title/i)

    fireEvent.click(screen.getByRole('button', { name: /add slide/i }))
    fireEvent.click(screen.getByRole('button', { name: /add scales slide/i }))

    await waitFor(() => expect(mockCreateQuestion).toHaveBeenCalledWith('session-1', 'scales'))
    expect(
      await screen.findByRole('button', {
        name: /slide 3: how useful was this session\?/i,
      }),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/question title/i), {
      target: { value: 'How clear was the strategy update?' },
    })

    await waitFor(() =>
      expect(mockUpdateQuestion).toHaveBeenCalledWith('question-6', {
        config: {
          leftLabel: 'Not useful',
          rightLabel: 'Very useful',
        },
        title: 'How clear was the strategy update?',
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /customize/i }))
    fireEvent.change(screen.getByLabelText(/left label/i), {
      target: { value: 'Still fuzzy' },
    })

    await waitFor(() =>
      expect(mockUpdateQuestion).toHaveBeenLastCalledWith('question-6', {
        config: {
          leftLabel: 'Still fuzzy',
          rightLabel: 'Very useful',
        },
        title: 'How clear was the strategy update?',
      }),
    )

    fireEvent.change(screen.getByLabelText(/right label/i), {
      target: { value: 'Crystal clear' },
    })

    await waitFor(() =>
      expect(mockUpdateQuestion).toHaveBeenLastCalledWith('question-6', {
        config: {
          leftLabel: 'Still fuzzy',
          rightLabel: 'Crystal clear',
        },
        title: 'How clear was the strategy update?',
      }),
    )
  })

  it('adds and edits a q&a slide', async () => {
    mockCreateQuestion.mockResolvedValueOnce(qAndAQuestion)

    renderHostConsole('/host/session-1')

    await screen.findByLabelText(/question title/i)

    fireEvent.click(screen.getByRole('button', { name: /add slide/i }))
    fireEvent.click(screen.getByRole('button', { name: /add q&a slide/i }))

    await waitFor(() => expect(mockCreateQuestion).toHaveBeenCalledWith('session-1', 'q_and_a'))
    expect(
      await screen.findByRole('button', {
        name: /slide 3: what would you like us to clarify\?/i,
      }),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/question title/i), {
      target: { value: 'What questions should we tackle first?' },
    })

    await waitFor(() =>
      expect(mockUpdateQuestion).toHaveBeenCalledWith('question-7', {
        config: {},
        title: 'What questions should we tackle first?',
      }),
    )
  })

  it('adds and edits a quiz slide', async () => {
    mockCreateQuestion.mockResolvedValueOnce(quizQuestion)

    renderHostConsole('/host/session-1')

    await screen.findByLabelText(/question title/i)

    fireEvent.click(screen.getByRole('button', { name: /add slide/i }))
    fireEvent.click(screen.getByRole('button', { name: /add quiz slide/i }))

    await waitFor(() => expect(mockCreateQuestion).toHaveBeenCalledWith('session-1', 'quiz'))
    expect(
      await screen.findByRole('button', {
        name: /slide 3: which outcome matters most for launch readiness\?/i,
      }),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/question title/i), {
      target: { value: 'Which outcome matters most this release?' },
    })

    await waitFor(() =>
      expect(mockUpdateQuestion).toHaveBeenCalledWith('question-8', {
        config: {
          correctOptionIdx: 1,
          durationSeconds: 30,
          options: ['Discovery', 'Reliability', 'Adoption'],
        },
        title: 'Which outcome matters most this release?',
      }),
    )

    fireEvent.change(screen.getByRole('textbox', { name: /option 1/i }), {
      target: { value: 'Quality' },
    })

    await waitFor(() =>
      expect(mockUpdateQuestion).toHaveBeenLastCalledWith('question-8', {
        config: {
          correctOptionIdx: 1,
          durationSeconds: 30,
          options: ['Quality', 'Reliability', 'Adoption'],
        },
        title: 'Which outcome matters most this release?',
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: /customize/i }))
    fireEvent.change(screen.getByLabelText(/correct answer/i), {
      target: { value: '2' },
    })
    fireEvent.change(screen.getByLabelText(/countdown seconds/i), {
      target: { value: '45' },
    })

    await waitFor(() =>
      expect(mockUpdateQuestion).toHaveBeenLastCalledWith('question-8', {
        config: {
          correctOptionIdx: 2,
          durationSeconds: 45,
          options: ['Quality', 'Reliability', 'Adoption'],
        },
        title: 'Which outcome matters most this release?',
      }),
    )
  })

  it('opens preview and copies the join link via share modal', async () => {
    const openWindowMock = vi.spyOn(window, 'open').mockImplementation(() => null)
    const writeTextMock = vi.fn().mockResolvedValue(undefined)

    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    renderHostConsole('/host/session-1')

    await screen.findByLabelText(/question title/i)

    fireEvent.click(screen.getByRole('button', { name: /preview/i }))
    expect(openWindowMock).toHaveBeenCalledWith('/present/session-1', '_blank', 'noopener,noreferrer')

    fireEvent.click(screen.getByRole('button', { name: /share/i }))

    const copyButton = await screen.findByRole('button', { name: /copy join link/i })
    fireEvent.click(copyButton)

    await waitFor(() =>
      expect(writeTextMock).toHaveBeenCalledWith(expect.stringMatching(/\/\?code=482176$/)),
    )

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /link copied/i })).toBeInTheDocument(),
    )

    openWindowMock.mockRestore()
  })
})
