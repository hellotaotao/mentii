import type { ScalesQuestion, ScalesResults } from '../../../types/questions'
import { ResponseCount, SlideEmptyState, SlideLayout } from '../../slides/SlideChrome'

type ScalesBigScreenProps = {
  question: ScalesQuestion
  results: ScalesResults
}

const MAX_COLUMN_HEIGHT = 210

export default function ScalesBigScreen({ question, results }: ScalesBigScreenProps) {
  const totalResponses = results.distribution.reduce((sum, bucket) => sum + bucket.count, 0)
  const maxCount = Math.max(...results.distribution.map((bucket) => bucket.count), 0)
  // Position of the average on a 1-5 track, as a percentage.
  const averagePosition = ((results.average - 1) / 4) * 100

  return (
    <SlideLayout footer={<ResponseCount count={totalResponses} />} title={question.title}>
      {totalResponses === 0 ? (
        <SlideEmptyState>The average will appear here as people rate.</SlideEmptyState>
      ) : (
        <div className="flex h-full items-end gap-20 pb-6">
          <div className="w-[300px] shrink-0 pb-10">
            <p className="text-[140px] font-bold leading-none tracking-[-0.04em] tabular-nums text-slide-accent">
              {results.average.toFixed(1)}
            </p>
            <p className="mt-3 text-[26px] text-slide-muted">Average out of 5</p>
          </div>

          <div className="min-w-0 flex-1">
            <div className="grid grid-cols-5 items-end gap-6" style={{ height: MAX_COLUMN_HEIGHT + 50 }}>
              {results.distribution.map((bucket) => (
                <div className="flex flex-col items-center justify-end" key={`${question.id}-distribution-${bucket.rating}`}>
                  <span className="mb-3 text-[26px] font-semibold tabular-nums">{bucket.count}</span>
                  <div
                    className="w-full rounded-t-xl bg-slide-accent/80 transition-[height] duration-500"
                    style={{
                      height: maxCount === 0 ? 0 : Math.max(8, (bucket.count / maxCount) * MAX_COLUMN_HEIGHT),
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="relative mt-0 h-[6px] rounded-full bg-slide-line">
              <span
                aria-label={`Average ${results.average.toFixed(1)}`}
                className="absolute top-1/2 size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-[6px] border-slide-bg bg-slide-accent shadow-lg transition-[left] duration-500"
                style={{ left: `${10 + averagePosition * 0.8}%` }}
              />
            </div>

            <div className="mt-6 grid grid-cols-5 gap-6 text-center text-[26px] font-semibold tabular-nums">
              {results.distribution.map((bucket) => (
                <span key={bucket.rating}>{bucket.rating}</span>
              ))}
            </div>
            <div className="mt-4 flex justify-between text-[24px] text-slide-muted">
              <span>{question.config.leftLabel}</span>
              <span>{question.config.rightLabel}</span>
            </div>
          </div>
        </div>
      )}
    </SlideLayout>
  )
}
