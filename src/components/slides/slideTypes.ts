import {
  BarChart3,
  Cloud,
  FileText,
  Medal,
  MessageSquare,
  SlidersHorizontal,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import type { QuestionType } from '../../types/questions'

export type SlideTypeMeta = {
  description: string
  group: 'Questions' | 'Quiz competition'
  Icon: LucideIcon
  title: string
  type: QuestionType
}

export const SLIDE_TYPES: SlideTypeMeta[] = [
  { description: 'Vote on predefined options', group: 'Questions', Icon: BarChart3, title: 'Multiple choice', type: 'multiple_choice' },
  { description: 'Collect words as a live cloud', group: 'Questions', Icon: Cloud, title: 'Word cloud', type: 'word_cloud' },
  { description: 'Gather free-text answers', group: 'Questions', Icon: FileText, title: 'Open ended', type: 'open_ended' },
  { description: 'Rate a statement from 1 to 5', group: 'Questions', Icon: SlidersHorizontal, title: 'Scales', type: 'scales' },
  { description: 'Audience asks and upvotes questions', group: 'Questions', Icon: MessageSquare, title: 'Q&A', type: 'q_and_a' },
  { description: 'Timed question with a correct answer', group: 'Quiz competition', Icon: Trophy, title: 'Quiz', type: 'quiz' },
  { description: 'Cumulative scores or the final podium', group: 'Quiz competition', Icon: Medal, title: 'Leaderboard', type: 'leaderboard' },
]

export function getSlideTypeMeta(type: QuestionType) {
  return SLIDE_TYPES.find((meta) => meta.type === type) ?? SLIDE_TYPES[0]
}
