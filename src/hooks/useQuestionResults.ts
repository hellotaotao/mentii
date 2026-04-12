import { useEffect, useRef, useState } from 'react'
import { subscribeToQuestionResultSignals } from '../lib/realtime'
import { getQuestionResults } from '../lib/supabaseQueries'
import type { EditorQuestion, QuestionResults } from '../types/questions'

const RESULTS_REFRESH_DEBOUNCE_MS = 200

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
  const [refreshKey, setRefreshKey] = useState(0)
  const latestRequestIdRef = useRef(0)

  useEffect(() => {
    if (!question) {
      return
    }

    const activeQuestion = question
    let isActive = true
    let hasSubscriptionSynced = false
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    async function loadResults(markSubscriptionSynced: boolean) {
      const requestId = latestRequestIdRef.current + 1
      latestRequestIdRef.current = requestId

      setState((currentState) => ({
        errorMessage: null,
        results: currentState.results?.questionId === activeQuestion.id ? currentState.results : null,
        status:
          hasSubscriptionSynced && currentState.results?.questionId === activeQuestion.id ? 'ready' : 'loading',
      }))

      try {
        const nextResults = await getQuestionResults(activeQuestion)

        if (!isActive || latestRequestIdRef.current !== requestId) {
          return
        }

        if (markSubscriptionSynced) {
          hasSubscriptionSynced = true
        }

        setState({
          errorMessage: null,
          results: nextResults,
          status: hasSubscriptionSynced ? 'ready' : 'loading',
        })
      } catch (error) {
        if (!isActive || latestRequestIdRef.current !== requestId) {
          return
        }

        setState({
          errorMessage: getErrorMessage(error),
          results: null,
          status: 'error',
        })
      }
    }

    function scheduleLoadResults(markSubscriptionSynced: boolean) {
      if (markSubscriptionSynced && !hasSubscriptionSynced) {
        void loadResults(true)
        return
      }

      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      debounceTimer = setTimeout(() => {
        debounceTimer = null
        void loadResults(markSubscriptionSynced)
      }, RESULTS_REFRESH_DEBOUNCE_MS)
    }

    void loadResults(false)
    const unsubscribe = subscribeToQuestionResultSignals(activeQuestion.id, () => {
      scheduleLoadResults(true)
    })

    return () => {
      isActive = false

      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      unsubscribe()
    }
  }, [question, refreshKey])

  if (!question) {
    return {
      errorMessage: null,
      refreshResults: () => setRefreshKey((currentKey) => currentKey + 1),
      results: null,
      status: 'idle' as const,
    }
  }

  return {
    ...state,
    refreshResults: () => setRefreshKey((currentKey) => currentKey + 1),
  }
}
