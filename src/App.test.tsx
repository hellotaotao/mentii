import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const {
  mockGetSession,
  mockGetSessionByCode,
  mockOnAuthStateChange,
  mockSignInWithOtp,
  mockUnsubscribe,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetSessionByCode: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockSignInWithOtp: vi.fn(),
  mockUnsubscribe: vi.fn(),
}))

vi.mock('./lib/supabaseQueries', () => ({
  getSessionByCode: mockGetSessionByCode,
}))

vi.mock('./lib/supabase', () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithOtp: mockSignInWithOtp,
    },
  }),
}))

vi.mock('./routes/BigScreen', async () => {
  const { useParams } = await import('react-router-dom')

  function MockBigScreenRoute() {
    const { sessionId = '' } = useParams()

    return (
      <main>
        <h1>{`Session ${sessionId}`}</h1>
        <p>Join code</p>
      </main>
    )
  }

  return {
    default: MockBigScreenRoute,
  }
})

vi.mock('./routes/VotePage', async () => {
  const { useParams } = await import('react-router-dom')

  function MockVotePageRoute() {
    const { sessionCode = '' } = useParams()

    return (
      <main data-testid="vote-route">
        <h1>{`Session ${sessionCode}`}</h1>
        <p>Audience route</p>
      </main>
    )
  }

  return {
    default: MockVotePageRoute,
  }
})

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

beforeEach(() => {
  mockGetSession.mockReset()
  mockGetSessionByCode.mockReset()
  mockOnAuthStateChange.mockReset()
  mockSignInWithOtp.mockReset()
  mockUnsubscribe.mockReset()

  mockGetSession.mockResolvedValue({
    data: {
      session: null,
    },
    error: null,
  })
  mockOnAuthStateChange.mockImplementation((callback) => {
    callback('INITIAL_SESSION', null)

    return {
      data: {
        subscription: {
          unsubscribe: mockUnsubscribe,
        },
      },
    }
  })
  mockSignInWithOtp.mockResolvedValue({
    data: {
      session: null,
      user: null,
    },
    error: null,
  })
  mockGetSessionByCode.mockResolvedValue({
    questions: [],
    session: {
      state: 'live',
    },
  })
})

afterEach(() => {
  cleanup()
  window.history.pushState({}, '', '/')
})

describe('App routing shell', () => {
  it('renders the join page on the root route', () => {
    renderAt('/')

    expect(
      screen.getByRole('heading', {
        name: /turn any presentation into a live conversation/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: /join a live session/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /join/i,
      }),
    ).toBeInTheDocument()
  })

  it('renders the audience placeholder on vote routes', () => {
    renderAt('/vote/482176')

    expect(
      screen.getByRole('heading', {
        name: /session 482176/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/audience route/i)).toBeInTheDocument()
  })

  it('prompts for host magic-link sign-in on host routes', async () => {
    renderAt('/host')

    expect(
      await screen.findByRole('heading', {
        name: /sign in to host rooms/i,
      }),
    ).toBeInTheDocument()
    expect(mockGetSession).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/work email/i), {
      target: { value: 'host@example.com' },
    })
    fireEvent.submit(screen.getByRole('button', { name: /send magic link/i }).closest('form')!)

    await waitFor(() =>
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'host@example.com',
        options: {
          emailRedirectTo: `${window.location.origin}/host`,
        },
      }),
    )
    expect(screen.getByText(/check your email for the sign-in link/i)).toBeInTheDocument()
  })

  it('renders the presenter placeholder on present routes', () => {
    renderAt('/present/demo-session')

    expect(
      screen.getByRole('heading', {
        name: /session demo-session/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/join code/i)).toBeInTheDocument()
  })

  it('navigates from the join page to the vote route on submit', async () => {
    renderAt('/')

    fireEvent.change(screen.getByLabelText(/6-digit code/i), {
      target: { value: '4821 76' },
    })
    fireEvent.submit(screen.getByRole('button', { name: /join/i }).closest('form')!)

    await waitFor(() => expect(mockGetSessionByCode).toHaveBeenCalledWith('482176'))
    expect(
      await screen.findByRole('heading', {
        name: /session 482176/i,
      }),
    ).toBeInTheDocument()
  })

  it('bootstraps the audience route from a code query parameter', async () => {
    renderAt('/?code=482176')

    await waitFor(() => expect(mockGetSessionByCode).toHaveBeenCalledWith('482176'))

    expect(
      await screen.findByRole('heading', {
        name: /session 482176/i,
      }),
    ).toBeInTheDocument()
  })
})
