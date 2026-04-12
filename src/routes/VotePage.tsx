import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import MultipleChoicePhone from '../components/questions/MultipleChoice/Phone'
import OpenEndedPhone from '../components/questions/OpenEnded/Phone'
import QAndAPhone from '../components/questions/QAndA/Phone'
import QuizPhone from '../components/questions/Quiz/Phone'
import ScalesPhone from '../components/questions/Scales/Phone'
import WordCloudPhone from '../components/questions/WordCloud/Phone'
import {
  subscribeToQuestionResultSignals,
  subscribeToSessionQuestionChanges,
  subscribeToSessionUpdates,
  trackAudiencePresence,
} from '../lib/realtime'
import { getParticipantId } from '../lib/participantId'
import {
  getQuestionResults,
  getSessionByCode,
  submitMultipleChoiceVote,
  submitOpenEndedVote,
  submitQAndAEntry,
  submitQuizVote,
  submitScalesVote,
  submitWordCloudVote,
  upvoteQAndAEntry,
} from '../lib/supabaseQueries'
import type { Tables } from '../types/database'
import {
  isMultipleChoiceQuestion,
  isOpenEndedQuestion,
  isQAndAQuestion,
  isQuizQuestion,
  isScalesQuestion,
  isWordCloudQuestion,
  type QAndAResults,
  type SessionEditorData,
} from '../types/questions'

type VotePageState = {
  errorMessage: string | null
  sessionData: SessionEditorData | null
  status: 'error' | 'loading' | 'ready'
}

type QAndAResultsState = {
  errorMessage: string | null
  results: QAndAResults | null
  status: 'error' | 'idle' | 'loading' | 'ready'
}

const RESULTS_REFRESH_DEBOUNCE_MS = 200

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Unable to load this session.'
}

export default function VotePage() {
  const { sessionCode = '' } = useParams()
  const [state, setState] = useState<VotePageState>({
    errorMessage: null,
    sessionData: null,
    status: sessionCode ? 'loading' : 'error',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [qAndAActionEntryId, setQAndAActionEntryId] = useState<string | null>(null)
  const [qAndAResultsState, setQAndAResultsState] = useState<QAndAResultsState>({
    errorMessage: null,
    results: null,
    status: 'idle',
  })
  const latestQAndARequestIdRef = useRef(0)
  const [qAndASuccessMessage, setQAndASuccessMessage] = useState<string | null>(null)
  const [submittedSingleResponseQuestionId, setSubmittedSingleResponseQuestionId] = useState<string | null>(null)
  const [wordCloudSuccessQuestionId, setWordCloudSuccessQuestionId] = useState<string | null>(null)
  const [quizRemainingSeconds, setQuizRemainingSeconds] = useState<number | null>(null)

  useEffect(() => {
    if (!sessionCode) {
      return
    }

    let isActive = true

    void getSessionByCode(sessionCode)
      .then((sessionData) => {
        if (!isActive) {
          return
        }

        setState({
          errorMessage: null,
          sessionData,
          status: 'ready',
        })
      })
      .catch((error) => {
        if (!isActive) {
          return
        }

        setState({
          errorMessage: getErrorMessage(error),
          sessionData: null,
          status: 'error',
        })
      })

    return () => {
      isActive = false
    }
  }, [sessionCode])

  useEffect(() => {
    const sessionId = state.sessionData?.session.id

    if (!sessionId || !sessionCode) {
      return
    }

    let isActive = true
    let latestRefreshRequestId = 0

    async function refreshSessionData() {
      const requestId = latestRefreshRequestId + 1
      latestRefreshRequestId = requestId

      try {
        const nextSessionData = await getSessionByCode(sessionCode)

        if (!isActive || latestRefreshRequestId !== requestId) {
          return
        }

        setState({
          errorMessage: null,
          sessionData: nextSessionData,
          status: 'ready',
        })
      } catch (error) {
        if (!isActive || latestRefreshRequestId !== requestId) {
          return
        }

        setState((currentState) => ({
          ...currentState,
          errorMessage: getErrorMessage(error),
        }))
      }
    }

    const unsubscribePresence = trackAudiencePresence(sessionId, getParticipantId())

    const unsubscribeSessionUpdates = subscribeToSessionUpdates(sessionId, (nextSession: Tables<'sessions'>) => {
      setState((currentState) => {
        if (!currentState.sessionData) {
          return currentState
        }

        return {
          ...currentState,
          sessionData: {
            ...currentState.sessionData,
            session: {
              ...currentState.sessionData.session,
              ...nextSession,
            },
          },
        }
      })
    })
    const unsubscribeQuestionChanges = subscribeToSessionQuestionChanges(sessionId, () => {
      void refreshSessionData()
    })

    return () => {
      isActive = false
      unsubscribePresence()
      unsubscribeSessionUpdates()
      unsubscribeQuestionChanges()
    }
  }, [sessionCode, state.sessionData?.session.id])

  const currentQuestion = useMemo(() => {
    const questions = state.sessionData?.questions ?? []
    const currentQuestionId = state.sessionData?.session.current_question_id

    return questions.find((question) => question.id === currentQuestionId) ?? questions[0] ?? null
  }, [state.sessionData])

  const hasSubmittedCurrentQuestion = submittedSingleResponseQuestionId === currentQuestion?.id
  const showWordCloudSuccess = wordCloudSuccessQuestionId === currentQuestion?.id
  const inlineErrorMessage = state.errorMessage ?? qAndAResultsState.errorMessage
  const activeQAndAQuestion = currentQuestion && isQAndAQuestion(currentQuestion) ? currentQuestion : null
  const activeQuizQuestion = currentQuestion && isQuizQuestion(currentQuestion) ? currentQuestion : null

  useEffect(() => {
    if (!activeQuizQuestion || !state.sessionData?.session.voting_open) {
      setQuizRemainingSeconds(null)
      return
    }

    const quizCycleStartedAtTimestamp = Date.parse(state.sessionData.session.question_cycle_started_at)
    if (!Number.isFinite(quizCycleStartedAtTimestamp)) {
      setQuizRemainingSeconds(activeQuizQuestion.config.durationSeconds)
      return
    }

    const deadlineTimestamp = quizCycleStartedAtTimestamp + activeQuizQuestion.config.durationSeconds * 1000

    function updateRemainingSeconds() {
      setQuizRemainingSeconds(Math.max(0, Math.ceil((deadlineTimestamp - Date.now()) / 1000)))
    }

    updateRemainingSeconds()

    const interval = window.setInterval(() => {
      updateRemainingSeconds()
    }, 250)

    return () => {
      window.clearInterval(interval)
    }
  }, [
    activeQuizQuestion,
    state.sessionData?.session.question_cycle_started_at,
    state.sessionData?.session.voting_open,
  ])

  const isQuizTimeUp =
    Boolean(activeQuizQuestion) &&
    state.sessionData?.session.voting_open &&
    (quizRemainingSeconds ?? activeQuizQuestion?.config.durationSeconds ?? 0) <= 0

  useEffect(() => {
    if (!state.sessionData?.session.question_cycle_started_at) {
      return
    }

    setSubmittedSingleResponseQuestionId(null)
    setWordCloudSuccessQuestionId(null)
    setQAndASuccessMessage(null)
  }, [state.sessionData?.session.current_question_id, state.sessionData?.session.question_cycle_started_at])

  const audienceDescription = useMemo(() => {
    if (!currentQuestion) {
      return ''
    }

    if (isMultipleChoiceQuestion(currentQuestion)) {
      return 'Choose one answer. Results stay on the presenter screen.'
    }

    if (isOpenEndedQuestion(currentQuestion)) {
      return 'Share a short text response. Results stay on the presenter screen.'
    }

    if (isQAndAQuestion(currentQuestion)) {
      return 'Submit a question or upvote another one. Results stay on the presenter screen.'
    }

    if (isQuizQuestion(currentQuestion)) {
      return 'Pick the best answer before the timer ends. Results stay on the presenter screen.'
    }

    if (isScalesQuestion(currentQuestion)) {
      return 'Choose a rating from 1 to 5. Results stay on the presenter screen.'
    }

    if (isWordCloudQuestion(currentQuestion)) {
      return 'Share a word or short phrase. Results stay on the presenter screen.'
    }

    return 'Respond from your phone while the presenter keeps results on the big screen.'
  }, [currentQuestion])

  useEffect(() => {
    setQAndAActionEntryId(null)
    setQAndASuccessMessage(null)

    if (!activeQAndAQuestion) {
      setQAndAResultsState({
        errorMessage: null,
        results: null,
        status: 'idle',
      })
      return
    }

    const qAndAQuestion = activeQAndAQuestion
    let isActive = true
    let refreshTimer: ReturnType<typeof setTimeout> | null = null

    async function loadQAndAResults() {
      const requestId = latestQAndARequestIdRef.current + 1
      latestQAndARequestIdRef.current = requestId

      setQAndAResultsState((currentState) => ({
        errorMessage: null,
        results: currentState.results,
        status: currentState.results?.questionId === qAndAQuestion.id ? 'ready' : 'loading',
      }))

      try {
        const nextResults = await getQuestionResults(qAndAQuestion)

        if (!isActive || latestQAndARequestIdRef.current !== requestId) {
          return
        }

        if (nextResults.type !== 'q_and_a') {
          throw new Error('Unable to load the Q&A feed.')
        }

        setQAndAResultsState({
          errorMessage: null,
          results: nextResults,
          status: 'ready',
        })
      } catch (error) {
        if (!isActive || latestQAndARequestIdRef.current !== requestId) {
          return
        }

        setQAndAResultsState({
          errorMessage: getErrorMessage(error),
          results: null,
          status: 'error',
        })
      }
    }

    function scheduleQAndARefresh() {
      if (refreshTimer) {
        clearTimeout(refreshTimer)
      }

      refreshTimer = setTimeout(() => {
        refreshTimer = null
        void loadQAndAResults()
      }, RESULTS_REFRESH_DEBOUNCE_MS)
    }

    void loadQAndAResults()
    const unsubscribe = subscribeToQuestionResultSignals(qAndAQuestion.id, () => {
      scheduleQAndARefresh()
    })

    return () => {
      isActive = false

      if (refreshTimer) {
        clearTimeout(refreshTimer)
      }

      unsubscribe()
    }
  }, [activeQAndAQuestion])

  async function handleVote(optionIdx: number) {
    if (!currentQuestion || !isMultipleChoiceQuestion(currentQuestion)) {
      return
    }

    setIsSubmitting(true)

    try {
      await submitMultipleChoiceVote(currentQuestion.id, optionIdx)
      setSubmittedSingleResponseQuestionId(currentQuestion.id)
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        errorMessage: getErrorMessage(error),
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleOpenEndedSubmit(text: string) {
    if (!currentQuestion || !isOpenEndedQuestion(currentQuestion)) {
      return
    }

    setIsSubmitting(true)

    try {
      await submitOpenEndedVote(currentQuestion.id, text)
      setSubmittedSingleResponseQuestionId(currentQuestion.id)
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        errorMessage: getErrorMessage(error),
      }))
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleScaleVote(rating: number) {
    if (!currentQuestion || !isScalesQuestion(currentQuestion)) {
      return
    }

    setIsSubmitting(true)

    try {
      await submitScalesVote(currentQuestion.id, rating)
      setSubmittedSingleResponseQuestionId(currentQuestion.id)
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        errorMessage: getErrorMessage(error),
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleQAndASubmit(text: string) {
    if (!currentQuestion || !isQAndAQuestion(currentQuestion)) {
      return
    }

    setIsSubmitting(true)
    setQAndASuccessMessage(null)

    try {
      await submitQAndAEntry(currentQuestion.id, text)
      setQAndASuccessMessage('Question submitted.')
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        errorMessage: getErrorMessage(error),
      }))
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleQAndAUpvote(entryId: string) {
    setQAndAActionEntryId(entryId)
    setQAndASuccessMessage(null)

    try {
      await upvoteQAndAEntry(entryId)
      setQAndASuccessMessage('Upvote added.')
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        errorMessage: getErrorMessage(error),
      }))
    } finally {
      setQAndAActionEntryId((currentEntryId) => (currentEntryId === entryId ? null : currentEntryId))
    }
  }

  async function handleQuizVote(optionIdx: number) {
    if (
      !currentQuestion ||
      !isQuizQuestion(currentQuestion) ||
      !state.sessionData?.session.voting_open ||
      isQuizTimeUp
    ) {
      return
    }

    setIsSubmitting(true)

    try {
      await submitQuizVote(currentQuestion.id, optionIdx)
      setSubmittedSingleResponseQuestionId(currentQuestion.id)
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        errorMessage: getErrorMessage(error),
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleWordCloudSubmit(word: string) {
    if (!currentQuestion || !isWordCloudQuestion(currentQuestion)) {
      return
    }

    setIsSubmitting(true)
    setWordCloudSuccessQuestionId(null)

    try {
      await submitWordCloudVote(currentQuestion.id, word)
      if (currentQuestion.config.allowMultipleSubmissions) {
        setWordCloudSuccessQuestionId(currentQuestion.id)
      } else {
        setSubmittedSingleResponseQuestionId(currentQuestion.id)
      }
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        errorMessage: getErrorMessage(error),
      }))
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  if (state.status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Audience</p>
          <h1 className="mt-3 text-3xl font-semibold">Loading session…</h1>
          <p className="mt-4 text-base text-slate-300">Pulling down the current question for your phone.</p>
        </section>
      </main>
    )
  }

  if (state.status === 'error' || !state.sessionData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <section className="w-full max-w-lg rounded-3xl border border-rose-300/30 bg-rose-400/10 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-rose-200">Audience</p>
          <h1 className="mt-3 text-3xl font-semibold">Unable to join this session</h1>
          <p className="mt-4 text-base text-rose-100">{state.errorMessage ?? 'Check the code and try again.'}</p>
        </section>
      </main>
    )
  }

  if (state.sessionData.session.state !== 'live' || !currentQuestion) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Audience</p>
          <h1 className="mt-3 text-3xl font-semibold">Waiting for the presenter to start...</h1>
          <p className="mt-4 text-base text-slate-300">
            Keep this page open. The current question will appear here when the session goes live.
          </p>
        </section>
      </main>
    )
  }

  if (!state.sessionData.session.voting_open) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Audience</p>
          <h1 className="mt-3 text-3xl font-semibold">Voting is closed</h1>
          <p className="mt-4 text-base text-slate-300">
            The presenter has closed submissions for this question.
          </p>
        </section>
      </main>
    )
  }

  if (hasSubmittedCurrentQuestion) {
    const confirmationTitle = currentQuestion && isOpenEndedQuestion(currentQuestion) ? 'Thanks for sharing! 👍' : 'Thanks for voting! 👍'

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <section className="w-full max-w-lg rounded-3xl border border-emerald-300/30 bg-emerald-400/10 p-8 text-center shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Audience</p>
          <h1 className="mt-3 text-3xl font-semibold">{confirmationTitle}</h1>
          <p className="mt-4 text-base text-emerald-100">Your response is in. Watch the big screen for the live result.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl sm:p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Audience</p>
        <h1 className="mt-3 text-3xl font-semibold">{currentQuestion.title}</h1>
        <p className="mt-4 text-base text-slate-300">{audienceDescription}</p>

        <div className="mt-6">
          {isMultipleChoiceQuestion(currentQuestion) ? (
            <MultipleChoicePhone
              isSubmitting={isSubmitting}
              onVote={handleVote}
              question={currentQuestion}
            />
          ) : isOpenEndedQuestion(currentQuestion) ? (
            <OpenEndedPhone
              isSubmitting={isSubmitting}
              onSubmit={handleOpenEndedSubmit}
              question={currentQuestion}
            />
          ) : isQAndAQuestion(currentQuestion) ? (
            <QAndAPhone
              actionEntryId={qAndAActionEntryId}
              isLoadingEntries={qAndAResultsState.status === 'loading'}
              isSubmitting={isSubmitting}
              onSubmit={handleQAndASubmit}
              onUpvote={handleQAndAUpvote}
              question={currentQuestion}
              results={qAndAResultsState.results}
              successMessage={qAndASuccessMessage}
            />
          ) : isQuizQuestion(currentQuestion) ? (
            <QuizPhone
              isSubmitting={isSubmitting}
              isTimeUp={Boolean(isQuizTimeUp)}
              isVotingOpen={state.sessionData.session.voting_open}
              onVote={handleQuizVote}
              question={currentQuestion}
              remainingSeconds={quizRemainingSeconds}
            />
          ) : isScalesQuestion(currentQuestion) ? (
            <ScalesPhone
              isSubmitting={isSubmitting}
              onVote={handleScaleVote}
              question={currentQuestion}
            />
          ) : isWordCloudQuestion(currentQuestion) ? (
            <WordCloudPhone
              isSubmitting={isSubmitting}
              onSubmit={handleWordCloudSubmit}
              question={currentQuestion}
              showSuccess={showWordCloudSuccess}
            />
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-6 text-sm text-slate-300">
              This question type will appear on phones in a later phase.
            </div>
          )}
        </div>

        {inlineErrorMessage ? (
          <p className="mt-4 rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {inlineErrorMessage}
          </p>
        ) : null}
      </section>
    </main>
  )
}
