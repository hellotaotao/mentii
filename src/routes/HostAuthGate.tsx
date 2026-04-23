import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Eye, Mail, Sparkles } from 'lucide-react'
import { getSupabaseClient } from '../lib/supabase'

export type HostAuthContext = {
  user: {
    email?: string | null
    id: string
  }
}

const hostBenefits = [
  {
    title: 'Create rooms fast',
    description: 'Start a room, add slides, and share a live code without asking the audience to install anything.',
  },
  {
    title: 'Preview the interaction',
    description: 'See how multiple choice, word clouds, scales, and open-ended prompts look before you commit.',
  },
  {
    title: 'Run real sessions later',
    description: 'Use the demo first, then sign in when you want to save rooms and host your own live event.',
  },
] as const

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
    <main className="relative isolate min-h-screen overflow-hidden bg-slate-100 px-6 py-8 text-slate-900 sm:px-8 lg:px-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.10),transparent_32%)]" />
      </div>

      <section className="relative mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.15fr)_24rem] lg:items-start">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_20px_65px_rgba(15,23,42,0.10)] sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm text-cyan-700">
            <Sparkles className="size-4" />
            Host onboarding
          </div>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            See Mentii hosting before you sign in
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
            Explore a seeded host workspace first, understand how rooms and slides work, and only use magic-link
            sign-in when you are ready to create and save your own live room.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {hostBenefits.map((benefit) => (
              <article
                key={benefit.title}
                className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5 shadow-sm"
              >
                <p className="text-lg font-semibold text-slate-900">{benefit.title}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{benefit.description}</p>
              </article>
            ))}
          </div>

          <section className="mt-8 rounded-[1.8rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_20px_65px_rgba(15,23,42,0.18)] sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Anonymous walkthrough</p>
                <h2 className="mt-3 text-3xl font-semibold">Demo host workspace</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                  Browse a seeded room preview, switch through example slides, and see how Mentii looks from the host side without any account setup.
                </p>
              </div>
              <Eye className="size-8 text-cyan-200" />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/12 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:border-cyan-200/45 hover:bg-cyan-300/16 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                to="/host/demo"
              >
                Explore demo workspace
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/[0.10] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                to={`/?code=483129`}
              >
                Join demo room
              </Link>
            </div>
          </section>
        </article>

        <aside
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_65px_rgba(15,23,42,0.10)] sm:p-7 lg:sticky lg:top-8"
          id="host-sign-in"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs uppercase tracking-[0.28em] text-slate-500">
            <Mail className="size-4" />
            Magic link
          </div>
          <h2 className="mt-4 text-3xl font-semibold text-slate-950">Create your first real room</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Use your email to save rooms, build your own questions, and host sessions that persist beyond the demo.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2" htmlFor="host-email">
              <span className="text-sm font-medium text-slate-700">Work email</span>
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
            <p className="mt-4 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-700">
              Check your email for the sign-in link.
            </p>
          ) : null}

          {errorMessage ? (
            <p className="mt-4 rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}
        </aside>
      </section>
    </main>
  )
}
