import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Outlet } from 'react-router-dom'
import { getSupabaseClient } from '../lib/supabase'

export type HostAuthContext = {
  user: {
    email?: string | null
    id: string
  }
}

export default function HostAuthGate() {
  const supabase = useMemo(() => getSupabaseClient(), [])
  const [email, setEmail] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [status, setStatus] = useState<'loading' | 'signed_in' | 'signed_out'>('loading')
  const [user, setUser] = useState<HostAuthContext['user'] | null>(null)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const sessionUser = nextSession?.user ?? null

      setUser(sessionUser ? { email: sessionUser.email, id: sessionUser.id } : null)
      setStatus(sessionUser ? 'signed_in' : 'signed_out')
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!email.trim()) {
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)

    const hostDashboardUrl = new URL('/host', window.location.origin).toString()

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: hostDashboardUrl,
      },
    })

    if (error) {
      setErrorMessage(error.message)
      setMagicLinkSent(false)
      setIsSubmitting(false)
      return
    }

    setMagicLinkSent(true)
    setIsSubmitting(false)
  }

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-slate-900">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-600">Host</p>
          <h1 className="mt-3 text-3xl font-semibold">Checking host access…</h1>
          <p className="mt-4 text-sm text-slate-600">Restoring your host rooms and preparing the dashboard.</p>
        </section>
      </main>
    )
  }

  if (status === 'signed_in' && user) {
    return <Outlet context={{ user }} />
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-slate-900">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-600">Host</p>
        <h1 className="mt-3 text-3xl font-semibold">Sign in to host rooms</h1>
        <p className="mt-4 text-sm text-slate-600">
          Use a Supabase magic link. Audience voting stays anonymous, but hosting rooms needs an authenticated owner.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2" htmlFor="host-email">
            <span className="text-sm font-medium text-slate-200">Work email</span>
            <input
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400"
              id="host-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="host@example.com"
              type="email"
              value={email}
            />
          </label>

          <button
            className="w-full rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Sending…' : 'Send magic link'}
          </button>
        </form>

        {magicLinkSent ? (
          <p className="mt-4 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            Check your email for the sign-in link.
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mt-4 rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {errorMessage}
          </p>
        ) : null}
      </section>
    </main>
  )
}
