import { Plus, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Field, PanelSection } from '../../ui/controls'

const MAX_OPTIONS = 6
const MIN_OPTIONS = 2

export function QuestionTitleField({
  label = 'Question',
  onChange,
  placeholder,
  value,
}: {
  label?: string
  onChange: (value: string) => void
  placeholder: string
  value: string
}) {
  return (
    <Field htmlFor="question-title" label={label}>
      <textarea
        className="block min-h-[76px] w-full resize-none rounded-xl border border-line bg-surface px-3 py-2.5 text-[15px] font-medium leading-snug text-ink outline-none transition placeholder:text-ink-3 hover:border-line-strong focus:border-brand focus:ring-3 focus:ring-brand/15"
        id="question-title"
        maxLength={200}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={2}
        value={value}
      />
    </Field>
  )
}

export function OptionsEditor({
  marker,
  onAdd,
  onChange,
  onRemove,
  options,
  trailing,
}: {
  marker: (index: number) => ReactNode
  onAdd: () => void
  onChange: (index: number, value: string) => void
  onRemove: (index: number) => void
  options: string[]
  // Extra control after each option, e.g. the quiz "correct answer" picker.
  trailing?: (index: number) => ReactNode
}) {
  return (
    <PanelSection title="Options">
      <ul className="space-y-2">
        {options.map((option, index) => (
          <li className="group flex items-center gap-2" key={`option-${index}`}>
            <span className="flex size-7 shrink-0 items-center justify-center">{marker(index)}</span>
            <input
              aria-label={`Option ${index + 1}`}
              className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none transition placeholder:text-ink-3 hover:border-line-strong focus:border-brand focus:ring-3 focus:ring-brand/15"
              maxLength={80}
              onChange={(event) => onChange(index, event.target.value)}
              placeholder={`Option ${index + 1}`}
              value={option}
            />
            {trailing ? trailing(index) : null}
            <button
              aria-label={`Remove option ${index + 1}`}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-3 opacity-0 transition hover:bg-sunken hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 disabled:hidden"
              disabled={options.length <= MIN_OPTIONS}
              onClick={() => onRemove(index)}
              type="button"
            >
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      {options.length < MAX_OPTIONS ? (
        <button
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong text-sm font-semibold text-ink-2 transition hover:border-brand hover:bg-brand-soft hover:text-brand"
          onClick={onAdd}
          type="button"
        >
          <Plus className="size-4" />
          Add option
        </button>
      ) : null}
    </PanelSection>
  )
}
