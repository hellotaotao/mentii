import { Users } from 'lucide-react'
import { createContext, useContext, type ReactNode } from 'react'
import { formatSessionCode } from '../../lib/sessionCode'

type SlideChromeValue = {
  joinCode: string | null
  joinHost: string | null
}

const SlideChromeContext = createContext<SlideChromeValue>({ joinCode: null, joinHost: null })

// Provides the join instructions shown along the top of every slide.
export function SlideChromeProvider({ children, joinCode }: { children: ReactNode; joinCode: string | null }) {
  const joinHost = typeof window === 'undefined' ? null : window.location.host

  return <SlideChromeContext.Provider value={{ joinCode, joinHost }}>{children}</SlideChromeContext.Provider>
}

export function JoinInstructions() {
  const { joinCode, joinHost } = useContext(SlideChromeContext)

  if (!joinCode) {
    return null
  }

  return (
    <p className="text-[26px] text-slide-muted">
      Join at <span className="font-semibold text-slide-fg">{joinHost}</span>
      <span className="mx-3 text-slide-line">|</span>
      use code{' '}
      <span className="font-bold tabular-nums tracking-[0.08em] text-slide-fg">{formatSessionCode(joinCode)}</span>
    </p>
  )
}

type SlideLayoutProps = {
  children: ReactNode
  // Right side of the footer, e.g. a response counter.
  footer?: ReactNode
  title: string
  titleAlign?: 'center' | 'left'
}

export function SlideLayout({ children, footer, title, titleAlign = 'left' }: SlideLayoutProps) {
  return (
    <div className="flex h-full flex-col px-24 pb-12 pt-12">
      <div className="h-10">
        <JoinInstructions />
      </div>
      <h1
        className={`mt-8 line-clamp-3 text-[60px] font-bold leading-[1.1] tracking-[-0.025em] ${
          titleAlign === 'center' ? 'mx-auto max-w-[1300px] text-center' : 'max-w-[1350px]'
        }`}
      >
        {title || 'Untitled slide'}
      </h1>
      <div className="mt-12 min-h-0 flex-1">{children}</div>
      <div className="flex h-10 items-center justify-end">{footer}</div>
    </div>
  )
}

export function ResponseCount({ count, label = 'responses' }: { count: number; label?: string }) {
  return (
    <span className="flex items-center gap-3 text-[24px] font-medium tabular-nums text-slide-muted">
      <Users aria-hidden="true" className="size-7" />
      {`${count} ${label}`}
    </span>
  )
}

export function SlideEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center text-center text-[30px] text-slide-muted">{children}</div>
  )
}
