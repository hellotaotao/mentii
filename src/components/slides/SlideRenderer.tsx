import type { QuizLeaderboard } from '../../lib/quizGame'
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
import { createEmptyResults } from './emptyResults'
import LeaderboardBigScreen from '../questions/Leaderboard/BigScreen'
import MultipleChoiceBigScreen from '../questions/MultipleChoice/BigScreen'
import OpenEndedBigScreen from '../questions/OpenEnded/BigScreen'
import QAndABigScreen from '../questions/QAndA/BigScreen'
import QuizBigScreen from '../questions/Quiz/BigScreen'
import ScalesBigScreen from '../questions/Scales/BigScreen'
import WordCloudBigScreen from '../questions/WordCloud/BigScreen'
import { SlideLayout } from './SlideChrome'

const SAMPLE_LEADERBOARD: QuizLeaderboard = {
  entries: [
    { emoji: '🦊', nickname: 'Brave Fox', score: 2730 },
    { emoji: '🐼', nickname: 'Sleepy Panda', score: 2415 },
    { emoji: '🦉', nickname: 'Witty Owl', score: 1980 },
    { emoji: '🐙', nickname: 'Funky Octopus', score: 1220 },
  ].map((entry, index) => ({
    ...entry,
    correctCount: 3 - Math.min(index, 2),
    lastPoints: 0,
    participantId: `sample-${index}`,
    previousRank: index + 1,
    rank: index + 1,
    realName: null,
  })),
  totalPlayers: 4,
}

type SlideRendererProps = {
  // Celebrations (confetti) only run on the real big screen.
  celebrate?: boolean
  isVotingOpen?: boolean
  leaderboard?: QuizLeaderboard | null
  onToggleQAndAAnswered?: (entryId: string, nextAnswered: boolean) => void
  playerCount?: number
  // Preview renders sample/empty data for the editor canvas and thumbnails.
  preview?: boolean
  qAndAActionEntryId?: string | null
  question: EditorQuestion
  quizRemainingSeconds?: number | null
  results: QuestionResults | null
}

export default function SlideRenderer({
  celebrate = false,
  isVotingOpen = true,
  leaderboard,
  onToggleQAndAAnswered = () => {},
  playerCount,
  preview = false,
  qAndAActionEntryId = null,
  question,
  quizRemainingSeconds = null,
  results,
}: SlideRendererProps) {
  const isPreview = preview
  const slideResults = results && results.questionId === question.id ? results : createEmptyResults(question)

  if (isMultipleChoiceQuestion(question) && slideResults.type === 'multiple_choice') {
    return <MultipleChoiceBigScreen question={question} results={slideResults} />
  }

  if (isWordCloudQuestion(question) && slideResults.type === 'word_cloud') {
    return <WordCloudBigScreen question={question} results={slideResults} />
  }

  if (isOpenEndedQuestion(question) && slideResults.type === 'open_ended') {
    return <OpenEndedBigScreen question={question} results={slideResults} />
  }

  if (isScalesQuestion(question) && slideResults.type === 'scales') {
    return <ScalesBigScreen question={question} results={slideResults} />
  }

  if (isQAndAQuestion(question) && slideResults.type === 'q_and_a') {
    return (
      <QAndABigScreen
        actionEntryId={qAndAActionEntryId}
        onToggleAnswered={onToggleQAndAAnswered}
        question={question}
        results={slideResults}
      />
    )
  }

  if (isQuizQuestion(question) && slideResults.type === 'quiz') {
    return (
      <QuizBigScreen
        isVotingOpen={isPreview ? true : isVotingOpen}
        leaderboard={leaderboard}
        playerCount={playerCount}
        question={question}
        remainingSeconds={isPreview ? question.config.durationSeconds : quizRemainingSeconds}
        results={slideResults}
      />
    )
  }

  if (isLeaderboardQuestion(question)) {
    return (
      <LeaderboardBigScreen
        celebrate={celebrate}
        leaderboard={isPreview ? SAMPLE_LEADERBOARD : (leaderboard ?? null)}
        question={question}
      />
    )
  }

  return (
    <SlideLayout title={question.title}>
      <p className="text-[28px] text-slide-muted">This slide type cannot be displayed yet.</p>
    </SlideLayout>
  )
}
