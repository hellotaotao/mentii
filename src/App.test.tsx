import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

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

  it('renders the host placeholder on host routes', () => {
    renderAt('/host/new')

    expect(
      screen.getByRole('heading', {
        name: /create a new session/i,
      }),
    ).toBeInTheDocument()
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
