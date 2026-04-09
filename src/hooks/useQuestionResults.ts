import { useEffect, useState } from 'react'
import { subscribeToQuestionVotes } from '../lib/realtime'
import { getQuestionResults } from '../lib/supabaseQueries'
import type { EditorQuestion, QuestionResults } from '../types/questions'

type UseQuestionResultsState = {
  errorMessage: string | null
  results: QuestionResults | null
  status: 'error' | 'idle' | 'loading' | 'ready'
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Unable to load live results.'
}

export function useQuestionResults(question: EditorQuestion | null) {
  const [state, setState] = useState<UseQuestionResultsState>({
    errorMessage: null,
    results: null,
    status: 'idle',
  })

  useEffect(() => {
    if (!question) {
      return
    }

    const activeQuestion = question
    let isActive = true

    async function loadResults() {
      setState((currentState) => ({
        errorMessage: null,
        results: currentState.results?.questionId === activeQuestion.id ? currentState.results : null,
        status: currentState.results?.questionId === activeQuestion.id ? 'ready' : 'loading',
      }))

      try {
        const nextResults = await getQuestionResults(activeQuestion)

        if (!isActive) {
          return
        }

        setState({
          errorMessage: null,
          results: nextResults,
          status: 'ready',
        })
      } catch (error) {
        if (!isActive) {
          return
        }

        setState({
          errorMessage: getErrorMessage(error),
          results: null,
          status: 'error',
        })
      }
    }

    void loadResults()
    const unsubscribe = subscribeToQuestionVotes(activeQuestion.id, () => {
      void loadResults()
    })

    return () => {
      isActive = false
      unsubscribe()
    }
  }, [question])

  if (!question) {
    return {
      errorMessage: null,
      results: null,
      status: 'idle' as const,
    }
  }

  return state
}
