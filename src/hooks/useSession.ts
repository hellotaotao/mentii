import { useCallback, useEffect, useMemo, useState } from 'react'
import { subscribeToSessionQuestionChanges, subscribeToSessionUpdates } from '../lib/realtime'
import { getSessionEditorData } from '../lib/supabaseQueries'
import type { Tables } from '../types/database'
import type { EditorQuestion, SessionEditorData } from '../types/questions'

type UseSessionState = {
  errorMessage: string | null
  sessionData: SessionEditorData | null
  status: 'error' | 'loading' | 'ready'
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Unable to load this presentation session.'
}

export function useSession(sessionId: string) {
  const [state, setState] = useState<UseSessionState>({
    errorMessage: null,
    sessionData: null,
    status: sessionId ? 'loading' : 'error',
  })

  const mergeSessionUpdate = useCallback((nextSessionFields: Partial<Tables<'sessions'>>) => {
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
            ...nextSessionFields,
          },
        },
      }
    })
  }, [])

  useEffect(() => {
    if (!sessionId) {
      return
    }

    let isActive = true
    let latestLoadRequestId = 0

    async function loadSessionData(mode: 'initial' | 'refresh') {
      const requestId = latestLoadRequestId + 1
      latestLoadRequestId = requestId

      if (mode === 'initial') {
        setState((currentState) => ({
          ...currentState,
          errorMessage: null,
          status: 'loading',
        }))
      }

      try {
        const sessionData = await getSessionEditorData(sessionId)

        if (!isActive || latestLoadRequestId !== requestId) {
          return
        }

        setState({
          errorMessage: null,
          sessionData,
          status: 'ready',
        })
      } catch (error) {
        if (!isActive || latestLoadRequestId !== requestId) {
          return
        }

        setState((currentState) => {
          if (mode === 'refresh' && currentState.sessionData) {
            return {
              ...currentState,
              errorMessage: getErrorMessage(error),
            }
          }

          return {
            errorMessage: getErrorMessage(error),
            sessionData: null,
            status: 'error',
          }
        })
      }
    }

    void loadSessionData('initial')

    const unsubscribeSessionUpdates = subscribeToSessionUpdates(sessionId, (nextSession: Tables<'sessions'>) => {
      mergeSessionUpdate(nextSession)
    })
    const unsubscribeQuestionChanges = subscribeToSessionQuestionChanges(sessionId, () => {
      void loadSessionData('refresh')
    })

    return () => {
      isActive = false
      unsubscribeSessionUpdates()
      unsubscribeQuestionChanges()
    }
  }, [mergeSessionUpdate, sessionId])

  const currentQuestion = useMemo<EditorQuestion | null>(() => {
    const questions = state.sessionData?.questions ?? []
    const currentQuestionId = state.sessionData?.session.current_question_id

    return questions.find((question) => question.id === currentQuestionId) ?? questions[0] ?? null
  }, [state.sessionData])

  if (!sessionId) {
    return {
      currentQuestion: null,
      errorMessage: 'Session not found.',
      mergeSessionUpdate,
      questions: [],
      session: null,
      status: 'error' as const,
    }
  }

  return {
    currentQuestion,
    errorMessage: state.errorMessage,
    mergeSessionUpdate,
    questions: state.sessionData?.questions ?? [],
    session: state.sessionData?.session ?? null,
    status: state.status,
  }
}
