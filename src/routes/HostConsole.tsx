import { ArrowLeft, ChevronLeft, ChevronRight, Copy, Eye, Play, Share2, Users, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import QuestionBigScreenPreview from '../components/QuestionBigScreenPreview'
import SlideList from '../components/SlideList'
import MultipleChoiceEditor from '../components/questions/MultipleChoice/Editor'
import OpenEndedEditor from '../components/questions/OpenEnded/Editor'
import QAndAEditor from '../components/questions/QAndA/Editor'
import QuizEditor from '../components/questions/Quiz/Editor'
import ScalesEditor from '../components/questions/Scales/Editor'
import WordCloudEditor from '../components/questions/WordCloud/Editor'
import type { HostPropertyTab } from '../components/questions/MultipleChoice/editorTabs'
import { subscribeToSessionPresenceCount } from '../lib/realtime'
import {
  createQuestion,
  deleteQuestion,
  getSessionEditorData,
  reorderQuestions,
  updateRoomName,
  updateSession,
  updateQuestion,
} from '../lib/supabaseQueries'
import { buildJoinUrl, formatSessionCode } from '../lib/sessionCode'
import {
  isMultipleChoiceQuestion,
  isOpenEndedQuestion,
  isQAndAQuestion,
  isQuizQuestion,
  isScalesQuestion,
  isWordCloudQuestion,
  normalizeOpenEndedMaxLength,
  type EditorQuestion,
  type QuestionType,
  type SessionEditorData,
} from '../types/questions'

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
  const [activeTab, setActiveTab] = useState<HostPropertyTab>('content')
  const [editorData, setEditorData] = useState<SessionEditorData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [roomNameDraft, setRoomNameDraft] = useState('')
  const [roomNameSaveState, setRoomNameSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [participantCount, setParticipantCount] = useState(0)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareState, setShareState] = useState<'copied' | 'idle'>('idle')
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
  const selectedQuestionIndex = selectedQuestion
    ? editorData?.questions.findIndex((question) => question.id === selectedQuestion.id) ?? -1
    : -1
  const previousQuestion =
    selectedQuestionIndex > 0 && editorData ? editorData.questions[selectedQuestionIndex - 1] : null
  const nextQuestion =
    selectedQuestionIndex >= 0 && editorData && selectedQuestionIndex < editorData.questions.length - 1
      ? editorData.questions[selectedQuestionIndex + 1]
      : null

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

    const unsubscribe = subscribeToSessionPresenceCount(sessionId, setParticipantCount)

    return () => {
      unsubscribe()
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

  async function handleSelectQuestion(questionId: string) {
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

  function handlePreview() {
    if (!editorData) {
      return
    }

    window.open(`/present/${editorData.session.id}`, '_blank', 'noopener,noreferrer')
  }

  async function handleShare() {
    if (!editorData) {
      return
    }

    try {
      await navigator.clipboard.writeText(buildJoinUrl(editorData.session.code))
      setShareState('copied')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
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
      setActiveTab('content')
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
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-slate-900">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-600">Host</p>
          <h1 className="mt-3 text-3xl font-semibold">Loading host console…</h1>
          <p className="mt-4 text-sm text-slate-600">Fetching the room slides and draft settings from Supabase.</p>
        </section>
      </main>
    )
  }

  if (status === 'error' || !editorData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-slate-900">
        <section className="w-full max-w-md rounded-3xl border border-rose-300/50 bg-rose-50 p-8 shadow-lg">
          <p className="text-sm uppercase tracking-[0.3em] text-rose-600">Host</p>
          <h1 className="mt-3 text-3xl font-semibold">Unable to load the editor</h1>
          <p className="mt-4 text-sm text-rose-700">{errorMessage ?? 'Try refreshing the page.'}</p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white/95">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <button
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={() => navigate('/host')}
              type="button"
            >
              <ArrowLeft className="size-4" />
              Back to rooms
            </button>

            <p className="text-sm uppercase tracking-[0.3em] text-cyan-600">Host</p>
            <h1 className="text-3xl font-semibold">Room editor</h1>

            <label className="block max-w-md space-y-2" htmlFor="room-name-input">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Room name</span>
              <input
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 text-base text-slate-900 outline-none transition focus:border-cyan-400"
                id="room-name-input"
                onBlur={flushRoomNameSave}
                onChange={(event) => queueRoomNameSave(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.currentTarget.blur()
                  }
                }}
                value={roomNameDraft}
              />
            </label>

            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
              {editorData.session.state === 'live' ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-emerald-700">
                  <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
                  <span className="font-medium">Live</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-slate-500">
                  <span className="size-2 rounded-full bg-slate-400" />
                  <span className="font-medium">Draft</span>
                </div>
              )}
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2">
                <Users className="size-4 text-slate-500" />
                <span>{participantCount}</span>
              </div>
              <div className="inline-flex items-center gap-3 rounded-full border border-slate-300 bg-white px-4 py-2">
                <span>Code</span>
                <span className="text-base font-semibold tracking-[0.35em]">
                  {formatSessionCode(editorData.session.code)}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2">
                <span className="text-slate-500">Room ID</span>
                <span className="font-mono text-xs text-slate-700">{editorData.session.id}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              {roomNameSaveState === 'saving'
                ? 'Saving room name…'
                : roomNameSaveState === 'saved'
                  ? 'Room name saved.'
                  : roomNameSaveState === 'error'
                    ? 'Could not save room name.'
                    : 'Room name can be changed anytime.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handlePreview}
              type="button"
            >
              <Eye className="size-4" />
              Preview
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => setShareModalOpen(true)}
              type="button"
            >
              <Share2 className="size-4" />
              Share
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                void handlePresent()
              }}
              type="button"
            >
              <Play className="size-4" />
              Present
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1400px] gap-4 px-4 py-6 xl:grid-cols-[190px_minmax(0,1fr)_360px]">
        <SlideList
          onAddSlide={(type) => {
            void handleAddSlide(type)
          }}
          onDelete={handleDeleteSlide}
          onReorder={handleReorderSlides}
          onSelect={(questionId) => {
            void handleSelectQuestion(questionId)
          }}
          questions={editorData.questions}
          selectedQuestionId={selectedQuestion?.id ?? null}
        />

        <section className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-amber-500">Preview</p>
                <p className="mt-2 text-sm text-slate-600">
                  {editorData.session.state === 'live'
                    ? 'This slide is currently driving the audience phones and big screen.'
                    : 'This center pane mirrors the big-screen composition while you build the slide.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!previousQuestion}
                  onClick={() => {
                    if (previousQuestion) {
                      void handleSelectQuestion(previousQuestion.id)
                    }
                  }}
                  type="button"
                >
                  <ChevronLeft className="size-4" />
                  Previous slide
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!nextQuestion}
                  onClick={() => {
                    if (nextQuestion) {
                      void handleSelectQuestion(nextQuestion.id)
                    }
                  }}
                  type="button"
                >
                  Next slide
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </div>

          <QuestionBigScreenPreview question={selectedQuestion} />
        </section>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          {errorMessage ? (
            <div className="rounded-2xl border border-rose-300/50 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            {saveState === 'saving'
              ? 'Saving changes…'
              : saveState === 'saved'
                ? 'All changes saved to Supabase.'
                : saveState === 'error'
                  ? 'The last edit could not be saved.'
                  : 'Changes save automatically as you edit.'}
          </div>

          {selectedQuestion && isMultipleChoiceQuestion(selectedQuestion) ? (
            <MultipleChoiceEditor
              activeTab={activeTab}
              onAddOption={() =>
                updateSelectedQuestion((question) =>
                  isMultipleChoiceQuestion(question)
                    ? {
                        ...question,
                        config: {
                          ...question.config,
                          options: [...question.config.options, `Option ${question.config.options.length + 1}`],
                        },
                      }
                    : question,
                )
              }
              onChartTypeChange={(chartType) =>
                updateSelectedQuestion((question) =>
                  isMultipleChoiceQuestion(question)
                    ? {
                        ...question,
                        config: {
                          ...question.config,
                          chartType,
                        },
                      }
                    : question,
                )
              }
              onOptionChange={(index, value) =>
                updateSelectedQuestion((question) =>
                  isMultipleChoiceQuestion(question)
                    ? {
                        ...question,
                        config: {
                          ...question.config,
                          options: question.config.options.map((option, optionIndex) =>
                            optionIndex === index ? value : option,
                          ),
                        },
                      }
                    : question,
                )
              }
              onRemoveOption={(index) =>
                updateSelectedQuestion((question) =>
                  isMultipleChoiceQuestion(question)
                    ? {
                        ...question,
                        config: {
                          ...question.config,
                          options: question.config.options.filter(
                            (_option, optionIndex) => optionIndex !== index,
                          ),
                        },
                      }
                    : question,
                )
              }
              onTabChange={setActiveTab}
              onTitleChange={(title) =>
                updateSelectedQuestion((question) => ({
                  ...question,
                  title,
                }))
              }
              question={selectedQuestion}
            />
          ) : selectedQuestion && isWordCloudQuestion(selectedQuestion) ? (
            <WordCloudEditor
              activeTab={activeTab}
              onAllowMultipleSubmissionsChange={(allowMultipleSubmissions) =>
                updateSelectedQuestion((question) =>
                  isWordCloudQuestion(question)
                    ? {
                        ...question,
                        config: {
                          ...question.config,
                          allowMultipleSubmissions,
                        },
                      }
                    : question,
                )
              }
              onTabChange={setActiveTab}
              onTitleChange={(title) =>
                updateSelectedQuestion((question) =>
                  isWordCloudQuestion(question)
                    ? {
                        ...question,
                        title,
                      }
                    : question,
                )
              }
              question={selectedQuestion}
            />
          ) : selectedQuestion && isOpenEndedQuestion(selectedQuestion) ? (
            <OpenEndedEditor
              activeTab={activeTab}
              onMaxLengthChange={(maxLength) =>
                updateSelectedQuestion((question) =>
                  isOpenEndedQuestion(question)
                    ? {
                        ...question,
                        config: {
                          ...question.config,
                          maxLength: normalizeOpenEndedMaxLength(maxLength),
                        },
                      }
                    : question,
                )
              }
              onTabChange={setActiveTab}
              onTitleChange={(title) =>
                updateSelectedQuestion((question) =>
                  isOpenEndedQuestion(question)
                    ? {
                        ...question,
                        title,
                      }
                    : question,
                )
              }
              question={selectedQuestion}
            />
          ) : selectedQuestion && isScalesQuestion(selectedQuestion) ? (
            <ScalesEditor
              activeTab={activeTab}
              onLeftLabelChange={(leftLabel) =>
                updateSelectedQuestion((question) =>
                  isScalesQuestion(question)
                    ? {
                        ...question,
                        config: {
                          ...question.config,
                          leftLabel,
                        },
                      }
                    : question,
                )
              }
              onRightLabelChange={(rightLabel) =>
                updateSelectedQuestion((question) =>
                  isScalesQuestion(question)
                    ? {
                        ...question,
                        config: {
                          ...question.config,
                          rightLabel,
                        },
                      }
                    : question,
                )
              }
              onTabChange={setActiveTab}
              onTitleChange={(title) =>
                updateSelectedQuestion((question) =>
                  isScalesQuestion(question)
                    ? {
                        ...question,
                        title,
                      }
                    : question,
                )
              }
              question={selectedQuestion}
            />
          ) : selectedQuestion && isQAndAQuestion(selectedQuestion) ? (
            <QAndAEditor
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onTitleChange={(title) =>
                updateSelectedQuestion((question) =>
                  isQAndAQuestion(question)
                    ? {
                        ...question,
                        title,
                      }
                    : question,
                )
              }
              question={selectedQuestion}
            />
          ) : selectedQuestion && isQuizQuestion(selectedQuestion) ? (
            <QuizEditor
              activeTab={activeTab}
              onAddOption={() =>
                updateSelectedQuestion((question) =>
                  isQuizQuestion(question)
                    ? {
                        ...question,
                        config: {
                          ...question.config,
                          options: [...question.config.options, `Option ${question.config.options.length + 1}`],
                        },
                      }
                    : question,
                )
              }
              onCorrectOptionChange={(correctOptionIdx) =>
                updateSelectedQuestion((question) =>
                  isQuizQuestion(question)
                    ? {
                        ...question,
                        config: {
                          ...question.config,
                          correctOptionIdx: Math.min(
                            question.config.options.length - 1,
                            Math.max(0, correctOptionIdx),
                          ),
                        },
                      }
                    : question,
                )
              }
              onDurationSecondsChange={(durationSeconds) =>
                updateSelectedQuestion((question) =>
                  isQuizQuestion(question)
                    ? {
                        ...question,
                        config: {
                          ...question.config,
                          durationSeconds: Math.min(120, Math.max(5, Math.round(durationSeconds || 30))),
                        },
                      }
                    : question,
                )
              }
              onOptionChange={(index, value) =>
                updateSelectedQuestion((question) =>
                  isQuizQuestion(question)
                    ? {
                        ...question,
                        config: {
                          ...question.config,
                          options: question.config.options.map((option, optionIndex) =>
                            optionIndex === index ? value : option,
                          ),
                        },
                      }
                    : question,
                )
              }
              onRemoveOption={(index) =>
                updateSelectedQuestion((question) => {
                  if (!isQuizQuestion(question)) {
                    return question
                  }

                  const nextOptions = question.config.options.filter(
                    (_option, optionIndex) => optionIndex !== index,
                  )
                  const nextCorrectOptionIdx = Math.min(
                    nextOptions.length - 1,
                    question.config.correctOptionIdx >= index
                      ? Math.max(0, question.config.correctOptionIdx - 1)
                      : question.config.correctOptionIdx,
                  )

                  return {
                    ...question,
                    config: {
                      ...question.config,
                      correctOptionIdx: nextCorrectOptionIdx,
                      options: nextOptions,
                    },
                  }
                })
              }
              onTabChange={setActiveTab}
              onTitleChange={(title) =>
                updateSelectedQuestion((question) =>
                  isQuizQuestion(question)
                    ? {
                        ...question,
                        title,
                      }
                    : question,
                )
              }
              question={selectedQuestion}
            />
          ) : null}
        </aside>
      </section>

      {shareModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShareModalOpen(false)
              setShareState('idle')
            }
          }}
        >
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
            <button
              aria-label="Close share dialog"
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              onClick={() => {
                setShareModalOpen(false)
                setShareState('idle')
              }}
              type="button"
            >
              <X className="size-5" />
            </button>

            <p className="text-center text-sm uppercase tracking-[0.3em] text-cyan-600">Share this room</p>
            <p className="mt-2 text-center text-sm text-slate-500">Scan the QR code or enter the code below to join.</p>

            <div className="mt-6 flex justify-center">
              <div className="rounded-2xl bg-white p-3 shadow-inner ring-1 ring-slate-200">
                <QRCodeSVG aria-label="Session QR code" size={180} value={buildJoinUrl(editorData.session.code)} />
              </div>
            </div>

            <p className="mt-6 text-center text-3xl font-bold tracking-[0.4em] text-slate-900">
              {formatSessionCode(editorData.session.code)}
            </p>

            <button
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              onClick={() => {
                void handleShare()
              }}
              type="button"
            >
              <Copy className="size-4" />
              {shareState === 'copied' ? 'Link copied!' : 'Copy join link'}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  )
}
