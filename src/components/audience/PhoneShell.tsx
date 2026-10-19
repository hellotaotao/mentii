import type { ReactNode } from 'react'
import type { PresentationTheme } from '../../lib/presentationTheme'
import type { ParticipantProfile } from '../../lib/quizGame'
import { MentiLogo } from '../MentiLogo'

type PhoneShellProps = {
  children: ReactNode
  // Pinned to the bottom of the screen, e.g. the reaction bar.
  footer?: ReactNode
  profile?: ParticipantProfile | null
  theme: PresentationTheme
}

export default function PhoneShell({ children, footer = null, profile = null, theme }: PhoneShellProps) {
  return (
    <main className={`slide-theme-${theme} flex min-h-dvh flex-col bg-slide-bg text-slide-fg`}>
      <header className="flex h-14 shrink-0 items-center justify-between px-5">
        <MentiLogo inheritColor size="xs" />
        {profile ? (
          <span className="flex max-w-[60%] items-center gap-1.5 truncate rounded-full bg-slide-subtle px-3 py-1 text-[13px] font-semibold">
            <span aria-hidden="true">{profile.emoji}</span>
            <span className="truncate">{profile.nickname}</span>
          </span>
        ) : null}
      </header>
      <div className={`flex flex-1 items-center justify-center px-5 pt-4 ${footer ? 'pb-28' : 'pb-10'}`}>
        <section className="w-full max-w-md">{children}</section>
      </div>
      {footer}
    </main>
  )
}

export function PhoneMessage({ emoji, text, title }: { emoji?: string; text: string; title: string }) {
  return (
    <div className="text-center">
      {emoji ? (
        <p aria-hidden="true" className="mentii-pop-in text-6xl">
          {emoji}
        </p>
      ) : null}
      <h1 className="mt-4 text-[26px] font-bold leading-tight tracking-[-0.02em]">{title}</h1>
      <p className="mx-auto mt-3 max-w-xs text-[16px] leading-relaxed text-slide-muted">{text}</p>
    </div>
  )
}
