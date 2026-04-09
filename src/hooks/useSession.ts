import { useEffect, useMemo, useState } from 'react'
import { subscribeToSessionUpdates } from '../lib/realtime'
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

  useEffect(() => {
    if (!sessionId) {
      return
    }

    let isActive = true

    void getSessionEditorData(sessionId)
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

    const unsubscribe = subscribeToSessionUpdates(sessionId, (nextSession: Tables<'sessions'>) => {
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

    return () => {
      isActive = false
      unsubscribe()
    }
  }, [sessionId])

  const currentQuestion = useMemo<EditorQuestion | null>(() => {
    const questions = state.sessionData?.questions ?? []
    const currentQuestionId = state.sessionData?.session.current_question_id

    return questions.find((question) => question.id === currentQuestionId) ?? questions[0] ?? null
  }, [state.sessionData])

  if (!sessionId) {
    return {
      currentQuestion: null,
      errorMessage: 'Session not found.',
      questions: [],
      session: null,
      status: 'error' as const,
    }
  }

  return {
    currentQuestion,
    errorMessage: state.errorMessage,
    questions: state.sessionData?.questions ?? [],
    session: state.sessionData?.session ?? null,
    status: state.status,
  }
}
