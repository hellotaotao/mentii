import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PresenterControls from './PresenterControls'

afterEach(cleanup)

function renderControls(overrides: Partial<Parameters<typeof PresenterControls>[0]> = {}) {
  const props = {
    canGoNext: true,
    canGoPrevious: true,
    onNext: vi.fn(),
    onPrevious: vi.fn(),
    onResetResults: vi.fn(),
    onToggleFullscreen: vi.fn(),
    onToggleResults: vi.fn(),
    onToggleVoting: vi.fn(),
    resultsHidden: false,
    votingOpen: true,
    ...overrides,
  }
  render(<PresenterControls {...props} />)
  return props
}

describe('PresenterControls', () => {
  it('renders the toolbar with all expected buttons', () => {
    renderControls()
    expect(screen.getByRole('toolbar', { name: 'Presenter controls' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous slide' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next slide' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide results' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close voting' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset results' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fullscreen' })).toBeInTheDocument()
  })

  it('disables Previous slide when canGoPrevious is false', () => {
    renderControls({ canGoPrevious: false })
    expect(screen.getByRole('button', { name: 'Previous slide' })).toBeDisabled()
  })

  it('disables Next slide when canGoNext is false', () => {
    renderControls({ canGoNext: false })
    expect(screen.getByRole('button', { name: 'Next slide' })).toBeDisabled()
  })

  it('calls onPrevious when Previous slide is clicked', () => {
    const props = renderControls()
    fireEvent.click(screen.getByRole('button', { name: 'Previous slide' }))
    expect(props.onPrevious).toHaveBeenCalledOnce()
  })

  it('calls onNext when Next slide is clicked', () => {
    const props = renderControls()
    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }))
    expect(props.onNext).toHaveBeenCalledOnce()
  })

  it('calls onToggleResults when results button is clicked', () => {
    const props = renderControls()
    fireEvent.click(screen.getByRole('button', { name: 'Hide results' }))
    expect(props.onToggleResults).toHaveBeenCalledOnce()
  })

  it('shows "Show results" when resultsHidden is true', () => {
    renderControls({ resultsHidden: true })
    expect(screen.getByRole('button', { name: 'Show results' })).toBeInTheDocument()
  })

  it('calls onToggleVoting when voting button is clicked', () => {
    const props = renderControls()
    fireEvent.click(screen.getByRole('button', { name: 'Close voting' }))
    expect(props.onToggleVoting).toHaveBeenCalledOnce()
  })

  it('shows "Open voting" when votingOpen is false', () => {
    renderControls({ votingOpen: false })
    expect(screen.getByRole('button', { name: 'Open voting' })).toBeInTheDocument()
  })

  it('calls onResetResults when Reset results is clicked', () => {
    const props = renderControls()
    fireEvent.click(screen.getByRole('button', { name: 'Reset results' }))
    expect(props.onResetResults).toHaveBeenCalledOnce()
  })

  it('calls onToggleFullscreen when Fullscreen is clicked', () => {
    const props = renderControls()
    fireEvent.click(screen.getByRole('button', { name: 'Fullscreen' }))
    expect(props.onToggleFullscreen).toHaveBeenCalledOnce()
  })
})
