import type {
  EditorQuestion,
  MultipleChoiceQuestion,
  MultipleChoiceResults,
  OpenEndedQuestion,
  OpenEndedResults,
  QuestionResults,
  ScalesQuestion,
  ScalesResults,
  WordCloudQuestion,
  WordCloudResults,
} from '../types/questions'

export type DemoHostSlide = {
  audiencePrompt: string
  hostMove: string
  question: EditorQuestion
  results: QuestionResults
  whyItWorks: string
}

export type DemoHostRoom = {
  attendeeCount: number
  code: string
  id: string
  name: string
  slides: DemoHostSlide[]
  state: 'live'
}

const multipleChoiceQuestion: MultipleChoiceQuestion = {
  config: {
    chartType: 'bar',
    options: ['Share more examples', 'Shorten updates', 'Leave more Q&A time', 'Send notes later'],
  },
  id: 'demo-question-1',
  orderIndex: 0,
  sessionId: 'demo-room',
  title: "Which change would help next week's all-hands most?",
  type: 'multiple_choice',
}

const multipleChoiceResults: MultipleChoiceResults = {
  config: multipleChoiceQuestion.config,
  questionId: multipleChoiceQuestion.id,
  title: multipleChoiceQuestion.title,
  totals: [
    { count: 18, label: 'Share more examples', optionIdx: 0 },
    { count: 11, label: 'Shorten updates', optionIdx: 1 },
    { count: 9, label: 'Leave more Q&A time', optionIdx: 2 },
    { count: 5, label: 'Send notes later', optionIdx: 3 },
  ],
  type: 'multiple_choice',
}

const wordCloudQuestion: WordCloudQuestion = {
  config: {
    allowMultipleSubmissions: true,
  },
  id: 'demo-question-2',
  orderIndex: 1,
  sessionId: 'demo-room',
  title: "Share one word about today's planning session",
  type: 'word_cloud',
}

const wordCloudResults: WordCloudResults = {
  config: wordCloudQuestion.config,
  questionId: wordCloudQuestion.id,
  title: wordCloudQuestion.title,
  type: 'word_cloud',
  words: [
    { count: 12, word: 'alignment' },
    { count: 10, word: 'clarity' },
    { count: 8, word: 'focus' },
    { count: 7, word: 'momentum' },
    { count: 6, word: 'timing' },
    { count: 5, word: 'ownership' },
  ],
}

const scalesQuestion: ScalesQuestion = {
  config: {
    leftLabel: 'Needs work',
    rightLabel: 'Ready to ship',
  },
  id: 'demo-question-3',
  orderIndex: 2,
  sessionId: 'demo-room',
  title: 'How confident do you feel about launch readiness?',
  type: 'scales',
}

const scalesResults: ScalesResults = {
  average: 4.1,
  config: scalesQuestion.config,
  distribution: [
    { count: 1, rating: 1 },
    { count: 3, rating: 2 },
    { count: 7, rating: 3 },
    { count: 13, rating: 4 },
    { count: 16, rating: 5 },
  ],
  questionId: scalesQuestion.id,
  title: scalesQuestion.title,
  type: 'scales',
}

const openEndedQuestion: OpenEndedQuestion = {
  config: {
    maxLength: 280,
  },
  id: 'demo-question-4',
  orderIndex: 3,
  sessionId: 'demo-room',
  title: 'What should the host clarify before the team leaves the room?',
  type: 'open_ended',
}

const openEndedResults: OpenEndedResults = {
  config: openEndedQuestion.config,
  questionId: openEndedQuestion.id,
  responses: [
    {
      createdAt: '2026-04-22T09:02:00.000Z',
      id: 'demo-response-1',
      text: 'Spell out the timeline tradeoffs if we keep the current scope.',
    },
    {
      createdAt: '2026-04-22T09:02:23.000Z',
      id: 'demo-response-2',
      text: 'Confirm who owns the launch checklist between design and product.',
    },
    {
      createdAt: '2026-04-22T09:03:01.000Z',
      id: 'demo-response-3',
      text: 'Show one concrete example of the new onboarding email before we commit.',
    },
    {
      createdAt: '2026-04-22T09:03:22.000Z',
      id: 'demo-response-4',
      text: 'Explain what happens if rollout slips by a week.',
    },
  ],
  title: openEndedQuestion.title,
  type: 'open_ended',
}

export const demoHostRoom: DemoHostRoom = {
  attendeeCount: 43,
  code: '483129',
  id: 'demo-room',
  name: 'Quarterly planning pulse',
  slides: [
    {
      audiencePrompt: 'Everyone taps one option from their phone and sees the bars update live.',
      hostMove: 'Open with a fast vote to prove the room can influence what happens next.',
      question: multipleChoiceQuestion,
      results: multipleChoiceResults,
      whyItWorks:
        'Multiple choice gives the room a visible decision in under a minute and shows hosts where to go deeper.',
    },
    {
      audiencePrompt: 'People submit one or more words anonymously, so the emotional temperature shows up quickly.',
      hostMove: 'Switch to a word cloud when you want shared language, not a binary decision.',
      question: wordCloudQuestion,
      results: wordCloudResults,
      whyItWorks:
        'Word cloud questions surface the language people keep repeating, so a facilitator can turn vague sentiment into something visible.',
    },
    {
      audiencePrompt: 'A 1-5 scale makes confidence measurable without slowing the conversation down.',
      hostMove: 'Use scales to quantify risk before the group leaves with a false sense of alignment.',
      question: scalesQuestion,
      results: scalesResults,
      whyItWorks:
        'Scales help hosts spot whether the room is actually ready, even when spoken feedback sounds optimistic.',
    },
    {
      audiencePrompt: 'Open text replies collect the exact blockers that still need airtime before the session ends.',
      hostMove: 'Finish with open-ended input when you need concrete follow-up actions from the group.',
      question: openEndedQuestion,
      results: openEndedResults,
      whyItWorks:
        'Open responses preserve nuance and give the host language they can reuse in notes, backlog items, or follow-up meetings.',
    },
  ],
  state: 'live',
}

export function getDemoSlideResponseCount(slide: DemoHostSlide) {
  switch (slide.results.type) {
    case 'multiple_choice':
      return slide.results.totals.reduce((sum, total) => sum + total.count, 0)
    case 'word_cloud':
      return slide.results.words.reduce((sum, wordEntry) => sum + wordEntry.count, 0)
    case 'scales':
      return slide.results.distribution.reduce((sum, bucket) => sum + bucket.count, 0)
    case 'open_ended':
      return slide.results.responses.length
    case 'q_and_a':
      return slide.results.entries.length
    case 'quiz':
      return slide.results.totals.reduce((sum, total) => sum + total.count, 0)
    default:
      return 0
  }
}
