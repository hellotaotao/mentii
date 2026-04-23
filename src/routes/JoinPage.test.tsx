import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import JoinPage from './JoinPage'

const { mockGetSessionByCode } = vi.hoisted(() => ({
  mockGetSessionByCode: vi.fn(),
}))

vi.mock('../lib/supabaseQueries', () => ({
  getSessionByCode: mockGetSessionByCode,
}))

function renderJoinPage(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<JoinPage />} />
        <Route path="/vote/:sessionCode" element={<p data-testid="vote-route">Vote route</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockGetSessionByCode.mockReset()
  mockGetSessionByCode.mockResolvedValue({
    questions: [],
    session: {
      state: 'live',
    },
  })
})

afterEach(() => {
  cleanup()
})

describe('JoinPage', () => {
  it('introduces Mentii for first-time visitors while keeping clear join and host paths', () => {
    renderJoinPage()

    expect(
      screen.getByRole('heading', {
        name: /turn any presentation into a live conversation/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/participants join instantly with a room code/i)).toBeInTheDocument()
    expect(screen.getByText(/i have a room code/i)).toBeInTheDocument()
    expect(screen.getByText(/i'm running the session/i)).toBeInTheDocument()
    const hostSignInLinks = screen.getAllByRole('link', {
      name: /sign in as host/i,
    })

    expect(hostSignInLinks).toHaveLength(2)
    hostSignInLinks.forEach((link) => expect(link).toHaveAttribute('href', '/host'))
    expect(
      screen.getByRole('heading', {
        name: /join a live session/i,
      }),
    ).toBeInTheDocument()
  })

  it('validates room code before navigating to the vote route', async () => {
    renderJoinPage()

    fireEvent.change(screen.getByLabelText(/6-digit code/i), {
      target: { value: '4821 76' },
    })
    fireEvent.click(screen.getByRole('button', { name: /join/i }))

    await waitFor(() => expect(mockGetSessionByCode).toHaveBeenCalledWith('482176'))
    expect(await screen.findByTestId('vote-route')).toBeInTheDocument()
  })

  it('shows a helpful message when the code format is incomplete', async () => {
    renderJoinPage()

    fireEvent.change(screen.getByLabelText(/6-digit code/i), {
      target: { value: '1234' },
    })
    fireEvent.click(screen.getByRole('button', { name: /join/i }))

    expect(screen.getByText(/enter the 6-digit room code/i)).toBeInTheDocument()
    expect(mockGetSessionByCode).not.toHaveBeenCalled()
  })

  it('shows a friendly not-found message for unknown room codes', async () => {
    mockGetSessionByCode.mockRejectedValueOnce(new Error('JSON object requested, multiple (or no) rows returned'))

    renderJoinPage()

    fireEvent.change(screen.getByLabelText(/6-digit code/i), {
      target: { value: '4821 76' },
    })
    fireEvent.click(screen.getByRole('button', { name: /join/i }))

    expect(await screen.findByText(/no room found for code 4821 76/i)).toBeInTheDocument()
  })

  it('blocks ended rooms before navigation', async () => {
    mockGetSessionByCode.mockResolvedValueOnce({
      questions: [],
      session: {
        state: 'ended',
      },
    })

    renderJoinPage()

    fireEvent.change(screen.getByLabelText(/6-digit code/i), {
      target: { value: '4821 76' },
    })
    fireEvent.click(screen.getByRole('button', { name: /join/i }))

    expect(await screen.findByText(/this room has ended/i)).toBeInTheDocument()
    expect(screen.queryByTestId('vote-route')).not.toBeInTheDocument()
  })

  it('validates query-string code before auto-joining', async () => {
    renderJoinPage('/?code=482176')

    await waitFor(() => expect(mockGetSessionByCode).toHaveBeenCalledWith('482176'))
    expect(await screen.findByTestId('vote-route')).toBeInTheDocument()
  })
})
