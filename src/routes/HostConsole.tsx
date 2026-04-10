import { ChevronLeft, ChevronRight, Copy, Eye, Play } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import SlideList from '../components/SlideList'
import MultipleChoiceEditor from '../components/questions/MultipleChoice/Editor'
import OpenEndedEditor from '../components/questions/OpenEnded/Editor'
import QAndAEditor from '../components/questions/QAndA/Editor'
import QuizEditor from '../components/questions/Quiz/Editor'
import ScalesEditor from '../components/questions/Scales/Editor'
import WordCloudEditor from '../components/questions/WordCloud/Editor'
import type { HostPropertyTab } from '../components/questions/MultipleChoice/editorTabs'
import {
  createQuestion,
  createSessionWithDefaultQuestion,
  deleteQuestion,
  getSessionEditorData,
  reorderQuestions,
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

function createQuestionCycleStartedAt() {
  return new Date().toISOString()
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

function QuestionPreview({ question }: { question: EditorQuestion | null }) {
  if (!question) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-[32px] border border-dashed border-white/15 bg-slate-950/60 p-8 text-center text-slate-400">
        Choose a slide to preview how the presenter screen will look later.
      </div>
    )
  }

  if (!isMultipleChoiceQuestion(question)) {
    if (isQuizQuestion(question)) {
      return (
        <div className="flex min-h-[520px] flex-col rounded-[32px] border border-white/10 bg-slate-950/70 p-10">
          <div className="mx-auto flex max-w-4xl flex-1 flex-col justify-center">
            <p className="text-center text-sm uppercase tracking-[0.3em] text-cyan-300">quiz</p>
            <h2 className="mt-5 text-center text-4xl font-semibold">{getPreviewTitle(question)}</h2>
            <div className="mt-8 text-center text-base text-slate-300">{`${question.config.durationSeconds}s remaining`}</div>
            <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <section className="space-y-4">
                {question.config.options.map((option, index) => (
                  <article
                    className={`rounded-3xl border px-5 py-4 ${
                      index === question.config.correctOptionIdx
                        ? 'border-emerald-300/30 bg-emerald-400/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                    key={`${question.id}-preview-quiz-${index}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{`${3 - Math.abs(1 - index)} votes`}</p>
                        <p className="mt-3 text-base text-slate-100">{option.trim() || `Option ${index + 1}`}</p>
                      </div>
                      {index === question.config.correctOptionIdx ? (
                        <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-100">
                          Correct
                        </span>
                      ) : null}
                    </div>
                  </article>
                ))}
              </section>

              <aside className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Leaderboard</p>
                <ol className="mt-4 space-y-3">
                  {['Player 1', 'Player 2', 'Player 3'].map((label, index) => (
                    <li
                      className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3"
                      key={`${question.id}-preview-quiz-leader-${label}`}
                    >
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{`Rank ${index + 1}`}</p>
                      <p className="mt-1 text-base font-medium text-white">{label}</p>
                    </li>
                  ))}
                </ol>
              </aside>
            </div>
          </div>
        </div>
      )
    }

    if (isQAndAQuestion(question)) {
      return (
        <div className="flex min-h-[520px] flex-col rounded-[32px] border border-white/10 bg-slate-950/70 p-10">
          <div className="mx-auto flex max-w-4xl flex-1 flex-col justify-center">
            <p className="text-center text-sm uppercase tracking-[0.3em] text-cyan-300">q&amp;a</p>
            <h2 className="mt-5 text-center text-4xl font-semibold">{getPreviewTitle(question)}</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {[
                { answered: false, text: 'How will support handle launch issues?', upvotes: 5 },
                { answered: true, text: 'Can we publish a rollback checklist?', upvotes: 3 },
              ].map((entry, index) => (
                <article
                  className={`rounded-3xl border px-5 py-4 ${
                    entry.answered
                      ? 'border-emerald-300/30 bg-emerald-400/10'
                      : 'border-white/10 bg-white/5'
                  }`}
                  key={`${question.id}-preview-q-and-a-${index}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{`${entry.upvotes} upvotes`}</p>
                      <p className="mt-3 text-base leading-7 text-slate-100">{entry.text}</p>
                    </div>
                    {entry.answered ? (
                      <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-100">
                        Answered
                      </span>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )
    }

    if (isScalesQuestion(question)) {
      return (
        <div className="flex min-h-[520px] flex-col rounded-[32px] border border-white/10 bg-slate-950/70 p-10">
          <div className="mx-auto flex max-w-4xl flex-1 flex-col justify-center">
            <p className="text-center text-sm uppercase tracking-[0.3em] text-cyan-300">scales</p>
            <h2 className="mt-5 text-center text-4xl font-semibold">{getPreviewTitle(question)}</h2>
            <div className="mt-10 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Average score</p>
                <p className="mt-5 text-5xl font-semibold text-white">3.8 / 5</p>
                <div className="mt-6 flex items-start justify-between gap-4 text-sm text-slate-300">
                  <span className="max-w-[45%] text-left">{question.config.leftLabel}</span>
                  <span className="max-w-[45%] text-right">{question.config.rightLabel}</span>
                </div>
              </section>

              <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <div key={`${question.id}-preview-scale-${rating}`}>
                    <div className="flex items-center justify-between text-sm text-slate-200">
                      <span className="font-medium">{`${rating} / 5`}</span>
                      <span>{`${Math.max(0, 6 - Math.abs(4 - rating) * 2)} votes`}</span>
                    </div>
                    <div className="mt-2 h-3 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-cyan-400/70"
                        style={{
                          width: `${Math.max(12, 86 - Math.abs(4 - rating) * 18)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </section>
            </div>
          </div>
        </div>
      )
    }

    if (isOpenEndedQuestion(question)) {
      return (
        <div className="flex min-h-[520px] flex-col rounded-[32px] border border-white/10 bg-slate-950/70 p-10">
          <div className="mx-auto flex max-w-4xl flex-1 flex-col justify-center">
            <p className="text-center text-sm uppercase tracking-[0.3em] text-cyan-300">open ended</p>
            <h2 className="mt-5 text-center text-4xl font-semibold">{getPreviewTitle(question)}</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {[
                'More visible release planning would help the whole team.',
                'Shorter standups and clearer ownership on cross-team work.',
                'I want clearer sprint goals before kickoff.',
              ].map((response, index) => (
                <article
                  className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-left shadow-sm"
                  key={`${question.id}-preview-open-ended-${index}`}
                >
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{`Response ${index + 1}`}</p>
                  <p className="mt-3 text-base leading-7 text-slate-100">{response}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      )
    }

    if (isWordCloudQuestion(question)) {
      return (
        <div className="flex min-h-[520px] flex-col rounded-[32px] border border-white/10 bg-slate-950/70 p-10">
          <div className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">word cloud</p>
            <h2 className="mt-5 text-4xl font-semibold">{getPreviewTitle(question)}</h2>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              {['productive', 'focused', 'clear', 'energized', 'calm'].map((word, index) => (
                <span
                  className="rounded-full px-3 py-2 font-semibold text-cyan-100"
                  key={word}
                  style={{
                    fontSize: `${22 + index * 8}px`,
                    opacity: 0.55 + index * 0.08,
                  }}
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        </div>
      )
    }

    return null
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
  const [shareState, setShareState] = useState<'copied' | 'idle'>('idle')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
              onClick={handlePreview}
              type="button"
            >
              <Eye className="size-4" />
              Preview
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                void handleShare()
              }}
              type="button"
            >
              <Copy className="size-4" />
              {shareState === 'copied' ? 'Copied' : 'Share'}
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

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[280px_minmax(0,1fr)_360px]">
        <SlideList
          onAdd={() => {
            void handleAddSlide('multiple_choice')
          }}
          onAddOpenEnded={() => {
            void handleAddSlide('open_ended')
          }}
          onAddQAndA={() => {
            void handleAddSlide('q_and_a')
          }}
          onAddQuiz={() => {
            void handleAddSlide('quiz')
          }}
          onAddScales={() => {
            void handleAddSlide('scales')
          }}
          onAddWordCloud={() => {
            void handleAddSlide('word_cloud')
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
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-amber-300">Preview</p>
                <p className="mt-2 text-sm text-slate-300">
                  {editorData.session.state === 'live'
                    ? 'This slide is currently driving the audience phones and big screen.'
                    : 'This center pane mirrors the big-screen composition while you build the slide.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
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
    </main>
  )
}
