import { useParams } from 'react-router-dom'
import SessionCodeBar from '../components/SessionCodeBar'
import MultipleChoiceBigScreen from '../components/questions/MultipleChoice/BigScreen'
import { useQuestionResults } from '../hooks/useQuestionResults'
import { useSession } from '../hooks/useSession'
import { isMultipleChoiceQuestion } from '../types/questions'

export default function BigScreen() {
  const { sessionId = '' } = useParams()
  const { currentQuestion, errorMessage, session, status } = useSession(sessionId)
  const {
    errorMessage: resultsErrorMessage,
    results,
    status: resultsStatus,
  } = useQuestionResults(currentQuestion)

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-300">Big screen</p>
          <h1 className="mt-3 text-3xl font-semibold">Loading presentation…</h1>
          <p className="mt-4 text-sm text-slate-300">Fetching the live session, current slide, and vote totals.</p>
        </section>
      </main>
    )
  }

  if (status === 'error' || !session || !currentQuestion) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <section className="w-full max-w-md rounded-3xl border border-rose-300/30 bg-rose-400/10 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-rose-200">Big screen</p>
          <h1 className="mt-3 text-3xl font-semibold">Unable to load the presentation</h1>
          <p className="mt-4 text-sm text-rose-100">{errorMessage ?? 'Try refreshing the page.'}</p>
        </section>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-950 text-white">
      <SessionCodeBar code={session.code} />

      <section className="flex flex-1 items-center justify-center px-6 py-10 sm:px-8">
        {resultsStatus === 'error' ? (
          <div className="w-full max-w-2xl rounded-[32px] border border-rose-300/30 bg-rose-400/10 p-10 text-center">
            <h2 className="text-3xl font-semibold">Unable to load live results</h2>
            <p className="mt-4 text-base text-rose-100">{resultsErrorMessage ?? 'Try refreshing the page.'}</p>
          </div>
        ) : resultsStatus === 'loading' || !results ? (
          <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-white/5 p-10 text-center">
            <h2 className="text-3xl font-semibold">{currentQuestion.title}</h2>
            <p className="mt-4 text-base text-slate-300">Loading the latest audience responses…</p>
          </div>
        ) : isMultipleChoiceQuestion(currentQuestion) && results.type === 'multiple_choice' ? (
          <MultipleChoiceBigScreen question={currentQuestion} results={results} />
        ) : (
          <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-white/5 p-10 text-center">
            <h2 className="text-3xl font-semibold">{currentQuestion.title}</h2>
            <p className="mt-4 text-base text-slate-300">
              This question type will receive its big-screen renderer in a later phase.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}
