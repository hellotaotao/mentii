import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import ReactionBar from '../components/ReactionBar'
import PhoneShell, { PhoneMessage } from '../components/audience/PhoneShell'
import { PhoneNotice } from '../components/audience/PhoneUI'
import NicknameForm from '../components/quiz/NicknameForm'
import LeaderboardPhone from '../components/questions/Leaderboard/Phone'
import MultipleChoicePhone from '../components/questions/MultipleChoice/Phone'
import OpenEndedPhone from '../components/questions/OpenEnded/Phone'
import QAndAPhone from '../components/questions/QAndA/Phone'
import QuizPhone, { type QuizPhonePhase } from '../components/questions/Quiz/Phone'
import ScalesPhone from '../components/questions/Scales/Phone'
import WordCloudPhone from '../components/questions/WordCloud/Phone'
import {
  subscribeToQuestionResultSignals,
  subscribeToSessionQuestionChanges,
  subscribeToSessionUpdates,
  trackAudiencePresence,
} from '../lib/realtime'
import { getParticipantId } from '../lib/participantId'
import { toPresentationTheme } from '../lib/presentationTheme'
import {
  getMyParticipant,
  getMyQuizStatus,
  joinSession,
  roomUsesQuizGame,
  setParticipantRealName,
  type MyQuizStatus,
  type ParticipantProfile,
} from '../lib/quizGame'
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
  isLeaderboardQuestion,
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

type ProfileState = {
  profile: ParticipantProfile | null
  sessionId: string | null
}

const RESULTS_REFRESH_DEBOUNCE_MS = 200
const QUIZ_REVEAL_RETRY_MS = 1500

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
  const [profileState, setProfileState] = useState<ProfileState>({ profile: null, sessionId: null })
  const [myQuizStatus, setMyQuizStatus] = useState<MyQuizStatus | null>(null)
  const [quizStatusRefreshKey, setQuizStatusRefreshKey] = useState(0)
  const [submittedQuizOption, setSubmittedQuizOption] = useState<{ optionIdx: number; questionId: string } | null>(
    null,
  )

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
      unsubscribeSessionUpdates()
      unsubscribeQuestionChanges()
    }
  }, [sessionCode, state.sessionData?.session.id])

  const sessionId = state.sessionData?.session.id ?? null
  const requiresProfile = state.sessionData ? roomUsesQuizGame(state.sessionData.questions) : false
  const isProfileResolved = !requiresProfile || (sessionId !== null && profileState.sessionId === sessionId)
  const profile = isProfileResolved && profileState.sessionId === sessionId ? profileState.profile : null
  const presenceNickname = profile?.nickname ?? null
  const presenceEmoji = profile?.emoji ?? null

  useEffect(() => {
    if (!sessionId || !requiresProfile) {
      return
    }

    let isActive = true

    void getMyParticipant(sessionId)
      .then((nextProfile) => {
        if (isActive) {
          setProfileState({ profile: nextProfile, sessionId })
        }
      })
      .catch(() => {
        if (isActive) {
          setProfileState({ profile: null, sessionId })
        }
      })

    return () => {
      isActive = false
    }
  }, [requiresProfile, sessionId])

  useEffect(() => {
    if (!sessionId || !isProfileResolved) {
      return
    }

    return trackAudiencePresence(
      sessionId,
      getParticipantId(),
      presenceNickname && presenceEmoji ? { emoji: presenceEmoji, nickname: presenceNickname } : null,
    )
  }, [isProfileResolved, presenceEmoji, presenceNickname, sessionId])

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
  const activeLeaderboardQuestion =
    currentQuestion && isLeaderboardQuestion(currentQuestion) ? currentQuestion : null

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

  const shouldTrackQuizStatus = Boolean(profile && (activeQuizQuestion || activeLeaderboardQuestion))
  const currentQuestionId = currentQuestion?.id ?? null
  const isVotingOpen = state.sessionData?.session.voting_open ?? false
  const questionCycleStartedAt = state.sessionData?.session.question_cycle_started_at ?? null

  useEffect(() => {
    if (!shouldTrackQuizStatus || !sessionId) {
      return
    }

    let isActive = true
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    void getMyQuizStatus(sessionId)
      .then((nextStatus) => {
        if (!isActive) {
          return
        }

        setMyQuizStatus(nextStatus)

        // The phone clock can run slightly ahead of the server; poll until the reveal lands.
        if (isQuizTimeUp && nextStatus?.currentAnswer && !nextStatus.currentAnswer.revealed) {
          retryTimer = setTimeout(() => setQuizStatusRefreshKey((key) => key + 1), QUIZ_REVEAL_RETRY_MS)
        }
      })
      .catch(() => {
        // Keep the last known standing on transient errors.
      })

    return () => {
      isActive = false

      if (retryTimer) {
        clearTimeout(retryTimer)
      }
    }
  }, [
    currentQuestionId,
    isQuizTimeUp,
    isVotingOpen,
    questionCycleStartedAt,
    quizStatusRefreshKey,
    sessionId,
    shouldTrackQuizStatus,
  ])

  useEffect(() => {
    if (!state.sessionData?.session.question_cycle_started_at) {
      return
    }

    setSubmittedQuizOption(null)
    setSubmittedSingleResponseQuestionId(null)
    setWordCloudSuccessQuestionId(null)
    setQAndASuccessMessage(null)
  }, [state.sessionData?.session.current_question_id, state.sessionData?.session.question_cycle_started_at])


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
      setSubmittedQuizOption({ optionIdx, questionId: currentQuestion.id })
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        errorMessage: getErrorMessage(error),
      }))
    } finally {
      setIsSubmitting(false)
      setQuizStatusRefreshKey((key) => key + 1)
    }
  }

  async function handleJoin(nickname: string, emoji: string) {
    if (!sessionId) {
      return
    }

    const nextProfile = await joinSession(sessionId, nickname, emoji)
    setProfileState({ profile: nextProfile, sessionId })
  }

  async function handleSaveRealName(realName: string) {
    if (!sessionId) {
      return
    }

    const nextProfile = await setParticipantRealName(sessionId, realName)

    if (nextProfile) {
      setProfileState({ profile: nextProfile, sessionId })
    }

    setQuizStatusRefreshKey((key) => key + 1)
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

  const presentationTheme = toPresentationTheme(state.sessionData?.session.theme)
  const errorNotice = inlineErrorMessage ? (
    <div className="mt-5">
      <PhoneNotice tone="error">{inlineErrorMessage}</PhoneNotice>
    </div>
  ) : null

  if (state.status === 'loading') {
    return (
      <PhoneShell theme="light">
        <p className="text-center text-slide-muted">Joining…</p>
      </PhoneShell>
    )
  }

  if (state.status === 'error' || !state.sessionData) {
    return (
      <PhoneShell theme="light">
        <PhoneMessage
          text={state.errorMessage ?? 'Check the code with the presenter and try again.'}
          title="We couldn’t find that session"
        />
        <a
          className="mt-8 flex h-14 items-center justify-center rounded-2xl border-2 border-slide-line text-[17px] font-semibold"
          href="/"
        >
          Enter a different code
        </a>
      </PhoneShell>
    )
  }

  const sessionState = state.sessionData.session.state
  const reactionBar = sessionState !== 'ended' ? <ReactionBar sessionId={state.sessionData.session.id} /> : null

  if (!isProfileResolved) {
    return (
      <PhoneShell theme={presentationTheme}>
        <p className="text-center text-slide-muted">Getting your seat ready…</p>
      </PhoneShell>
    )
  }

  if (requiresProfile && !profile && sessionState !== 'ended') {
    return (
      <PhoneShell theme={presentationTheme}>
        <NicknameForm onSubmit={handleJoin} roomName={state.sessionData.session.name} />
      </PhoneShell>
    )
  }

  if (sessionState !== 'live' || !currentQuestion) {
    return (
      <PhoneShell footer={reactionBar} profile={profile} theme={presentationTheme}>
        {profile ? (
          <PhoneMessage
            emoji={profile.emoji}
            text="Look for your name on the big screen. The first question appears here when the game starts."
            title={`You're in, ${profile.nickname}!`}
          />
        ) : (
          <PhoneMessage
            emoji="👋"
            text="Keep this page open. Questions appear here as soon as the presenter starts."
            title="Waiting for the presenter to start..."
          />
        )}
      </PhoneShell>
    )
  }

  if (isQuizQuestion(currentQuestion) || isLeaderboardQuestion(currentQuestion)) {
    const quizAnswer =
      myQuizStatus?.currentAnswer?.questionId === currentQuestion.id ? myQuizStatus.currentAnswer : null
    const submittedOptionIdx =
      submittedQuizOption?.questionId === currentQuestion.id ? submittedQuizOption.optionIdx : null
    const quizPhase: QuizPhonePhase =
      !state.sessionData.session.voting_open || isQuizTimeUp || quizAnswer?.revealed
        ? 'revealed'
        : submittedOptionIdx !== null || quizAnswer?.answered
          ? 'locked'
          : 'answering'

    return (
      <PhoneShell footer={reactionBar} profile={profile} theme={presentationTheme}>
        {isQuizQuestion(currentQuestion) ? (
          <>
            <h1 className="text-[24px] font-bold leading-tight tracking-[-0.02em]">{currentQuestion.title}</h1>
            <div className="mt-6">
              <QuizPhone
                isSubmitting={isSubmitting}
                onVote={handleQuizVote}
                phase={quizPhase}
                question={currentQuestion}
                remainingSeconds={quizRemainingSeconds}
                status={myQuizStatus}
                submittedOptionIdx={submittedOptionIdx}
              />
            </div>
          </>
        ) : (
          <LeaderboardPhone onSaveRealName={handleSaveRealName} question={currentQuestion} status={myQuizStatus} />
        )}
        {errorNotice}
      </PhoneShell>
    )
  }

  if (!state.sessionData.session.voting_open) {
    return (
      <PhoneShell footer={reactionBar} profile={profile} theme={presentationTheme}>
        <PhoneMessage
          emoji="🔒"
          text="The presenter has closed submissions for this question. Keep an eye on the big screen."
          title="Voting is closed"
        />
      </PhoneShell>
    )
  }

  if (hasSubmittedCurrentQuestion) {
    return (
      <PhoneShell footer={reactionBar} profile={profile} theme={presentationTheme}>
        <PhoneMessage
          emoji="🙌"
          text="Your response is in. Watch the big screen for the results."
          title={isOpenEndedQuestion(currentQuestion) ? 'Thanks for sharing!' : 'Thanks for voting!'}
        />
      </PhoneShell>
    )
  }

  return (
    <PhoneShell footer={reactionBar} profile={profile} theme={presentationTheme}>
      <h1 className="text-[24px] font-bold leading-tight tracking-[-0.02em]">{currentQuestion.title}</h1>

      <div className="mt-6">
        {isMultipleChoiceQuestion(currentQuestion) ? (
          <MultipleChoicePhone isSubmitting={isSubmitting} onVote={handleVote} question={currentQuestion} />
        ) : isOpenEndedQuestion(currentQuestion) ? (
          <OpenEndedPhone isSubmitting={isSubmitting} onSubmit={handleOpenEndedSubmit} question={currentQuestion} />
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
        ) : isScalesQuestion(currentQuestion) ? (
          <ScalesPhone isSubmitting={isSubmitting} onVote={handleScaleVote} question={currentQuestion} />
        ) : isWordCloudQuestion(currentQuestion) ? (
          <WordCloudPhone
            isSubmitting={isSubmitting}
            onSubmit={handleWordCloudSubmit}
            question={currentQuestion}
            showSuccess={showWordCloudSuccess}
          />
        ) : (
          <PhoneNotice>Watch the big screen for this slide.</PhoneNotice>
        )}
      </div>

      {errorNotice}
    </PhoneShell>
  )
}
