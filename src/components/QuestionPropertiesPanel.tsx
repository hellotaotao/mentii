import LeaderboardEditor from './questions/Leaderboard/Editor'
import MultipleChoiceEditor from './questions/MultipleChoice/Editor'
import OpenEndedEditor from './questions/OpenEnded/Editor'
import QAndAEditor from './questions/QAndA/Editor'
import QuizEditor from './questions/Quiz/Editor'
import ScalesEditor from './questions/Scales/Editor'
import WordCloudEditor from './questions/WordCloud/Editor'
import {
  isLeaderboardQuestion,
  isMultipleChoiceQuestion,
  isOpenEndedQuestion,
  isQAndAQuestion,
  isQuizQuestion,
  isScalesQuestion,
  isWordCloudQuestion,
  normalizeOpenEndedMaxLength,
  type EditorQuestion,
} from '../types/questions'

export type QuestionTransform = (question: EditorQuestion) => EditorQuestion

type QuestionPropertiesPanelProps = {
  onUpdate: (transform: QuestionTransform) => void
  question: EditorQuestion
}

export default function QuestionPropertiesPanel({
  onUpdate,
  question,
}: QuestionPropertiesPanelProps) {
  // Applies a config patch only when the latest question still matches the expected type.
  function updateConfig<TQuestion extends EditorQuestion>(
    isExpectedType: (candidate: EditorQuestion) => candidate is TQuestion,
    createPatch: (current: TQuestion) => Partial<TQuestion['config']>,
  ) {
    onUpdate((current) =>
      isExpectedType(current)
        ? ({ ...current, config: { ...current.config, ...createPatch(current) } } as TQuestion)
        : current,
    )
  }

  function updateTitle(title: string) {
    onUpdate((current) => ({ ...current, title }))
  }

  if (isMultipleChoiceQuestion(question)) {
    return (
      <MultipleChoiceEditor
        onAddOption={() =>
          updateConfig(isMultipleChoiceQuestion, (current) => ({
            options: [...current.config.options, `Option ${current.config.options.length + 1}`],
          }))
        }
        onChartTypeChange={(chartType) => updateConfig(isMultipleChoiceQuestion, () => ({ chartType }))}
        onOptionChange={(index, value) =>
          updateConfig(isMultipleChoiceQuestion, (current) => ({
            options: current.config.options.map((option, optionIndex) => (optionIndex === index ? value : option)),
          }))
        }
        onRemoveOption={(index) =>
          updateConfig(isMultipleChoiceQuestion, (current) => ({
            options: current.config.options.filter((_option, optionIndex) => optionIndex !== index),
          }))
        }
        onTitleChange={updateTitle}
        question={question}
      />
    )
  }

  if (isWordCloudQuestion(question)) {
    return (
      <WordCloudEditor
        onAllowMultipleSubmissionsChange={(allowMultipleSubmissions) =>
          updateConfig(isWordCloudQuestion, () => ({ allowMultipleSubmissions }))
        }
        onTitleChange={updateTitle}
        question={question}
      />
    )
  }

  if (isOpenEndedQuestion(question)) {
    return (
      <OpenEndedEditor
        onMaxLengthChange={(maxLength) =>
          updateConfig(isOpenEndedQuestion, () => ({ maxLength: normalizeOpenEndedMaxLength(maxLength) }))
        }
        onTitleChange={updateTitle}
        question={question}
      />
    )
  }

  if (isScalesQuestion(question)) {
    return (
      <ScalesEditor
        onLeftLabelChange={(leftLabel) => updateConfig(isScalesQuestion, () => ({ leftLabel }))}
        onRightLabelChange={(rightLabel) => updateConfig(isScalesQuestion, () => ({ rightLabel }))}
        onTitleChange={updateTitle}
        question={question}
      />
    )
  }

  if (isQAndAQuestion(question)) {
    return (
      <QAndAEditor onTitleChange={updateTitle} question={question} />
    )
  }

  if (isQuizQuestion(question)) {
    return (
      <QuizEditor
        onAddOption={() =>
          updateConfig(isQuizQuestion, (current) => ({
            options: [...current.config.options, `Option ${current.config.options.length + 1}`],
          }))
        }
        onCorrectOptionChange={(correctOptionIdx) =>
          updateConfig(isQuizQuestion, (current) => ({
            correctOptionIdx: Math.min(current.config.options.length - 1, Math.max(0, correctOptionIdx)),
          }))
        }
        onDurationSecondsChange={(durationSeconds) =>
          updateConfig(isQuizQuestion, () => ({
            durationSeconds: Math.min(120, Math.max(5, Math.round(durationSeconds || 30))),
          }))
        }
        onOptionChange={(index, value) =>
          updateConfig(isQuizQuestion, (current) => ({
            options: current.config.options.map((option, optionIndex) => (optionIndex === index ? value : option)),
          }))
        }
        onRemoveOption={(index) =>
          updateConfig(isQuizQuestion, (current) => {
            const nextOptions = current.config.options.filter((_option, optionIndex) => optionIndex !== index)

            return {
              correctOptionIdx: Math.min(
                nextOptions.length - 1,
                current.config.correctOptionIdx >= index
                  ? Math.max(0, current.config.correctOptionIdx - 1)
                  : current.config.correctOptionIdx,
              ),
              options: nextOptions,
            }
          })
        }
        onTitleChange={updateTitle}
        question={question}
      />
    )
  }

  if (isLeaderboardQuestion(question)) {
    return (
      <LeaderboardEditor
        onPodiumChange={(podium) => updateConfig(isLeaderboardQuestion, () => ({ podium }))}
        onTitleChange={updateTitle}
        question={question}
      />
    )
  }

  return null
}
