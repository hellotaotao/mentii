import type { FormEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getSessionByCode } from '../lib/supabaseQueries'
import { formatSessionCode, normalizeSessionCode } from '../lib/sessionCode'

const featureHighlights = [
  {
    title: 'No app or sign-up',
    description: 'Participants jump in with a 6-digit code and respond from any phone in seconds.',
  },
  {
    title: 'Live visual feedback',
    description: 'Polls, word clouds, scales, and Q&A update on the big screen as the room responds.',
  },
  {
    title: 'Built for hosts',
    description: 'Facilitators can launch prompts quickly, keep momentum high, and see what the room thinks.',
  },
] as const

const reactionSignals = [
  { label: 'More examples', score: 78 },
  { label: 'Shorter updates', score: 63 },
  { label: 'Open Q&A', score: 51 },
] as const

const wordCloudTerms = ['clarity', 'energy', 'questions', 'momentum', 'alignment', 'ideas'] as const

const audienceJourney = [
  'Host opens a Mentii room and launches a prompt on the big screen.',
  'Audience enters the 6-digit code to vote, reply, or rate the moment live.',
  'Results appear instantly so the room can react, discuss, and move forward together.',
] as const

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
    <main className="relative isolate min-h-screen overflow-hidden bg-slate-950 px-6 py-6 text-white sm:px-8 lg:px-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="mentii-grid absolute inset-0 opacity-40" />
        <div className="mentii-orb mentii-float-slow absolute -left-20 top-14 h-72 w-72 rounded-full bg-cyan-400/[0.22]" />
        <div className="mentii-orb mentii-float-delayed absolute right-[-4.5rem] top-28 h-80 w-80 rounded-full bg-fuchsia-500/[0.18]" />
        <div className="mentii-orb mentii-float-slow absolute bottom-[-7rem] left-1/3 h-96 w-96 rounded-full bg-emerald-400/[0.14]" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col">
        <header className="flex items-center justify-between gap-4 rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 backdrop-blur-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.38em] text-cyan-200">Mentii</p>
            <p className="mt-1 text-sm text-slate-300">Live audience participation for rooms that need fast signal.</p>
          </div>
          <Link
            className="rounded-full border border-white/15 bg-white/[0.08] px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            to="/host"
          >
            Host sign-in
          </Link>
        </header>

        <section className="mt-8 grid flex-1 gap-8 lg:grid-cols-[minmax(0,1.12fr)_24rem] lg:items-start">
          <div className="space-y-8">
            <section className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 backdrop-blur-sm">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.75)]" />
                Audience feedback that moves at room speed
              </div>

              <div className="max-w-3xl space-y-4">
                <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                  Turn any presentation into a live conversation
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
                  Mentii helps teams run polls, word clouds, scales, and Q&amp;A without slowing the room down.
                  Participants join instantly with a room code, and the results update live on the big screen.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {featureHighlights.map((feature) => (
                  <article
                    key={feature.title}
                    className="rounded-[1.6rem] border border-white/10 bg-white/[0.07] p-5 shadow-[0_18px_55px_rgba(15,23,42,0.38)] backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sm font-semibold text-cyan-100">
                        {feature.title.slice(0, 1)}
                      </span>
                      <h2 className="text-base font-semibold text-white">{feature.title}</h2>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{feature.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section aria-label="Newcomer paths" className="grid gap-4 md:grid-cols-2">
              <a
                className="group rounded-[1.8rem] border border-cyan-300/20 bg-cyan-300/10 p-6 shadow-[0_18px_55px_rgba(8,145,178,0.2)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-cyan-200/40 hover:bg-cyan-300/[0.14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                href="#join-room"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">For participants</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">I have a room code</h2>
                <p className="mt-3 text-sm leading-6 text-cyan-50/[0.85]">
                  Jump straight into the live room from the 6-digit code on the screen and start responding.
                </p>
                <p className="mt-5 text-sm font-medium text-white transition group-hover:translate-x-1">Enter code above</p>
              </a>

              <Link
                className="group rounded-[1.8rem] border border-white/10 bg-white/[0.07] p-6 shadow-[0_18px_55px_rgba(15,23,42,0.38)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.09] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                to="/host"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">For facilitators</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">I&apos;m running the session</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Sign in as host to create rooms, launch prompts, and keep every response synced to the big screen.
                </p>
                <p className="mt-5 text-sm font-medium text-cyan-200 transition group-hover:translate-x-1">
                  Open host workspace
                </p>
              </Link>
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <article className="mentii-shimmer relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/[0.70] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.55)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(15,23,42,0.64))]" />
                <div className="relative space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Live room preview</p>
                      <h2 className="mt-3 text-2xl font-semibold text-white">See the room respond in real time</h2>
                    </div>
                    <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-emerald-100">
                      Live signal
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_15rem]">
                    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Instant reactions</p>
                          <p className="mt-2 text-lg font-semibold text-white">What should the team do next?</p>
                        </div>
                        <p className="text-sm text-slate-400">84 responses</p>
                      </div>

                      <ul className="mt-6 space-y-4">
                        {reactionSignals.map((signal, index) => (
                          <li key={signal.label} className="space-y-2">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-slate-100">{signal.label}</span>
                              <span className="font-medium text-cyan-200">{signal.score}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                              <span
                                className="mentii-bar block h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300"
                                style={{
                                  animationDelay: `${index * 0.35}s`,
                                  width: `${signal.score}%`,
                                }}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>

                    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Word cloud mode</p>
                      <p className="mt-2 text-lg font-semibold text-white">The room sounds like this</p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        {wordCloudTerms.map((term, index) => (
                          <span
                            key={term}
                            className="mentii-float-chip inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-50"
                            style={{ animationDelay: `${index * 0.4}s` }}
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              </article>

              <article
                className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-[0_18px_55px_rgba(15,23,42,0.38)] backdrop-blur-sm"
                id="how-it-works"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">How Mentii works</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">Clear on-ramp for a first visit</h2>
                <ol className="mt-6 space-y-4">
                  {audienceJourney.map((step, index) => (
                    <li
                      key={step}
                      className="rounded-[1.4rem] border border-white/10 bg-slate-950/50 p-4 text-sm leading-6 text-slate-200"
                    >
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">{`Step 0${index + 1}`}</p>
                      <p>{step}</p>
                    </li>
                  ))}
                </ol>
              </article>
            </section>
          </div>

          <aside className="lg:sticky lg:top-8" id="join-room">
            <section className="mentii-shimmer relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/[0.85] p-8 shadow-[0_24px_90px_rgba(2,6,23,0.65)] backdrop-blur-xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.12),transparent_40%)]" />
              <div className="relative space-y-6">
                <div className="space-y-3">
                  <p className="text-sm uppercase tracking-[0.32em] text-cyan-200">Audience entry</p>
                  <h2 className="text-3xl font-semibold text-white">Join a live session</h2>
                  <p className="text-sm leading-6 text-slate-300" id="session-code-hint">
                    Enter the 6-digit code shown on the big screen to vote, reply, and see the room move live.
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <label className="block space-y-2" htmlFor="session-code">
                    <span className="text-sm font-medium text-slate-100">6-digit code</span>
                    <input
                      aria-describedby={errorMessage ? 'session-code-hint session-code-error' : 'session-code-hint'}
                      aria-invalid={Boolean(errorMessage)}
                      autoComplete="one-time-code"
                      className="w-full rounded-[1.6rem] border border-white/10 bg-white/[0.06] px-4 py-4 text-center text-2xl tracking-[0.35em] text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/[0.60] focus:bg-slate-900/[0.90] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                      id="session-code"
                      inputMode="numeric"
                      maxLength={7}
                      name="session-code"
                      onChange={(event) => setCode(formatSessionCode(event.target.value))}
                      placeholder="4821 76"
                      value={code}
                    />
                  </label>

                  <button
                    className="w-full rounded-[1.6rem] bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300 px-4 py-4 font-semibold text-slate-950 shadow-[0_20px_40px_rgba(34,211,238,0.3)] transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? 'Checking…' : 'Join room'}
                  </button>
                </form>

                {errorMessage ? (
                  <p
                    className="rounded-[1.4rem] border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
                    id="session-code-error"
                    role="alert"
                  >
                    {errorMessage}
                  </p>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <a
                    className="rounded-[1.4rem] border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                    href="#how-it-works"
                  >
                    New here? See how it works
                  </a>
                  <Link
                    className="rounded-[1.4rem] border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:border-cyan-200/40 hover:bg-cyan-300/[0.14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                    to="/host"
                  >
                    Sign in as host
                  </Link>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-300">Why it works</p>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
                    <li>No audience account required.</li>
                    <li>Responses stay synchronized with the big screen.</li>
                    <li>Hosts keep control without hiding the room-code entry.</li>
                  </ul>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  )
}
