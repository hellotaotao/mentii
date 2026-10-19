import type { OpenEndedQuestion } from '../../../types/questions'
import { Field, PanelSection, TextInput } from '../../ui/controls'
import { QuestionTitleField } from '../shared/EditorFields'

type OpenEndedEditorProps = {
  onMaxLengthChange: (maxLength: number) => void
  onTitleChange: (title: string) => void
  question: OpenEndedQuestion
}

export default function OpenEndedEditor({ onMaxLengthChange, onTitleChange, question }: OpenEndedEditorProps) {
  return (
    <>
      <PanelSection>
        <QuestionTitleField onChange={onTitleChange} placeholder="What should we try next month?" value={question.title} />
      </PanelSection>
      <PanelSection title="Settings">
        <Field hint="Between 40 and 500 characters." htmlFor="open-ended-max-length" label="Maximum response length">
          <TextInput
            id="open-ended-max-length"
            max={500}
            min={40}
            onChange={(event) => onMaxLengthChange(Number(event.target.value))}
            type="number"
            value={question.config.maxLength}
          />
        </Field>
      </PanelSection>
    </>
  )
}
