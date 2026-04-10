import type { Json, Tables } from './database'

export const QUESTION_TYPES = [
  'multiple_choice',
  'word_cloud',
  'open_ended',
  'scales',
  'q_and_a',
  'quiz',
] as const

export type QuestionType = (typeof QUESTION_TYPES)[number]

export const MULTIPLE_CHOICE_CHART_TYPES = ['bar', 'donut', 'pie'] as const

export type MultipleChoiceChartType = (typeof MULTIPLE_CHOICE_CHART_TYPES)[number]

export type MultipleChoiceQuestionConfig = {
  chartType: MultipleChoiceChartType
  options: string[]
}

export type WordCloudQuestionConfig = {
  allowMultipleSubmissions: boolean
}

export type OpenEndedQuestionConfig = {
  maxLength: number
}

export type ScalesQuestionConfig = {
  leftLabel: string
  rightLabel: string
}

export type QuizQuestionConfig = {
  correctOptionIdx: number
  durationSeconds: number
  options: string[]
}

export type GenericQuestionConfig = Record<string, Json | undefined>

type QuestionBase<TType extends QuestionType, TConfig> = {
  config: TConfig
  id: string
  orderIndex: number
  sessionId: string
  title: string
  type: TType
}

export type MultipleChoiceQuestion = QuestionBase<'multiple_choice', MultipleChoiceQuestionConfig>
export type WordCloudQuestion = QuestionBase<'word_cloud', WordCloudQuestionConfig>
export type OpenEndedQuestion = QuestionBase<'open_ended', OpenEndedQuestionConfig>
export type ScalesQuestion = QuestionBase<'scales', ScalesQuestionConfig>
export type QAndAQuestion = QuestionBase<'q_and_a', GenericQuestionConfig>
export type QuizQuestion = QuestionBase<'quiz', QuizQuestionConfig>
export type PlaceholderQuestion = QuestionBase<Exclude<QuestionType, 'multiple_choice' | 'word_cloud' | 'open_ended' | 'scales' | 'q_and_a' | 'quiz'>, GenericQuestionConfig>

export type EditorQuestion =
  | MultipleChoiceQuestion
  | WordCloudQuestion
  | OpenEndedQuestion
  | ScalesQuestion
  | QAndAQuestion
  | QuizQuestion
  | PlaceholderQuestion

export type MultipleChoiceResultTotal = {
  count: number
  label: string
  optionIdx: number
}

export type MultipleChoiceResults = {
  config: MultipleChoiceQuestionConfig
  questionId: string
  title: string
  totals: MultipleChoiceResultTotal[]
  type: 'multiple_choice'
}

export type WordCloudResultWord = {
  count: number
  word: string
}

export type WordCloudResults = {
  config: WordCloudQuestionConfig
  questionId: string
  title: string
  type: 'word_cloud'
  words: WordCloudResultWord[]
}

export type OpenEndedResultResponse = {
  createdAt: string
  id: string
  text: string
}

export type OpenEndedResults = {
  config: OpenEndedQuestionConfig
  questionId: string
  responses: OpenEndedResultResponse[]
  title: string
  type: 'open_ended'
}

export type ScalesResultBucket = {
  count: number
  rating: number
}

export type ScalesResults = {
  average: number
  config: ScalesQuestionConfig
  distribution: ScalesResultBucket[]
  questionId: string
  title: string
  type: 'scales'
}

export type QAndAEntryResult = {
  answered: boolean
  createdAt: string
  hasUpvoted: boolean
  id: string
  isOwnEntry: boolean
  text: string
  upvoteCount: number
}

export type QAndAResults = {
  config: GenericQuestionConfig
  entries: QAndAEntryResult[]
  questionId: string
  title: string
  type: 'q_and_a'
}

export type QuizLeaderboardEntry = {
  answeredAt: string
  label: string
  participantId: string
}

export type QuizResults = {
  config: QuizQuestionConfig
  correctOptionIdx: number
  leaderboard: QuizLeaderboardEntry[]
  questionId: string
  title: string
  totals: MultipleChoiceResultTotal[]
  type: 'quiz'
}

export type QuestionResults =
  | MultipleChoiceResults
  | WordCloudResults
  | OpenEndedResults
  | ScalesResults
  | QAndAResults
  | QuizResults
  | {
      config: GenericQuestionConfig
      questionId: string
      title: string
      type: Exclude<QuestionType, 'multiple_choice' | 'word_cloud' | 'open_ended' | 'scales' | 'q_and_a' | 'quiz'>
    }

export type SessionEditorData = {
  questions: EditorQuestion[]
  session: Tables<'sessions'>
}

type QuestionRegistryEntry<TType extends QuestionType, TConfig extends Json> = {
  createDefaultConfig: () => TConfig
  defaultTitle: string
  hostEditorReady: boolean
  label: string
  type: TType
}

function isJsonRecord(value: Json): value is Record<string, Json | undefined> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isJsonArray(value: Json | undefined): value is Json[] {
  return Array.isArray(value)
}

function isQuestionType(value: string): value is QuestionType {
  return QUESTION_TYPES.some((questionType) => questionType === value)
}

function isMultipleChoiceChartType(value: unknown): value is MultipleChoiceChartType {
  return MULTIPLE_CHOICE_CHART_TYPES.some((chartType) => chartType === value)
}

function sanitizeOptions(value: Json | undefined) {
  if (!Array.isArray(value)) {
    return createDefaultMultipleChoiceConfig().options
  }

  const nextOptions = value
    .map((option) => (typeof option === 'string' ? option : ''))
    .filter((option) => option.length > 0)

  return nextOptions.length >= 2 ? nextOptions : createDefaultMultipleChoiceConfig().options
}

function getNumericValue(value: Json | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : 0
  }

  return 0
}

function getNonEmptyString(value: Json | undefined, fallbackValue: string) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallbackValue
}

function parseMultipleChoiceConfig(config: Json): MultipleChoiceQuestionConfig {
  if (!isJsonRecord(config)) {
    return createDefaultMultipleChoiceConfig()
  }

  return {
    chartType: isMultipleChoiceChartType(config.chartType) ? config.chartType : 'bar',
    options: sanitizeOptions(config.options),
  }
}

function parseWordCloudConfig(config: Json): WordCloudQuestionConfig {
  if (!isJsonRecord(config)) {
    return createDefaultWordCloudConfig()
  }

  return {
    allowMultipleSubmissions:
      config.allowMultipleSubmissions !== false &&
      (typeof config.submissionMode !== 'string' || config.submissionMode !== 'single'),
  }
}

export function normalizeOpenEndedMaxLength(value: unknown) {
  const DEFAULT_MAX_LENGTH = 280
  const MIN_MAX_LENGTH = 40
  const MAX_MAX_LENGTH = 500

  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_MAX_LENGTH
  }

  return Math.min(MAX_MAX_LENGTH, Math.max(MIN_MAX_LENGTH, Math.round(numericValue)))
}

function parseOpenEndedConfig(config: Json): OpenEndedQuestionConfig {
  if (!isJsonRecord(config)) {
    return createDefaultOpenEndedConfig()
  }

  return {
    maxLength: normalizeOpenEndedMaxLength(config.maxLength),
  }
}

function parseScalesConfig(config: Json): ScalesQuestionConfig {
  if (!isJsonRecord(config)) {
    return createDefaultScalesConfig()
  }

  return {
    leftLabel: getNonEmptyString(config.leftLabel, createDefaultScalesConfig().leftLabel),
    rightLabel: getNonEmptyString(config.rightLabel, createDefaultScalesConfig().rightLabel),
  }
}

function normalizeQuizDurationSeconds(value: Json | undefined) {
  const DEFAULT_DURATION_SECONDS = 30
  const MIN_DURATION_SECONDS = 5
  const MAX_DURATION_SECONDS = 120
  const numericValue = getNumericValue(value)

  if (numericValue <= 0) {
    return DEFAULT_DURATION_SECONDS
  }

  return Math.min(MAX_DURATION_SECONDS, Math.max(MIN_DURATION_SECONDS, Math.round(numericValue)))
}

function parseQuizConfig(config: Json): QuizQuestionConfig {
  const defaultConfig = createDefaultQuizConfig()

  if (!isJsonRecord(config)) {
    return defaultConfig
  }

  const options = sanitizeOptions(config.options)
  const correctOptionIdx = Math.min(
    options.length - 1,
    Math.max(0, Math.round(getNumericValue(config.correctOptionIdx))),
  )

  return {
    correctOptionIdx,
    durationSeconds: normalizeQuizDurationSeconds(config.durationSeconds),
    options,
  }
}

function parseGenericConfig(config: Json): GenericQuestionConfig {
  return isJsonRecord(config) ? config : {}
}

export function createDefaultMultipleChoiceConfig(): MultipleChoiceQuestionConfig {
  return {
    chartType: 'bar',
    options: ['Option 1', 'Option 2'],
  }
}

export function createDefaultWordCloudConfig(): WordCloudQuestionConfig {
  return {
    allowMultipleSubmissions: true,
  }
}

export function createDefaultOpenEndedConfig(): OpenEndedQuestionConfig {
  return {
    maxLength: normalizeOpenEndedMaxLength(undefined),
  }
}

export function createDefaultScalesConfig(): ScalesQuestionConfig {
  return {
    leftLabel: 'Strongly disagree',
    rightLabel: 'Strongly agree',
  }
}

export function createDefaultQuizConfig(): QuizQuestionConfig {
  return {
    correctOptionIdx: 0,
    durationSeconds: 30,
    options: ['Option 1', 'Option 2', 'Option 3'],
  }
}

export const questionRegistry = {
  multiple_choice: {
    createDefaultConfig: createDefaultMultipleChoiceConfig,
    defaultTitle: 'Ask your audience a question',
    hostEditorReady: true,
    label: 'Multiple Choice',
    type: 'multiple_choice',
  },
  open_ended: {
    createDefaultConfig: createDefaultOpenEndedConfig,
    defaultTitle: 'Collect open-ended answers',
    hostEditorReady: true,
    label: 'Open Ended',
    type: 'open_ended',
  },
  q_and_a: {
    createDefaultConfig: () => ({}),
    defaultTitle: 'What questions do you have?',
    hostEditorReady: true,
    label: 'Q&A',
    type: 'q_and_a',
  },
  quiz: {
    createDefaultConfig: createDefaultQuizConfig,
    defaultTitle: 'Which answer is correct?',
    hostEditorReady: true,
    label: 'Quiz',
    type: 'quiz',
  },
  scales: {
    createDefaultConfig: createDefaultScalesConfig,
    defaultTitle: 'How strongly do you agree?',
    hostEditorReady: true,
    label: 'Scales',
    type: 'scales',
  },
  word_cloud: {
    createDefaultConfig: createDefaultWordCloudConfig,
    defaultTitle: 'Capture words from the room',
    hostEditorReady: true,
    label: 'Word Cloud',
    type: 'word_cloud',
  },
} satisfies {
  [Key in QuestionType]: QuestionRegistryEntry<Key, Json>
}

export function getQuestionTypeLabel(type: QuestionType) {
  return questionRegistry[type].label
}

export function createDefaultQuestionConfig(type: QuestionType) {
  return questionRegistry[type].createDefaultConfig()
}

export function createDefaultQuestionTitle(type: QuestionType) {
  return questionRegistry[type].defaultTitle
}

export function isHostEditorReady(type: QuestionType) {
  return questionRegistry[type].hostEditorReady
}

export function isMultipleChoiceQuestion(question: EditorQuestion): question is MultipleChoiceQuestion {
  return question.type === 'multiple_choice'
}

export function isWordCloudQuestion(question: EditorQuestion): question is WordCloudQuestion {
  return question.type === 'word_cloud'
}

export function isOpenEndedQuestion(question: EditorQuestion): question is OpenEndedQuestion {
  return question.type === 'open_ended'
}

export function isScalesQuestion(question: EditorQuestion): question is ScalesQuestion {
  return question.type === 'scales'
}

export function isQAndAQuestion(question: EditorQuestion): question is QAndAQuestion {
  return question.type === 'q_and_a'
}

export function isQuizQuestion(question: EditorQuestion): question is QuizQuestion {
  return question.type === 'quiz'
}

export function parseQuestionResults(question: EditorQuestion, results: Json): QuestionResults {
  if (question.type === 'multiple_choice') {
    const totalsSource = isJsonRecord(results) && isJsonArray(results.totals) ? results.totals : []
    const countsByOptionIndex = new Map<number, number>()

    for (const total of totalsSource) {
      if (!isJsonRecord(total)) {
        continue
      }

      countsByOptionIndex.set(getNumericValue(total.optionIdx), getNumericValue(total.count))
    }

    return {
      config: question.config,
      questionId: question.id,
      title: question.title,
      totals: question.config.options.map((label, optionIdx) => ({
        count: countsByOptionIndex.get(optionIdx) ?? 0,
        label,
        optionIdx,
      })),
      type: 'multiple_choice',
    }
  }

  if (question.type === 'word_cloud') {
    const wordsSource = isJsonRecord(results) && isJsonArray(results.words) ? results.words : []

    return {
      config: question.config,
      questionId: question.id,
      title: question.title,
      type: 'word_cloud',
      words: wordsSource.flatMap((wordEntry) => {
        if (!isJsonRecord(wordEntry) || typeof wordEntry.word !== 'string') {
          return []
        }

        return [
          {
            count: getNumericValue(wordEntry.count),
            word: wordEntry.word,
          },
        ]
      }),
    }
  }

  if (question.type === 'open_ended') {
    const responsesSource = isJsonRecord(results) && isJsonArray(results.responses) ? results.responses : []

    return {
      config: question.config,
      questionId: question.id,
      responses: responsesSource.flatMap((responseEntry) => {
        if (
          !isJsonRecord(responseEntry) ||
          typeof responseEntry.id !== 'string' ||
          typeof responseEntry.text !== 'string'
        ) {
          return []
        }

        return [
          {
            createdAt: typeof responseEntry.createdAt === 'string' ? responseEntry.createdAt : '',
            id: responseEntry.id,
            text: responseEntry.text,
          },
        ]
      }),
      title: question.title,
      type: 'open_ended',
    }
  }

  if (question.type === 'scales') {
    const distributionSource =
      isJsonRecord(results) && isJsonArray(results.distribution) ? results.distribution : []
    const countsByRating = new Map<number, number>()

    for (const distributionEntry of distributionSource) {
      if (!isJsonRecord(distributionEntry)) {
        continue
      }

      const rating = Math.round(getNumericValue(distributionEntry.rating))

      if (rating < 1 || rating > 5) {
        continue
      }

      countsByRating.set(rating, getNumericValue(distributionEntry.count))
    }

    return {
      average:
        Math.round(
          (isJsonRecord(results) ? getNumericValue(results.average) : 0) * 100,
        ) / 100,
      config: question.config,
      distribution: [1, 2, 3, 4, 5].map((rating) => ({
        count: countsByRating.get(rating) ?? 0,
        rating,
      })),
      questionId: question.id,
      title: question.title,
      type: 'scales',
    }
  }

  if (question.type === 'q_and_a') {
    const entriesSource = isJsonRecord(results) && isJsonArray(results.entries) ? results.entries : []

    return {
      config: question.config,
      entries: entriesSource.flatMap((entry) => {
        if (
          !isJsonRecord(entry) ||
          typeof entry.id !== 'string' ||
          typeof entry.text !== 'string'
        ) {
          return []
        }

        return [
          {
            answered: entry.answered === true,
            createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : '',
            hasUpvoted: entry.hasUpvoted === true,
            id: entry.id,
            isOwnEntry: entry.isOwnEntry === true,
            text: entry.text,
            upvoteCount: getNumericValue(entry.upvoteCount),
          },
        ]
      }),
      questionId: question.id,
      title: question.title,
      type: 'q_and_a',
    }
  }

  if (question.type === 'quiz') {
    const totalsSource = isJsonRecord(results) && isJsonArray(results.totals) ? results.totals : []
    const countsByOptionIndex = new Map<number, number>()

    for (const total of totalsSource) {
      if (!isJsonRecord(total)) {
        continue
      }

      countsByOptionIndex.set(getNumericValue(total.optionIdx), getNumericValue(total.count))
    }

    const leaderboardSource =
      isJsonRecord(results) && isJsonArray(results.leaderboard) ? results.leaderboard : []

    return {
      config: question.config,
      correctOptionIdx: question.config.correctOptionIdx,
      leaderboard: leaderboardSource.flatMap((entry) => {
        if (
          !isJsonRecord(entry) ||
          typeof entry.label !== 'string' ||
          typeof entry.participantId !== 'string'
        ) {
          return []
        }

        return [
          {
            answeredAt: typeof entry.answeredAt === 'string' ? entry.answeredAt : '',
            label: entry.label,
            participantId: entry.participantId,
          },
        ]
      }),
      questionId: question.id,
      title: question.title,
      totals: question.config.options.map((label, optionIdx) => ({
        count: countsByOptionIndex.get(optionIdx) ?? 0,
        label,
        optionIdx,
      })),
      type: 'quiz',
    }
  }

  const unreachableQuestion: never = question
  throw new Error(`Unsupported question type: ${String(unreachableQuestion)}`)
}

export function mapQuestionRow(row: Tables<'questions'>): EditorQuestion {
  if (!isQuestionType(row.type)) {
    throw new Error(`Unsupported question type: ${row.type}`)
  }

  const baseQuestion = {
    id: row.id,
    orderIndex: row.order_index,
    sessionId: row.session_id,
    title: row.title,
  }

  switch (row.type) {
    case 'multiple_choice':
      return {
        ...baseQuestion,
        config: parseMultipleChoiceConfig(row.config),
        type: 'multiple_choice',
      }
    case 'word_cloud':
      return {
        ...baseQuestion,
        config: parseWordCloudConfig(row.config),
        type: 'word_cloud',
      }
    case 'open_ended':
      return {
        ...baseQuestion,
        config: parseOpenEndedConfig(row.config),
        type: 'open_ended',
      }
    case 'scales':
      return {
        ...baseQuestion,
        config: parseScalesConfig(row.config),
        type: 'scales',
      }
    case 'q_and_a':
      return {
        ...baseQuestion,
        config: parseGenericConfig(row.config),
        type: 'q_and_a',
      }
    case 'quiz':
      return {
        ...baseQuestion,
        config: parseQuizConfig(row.config),
        type: row.type,
      }
  }
}
