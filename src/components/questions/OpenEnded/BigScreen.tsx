import type { OpenEndedQuestion, OpenEndedResults } from '../../../types/questions'
import { ResponseCount, SlideEmptyState, SlideLayout } from '../../slides/SlideChrome'

type OpenEndedBigScreenProps = {
  question: OpenEndedQuestion
  results: OpenEndedResults
}

const MAX_VISIBLE_RESPONSES = 9

export default function OpenEndedBigScreen({ question, results }: OpenEndedBigScreenProps) {
  const visibleResponses = results.responses.slice(0, MAX_VISIBLE_RESPONSES)

  return (
    <SlideLayout footer={<ResponseCount count={results.responses.length} />} title={question.title}>
      {visibleResponses.length === 0 ? (
        <SlideEmptyState>Responses will appear here as people submit them.</SlideEmptyState>
      ) : (
        <div className="grid h-full auto-rows-min grid-cols-3 gap-6 overflow-hidden">
          {visibleResponses.map((response) => (
            <article
              className="mentii-pop-in rounded-3xl bg-slide-subtle px-8 py-7 text-[28px] leading-snug"
              key={response.id}
            >
              <p className="line-clamp-4 whitespace-pre-wrap">{response.text}</p>
            </article>
          ))}
        </div>
      )}
    </SlideLayout>
  )
}
