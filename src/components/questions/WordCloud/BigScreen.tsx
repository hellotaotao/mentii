import { slideColor } from '../../../lib/presentationTheme'
import type { WordCloudQuestion, WordCloudResults, WordCloudResultWord } from '../../../types/questions'
import { ResponseCount, SlideEmptyState, SlideLayout } from '../../slides/SlideChrome'

type WordCloudBigScreenProps = {
  question: WordCloudQuestion
  results: WordCloudResults
}

const MAX_WORDS = 60
const MIN_FONT_SIZE = 30
const MAX_FONT_SIZE = 136

// Places the most frequent words in the middle and lets smaller ones fan out to both sides.
function arrangeCenterOut(words: WordCloudResultWord[]) {
  const arranged: WordCloudResultWord[] = []

  words.forEach((word, index) => {
    if (index % 2 === 0) {
      arranged.push(word)
    } else {
      arranged.unshift(word)
    }
  })

  return arranged
}

export default function WordCloudBigScreen({ question, results }: WordCloudBigScreenProps) {
  const totalResponses = results.words.reduce((sum, word) => sum + word.count, 0)
  const topWords = [...results.words].sort((left, right) => right.count - left.count).slice(0, MAX_WORDS)
  const maxCount = Math.max(...topWords.map((word) => word.count), 1)
  const colorByWord = new Map(topWords.map((word, index) => [word.word, slideColor(index)]))

  return (
    <SlideLayout footer={<ResponseCount count={totalResponses} />} title={question.title} titleAlign="center">
      {topWords.length === 0 ? (
        <SlideEmptyState>Words will appear here as people respond.</SlideEmptyState>
      ) : (
        <div className="flex h-full flex-wrap content-center items-center justify-center gap-x-10 gap-y-2 overflow-hidden px-8">
          {arrangeCenterOut(topWords).map((wordEntry) => {
            const ratio = Math.sqrt(wordEntry.count / maxCount)

            return (
              <span
                className="font-bold leading-none tracking-[-0.02em] transition-[font-size] duration-500"
                key={wordEntry.word}
                style={{
                  color: colorByWord.get(wordEntry.word),
                  fontSize: `${Math.round(MIN_FONT_SIZE + ratio * (MAX_FONT_SIZE - MIN_FONT_SIZE))}px`,
                }}
              >
                {wordEntry.word}
              </span>
            )
          })}
        </div>
      )}
    </SlideLayout>
  )
}
