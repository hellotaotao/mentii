import type { QAndAQuestion } from '../../../types/questions'
import { PanelSection } from '../../ui/controls'
import { QuestionTitleField } from '../shared/EditorFields'

type QAndAEditorProps = {
  onTitleChange: (title: string) => void
  question: QAndAQuestion
}

export default function QAndAEditor({ onTitleChange, question }: QAndAEditorProps) {
  return (
    <>
      <PanelSection>
        <QuestionTitleField
          label="Prompt"
          onChange={onTitleChange}
          placeholder="What questions do you have?"
          value={question.title}
        />
      </PanelSection>
      <PanelSection>
        <p className="text-sm leading-relaxed text-ink-2">
          People can ask as many questions as they like and upvote each other&apos;s. The most upvoted questions rise to
          the top, and you can mark them answered from the big screen.
        </p>
      </PanelSection>
    </>
  )
}
