import type { Json, Tables } from './database'

export const QUESTION_TYPES = [
  'multiple_choice',
  'word_cloud',
  'open_ended',
  'scales',
  'qa',
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
export type PlaceholderQuestion = QuestionBase<
  Exclude<QuestionType, 'multiple_choice' | 'word_cloud'>,
  GenericQuestionConfig
>

export type EditorQuestion = MultipleChoiceQuestion | WordCloudQuestion | PlaceholderQuestion

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
    allowMultipleSubmissions: config.allowMultipleSubmissions !== false,
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

export const questionRegistry = {
  multiple_choice: {
    createDefaultConfig: createDefaultMultipleChoiceConfig,
    defaultTitle: 'Ask your audience a question',
    hostEditorReady: true,
    label: 'Multiple Choice',
    type: 'multiple_choice',
  },
  open_ended: {
    createDefaultConfig: () => ({}),
    defaultTitle: 'Collect open-ended answers',
    hostEditorReady: false,
    label: 'Open Ended',
    type: 'open_ended',
  },
  qa: {
    createDefaultConfig: () => ({}),
    defaultTitle: 'Collect audience questions',
    hostEditorReady: false,
    label: 'Q&A',
    type: 'qa',
  },
  quiz: {
    createDefaultConfig: () => ({}),
    defaultTitle: 'Test your audience',
    hostEditorReady: false,
    label: 'Quiz',
    type: 'quiz',
  },
  scales: {
    createDefaultConfig: () => ({}),
    defaultTitle: 'Measure audience sentiment',
    hostEditorReady: false,
    label: 'Scales',
    type: 'scales',
  },
  word_cloud: {
    createDefaultConfig: createDefaultWordCloudConfig,
    defaultTitle: 'Capture words from the room',
    hostEditorReady: false,
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
    case 'qa':
    case 'quiz':
    case 'scales':
      return {
        ...baseQuestion,
        config: parseGenericConfig(row.config),
        type: row.type,
      }
  }
}
