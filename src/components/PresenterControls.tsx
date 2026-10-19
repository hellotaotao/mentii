import { ChevronLeft, ChevronRight, Eye, EyeOff, Expand, Lock, RotateCcw, Unlock, Users } from 'lucide-react'
import type { ReactNode } from 'react'

type PresenterControlsProps = {
  canGoNext: boolean
  canGoPrevious: boolean
  onNext: () => void
  onPrevious: () => void
  onResetResults: () => void
  onToggleFullscreen: () => void
  onToggleResults: () => void
  onToggleVoting: () => void
  participantCount?: number
  resultsHidden: boolean
  slidePosition?: { current: number; total: number }
  votingOpen: boolean
}

function ToolbarButton({
  children,
  disabled = false,
  label,
  onClick,
  shortcut,
}: {
  children: ReactNode
  disabled?: boolean
  label: string
  onClick: () => void
  shortcut?: string
}) {
  return (
    <button
      aria-label={label}
      className="flex size-10 items-center justify-center rounded-full text-white/85 transition hover:bg-white/12 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:pointer-events-none disabled:opacity-35"
      disabled={disabled}
      onClick={onClick}
      title={shortcut ? `${label} (${shortcut})` : label}
      type="button"
    >
      {children}
    </button>
  )
}

export default function PresenterControls({
  canGoNext,
  canGoPrevious,
  onNext,
  onPrevious,
  onResetResults,
  onToggleFullscreen,
  onToggleResults,
  onToggleVoting,
  participantCount,
  resultsHidden,
  slidePosition,
  votingOpen,
}: PresenterControlsProps) {
  return (
    <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
      <div
        aria-label="Presenter controls"
        className="flex items-center gap-1 rounded-full bg-[#1c120c]/90 px-2 py-1.5 text-sm text-white shadow-2xl ring-1 ring-white/10 backdrop-blur"
        role="toolbar"
      >
        <ToolbarButton disabled={!canGoPrevious} label="Previous slide" onClick={onPrevious} shortcut="←">
          <ChevronLeft className="size-5" />
        </ToolbarButton>
        {slidePosition ? (
          <span className="min-w-14 text-center font-medium tabular-nums text-white/80">
            {`${slidePosition.current} / ${slidePosition.total}`}
          </span>
        ) : null}
        <ToolbarButton disabled={!canGoNext} label="Next slide" onClick={onNext} shortcut="→">
          <ChevronRight className="size-5" />
        </ToolbarButton>

        <span aria-hidden="true" className="mx-1 h-5 w-px bg-white/15" />

        <ToolbarButton label={resultsHidden ? 'Show results' : 'Hide results'} onClick={onToggleResults} shortcut="H">
          {resultsHidden ? <Eye className="size-[18px]" /> : <EyeOff className="size-[18px]" />}
        </ToolbarButton>
        <ToolbarButton label={votingOpen ? 'Close voting' : 'Open voting'} onClick={onToggleVoting}>
          {votingOpen ? <Lock className="size-[18px]" /> : <Unlock className="size-[18px]" />}
        </ToolbarButton>
        <ToolbarButton label="Reset results" onClick={onResetResults} shortcut="R">
          <RotateCcw className="size-[18px]" />
        </ToolbarButton>
        <ToolbarButton label="Fullscreen" onClick={onToggleFullscreen} shortcut="F">
          <Expand className="size-[18px]" />
        </ToolbarButton>

        {participantCount !== undefined ? (
          <>
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-white/15" />
            <span className="flex items-center gap-1.5 px-2 font-medium tabular-nums text-white/80">
              <Users aria-hidden="true" className="size-4" />
              {participantCount}
            </span>
          </>
        ) : null}
      </div>
    </div>
  )
}
