import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import DemoHostWorkspace from './DemoHostWorkspace'

function renderDemoHostWorkspace() {
  return render(
    <MemoryRouter>
      <DemoHostWorkspace />
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
})

describe('DemoHostWorkspace', () => {
  it('renders a seeded host workspace with clear upgrade calls to action', () => {
    renderDemoHostWorkspace()

    expect(
      screen.getByRole('heading', {
        name: /demo host workspace/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/quarterly planning pulse/i)).toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: /create a real room/i,
      }),
    ).toHaveAttribute('href', '/host#host-sign-in')
    expect(
      screen.getByRole('button', {
        name: /slide 1: which change would help next week's all-hands most\?/i,
      }),
    ).toHaveAttribute('aria-pressed', 'true')

    const previewStage = screen.getByTestId('demo-stage')
    expect(
      within(previewStage).getByRole('heading', {
        name: /which change would help next week's all-hands most\?/i,
      }),
    ).toBeInTheDocument()
  })

  it('switches between seeded demo slides without requiring authentication', () => {
    renderDemoHostWorkspace()

    fireEvent.click(
      screen.getByRole('button', {
        name: /slide 2: share one word about today's planning session/i,
      }),
    )

    expect(
      screen.getByRole('button', {
        name: /slide 2: share one word about today's planning session/i,
      }),
    ).toHaveAttribute('aria-pressed', 'true')

    const previewStage = screen.getByTestId('demo-stage')
    expect(
      within(previewStage).getByRole('heading', {
        name: /share one word about today's planning session/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/word cloud questions surface the language people keep repeating/i),
    ).toBeInTheDocument()
  })
})
