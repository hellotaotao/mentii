import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import PresenterControls from '../components/PresenterControls'
import SessionCodeBar from '../components/SessionCodeBar'
import MultipleChoiceBigScreen from '../components/questions/MultipleChoice/BigScreen'
import OpenEndedBigScreen from '../components/questions/OpenEnded/BigScreen'
import QAndABigScreen from '../components/questions/QAndA/BigScreen'
import QuizBigScreen from '../components/questions/Quiz/BigScreen'
import ScalesBigScreen from '../components/questions/Scales/BigScreen'
import WordCloudBigScreen from '../components/questions/WordCloud/BigScreen'
import { useQuestionResults } from '../hooks/useQuestionResults'
import { useSession } from '../hooks/useSession'
import { subscribeToSessionPresenceCount } from '../lib/realtime'
import { resetQuestionResults, setQAndAEntryAnswered, updateSession } from '../lib/supabaseQueries'
import {
  isMultipleChoiceQuestion,
  isOpenEndedQuestion,
  isQAndAQuestion,
  isQuizQuestion,
  isScalesQuestion,
  isWordCloudQuestion,
} from '../types/questions'

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Unable to update presenter controls.'
}

function createQuestionCycleStartedAt() {
  return new Date().toISOString()
}

export default function BigScreen() {
  const { sessionId = '' } = useParams()
  const [controlsVisible, setControlsVisible] = useState(false)
  const [controlErrorMessage, setControlErrorMessage] = useState<string | null>(null)
  const [participantCount, setParticipantCount] = useState(0)
  const [qAndAActionEntryId, setQAndAActionEntryId] = useState<string | null>(null)
  const [quizRemainingSeconds, setQuizRemainingSeconds] = useState<number | null>(null)
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { currentQuestion, errorMessage, mergeSessionUpdate, questions, session, status } = useSession(sessionId)
  const {
    errorMessage: resultsErrorMessage,
    refreshResults,
    results,
    status: resultsStatus,
  } = useQuestionResults(currentQuestion)
  const currentQuestionIndex = useMemo(
    () => questions.findIndex((question) => question.id === currentQuestion?.id),
    [currentQuestion?.id, questions],
  )
  const previousQuestion =
    currentQuestionIndex > 0 ? questions[currentQuestionIndex - 1] ?? null : null
  const nextQuestion =
    currentQuestionIndex >= 0 && currentQuestionIndex < questions.length - 1
      ? questions[currentQuestionIndex + 1] ?? null
      : null
  const activeQuizQuestion = currentQuestion && isQuizQuestion(currentQuestion) ? currentQuestion : null
  const activeQuizCycleStartedAt = activeQuizQuestion ? session?.question_cycle_started_at ?? null : null
  const activeQuizQuestionId = activeQuizQuestion?.id ?? null
  const activeQuizDurationSeconds = activeQuizQuestion?.config.durationSeconds ?? null

  const revealControls = useCallback(() => {
    setControlsVisible(true)

    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current)
    }

    hideControlsTimerRef.current = setTimeout(() => {
      setControlsVisible(false)
    }, 2000)
  }, [])

  useEffect(() => {
    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!sessionId) {
      return
    }

    const unsubscribe = subscribeToSessionPresenceCount(sessionId, setParticipantCount)

    return () => {
      unsubscribe()
    }
  }, [sessionId])

  const commitSessionUpdate = useCallback(async (nextSessionFields: Partial<NonNullable<typeof session>>) => {
    if (!session) {
      return
    }

    setControlErrorMessage(null)
    const previousSession = session
    mergeSessionUpdate(nextSessionFields)

    try {
      await updateSession(session.id, nextSessionFields)
    } catch (error) {
      mergeSessionUpdate(previousSession)
      setControlErrorMessage(getErrorMessage(error))
    }
  }, [mergeSessionUpdate, session])

  const handleGoToQuestion = useCallback(async (questionId: string | null) => {
    if (!questionId) {
      return
    }

    revealControls()
    await commitSessionUpdate({
      current_question_id: questionId,
      question_cycle_started_at: createQuestionCycleStartedAt(),
      results_hidden: false,
      voting_open: true,
    })
  }, [commitSessionUpdate, revealControls])

  const handleResetResults = useCallback(async () => {
    if (!currentQuestion) {
      return
    }

    revealControls()
    setControlErrorMessage(null)

    try {
      await resetQuestionResults(currentQuestion.id)
      refreshResults()
    } catch (error) {
      setControlErrorMessage(getErrorMessage(error))
    }
  }, [currentQuestion, refreshResults, revealControls])

  const handleToggleFullscreen = useCallback(async () => {
    revealControls()

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen?.()
        return
      }

      await document.documentElement.requestFullscreen?.()
    } catch (error) {
      setControlErrorMessage(getErrorMessage(error))
    }
  }, [revealControls])

  const handleToggleQAndAAnswered = useCallback(async (entryId: string, nextAnswered: boolean) => {
    setQAndAActionEntryId(entryId)
    setControlErrorMessage(null)

    try {
      await setQAndAEntryAnswered(entryId, nextAnswered)
      refreshResults()
    } catch (error) {
      setControlErrorMessage(getErrorMessage(error))
    } finally {
      setQAndAActionEntryId((currentEntryId) => (currentEntryId === entryId ? null : currentEntryId))
    }
  }, [refreshResults])

  useEffect(() => {
    if (!activeQuizQuestionId || !activeQuizDurationSeconds || !activeQuizCycleStartedAt || !session?.voting_open) {
      setQuizRemainingSeconds(null)
      return
    }

    const deadline = new Date(activeQuizCycleStartedAt).getTime() + activeQuizDurationSeconds * 1000
    setQuizRemainingSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))

    const interval = window.setInterval(() => {
      const nextRemainingSeconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setQuizRemainingSeconds(nextRemainingSeconds)

      if (nextRemainingSeconds === 0) {
        window.clearInterval(interval)
        void commitSessionUpdate({
          voting_open: false,
        })
      }
    }, 250)

    return () => {
      window.clearInterval(interval)
    }
  }, [
    commitSessionUpdate,
    activeQuizCycleStartedAt,
    activeQuizQuestionId,
    activeQuizDurationSeconds,
    session?.voting_open,
  ])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!session || !currentQuestion) {
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        void handleGoToQuestion(previousQuestion?.id ?? null)
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        void handleGoToQuestion(nextQuestion?.id ?? null)
        return
      }

      if (event.key.toLowerCase() === 'h') {
        event.preventDefault()
        void commitSessionUpdate({
          results_hidden: !session.results_hidden,
        })
        return
      }

      if (event.key.toLowerCase() === 'r') {
        event.preventDefault()
        void handleResetResults()
        return
      }

      if (event.key.toLowerCase() === 'f') {
        event.preventDefault()
        void handleToggleFullscreen()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    commitSessionUpdate,
    currentQuestion,
    handleGoToQuestion,
    handleResetResults,
    handleToggleFullscreen,
    nextQuestion?.id,
    previousQuestion?.id,
    session,
  ])

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
    <main
      className="flex min-h-screen flex-col bg-slate-950 text-white"
      data-testid="big-screen-shell"
      onMouseMove={(event) => {
        if (event.clientY >= window.innerHeight - 100) {
          revealControls()
        }
      }}
    >
      <SessionCodeBar code={session.code} />

      <section className="flex flex-1 items-center justify-center px-6 py-10 sm:px-8">
        {session.results_hidden ? (
          <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-white/5 p-10 text-center">
            <h2 className="text-3xl font-semibold">{currentQuestion.title}</h2>
            <p className="mt-4 text-base text-slate-300">Results are hidden while the presenter speaks.</p>
          </div>
        ) : resultsStatus === 'error' ? (
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
        ) : isOpenEndedQuestion(currentQuestion) && results.type === 'open_ended' ? (
          <OpenEndedBigScreen question={currentQuestion} results={results} />
        ) : isQAndAQuestion(currentQuestion) && results.type === 'q_and_a' ? (
          <QAndABigScreen
            actionEntryId={qAndAActionEntryId}
            onToggleAnswered={handleToggleQAndAAnswered}
            question={currentQuestion}
            results={results}
          />
        ) : isQuizQuestion(currentQuestion) && results.type === 'quiz' ? (
          <QuizBigScreen
            isVotingOpen={session.voting_open}
            question={currentQuestion}
            remainingSeconds={quizRemainingSeconds}
            results={results}
          />
        ) : isScalesQuestion(currentQuestion) && results.type === 'scales' ? (
          <ScalesBigScreen question={currentQuestion} results={results} />
        ) : isWordCloudQuestion(currentQuestion) && results.type === 'word_cloud' ? (
          <WordCloudBigScreen question={currentQuestion} results={results} />
        ) : (
          <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-white/5 p-10 text-center">
            <h2 className="text-3xl font-semibold">{currentQuestion.title}</h2>
            <p className="mt-4 text-base text-slate-300">
              This question type will receive its big-screen renderer in a later phase.
            </p>
          </div>
        )}
      </section>

      {controlErrorMessage ? (
        <div className="fixed right-6 top-28 z-20 rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {controlErrorMessage}
        </div>
      ) : null}

      <div className="fixed bottom-6 right-6 z-10 rounded-full border border-white/10 bg-slate-950/85 px-4 py-2 text-sm font-medium text-slate-100 shadow-xl backdrop-blur">
        {`${participantCount} participants`}
      </div>

      {controlsVisible ? (
        <PresenterControls
          canGoNext={Boolean(nextQuestion)}
          canGoPrevious={Boolean(previousQuestion)}
          onNext={() => {
            void handleGoToQuestion(nextQuestion?.id ?? null)
          }}
          onPrevious={() => {
            void handleGoToQuestion(previousQuestion?.id ?? null)
          }}
          onResetResults={() => {
            void handleResetResults()
          }}
          onToggleFullscreen={() => {
            void handleToggleFullscreen()
          }}
          onToggleResults={() => {
            void commitSessionUpdate({
              results_hidden: !session.results_hidden,
            })
          }}
          onToggleVoting={() => {
            void commitSessionUpdate({
              ...(isQuizQuestion(currentQuestion) && !session.voting_open
                ? {
                    question_cycle_started_at: createQuestionCycleStartedAt(),
                  }
                : {}),
              voting_open: !session.voting_open,
            })
          }}
          resultsHidden={session.results_hidden}
          votingOpen={session.voting_open}
        />
      ) : null}
    </main>
  )
}
