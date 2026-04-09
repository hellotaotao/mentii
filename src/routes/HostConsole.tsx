import { Copy, Eye, Play } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import SlideList from '../components/SlideList'
import MultipleChoiceEditor from '../components/questions/MultipleChoice/Editor'
import type { HostPropertyTab } from '../components/questions/MultipleChoice/editorTabs'
import {
  createQuestion,
  createSessionWithDefaultQuestion,
  deleteQuestion,
  getSessionEditorData,
  reorderQuestions,
  updateQuestion,
} from '../lib/supabaseQueries'
import { formatSessionCode } from '../lib/sessionCode'
import {
  getQuestionTypeLabel,
  isHostEditorReady,
  isMultipleChoiceQuestion,
  type EditorQuestion,
  type SessionEditorData,
} from '../types/questions'
import type { HostAuthContext } from './HostAuthGate'

type HostConsoleProps = {
  mode: 'new' | 'existing'
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Something went wrong while updating this session.'
}

function getPreviewTitle(question: EditorQuestion | null) {
  if (!question) {
    return 'Select a slide'
  }

  return question.title.trim() || 'Untitled question'
}

function QuestionPreview({ question }: { question: EditorQuestion | null }) {
  if (!question) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-[32px] border border-dashed border-white/15 bg-slate-950/60 p-8 text-center text-slate-400">
        Choose a slide to preview how the presenter screen will look later.
      </div>
    )
  }

  if (!isMultipleChoiceQuestion(question)) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center rounded-[32px] border border-white/10 bg-slate-950/70 p-10 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-amber-300">{getQuestionTypeLabel(question.type)}</p>
        <h2 className="mt-4 text-3xl font-semibold">{getPreviewTitle(question)}</h2>
        <p className="mt-4 max-w-xl text-base text-slate-300">
          This question type is already part of the shared registry, but its dedicated editor arrives in a later
          phase.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-[520px] rounded-[32px] border border-white/10 bg-slate-950/70 p-10">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{question.config.chartType}</p>
        <h2 className="mt-5 text-4xl font-semibold">{getPreviewTitle(question)}</h2>
        <div className="mt-10 w-full space-y-4">
          {question.config.options.map((option, index) => (
            <div
              className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/5 px-5 py-4"
              key={`${question.id}-preview-${index}`}
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-cyan-400/20 text-sm font-semibold text-cyan-200">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-lg font-medium text-white">{option.trim() || `Option ${index + 1}`}</p>
                <div className="mt-2 h-2 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-cyan-400/70"
                    style={{ width: `${Math.max(18, 72 - index * 10)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function HostConsole({ mode }: HostConsoleProps) {
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()
  const hostContext = useOutletContext<HostAuthContext | undefined>()
  const hostUserId = hostContext?.user.id ?? null
  const [activeTab, setActiveTab] = useState<HostPropertyTab>('content')
  const [editorData, setEditorData] = useState<SessionEditorData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const selectedQuestion = useMemo(
    () =>
      editorData?.questions.find((question) => question.id === selectedQuestionId) ??
      editorData?.questions[0] ??
      null,
    [editorData, selectedQuestionId],
  )

  useEffect(() => {
    let isActive = true

    async function bootstrapEditor() {
      setErrorMessage(null)

      if (mode === 'new') {
        if (!hostUserId) {
          setStatus('error')
          setErrorMessage('Host authentication is required to create a session.')
          return
        }

        setStatus('loading')

        try {
          const { sessionId: nextSessionId } = await createSessionWithDefaultQuestion(hostUserId)

          if (!isActive) {
            return
          }

          navigate(`/host/${nextSessionId}`, { replace: true })
        } catch (error) {
          if (!isActive) {
            return
          }

          setStatus('error')
          setErrorMessage(getErrorMessage(error))
        }

        return
      }

      if (!sessionId) {
        setStatus('error')
        setErrorMessage('Session not found.')
        return
      }

      setStatus('loading')

      try {
        const nextEditorData = await getSessionEditorData(sessionId)

        if (!isActive) {
          return
        }

        setEditorData(nextEditorData)
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
    }
  }, [hostUserId, mode, navigate, sessionId])

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
    void persistQuestion(nextQuestion)
  }

  async function handleAddSlide() {
    if (!editorData) {
      return
    }

    setErrorMessage(null)

    try {
      const nextQuestion = await createQuestion(editorData.session.id, 'multiple_choice')

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
    const deletedQuestionIndex = currentQuestions.findIndex((question) => question.id === questionId)
    const remainingQuestions = currentQuestions
      .filter((question) => question.id !== questionId)
      .map((question, index) => ({
        ...question,
        orderIndex: index,
      }))

    try {
      await deleteQuestion(editorData.session.id, questionId)
      setEditorData({
        ...editorData,
        questions: remainingQuestions,
      })

      if (selectedQuestionId === questionId) {
        const fallbackQuestion =
          remainingQuestions[Math.max(0, deletedQuestionIndex - 1)] ?? remainingQuestions[0] ?? null
        setSelectedQuestionId(fallbackQuestion?.id ?? null)
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    }
  }

  async function handleReorderSlides(orderedQuestionIds: string[]) {
    if (!editorData) {
      return
    }

    const questionById = new Map(editorData.questions.map((question) => [question.id, question]))
    const reorderedQuestions = orderedQuestionIds
      .map((questionId) => questionById.get(questionId))
      .filter((question): question is EditorQuestion => Boolean(question))
      .map((question, index) => ({
        ...question,
        orderIndex: index,
      }))

    if (reorderedQuestions.length !== editorData.questions.length) {
      return
    }

    const previousQuestions = editorData.questions
    setEditorData({
      ...editorData,
      questions: reorderedQuestions,
    })

    try {
      await reorderQuestions(editorData.session.id, orderedQuestionIds)
    } catch (error) {
      setEditorData({
        ...editorData,
        questions: previousQuestions,
      })
      setErrorMessage(getErrorMessage(error))
    }
  }

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-fuchsia-300">Host</p>
          <h1 className="mt-3 text-3xl font-semibold">
            {mode === 'new' ? 'Creating your session…' : 'Loading host console…'}
          </h1>
          <p className="mt-4 text-sm text-slate-300">
            {mode === 'new'
              ? 'Generating a session code and your first multiple-choice slide.'
              : 'Fetching the ordered slides and draft settings from Supabase.'}
          </p>
        </section>
      </main>
    )
  }

  if (status === 'error' || !editorData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <section className="w-full max-w-md rounded-3xl border border-rose-300/30 bg-rose-400/10 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-rose-200">Host</p>
          <h1 className="mt-3 text-3xl font-semibold">Unable to load the editor</h1>
          <p className="mt-4 text-sm text-rose-100">{errorMessage ?? 'Try refreshing the page.'}</p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-fuchsia-300">Host</p>
            <h1 className="mt-2 text-3xl font-semibold">Host console</h1>
            <div className="mt-3 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
              <span>Join code</span>
              <span className="text-base font-semibold tracking-[0.35em]">
                {formatSessionCode(editorData.session.code)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled
              type="button"
            >
              <Eye className="size-4" />
              Preview
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled
              type="button"
            >
              <Copy className="size-4" />
              Share
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled
              type="button"
            >
              <Play className="size-4" />
              Present
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[280px_minmax(0,1fr)_360px]">
        <SlideList
          onAdd={handleAddSlide}
          onDelete={handleDeleteSlide}
          onReorder={handleReorderSlides}
          onSelect={(questionId) => setSelectedQuestionId(questionId)}
          questions={editorData.questions}
          selectedQuestionId={selectedQuestion?.id ?? null}
        />

        <section className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm uppercase tracking-[0.3em] text-amber-300">Preview</p>
            <p className="mt-2 text-sm text-slate-300">
              This center pane mirrors the big-screen composition while you build the slide.
            </p>
          </div>

          <QuestionPreview question={selectedQuestion} />
        </section>

        <aside className="space-y-4">
          {errorMessage ? (
            <div className="rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              {errorMessage}
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
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
          ) : selectedQuestion ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-fuchsia-300">Properties</p>
              <h2 className="mt-2 text-2xl font-semibold">{getQuestionTypeLabel(selectedQuestion.type)}</h2>
              <p className="mt-4 text-sm text-slate-300">
                This question type is registered and can render in the slide list, but its custom editor will land
                in a later phase.
              </p>
              {!isHostEditorReady(selectedQuestion.type) ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
                  Keep Phase 1a focused on multiple choice. The registry already keeps future question types wired
                  through the same session editor data flow.
                </div>
              ) : null}
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  )
}
