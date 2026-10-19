import type { LeaderboardQuestion } from '../../../types/questions'
import { PanelSection, Toggle } from '../../ui/controls'
import { QuestionTitleField } from '../shared/EditorFields'

type LeaderboardEditorProps = {
  onPodiumChange: (podium: boolean) => void
  onTitleChange: (title: string) => void
  question: LeaderboardQuestion
}

export default function LeaderboardEditor({ onPodiumChange, onTitleChange, question }: LeaderboardEditorProps) {
  return (
    <>
      <PanelSection>
        <QuestionTitleField label="Heading" onChange={onTitleChange} placeholder="Leaderboard" value={question.title} />
      </PanelSection>
      <PanelSection title="Settings">
        <Toggle
          checked={question.config.podium}
          description="Reveal 3rd, 2nd and 1st place with confetti. Winners can add their real name."
          id="leaderboard-podium"
          label="Final podium"
          onChange={onPodiumChange}
        />
      </PanelSection>
      <PanelSection>
        <p className="text-sm leading-relaxed text-ink-2">
          Shows cumulative quiz scores. Put one after a quiz question to show who moved up.
        </p>
      </PanelSection>
    </>
  )
}
