import type { OpenEndedQuestion, OpenEndedResults } from '../../../types/questions'

type OpenEndedBigScreenProps = {
  question: OpenEndedQuestion
  results: OpenEndedResults
}

export default function OpenEndedBigScreen({ question, results }: OpenEndedBigScreenProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <div className="space-y-4 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">open ended</p>
        <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">{question.title}</h1>
        <p className="text-base text-slate-300">{`${results.responses.length} total responses`}</p>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
        {results.responses.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center text-center text-slate-300">
            Waiting for the first response to arrive…
          </div>
        ) : (
          <div className="grid max-h-[420px] gap-4 overflow-y-auto pr-2 md:grid-cols-2">
            {results.responses.map((response, index) => (
              <article
                className="rounded-3xl border border-white/10 bg-slate-950/70 px-5 py-4 shadow-sm transition-transform duration-300"
                key={response.id}
              >
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{`Response ${index + 1}`}</p>
                <p className="mt-3 whitespace-pre-wrap text-lg leading-8 text-slate-100">{response.text}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
