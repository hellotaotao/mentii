import { Check } from 'lucide-react'
import type { QuizQuestion } from '../../../types/questions'
import { Field, PanelSection } from '../../ui/controls'
import { OptionsEditor, QuestionTitleField } from '../shared/EditorFields'
import { getQuizAnswerStyle } from './answerStyles'

type QuizEditorProps = {
  onAddOption: () => void
  onCorrectOptionChange: (optionIdx: number) => void
  onDurationSecondsChange: (durationSeconds: number) => void
  onOptionChange: (index: number, value: string) => void
  onRemoveOption: (index: number) => void
  onTitleChange: (title: string) => void
  question: QuizQuestion
}

const DURATION_CHOICES = [10, 15, 20, 30, 45, 60, 90]

export default function QuizEditor({
  onAddOption,
  onCorrectOptionChange,
  onDurationSecondsChange,
  onOptionChange,
  onRemoveOption,
  onTitleChange,
  question,
}: QuizEditorProps) {
  const durationChoices = DURATION_CHOICES.includes(question.config.durationSeconds)
    ? DURATION_CHOICES
    : [...DURATION_CHOICES, question.config.durationSeconds].sort((left, right) => left - right)

  return (
    <>
      <PanelSection>
        <QuestionTitleField onChange={onTitleChange} placeholder="Which answer is correct?" value={question.title} />
      </PanelSection>
      <OptionsEditor
        marker={(index) => {
          const answerStyle = getQuizAnswerStyle(index)

          return (
            <span
              className={`flex size-6 items-center justify-center rounded-md text-[11px] text-white ${answerStyle.tileClassName}`}
            >
              {answerStyle.shape}
            </span>
          )
        }}
        onAdd={onAddOption}
        onChange={onOptionChange}
        onRemove={onRemoveOption}
        options={question.config.options}
        trailing={(index) => {
          const isCorrect = question.config.correctOptionIdx === index

          return (
            <button
              aria-label={`Mark option ${index + 1} as correct`}
              aria-pressed={isCorrect}
              className={`flex size-8 shrink-0 items-center justify-center rounded-full ring-1 transition ${
                isCorrect ? 'bg-live text-white ring-live' : 'text-ink-3 ring-line hover:text-live hover:ring-live'
              }`}
              onClick={() => onCorrectOptionChange(index)}
              title={isCorrect ? 'Correct answer' : 'Mark as correct'}
              type="button"
            >
              <Check className="size-4" />
            </button>
          )
        }}
      />
      <PanelSection title="Settings">
        <Field hint="Faster correct answers earn more points." htmlFor="quiz-duration-seconds" label="Time to answer">
          <select
            className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none transition hover:border-line-strong focus:border-brand focus:ring-3 focus:ring-brand/15"
            id="quiz-duration-seconds"
            onChange={(event) => onDurationSecondsChange(Number(event.target.value))}
            value={question.config.durationSeconds}
          >
            {durationChoices.map((seconds) => (
              <option key={seconds} value={seconds}>{`${seconds} seconds`}</option>
            ))}
          </select>
        </Field>
      </PanelSection>
    </>
  )
}
