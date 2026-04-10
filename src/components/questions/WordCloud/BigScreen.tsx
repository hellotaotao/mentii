import type { WordCloudQuestion, WordCloudResults } from '../../../types/questions'

type WordCloudBigScreenProps = {
  question: WordCloudQuestion
  results: WordCloudResults
}

export default function WordCloudBigScreen({ question, results }: WordCloudBigScreenProps) {
  const totalResponses = results.words.reduce((sum, word) => sum + word.count, 0)
  const maxCount = Math.max(...results.words.map((word) => word.count), 1)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <div className="space-y-4 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">word cloud</p>
        <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">{question.title}</h1>
        <p className="text-base text-slate-300">{`${totalResponses} total responses`}</p>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
        {results.words.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center text-center text-slate-300">
            Waiting for the first word to arrive…
          </div>
        ) : (
          <div className="flex min-h-[320px] flex-wrap items-center justify-center gap-4">
            {results.words.map((wordEntry) => {
              const ratio = wordEntry.count / maxCount

              return (
                <span
                  className="rounded-full px-3 py-2 font-semibold text-cyan-100 transition-all duration-300"
                  key={wordEntry.word}
                  style={{
                    fontSize: `${16 + ratio * 48}px`,
                    opacity: 0.5 + ratio * 0.5,
                  }}
                >
                  {wordEntry.word}
                </span>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
