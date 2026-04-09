import type { FormEvent } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function JoinPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedCode = code.replace(/\s+/g, '')
    if (!normalizedCode) return

    navigate(`/vote/${normalizedCode}`)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <div className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Mentii</p>
          <h1 className="text-3xl font-semibold">Join a live session</h1>
          <p className="text-sm text-slate-300">Phase 0 placeholder for the audience join page.</p>
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
            onChange={(event) => setCode(event.target.value)}
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
      </section>
    </main>
  )
}
