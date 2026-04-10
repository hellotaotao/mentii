import type { ScalesQuestion, ScalesResults } from '../../../types/questions'

type ScalesBigScreenProps = {
  question: ScalesQuestion
  results: ScalesResults
}

export default function ScalesBigScreen({ question, results }: ScalesBigScreenProps) {
  const totalResponses = results.distribution.reduce((sum, bucket) => sum + bucket.count, 0)
  const maxCount = Math.max(...results.distribution.map((bucket) => bucket.count), 0)
  const averageLabel = totalResponses > 0 ? `${results.average.toFixed(1)} / 5` : '—'

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <div className="space-y-4 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">scales</p>
        <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">{question.title}</h1>
        <p className="text-base text-slate-300">{`${totalResponses} total responses`}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Average score</p>
          <p className="mt-5 text-6xl font-semibold text-white">{averageLabel}</p>
          <div className="mt-8 flex items-start justify-between gap-4 text-sm text-slate-300">
            <span className="max-w-[45%] text-left">{question.config.leftLabel}</span>
            <span className="max-w-[45%] text-right">{question.config.rightLabel}</span>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          {totalResponses === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center text-center text-slate-300">
              Waiting for the first rating to arrive…
            </div>
          ) : (
            <div className="space-y-5">
              {results.distribution.map((bucket) => (
                <div key={`${question.id}-distribution-${bucket.rating}`}>
                  <div className="flex items-center justify-between text-sm text-slate-200">
                    <span className="font-medium">{`${bucket.rating} / 5`}</span>
                    <span>{`${bucket.count} votes`}</span>
                  </div>
                  <div className="mt-2 h-4 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                      style={{
                        width:
                          bucket.count === 0 || maxCount === 0
                            ? '0%'
                            : `${Math.max(10, (bucket.count / maxCount) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
