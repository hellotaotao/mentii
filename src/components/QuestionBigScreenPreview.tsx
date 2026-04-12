import MultipleChoiceBigScreen from './questions/MultipleChoice/BigScreen'
import OpenEndedBigScreen from './questions/OpenEnded/BigScreen'
import QAndABigScreen from './questions/QAndA/BigScreen'
import QuizBigScreen from './questions/Quiz/BigScreen'
import ScalesBigScreen from './questions/Scales/BigScreen'
import WordCloudBigScreen from './questions/WordCloud/BigScreen'
import {
  isMultipleChoiceQuestion,
  isOpenEndedQuestion,
  isQAndAQuestion,
  isQuizQuestion,
  isScalesQuestion,
  isWordCloudQuestion,
  type EditorQuestion,
} from '../types/questions'

type QuestionBigScreenPreviewProps = {
  question: EditorQuestion | null
}

export default function QuestionBigScreenPreview({ question }: QuestionBigScreenPreviewProps) {
  if (!question) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
        Choose a slide to preview the real big-screen renderer.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-900/10 bg-slate-950 text-white shadow-xl">
      <div className="border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-300">
        Live renderer preview
      </div>

      <div className="p-4 sm:p-6">
        {isMultipleChoiceQuestion(question) ? (
          <MultipleChoiceBigScreen
            question={question}
            results={{
              config: question.config,
              questionId: question.id,
              title: question.title,
              totals: question.config.options.map((label, optionIdx) => ({
                count: 0,
                label,
                optionIdx,
              })),
              type: 'multiple_choice',
            }}
          />
        ) : isOpenEndedQuestion(question) ? (
          <OpenEndedBigScreen
            question={question}
            results={{
              config: question.config,
              questionId: question.id,
              responses: [],
              title: question.title,
              type: 'open_ended',
            }}
          />
        ) : isQAndAQuestion(question) ? (
          <QAndABigScreen
            actionEntryId={null}
            onToggleAnswered={() => {}}
            question={question}
            results={{
              config: question.config,
              entries: [],
              questionId: question.id,
              title: question.title,
              type: 'q_and_a',
            }}
          />
        ) : isQuizQuestion(question) ? (
          <QuizBigScreen
            isVotingOpen
            question={question}
            remainingSeconds={question.config.durationSeconds}
            results={{
              config: question.config,
              correctOptionIdx: question.config.correctOptionIdx,
              leaderboard: [],
              questionId: question.id,
              title: question.title,
              totals: question.config.options.map((label, optionIdx) => ({
                count: 0,
                label,
                optionIdx,
              })),
              type: 'quiz',
            }}
          />
        ) : isScalesQuestion(question) ? (
          <ScalesBigScreen
            question={question}
            results={{
              average: 0,
              config: question.config,
              distribution: [1, 2, 3, 4, 5].map((rating) => ({
                count: 0,
                rating,
              })),
              questionId: question.id,
              title: question.title,
              type: 'scales',
            }}
          />
        ) : isWordCloudQuestion(question) ? (
          <WordCloudBigScreen
            question={question}
            results={{
              config: question.config,
              questionId: question.id,
              title: question.title,
              type: 'word_cloud',
              words: [],
            }}
          />
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-6 text-center text-slate-300">
            This question type does not have a big-screen renderer yet.
          </div>
        )}
      </div>
    </div>
  )
}
