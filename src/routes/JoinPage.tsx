import type { FormEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getSessionByCode } from '../lib/supabaseQueries'
import { formatSessionCode, normalizeSessionCode } from '../lib/sessionCode'

function getFriendlyJoinErrorMessage(error: unknown, normalizedCode: string) {
  if (error instanceof Error) {
    const normalizedMessage = error.message.toLowerCase()

    if (
      normalizedMessage.includes('session not found') ||
      normalizedMessage.includes('json object requested') ||
      normalizedMessage.includes('no rows')
    ) {
      return `No room found for code ${formatSessionCode(normalizedCode)}.`
    }
  }

  return 'Unable to join this room right now. Please try again.'
}

export default function JoinPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryCode = searchParams.get('code') ?? ''

  const attemptJoin = useCallback(async (normalizedCode: string, replace = false) => {
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const sessionData = await getSessionByCode(normalizedCode)

      if (sessionData.session.state === 'ended') {
        setErrorMessage('This room has ended. Ask your host for a new code.')
        return
      }

      navigate(`/vote/${normalizedCode}`, { replace })
    } catch (error) {
      setErrorMessage(getFriendlyJoinErrorMessage(error, normalizedCode))
    } finally {
      setIsSubmitting(false)
    }
  }, [navigate])

  useEffect(() => {
    const normalizedQueryCode = normalizeSessionCode(queryCode)

    if (!normalizedQueryCode) {
      return
    }

    void attemptJoin(normalizedQueryCode, true)
  }, [attemptJoin, queryCode])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedCode = normalizeSessionCode(code)
    if (normalizedCode.length !== 6) {
      setErrorMessage('Enter the 6-digit room code from the big screen.')
      return
    }

    void attemptJoin(normalizedCode)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <div className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Mentii</p>
          <h1 className="text-3xl font-semibold">Join a live session</h1>
          <p className="text-sm text-slate-300">Enter the six-digit code shown on the big screen to vote.</p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2" htmlFor="session-code">
            <span className="text-sm font-medium text-slate-200">6-digit code</span>
          </label>
          <input
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-center text-2xl tracking-[0.35em] outline-none placeholder:text-slate-500"
            id="session-code"
            inputMode="numeric"
            maxLength={7}
            name="session-code"
            onChange={(event) => setCode(formatSessionCode(event.target.value))}
            placeholder="4821 76"
            value={code}
          />
          <button
            className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Checking…' : 'Join'}
          </button>
        </form>

        {errorMessage ? (
          <p className="mt-4 rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {errorMessage}
          </p>
        ) : null}

        <p className="mt-6 text-center text-xs text-slate-400">
          Running the session?{' '}
          <Link className="font-medium text-cyan-300 hover:text-cyan-200" to="/host">
            Sign in as host
          </Link>
        </p>
      </section>
    </main>
  )
}
