import type { ScalesQuestion } from '../../../types/questions'
import { Field, PanelSection, TextInput } from '../../ui/controls'
import { QuestionTitleField } from '../shared/EditorFields'

type ScalesEditorProps = {
  onLeftLabelChange: (leftLabel: string) => void
  onRightLabelChange: (rightLabel: string) => void
  onTitleChange: (title: string) => void
  question: ScalesQuestion
}

export default function ScalesEditor({ onLeftLabelChange, onRightLabelChange, onTitleChange, question }: ScalesEditorProps) {
  return (
    <>
      <PanelSection>
        <QuestionTitleField
          label="Statement"
          onChange={onTitleChange}
          placeholder="How strongly do you agree?"
          value={question.title}
        />
      </PanelSection>
      <PanelSection title="Scale labels">
        <div className="grid grid-cols-2 gap-3">
          <Field htmlFor="scales-left-label" label="Left label (1)">
            <TextInput
              id="scales-left-label"
              maxLength={40}
              onChange={(event) => onLeftLabelChange(event.target.value)}
              value={question.config.leftLabel}
            />
          </Field>
          <Field htmlFor="scales-right-label" label="Right label (5)">
            <TextInput
              id="scales-right-label"
              maxLength={40}
              onChange={(event) => onRightLabelChange(event.target.value)}
              value={question.config.rightLabel}
            />
          </Field>
        </div>
      </PanelSection>
    </>
  )
}
