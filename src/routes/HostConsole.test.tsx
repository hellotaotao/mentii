import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import HostConsole from './HostConsole'

const {
  mockCreateQuestion,
  mockCreateSessionWithDefaultQuestion,
  mockDeleteQuestion,
  mockGetSessionEditorData,
  mockReorderQuestions,
  mockUpdateQuestion,
} = vi.hoisted(() => ({
  mockCreateQuestion: vi.fn(),
  mockCreateSessionWithDefaultQuestion: vi.fn(),
  mockDeleteQuestion: vi.fn(),
  mockGetSessionEditorData: vi.fn(),
  mockReorderQuestions: vi.fn(),
  mockUpdateQuestion: vi.fn(),
}))

vi.mock('../lib/supabaseQueries', () => ({
  createQuestion: mockCreateQuestion,
  createSessionWithDefaultQuestion: mockCreateSessionWithDefaultQuestion,
  deleteQuestion: mockDeleteQuestion,
  getSessionEditorData: mockGetSessionEditorData,
  reorderQuestions: mockReorderQuestions,
  updateQuestion: mockUpdateQuestion,
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

function renderHostConsole(path: string) {
  window.history.pushState({}, '', path)

  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Outlet context={{ user: hostUser }} />}>
          <Route path="/host/new" element={<HostConsole mode="new" />} />
          <Route path="/host/:sessionId" element={<HostConsole mode="existing" />} />
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
  mockCreateSessionWithDefaultQuestion.mockReset()
  mockGetSessionEditorData.mockReset()
  mockCreateQuestion.mockReset()
  mockUpdateQuestion.mockReset()
  mockDeleteQuestion.mockReset()
  mockReorderQuestions.mockReset()

  mockCreateSessionWithDefaultQuestion.mockResolvedValue({
    sessionId: session.id,
  })
  mockGetSessionEditorData.mockResolvedValue({
    questions: [firstQuestion, secondQuestion],
    session,
  })
  mockCreateQuestion.mockResolvedValue(thirdQuestion)
  mockUpdateQuestion.mockResolvedValue(undefined)
  mockDeleteQuestion.mockResolvedValue(undefined)
  mockReorderQuestions.mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  window.history.pushState({}, '', '/')
})

describe('HostConsole', () => {
  it('creates a session from /host/new and loads the default multiple-choice slide', async () => {
    renderHostConsole('/host/new')

    await waitFor(() => expect(mockCreateSessionWithDefaultQuestion).toHaveBeenCalledWith('host-1'))
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
        level: 2,
        name: /which team should get the next headcount\?/i,
      }),
    ).toBeInTheDocument()
  })

  it('adds, reorders, and deletes slides', async () => {
    renderHostConsole('/host/session-1')

    await screen.findByLabelText(/question title/i)

    fireEvent.click(screen.getByRole('button', { name: /add slide/i }))

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
})
