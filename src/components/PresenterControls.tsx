import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Expand,
  Lock,
  RotateCcw,
  Unlock,
} from 'lucide-react'

type PresenterControlsProps = {
  canGoNext: boolean
  canGoPrevious: boolean
  onNext: () => void
  onPrevious: () => void
  onResetResults: () => void
  onToggleFullscreen: () => void
  onToggleResults: () => void
  onToggleVoting: () => void
  resultsHidden: boolean
  votingOpen: boolean
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
  resultsHidden,
  votingOpen,
}: PresenterControlsProps) {
  return (
    <div className="fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
      <div
        aria-label="Presenter controls"
        className="flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/10 bg-slate-950/90 px-3 py-3 shadow-2xl backdrop-blur"
        role="toolbar"
      >
        <button
          aria-label="Previous slide"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canGoPrevious}
          onClick={onPrevious}
          type="button"
        >
          <ChevronLeft className="size-4" />
          Previous slide
        </button>
        <button
          aria-label="Next slide"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canGoNext}
          onClick={onNext}
          type="button"
        >
          Next slide
          <ChevronRight className="size-4" />
        </button>
        <button
          aria-label={resultsHidden ? 'Show results' : 'Hide results'}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          onClick={onToggleResults}
          type="button"
        >
          {resultsHidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          {resultsHidden ? 'Show results' : 'Hide results'}
        </button>
        <button
          aria-label={votingOpen ? 'Close voting' : 'Open voting'}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          onClick={onToggleVoting}
          type="button"
        >
          {votingOpen ? <Lock className="size-4" /> : <Unlock className="size-4" />}
          {votingOpen ? 'Close voting' : 'Open voting'}
        </button>
        <button
          aria-label="Reset results"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          onClick={onResetResults}
          type="button"
        >
          <RotateCcw className="size-4" />
          Reset results
        </button>
        <button
          aria-label="Fullscreen"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          onClick={onToggleFullscreen}
          type="button"
        >
          <Expand className="size-4" />
          Fullscreen
        </button>
      </div>
    </div>
  )
}
