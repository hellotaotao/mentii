import {
  isLeaderboardQuestion,
  isMultipleChoiceQuestion,
  isOpenEndedQuestion,
  isQAndAQuestion,
  isQuizQuestion,
  isScalesQuestion,
  isWordCloudQuestion,
  type EditorQuestion,
  type QuestionResults,
} from '../../types/questions'

// Results with no responses, used for previews and while live results load.
export function createEmptyResults(question: EditorQuestion): QuestionResults {
  const base = { questionId: question.id, title: question.title }

  if (isMultipleChoiceQuestion(question)) {
    return {
      ...base,
      config: question.config,
      totals: question.config.options.map((label, optionIdx) => ({ count: 0, label, optionIdx })),
      type: 'multiple_choice',
    }
  }

  if (isQuizQuestion(question)) {
    return {
      ...base,
      config: question.config,
      correctOptionIdx: question.config.correctOptionIdx,
      leaderboard: [],
      totals: question.config.options.map((label, optionIdx) => ({ count: 0, label, optionIdx })),
      type: 'quiz',
    }
  }

  if (isWordCloudQuestion(question)) {
    return { ...base, config: question.config, type: 'word_cloud', words: [] }
  }

  if (isOpenEndedQuestion(question)) {
    return { ...base, config: question.config, responses: [], type: 'open_ended' }
  }

  if (isScalesQuestion(question)) {
    return {
      ...base,
      average: 0,
      config: question.config,
      distribution: [1, 2, 3, 4, 5].map((rating) => ({ count: 0, rating })),
      type: 'scales',
    }
  }

  if (isQAndAQuestion(question)) {
    return { ...base, config: question.config, entries: [], type: 'q_and_a' }
  }

  if (isLeaderboardQuestion(question)) {
    return { ...base, config: question.config, type: 'leaderboard' }
  }

  const unsupportedQuestion: never = question
  throw new Error(`Unsupported question type: ${String(unsupportedQuestion)}`)
}

