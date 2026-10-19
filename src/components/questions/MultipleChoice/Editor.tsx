import { ChartColumn, ChartPie, CircleDashed } from 'lucide-react'
import { lightSlideColor } from '../../../lib/presentationTheme'
import type { MultipleChoiceChartType, MultipleChoiceQuestion } from '../../../types/questions'
import { PanelSection, Segmented } from '../../ui/controls'
import { OptionsEditor, QuestionTitleField } from '../shared/EditorFields'

type MultipleChoiceEditorProps = {
  onAddOption: () => void
  onChartTypeChange: (chartType: MultipleChoiceChartType) => void
  onOptionChange: (index: number, value: string) => void
  onRemoveOption: (index: number) => void
  onTitleChange: (title: string) => void
  question: MultipleChoiceQuestion
}

export default function MultipleChoiceEditor({
  onAddOption,
  onChartTypeChange,
  onOptionChange,
  onRemoveOption,
  onTitleChange,
  question,
}: MultipleChoiceEditorProps) {
  return (
    <>
      <PanelSection>
        <QuestionTitleField onChange={onTitleChange} placeholder="Ask your audience a question" value={question.title} />
      </PanelSection>
      <OptionsEditor
        marker={(index) => <span className="size-3 rounded-full" style={{ backgroundColor: lightSlideColor(index) }} />}
        onAdd={onAddOption}
        onChange={onOptionChange}
        onRemove={onRemoveOption}
        options={question.config.options}
      />
      <PanelSection title="Result layout">
        <Segmented<MultipleChoiceChartType>
          label="Chart style"
          onChange={onChartTypeChange}
          options={[
            { icon: <ChartColumn className="size-4" />, label: 'Bars', value: 'bar' },
            { icon: <CircleDashed className="size-4" />, label: 'Donut', value: 'donut' },
            { icon: <ChartPie className="size-4" />, label: 'Pie', value: 'pie' },
          ]}
          value={question.config.chartType}
        />
      </PanelSection>
    </>
  )
}
