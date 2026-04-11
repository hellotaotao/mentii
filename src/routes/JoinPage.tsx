import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { formatSessionCode, normalizeSessionCode } from '../lib/sessionCode'

export default function JoinPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState('')
  const queryCode = searchParams.get('code') ?? ''

  useEffect(() => {
    const normalizedQueryCode = normalizeSessionCode(queryCode)

    if (!normalizedQueryCode) {
      return
    }

    navigate(`/vote/${normalizedQueryCode}`, { replace: true })
  }, [navigate, queryCode])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedCode = normalizeSessionCode(code)
    if (!normalizedCode) return

    navigate(`/vote/${normalizedCode}`)
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
            className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950"
            type="submit"
          >
            Join
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Running the session?{' '}
          <Link className="font-medium text-cyan-300 hover:text-cyan-200" to="/host/new">
            Sign in as host
          </Link>
        </p>
      </section>
    </main>
  )
}
