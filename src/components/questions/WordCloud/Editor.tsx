import type { WordCloudQuestion } from '../../../types/questions'
import { PanelSection, Toggle } from '../../ui/controls'
import { QuestionTitleField } from '../shared/EditorFields'

type WordCloudEditorProps = {
  onAllowMultipleSubmissionsChange: (allowMultipleSubmissions: boolean) => void
  onTitleChange: (title: string) => void
  question: WordCloudQuestion
}

export default function WordCloudEditor({
  onAllowMultipleSubmissionsChange,
  onTitleChange,
  question,
}: WordCloudEditorProps) {
  return (
    <>
      <PanelSection>
        <QuestionTitleField onChange={onTitleChange} placeholder="Describe this month in one word" value={question.title} />
      </PanelSection>
      <PanelSection title="Settings">
        <Toggle
          checked={question.config.allowMultipleSubmissions}
          description="Each person can add more than one word."
          id="word-cloud-multiple"
          label="Allow repeated submissions"
          onChange={onAllowMultipleSubmissionsChange}
        />
      </PanelSection>
    </>
  )
}
