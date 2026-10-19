import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useParams } from 'react-router-dom'
import PresenterControls from '../components/PresenterControls'
import ReactionLayer from '../components/ReactionLayer'
import { SlideChromeProvider, SlideEmptyState, SlideLayout } from '../components/slides/SlideChrome'
import SlideRenderer from '../components/slides/SlideRenderer'
import SlideStage from '../components/slides/SlideStage'
import { useQuestionResults } from '../hooks/useQuestionResults'
import { useQuizLeaderboard } from '../hooks/useQuizLeaderboard'
import { useSession } from '../hooks/useSession'
import { toPresentationTheme } from '../lib/presentationTheme'
import { subscribeToSessionAudience, type AudienceMember } from '../lib/realtime'
import { buildJoinUrl, formatSessionCode } from '../lib/sessionCode'
import { resetQuestionResults, setQAndAEntryAnswered, updateSession } from '../lib/supabaseQueries'
import { isLeaderboardQuestion, isQuizQuestion } from '../types/questions'

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Unable to update presenter controls.'
}

function createQuestionCycleStartedAt() {
  return new Date().toISOString()
}

const MAX_WAITING_ROOM_NAMES = 24

function WaitingRoomRoster({ members }: { members: AudienceMember[] }) {
  const namedMembers = members.filter((member) => member.nickname)

  if (namedMembers.length === 0) {
    return null
  }

  const visibleMembers = namedMembers.slice(-MAX_WAITING_ROOM_NAMES).reverse()
  const hiddenCount = namedMembers.length - visibleMembers.length

  return (
    <ul aria-label="Players in the room" className="flex flex-wrap content-start gap-3">
      {visibleMembers.map((member) => (
        <li
          className="mentii-pop-in flex items-center gap-2 rounded-full bg-slide-subtle px-5 py-2 text-[24px] font-semibold"
          key={member.participantId}
        >
          <span aria-hidden="true">{member.emoji}</span>
          {member.nickname}
        </li>
      ))}
      {hiddenCount > 0 ? (
        <li className="flex items-center px-4 py-2 text-[24px] text-slide-muted">{`+${hiddenCount} more`}</li>
      ) : null}
    </ul>
  )
}

function WaitingRoom({ code, members, roomName }: { code: string; members: AudienceMember[]; roomName: string }) {
  const joinHost = typeof window === 'undefined' ? '' : window.location.host

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_420px] gap-20 px-24 py-20">
      <div className="flex min-h-0 flex-col">
        <p className="text-[30px] font-medium text-slide-muted">{roomName}</p>
        <h1 className="mt-6 text-[76px] font-bold leading-[1.05] tracking-[-0.03em]">
          Join at {joinHost}
        </h1>
        <p className="mt-4 text-[34px] text-slide-muted">
          and use the code{' '}
          <span className="font-bold tabular-nums tracking-[0.06em] text-slide-accent">{formatSessionCode(code)}</span>
        </p>
        <div className="mt-14 min-h-0 flex-1 overflow-hidden">
          <WaitingRoomRoster members={members} />
        </div>
        <p className="text-[26px] font-medium tabular-nums text-slide-muted">
          {`${members.length} ${members.length === 1 ? 'person has' : 'people have'} joined`}
        </p>
      </div>
      <div className="flex flex-col items-center justify-center">
        <div className="rounded-[36px] bg-white p-8 shadow-[0_20px_60px_rgba(28,18,12,0.12)]">
          <QRCodeSVG aria-label="Session QR code" size={320} value={buildJoinUrl(code)} />
        </div>
        <p className="mt-6 text-[24px] text-slide-muted">Scan to join</p>
      </div>
    </div>
  )
}

export default function BigScreen() {
  const { sessionId = '' } = useParams()
  const [controlsVisible, setControlsVisible] = useState(false)
  const [controlErrorMessage, setControlErrorMessage] = useState<string | null>(null)
  const [audienceMembers, setAudienceMembers] = useState<AudienceMember[]>([])
  const participantCount = audienceMembers.length
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
  const isQuizGameSlide = Boolean(currentQuestion && (isQuizQuestion(currentQuestion) || isLeaderboardQuestion(currentQuestion)))
  const answeredCount = results?.type === 'quiz' ? results.totals.reduce((sum, total) => sum + total.count, 0) : 0
  const leaderboard = useQuizLeaderboard({
    enabled: isQuizGameSlide,
    refreshKey: `${currentQuestion?.id ?? ''}:${session?.voting_open ?? ''}:${quizRemainingSeconds === 0}:${answeredCount}:${session?.question_cycle_started_at ?? ''}`,
    sessionId: session?.id ?? null,
  })

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

    const unsubscribe = subscribeToSessionAudience(sessionId, setAudienceMembers)

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

  const presentationTheme = toPresentationTheme(session?.theme)

  if (status === 'loading') {
    return (
      <main className="slide-theme-light flex min-h-screen items-center justify-center bg-slide-bg text-slide-muted">
        <p className="text-lg">Loading presentation…</p>
      </main>
    )
  }

  if (status === 'error' || !session || !currentQuestion) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-app px-6 text-ink">
        <section className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">This presentation could not be loaded</h1>
          <p className="mt-3 text-ink-2">{errorMessage ?? 'Check the link, then refresh the page.'}</p>
        </section>
      </main>
    )
  }

  const isLive = session.state === 'live'

  return (
    <main
      className={`slide-theme-${presentationTheme} h-screen w-screen overflow-hidden bg-slide-bg`}
      data-testid="big-screen-shell"
      onMouseMove={() => {
        revealControls()
      }}
    >
      <SlideChromeProvider joinCode={session.code}>
        <SlideStage className="h-full w-full" theme={presentationTheme}>
          {!isLive ? (
            <WaitingRoom code={session.code} members={audienceMembers} roomName={session.name} />
          ) : session.results_hidden ? (
            <SlideLayout title={currentQuestion.title}>
              <SlideEmptyState>Results are hidden for now.</SlideEmptyState>
            </SlideLayout>
          ) : resultsStatus === 'error' ? (
            <SlideLayout title={currentQuestion.title}>
              <SlideEmptyState>{resultsErrorMessage ?? 'Live results could not be loaded. Refresh the page.'}</SlideEmptyState>
            </SlideLayout>
          ) : (resultsStatus === 'loading' || !results) && !isLeaderboardQuestion(currentQuestion) ? (
            <SlideLayout title={currentQuestion.title}>
              <SlideEmptyState>Loading responses…</SlideEmptyState>
            </SlideLayout>
          ) : (
            <SlideRenderer
              celebrate
              isVotingOpen={session.voting_open}
              leaderboard={leaderboard}
              onToggleQAndAAnswered={handleToggleQAndAAnswered}
              playerCount={participantCount}
              qAndAActionEntryId={qAndAActionEntryId}
              question={currentQuestion}
              quizRemainingSeconds={quizRemainingSeconds}
              results={results}
            />
          )}
        </SlideStage>
      </SlideChromeProvider>

      <ReactionLayer sessionId={session.id} />

      {controlErrorMessage ? (
        <div className="fixed left-1/2 top-5 z-40 -translate-x-1/2 rounded-full bg-danger px-5 py-2 text-sm font-medium text-white shadow-lg">
          {controlErrorMessage}
        </div>
      ) : null}

      {controlsVisible && isLive ? (
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
          participantCount={participantCount}
          resultsHidden={session.results_hidden}
          slidePosition={{ current: currentQuestionIndex + 1, total: questions.length }}
          votingOpen={session.voting_open}
        />
      ) : null}
    </main>
  )
}

