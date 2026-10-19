import type { ButtonHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

export function PhoneButton({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slide-accent text-[17px] font-semibold text-slide-accent-fg shadow-sm transition active:scale-[0.99] disabled:opacity-40 ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}

export function PhoneTextArea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`block w-full resize-none rounded-2xl border-2 border-slide-line bg-slide-bg px-4 py-3.5 text-[17px] text-slide-fg outline-none transition placeholder:text-slide-muted focus:border-slide-accent ${className}`}
      {...props}
    />
  )
}

export function PhoneNotice({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'error' | 'neutral' | 'success' }) {
  const toneClassName =
    tone === 'error'
      ? 'bg-[#fdecea] text-[#b42318]'
      : tone === 'success'
        ? 'bg-[color-mix(in_srgb,var(--slide-c4)_14%,transparent)] text-[var(--slide-c4)]'
        : 'bg-slide-subtle text-slide-muted'

  return <p className={`rounded-2xl px-4 py-3 text-[15px] ${toneClassName}`}>{children}</p>
}
