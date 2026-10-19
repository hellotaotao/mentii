import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  danger: 'bg-surface text-danger ring-1 ring-line hover:bg-danger-soft hover:ring-danger/30',
  ghost: 'text-ink-2 hover:bg-sunken hover:text-ink',
  primary: 'bg-brand text-white shadow-sm hover:bg-brand-hover',
  secondary: 'bg-surface text-ink ring-1 ring-line hover:bg-sunken hover:ring-line-strong',
}

export function Button({
  children,
  className = '',
  size = 'md',
  variant = 'secondary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { size?: 'sm' | 'md'; variant?: ButtonVariant }) {
  return (
    <button
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-50 ${
        size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-sm'
      } ${BUTTON_VARIANT_CLASSES[variant]} ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}

export function IconButton({
  children,
  className = '',
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full text-ink-2 transition hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-40 ${className}`}
      title={label}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}

export function Field({
  children,
  hint,
  htmlFor,
  label,
}: {
  children: ReactNode
  hint?: string
  htmlFor?: string
  label: string
}) {
  return (
    <div className="space-y-2">
      <label className="block text-[13px] font-semibold text-ink" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-ink-3">{hint}</p> : null}
    </div>
  )
}

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none transition placeholder:text-ink-3 hover:border-line-strong focus:border-brand focus:ring-3 focus:ring-brand/15 ${className}`}
      {...props}
    />
  )
}

export function Toggle({
  checked,
  description,
  id,
  label,
  onChange,
}: {
  checked: boolean
  description?: string
  id: string
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4" htmlFor={id}>
      <span>
        <span className="block text-[13px] font-semibold text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-ink-3">{description}</span> : null}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          checked={checked}
          className="peer sr-only"
          id={id}
          onChange={(event) => onChange(event.target.checked)}
          role="switch"
          type="checkbox"
        />
        <span className="h-6 w-10 rounded-full bg-line-strong transition peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand" />
        <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
      </span>
    </label>
  )
}

export function Segmented<TValue extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange: (value: TValue) => void
  options: Array<{ icon?: ReactNode; label: string; value: TValue }>
  value: TValue
}) {
  return (
    <div aria-label={label} className="flex rounded-xl bg-sunken p-1 ring-1 ring-line" role="radiogroup">
      {options.map((option) => (
        <button
          aria-checked={option.value === value}
          className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold transition ${
            option.value === value ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-ink-3 hover:text-ink'
          }`}
          key={option.value}
          onClick={() => onChange(option.value)}
          role="radio"
          type="button"
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function PanelSection({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <section className="space-y-4 border-b border-line px-5 py-5 last:border-b-0">
      {title ? <h3 className="text-[13px] font-semibold text-ink-3">{title}</h3> : null}
      {children}
    </section>
  )
}
