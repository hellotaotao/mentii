import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockSignInWithOtp = vi.fn()
const mockUnsubscribe = vi.fn()

vi.mock('./lib/supabase', () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithOtp: mockSignInWithOtp,
    },
  }),
}))

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

beforeEach(() => {
  mockGetSession.mockReset()
  mockOnAuthStateChange.mockReset()
  mockSignInWithOtp.mockReset()
  mockUnsubscribe.mockReset()

  mockGetSession.mockResolvedValue({
    data: {
      session: null,
    },
    error: null,
  })
  mockOnAuthStateChange.mockReturnValue({
    data: {
      subscription: {
        unsubscribe: mockUnsubscribe,
      },
    },
  })
  mockSignInWithOtp.mockResolvedValue({
    data: {
      session: null,
      user: null,
    },
    error: null,
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
    expect(screen.getByText(/phase 0 placeholder/i)).toBeInTheDocument()
  })

  it('prompts for host magic-link sign-in on host routes', async () => {
    renderAt('/host/new')

    expect(
      await screen.findByRole('heading', {
        name: /sign in to host sessions/i,
      }),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/work email/i), {
      target: { value: 'host@example.com' },
    })
    fireEvent.submit(screen.getByRole('button', { name: /send magic link/i }).closest('form')!)

    await waitFor(() =>
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'host@example.com',
        options: {
          emailRedirectTo: window.location.href,
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

  it('navigates from the join page to the vote route on submit', () => {
    renderAt('/')

    fireEvent.change(screen.getByLabelText(/6-digit code/i), {
      target: { value: '4821 76' },
    })
    fireEvent.submit(screen.getByRole('button', { name: /join/i }).closest('form')!)

    expect(
      screen.getByRole('heading', {
        name: /session 482176/i,
      }),
    ).toBeInTheDocument()
  })
})
