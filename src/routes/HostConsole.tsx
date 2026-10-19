import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Moon, Play, RotateCcw, Share2, Sun, Users } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MentiLogo } from '../components/MentiLogo'
import QuestionPropertiesPanel from '../components/QuestionPropertiesPanel'
import ShareModal from '../components/ShareModal'
import SlideList from '../components/SlideList'
import { SlideChromeProvider } from '../components/slides/SlideChrome'
import SlideRenderer from '../components/slides/SlideRenderer'
import SlideStage from '../components/slides/SlideStage'
import { getSlideTypeMeta } from '../components/slides/slideTypes'
import { Button, IconButton, Segmented } from '../components/ui/controls'
import { toPresentationTheme, type PresentationTheme } from '../lib/presentationTheme'
import { subscribeToSessionPresenceCount, subscribeToSessionUpdates } from '../lib/realtime'
import {
  createQuestion,
  deleteQuestion,
  getSessionEditorData,
  reorderQuestions,
  resetSessionResults,
  updateRoomName,
  updateSession,
  updateQuestion,
} from '../lib/supabaseQueries'
import { formatSessionCode } from '../lib/sessionCode'
import type { EditorQuestion, QuestionType, SessionEditorData } from '../types/questions'

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Something went wrong while updating this room.'
}

function createQuestionCycleStartedAt() {
  return new Date().toISOString()
}

function normalizeRoomName(roomName: string) {
  const trimmedRoomName = roomName.trim()

  if (trimmedRoomName.length === 0) {
    return 'Untitled room'
  }

  return trimmedRoomName.slice(0, 120)
}

function reorderQuestionState(currentQuestions: EditorQuestion[], orderedQuestionIds: string[]) {
  const questionById = new Map(currentQuestions.map((question) => [question.id, question]))
  const orderedQuestions = orderedQuestionIds
    .map((questionId) => questionById.get(questionId))
    .filter((question): question is EditorQuestion => Boolean(question))
  const remainingQuestions = currentQuestions.filter((question) => !orderedQuestionIds.includes(question.id))

  return [...orderedQuestions, ...remainingQuestions].map((question, index) => ({
    ...question,
    orderIndex: index,
  }))
}

export default function HostConsole() {
  const navigate = useNavigate()
  const { sessionId = '' } = useParams()
  const [editorData, setEditorData] = useState<SessionEditorData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [roomNameDraft, setRoomNameDraft] = useState('')
  const [roomNameSaveState, setRoomNameSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [participantCount, setParticipantCount] = useState(0)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const roomNamePersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingQuestionRef = useRef<EditorQuestion | null>(null)

  const selectedQuestion = useMemo(
    () =>
      editorData?.questions.find((question) => question.id === selectedQuestionId) ??
      editorData?.questions[0] ??
      null,
    [editorData, selectedQuestionId],
  )

  function mergeSessionUpdate(nextSessionFields: Partial<SessionEditorData['session']>) {
    setEditorData((currentEditorData) => {
      if (!currentEditorData) {
        return currentEditorData
      }

      return {
        ...currentEditorData,
        session: {
          ...currentEditorData.session,
          ...nextSessionFields,
        },
      }
    })
  }

  useEffect(() => {
    let isActive = true

    async function bootstrapEditor() {
      setErrorMessage(null)

      if (!sessionId) {
        setStatus('error')
        setErrorMessage('Room not found.')
        return
      }

      setStatus('loading')

      try {
        const nextEditorData = await getSessionEditorData(sessionId)

        if (!isActive) {
          return
        }

        setEditorData(nextEditorData)
        setRoomNameDraft(nextEditorData.session.name)
        setRoomNameSaveState('idle')
        setSelectedQuestionId((currentSelectedQuestionId) => {
          if (
            currentSelectedQuestionId &&
            nextEditorData.questions.some((question) => question.id === currentSelectedQuestionId)
          ) {
            return currentSelectedQuestionId
          }

          return nextEditorData.session.current_question_id ?? nextEditorData.questions[0]?.id ?? null
        })
        setStatus('ready')
      } catch (error) {
        if (!isActive) {
          return
        }

        setStatus('error')
        setErrorMessage(getErrorMessage(error))
      }
    }

    void bootstrapEditor()

    return () => {
      isActive = false

      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current)
        persistTimerRef.current = null
      }

      if (pendingQuestionRef.current) {
        void updateQuestion(pendingQuestionRef.current.id, {
          config: pendingQuestionRef.current.config,
          title: pendingQuestionRef.current.title,
        })
        pendingQuestionRef.current = null
      }

      if (roomNamePersistTimerRef.current) {
        clearTimeout(roomNamePersistTimerRef.current)
        roomNamePersistTimerRef.current = null
      }
    }
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) {
      return
    }

    const unsubscribePresence = subscribeToSessionPresenceCount(sessionId, setParticipantCount)
    // Keep the live indicator in sync when the big screen changes slides.
    const unsubscribeSession = subscribeToSessionUpdates(sessionId, (nextSession) => {
      setEditorData((currentEditorData) =>
        currentEditorData
          ? { ...currentEditorData, session: { ...currentEditorData.session, ...nextSession } }
          : currentEditorData,
      )
    })

    return () => {
      unsubscribePresence()
      unsubscribeSession()
    }
  }, [sessionId])

  function replaceQuestion(nextQuestion: EditorQuestion) {
    setEditorData((currentEditorData) => {
      if (!currentEditorData) {
        return currentEditorData
      }

      return {
        ...currentEditorData,
        questions: currentEditorData.questions.map((question) =>
          question.id === nextQuestion.id ? nextQuestion : question,
        ),
      }
    })
  }

  function handleSelectQuestion(questionId: string) {
    setSelectedQuestionId(questionId)
  }

  // Moves the audience and big screen to a slide (used while presenting).
  async function handleShowLive(questionId: string) {
    if (!editorData) {
      return
    }

    setSelectedQuestionId(questionId)

    if (editorData.session.current_question_id === questionId) {
      return
    }

    const previousSession = editorData.session
    const nextSessionFields = {
      current_question_id: questionId,
      question_cycle_started_at: createQuestionCycleStartedAt(),
      results_hidden: false,
      voting_open: true,
    }
    mergeSessionUpdate(nextSessionFields)

    try {
      await updateSession(editorData.session.id, nextSessionFields)
    } catch (error) {
      mergeSessionUpdate(previousSession)
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handlePresent() {
    if (!editorData || !selectedQuestion) {
      return
    }

    const previousSession = editorData.session
    const nextSessionFields = {
      current_question_id: selectedQuestion.id,
      question_cycle_started_at: createQuestionCycleStartedAt(),
      results_hidden: false,
      state: 'live' as const,
      voting_open: true,
    }

    mergeSessionUpdate(nextSessionFields)

    try {
      await updateSession(editorData.session.id, nextSessionFields)
      window.open(`/present/${editorData.session.id}`, '_blank', 'noopener,noreferrer')
    } catch (error) {
      mergeSessionUpdate(previousSession)
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleThemeChange(theme: PresentationTheme) {
    if (!editorData || editorData.session.theme === theme) {
      return
    }

    const previousTheme = editorData.session.theme
    mergeSessionUpdate({ theme })

    try {
      await updateSession(editorData.session.id, { theme })
    } catch (error) {
      mergeSessionUpdate({ theme: previousTheme })
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleResetRoom() {
    if (!editorData) {
      return
    }

    const shouldReset = window.confirm(
      'Reset this room? All responses, quiz scores and player names are cleared and the room goes back to draft. Slides are kept.',
    )

    if (!shouldReset) {
      return
    }

    setErrorMessage(null)

    try {
      await resetSessionResults(editorData.session.id)
      const firstQuestionId = editorData.questions[0]?.id ?? null
      mergeSessionUpdate({
        current_question_id: firstQuestionId,
        results_hidden: false,
        state: 'draft',
        voting_open: true,
      })
      setSelectedQuestionId(firstQuestionId)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  function handlePreview() {
    if (!editorData) {
      return
    }

    window.open(`/present/${editorData.session.id}`, '_blank', 'noopener,noreferrer')
  }

  async function persistRoomName(nextRoomName: string) {
    if (!editorData) {
      return
    }

    if (editorData.session.name === nextRoomName) {
      setRoomNameSaveState('saved')
      return
    }

    setRoomNameSaveState('saving')

    try {
      await updateRoomName(editorData.session.id, nextRoomName)
      mergeSessionUpdate({ name: nextRoomName })
      setRoomNameSaveState('saved')
    } catch (error) {
      setRoomNameSaveState('error')
      setErrorMessage(getErrorMessage(error))
    }
  }

  function queueRoomNameSave(nextRoomNameInput: string) {
    const normalizedRoomName = normalizeRoomName(nextRoomNameInput)

    setRoomNameDraft(nextRoomNameInput)
    setRoomNameSaveState('idle')

    if (roomNamePersistTimerRef.current) {
      clearTimeout(roomNamePersistTimerRef.current)
    }

    roomNamePersistTimerRef.current = setTimeout(() => {
      setRoomNameDraft(normalizedRoomName)
      void persistRoomName(normalizedRoomName)
    }, 350)
  }

  function flushRoomNameSave() {
    const normalizedRoomName = normalizeRoomName(roomNameDraft)

    if (roomNamePersistTimerRef.current) {
      clearTimeout(roomNamePersistTimerRef.current)
      roomNamePersistTimerRef.current = null
    }

    if (roomNameDraft !== normalizedRoomName) {
      setRoomNameDraft(normalizedRoomName)
    }

    void persistRoomName(normalizedRoomName)
  }

  async function persistQuestion(nextQuestion: EditorQuestion) {
    setSaveState('saving')

    try {
      await updateQuestion(nextQuestion.id, {
        config: nextQuestion.config,
        title: nextQuestion.title,
      })
      setSaveState('saved')
    } catch (error) {
      setSaveState('error')
      setErrorMessage(getErrorMessage(error))
    }
  }

  function updateSelectedQuestion(transform: (question: EditorQuestion) => EditorQuestion) {
    if (!selectedQuestion) {
      return
    }

    const nextQuestion = transform(selectedQuestion)
    replaceQuestion(nextQuestion)

    // Debounce persistence: accumulate rapid edits and flush after 300 ms idle.
    pendingQuestionRef.current = nextQuestion
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current)
    }
    persistTimerRef.current = setTimeout(() => {
      if (pendingQuestionRef.current) {
        void persistQuestion(pendingQuestionRef.current)
        pendingQuestionRef.current = null
      }
    }, 300)
  }

  async function handleAddSlide(type: QuestionType = 'multiple_choice') {
    if (!editorData) {
      return
    }

    setErrorMessage(null)

    try {
      const nextQuestion = await createQuestion(editorData.session.id, type)

      setEditorData((currentEditorData) => {
        if (!currentEditorData) {
          return currentEditorData
        }

        return {
          ...currentEditorData,
          questions: [...currentEditorData.questions, nextQuestion],
        }
      })
      setSelectedQuestionId(nextQuestion.id)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleDeleteSlide(questionId: string) {
    if (!editorData || editorData.questions.length <= 1) {
      return
    }

    const currentQuestions = editorData.questions
    const remainingQuestions = currentQuestions.filter((question) => question.id !== questionId)
    const deletedQuestionIndex = currentQuestions.findIndex((question) => question.id === questionId)
    const fallbackQuestionId =
      remainingQuestions[Math.max(0, deletedQuestionIndex - 1)]?.id ?? remainingQuestions[0]?.id ?? null

    try {
      await deleteQuestion(editorData.session.id, questionId)
      setEditorData((currentEditorData) => {
        if (!currentEditorData) {
          return currentEditorData
        }

        return {
          ...currentEditorData,
          session: {
            ...currentEditorData.session,
            current_question_id:
              currentEditorData.session.current_question_id === questionId
                ? fallbackQuestionId
                : currentEditorData.session.current_question_id,
          },
          questions: currentEditorData.questions
            .filter((question) => question.id !== questionId)
            .map((question, index) => ({
              ...question,
              orderIndex: index,
            })),
        }
      })

      if (selectedQuestionId === questionId) {
        setSelectedQuestionId(fallbackQuestionId)
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleReorderSlides(orderedQuestionIds: string[]) {
    if (!editorData) {
      return
    }

    const previousQuestionIds = editorData.questions.map((question) => question.id)
    setEditorData((currentEditorData) => {
      if (!currentEditorData) {
        return currentEditorData
      }

      return {
        ...currentEditorData,
        questions: reorderQuestionState(currentEditorData.questions, orderedQuestionIds),
      }
    })

    try {
      await reorderQuestions(editorData.session.id, orderedQuestionIds)
    } catch (error) {
      setEditorData((currentEditorData) => {
        if (!currentEditorData) {
          return currentEditorData
        }

        return {
          ...currentEditorData,
          questions: reorderQuestionState(currentEditorData.questions, previousQuestionIds),
        }
      })
      setErrorMessage(getErrorMessage(error))
    }
  }

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-app text-ink-2">
        <p className="text-sm">Loading your room…</p>
      </main>
    )
  }

  if (status === 'error' || !editorData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-app px-6 text-ink">
        <section className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">This room could not be opened</h1>
          <p className="mt-3 text-ink-2">{errorMessage ?? 'Refresh the page to try again.'}</p>
          <Button className="mt-6" onClick={() => navigate('/host')}>
            <ArrowLeft className="size-4" />
            Back to rooms
          </Button>
        </section>
      </main>
    )
  }

  const session = editorData.session
  const presentationTheme = toPresentationTheme(session.theme)
  const isLive = session.state === 'live'
  const liveQuestionIndex = editorData.questions.findIndex((question) => question.id === session.current_question_id)
  const liveQuestion = liveQuestionIndex >= 0 ? editorData.questions[liveQuestionIndex] : null
  const previousLiveQuestion = liveQuestionIndex > 0 ? editorData.questions[liveQuestionIndex - 1] : null
  const nextLiveQuestion =
    liveQuestionIndex >= 0 && liveQuestionIndex < editorData.questions.length - 1
      ? editorData.questions[liveQuestionIndex + 1]
      : null
  const selectedMeta = selectedQuestion ? getSlideTypeMeta(selectedQuestion.type) : null
  const saveLabel =
    saveState === 'saving' || roomNameSaveState === 'saving'
      ? 'Saving…'
      : saveState === 'error' || roomNameSaveState === 'error'
        ? 'Not saved'
        : saveState === 'saved' || roomNameSaveState === 'saved'
          ? 'Saved'
          : ''

  return (
    <main className="flex h-screen flex-col bg-app text-ink">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-3">
        <IconButton label="Back to rooms" onClick={() => navigate('/host')}>
          <ArrowLeft className="size-[18px]" />
        </IconButton>
        <MentiLogo creator size="xs" />
        <span aria-hidden="true" className="mx-2 h-6 w-px bg-line" />

        <input
          aria-label="Room name"
          className="h-9 w-[min(360px,30vw)] rounded-lg border border-transparent bg-transparent px-2 text-[15px] font-semibold text-ink outline-none transition hover:border-line focus:border-brand focus:ring-3 focus:ring-brand/15"
          id="room-name-input"
          maxLength={120}
          onBlur={flushRoomNameSave}
          onChange={(event) => queueRoomNameSave(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
            }
          }}
          value={roomNameDraft}
        />
        <span aria-live="polite" className={`text-xs ${saveLabel === 'Not saved' ? 'text-danger' : 'text-ink-3'}`}>
          {saveLabel}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <span
            className={`hidden items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold md:flex ${
              isLive ? 'bg-live-soft text-live' : 'bg-sunken text-ink-3'
            }`}
          >
            <span className={`size-2 rounded-full ${isLive ? 'animate-pulse bg-live' : 'bg-ink-3/50'}`} />
            {isLive ? 'Live' : 'Draft'}
            <span className="font-medium text-ink-3">·</span>
            <span className="flex items-center gap-1 font-medium tabular-nums">
              <Users aria-label="People joined" className="size-3.5" />
              {participantCount}
            </span>
          </span>
          <span className="hidden text-[13px] font-semibold tabular-nums text-ink-2 lg:inline">
            {`Code ${formatSessionCode(session.code)}`}
          </span>

          <div className="w-[92px]">
            <Segmented<PresentationTheme>
              label="Presentation theme"
              onChange={(theme) => {
                void handleThemeChange(theme)
              }}
              options={[
                { icon: <Sun aria-label="Light" className="size-4" />, label: '', value: 'light' },
                { icon: <Moon aria-label="Dark" className="size-4" />, label: '', value: 'dark' },
              ]}
              value={presentationTheme}
            />
          </div>
          <IconButton
            label="Reset room"
            onClick={() => {
              void handleResetRoom()
            }}
          >
            <RotateCcw className="size-[18px]" />
          </IconButton>
          <Button onClick={handlePreview}>
            <Eye className="size-4" />
            Preview
          </Button>
          <Button onClick={() => setShareModalOpen(true)}>
            <Share2 className="size-4" />
            Share
          </Button>
          <Button
            onClick={() => {
              void handlePresent()
            }}
            variant="primary"
          >
            <Play className="size-4 fill-current" />
            Present
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[236px_minmax(0,1fr)_340px]">
        <div className="min-h-0 border-r border-line">
          <SlideList
            liveQuestionId={isLive ? session.current_question_id : null}
            onAddSlide={(type) => {
              void handleAddSlide(type)
            }}
            onDelete={handleDeleteSlide}
            onReorder={handleReorderSlides}
            onSelect={handleSelectQuestion}
            questions={editorData.questions}
            selectedQuestionId={selectedQuestion?.id ?? null}
            theme={presentationTheme}
          />
        </div>

        <section className="flex min-h-0 flex-col gap-4 p-6 xl:p-8">
          {isLive ? (
            <div className="flex shrink-0 items-center gap-3 self-center rounded-full bg-surface py-1.5 pl-4 pr-1.5 text-[13px] shadow-sm ring-1 ring-line">
              <span className="size-2 animate-pulse rounded-full bg-live" />
              <span className="font-semibold text-ink">
                {liveQuestion ? `Audience is on slide ${liveQuestionIndex + 1}` : 'Presentation is live'}
              </span>
              <IconButton
                className="size-8"
                disabled={!previousLiveQuestion}
                label="Previous slide"
                onClick={() => {
                  if (previousLiveQuestion) {
                    void handleShowLive(previousLiveQuestion.id)
                  }
                }}
              >
                <ChevronLeft className="size-4" />
              </IconButton>
              <IconButton
                className="size-8"
                disabled={!nextLiveQuestion}
                label="Next slide"
                onClick={() => {
                  if (nextLiveQuestion) {
                    void handleShowLive(nextLiveQuestion.id)
                  }
                }}
              >
                <ChevronRight className="size-4" />
              </IconButton>
              {selectedQuestion && selectedQuestion.id !== session.current_question_id ? (
                <Button
                  onClick={() => {
                    void handleShowLive(selectedQuestion.id)
                  }}
                  size="sm"
                  variant="primary"
                >
                  Show this slide
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 items-center justify-center" style={{ containerType: 'size' }}>
            {selectedQuestion ? (
              <div
                className="overflow-hidden rounded-2xl shadow-[0_24px_64px_-24px_rgba(28,18,12,0.28)] ring-1 ring-line"
                style={{ aspectRatio: '16 / 9', width: 'min(100cqw, calc(100cqh * 16 / 9))' }}
              >
                <SlideChromeProvider joinCode={session.code}>
                  <SlideStage className="h-full w-full" theme={presentationTheme}>
                    <SlideRenderer preview question={selectedQuestion} results={null} />
                  </SlideStage>
                </SlideChromeProvider>
              </div>
            ) : (
              <p className="text-sm text-ink-3">Add a slide to get started.</p>
            )}
          </div>
        </section>

        <aside className="min-h-0 overflow-y-auto border-l border-line bg-surface">
          {selectedQuestion && selectedMeta ? (
            <>
              <div className="flex items-center gap-3 border-b border-line px-5 py-4">
                <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <selectedMeta.Icon className="size-[18px]" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold">{selectedMeta.title}</h2>
                  <p className="text-xs text-ink-3">{selectedMeta.description}</p>
                </div>
              </div>

              {errorMessage ? (
                <p className="mx-5 mt-4 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <QuestionPropertiesPanel onUpdate={updateSelectedQuestion} question={selectedQuestion} />
            </>
          ) : null}
        </aside>
      </div>

      {shareModalOpen ? (
        <ShareModal code={session.code} onClose={() => setShareModalOpen(false)} onError={setErrorMessage} />
      ) : null}
    </main>
  )
}
