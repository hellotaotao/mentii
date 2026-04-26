import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { MentiLogo } from '../components/MentiLogo'
import { ThemeSwitcher } from '../components/ThemeSwitcher'
import { useTheme } from '../lib/themeContext'
import { formatSessionCode, normalizeSessionCode } from '../lib/sessionCode'
import { getSessionByCode } from '../lib/supabaseQueries'

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

// Append a 2-digit hex alpha channel to a #RRGGBB color (no-op for non-hex strings).
function withAlpha(hex: string, alphaHex: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) return `${hex}${alphaHex}`
  return hex
}

export default function JoinPage() {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const queryCode = searchParams.get('code') ?? ''

  const attemptJoin = useCallback(
    async (normalizedCode: string, replace = false) => {
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
    },
    [navigate],
  )

  useEffect(() => {
    const normalizedQueryCode = normalizeSessionCode(queryCode)
    if (!normalizedQueryCode) return
    void attemptJoin(normalizedQueryCode, true)
  }, [attemptJoin, queryCode])

  function submitCurrentCode() {
    const normalizedCode = normalizeSessionCode(code)
    if (normalizedCode.length !== 6) {
      setErrorMessage('Enter the 6-digit room code from the big screen.')
      return
    }
    void attemptJoin(normalizedCode)
  }

  // Theme-derived color shorthands
  const c = {
    page: theme.pageBg,
    text1: theme.text1,
    text2: theme.text2,
    accent: theme.accent,
    accentFg: theme.accentFg,
    accentSoft: withAlpha(theme.accent, '1A'),
    accentSofter: withAlpha(theme.accent, '24'),
    accentBorder: withAlpha(theme.accent, '33'),
    accentBorderStrong: withAlpha(theme.accent, '66'),
    success: theme.success,
    successSoft: withAlpha(theme.success, '1A'),
    successBorder: withAlpha(theme.success, '33'),
    error: theme.error,
    errorSoft: withAlpha(theme.error, '1A'),
    errorBorder: withAlpha(theme.error, '4D'),
    cardBg: theme.cardBg,
    cardBorder: theme.cardBorder,
    inputBg: theme.inputBg,
    inputBorder: theme.inputBorder,
    inputFocusBorder: theme.inputFocusBorder,
    inputFocusShadow: theme.inputFocusShadow,
  }

  const orbColors = theme.optionColors
  const isDark = theme.isDark

  return (
    <main
      className="relative isolate min-h-screen overflow-hidden px-6 py-6 sm:px-8 lg:px-10"
      style={{ background: c.page, color: c.text1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {isDark && <div className="mentii-grid absolute inset-0 opacity-40" />}
        <div
          className="mentii-orb mentii-float-slow absolute -left-20 top-14 h-72 w-72 rounded-full"
          style={{ background: withAlpha(orbColors[0], isDark ? '38' : '1F') }}
        />
        <div
          className="mentii-orb mentii-float-delayed absolute right-[-4.5rem] top-28 h-80 w-80 rounded-full"
          style={{ background: withAlpha(orbColors[1], isDark ? '2E' : '1A') }}
        />
        <div
          className="mentii-orb mentii-float-slow absolute bottom-[-7rem] left-1/3 h-96 w-96 rounded-full"
          style={{ background: withAlpha(orbColors[2], isDark ? '24' : '14') }}
        />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col">
        <header
          className="flex items-center justify-between gap-4 rounded-full px-4 py-3"
          style={{
            border: `1px solid ${c.cardBorder}`,
            background: c.cardBg,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex items-center gap-4">
            <MentiLogo size="sm" />
            <span style={{ color: c.text2, fontSize: 14 }} className="hidden sm:inline">
              Live audience participation for rooms that need fast signal.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              className="rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                border: `1px solid ${c.cardBorder}`,
                background: 'transparent',
                color: c.text1,
                outlineColor: c.accent,
              }}
              to="/host"
            >
              Host sign-in
            </Link>
            <ThemeSwitcher />
          </div>
        </header>

        <section className="mt-8 grid flex-1 gap-8 lg:grid-cols-[minmax(0,1.12fr)_24rem] lg:items-start">
          <div className="space-y-8">
            <section className="space-y-6">
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
                style={{
                  border: `1px solid ${c.accentBorder}`,
                  background: c.accentSoft,
                  color: c.accent,
                }}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{
                    background: c.accent,
                    boxShadow: `0 0 18px ${withAlpha(theme.accent, 'BF')}`,
                  }}
                />
                Audience feedback that moves at room speed
              </div>

              <div className="max-w-3xl space-y-4">
                <h1
                  className="max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
                  style={{ color: c.text1, letterSpacing: '-0.035em', lineHeight: 1.05 }}
                >
                  Turn any presentation into a live conversation
                </h1>
                <p
                  className="max-w-2xl text-lg leading-8 sm:text-xl"
                  style={{ color: c.text2 }}
                >
                  Mentii helps teams run polls, word clouds, scales, and Q&amp;A without slowing the room down.
                  Participants join instantly with a room code, and the results update live on the big screen.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {featureHighlights.map((feature) => (
                  <article
                    key={feature.title}
                    className="rounded-[1.6rem] p-5"
                    style={{
                      border: `1px solid ${c.cardBorder}`,
                      background: c.cardBg,
                      boxShadow: isDark
                        ? '0 18px 55px rgba(15, 23, 42, 0.38)'
                        : '0 12px 32px rgba(26, 13, 5, 0.06)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold"
                        style={{
                          border: `1px solid ${c.accentBorder}`,
                          background: c.accentSoft,
                          color: c.accent,
                        }}
                      >
                        {feature.title.slice(0, 1)}
                      </span>
                      <h2 className="text-base font-bold" style={{ color: c.text1 }}>
                        {feature.title}
                      </h2>
                    </div>
                    <p className="mt-3 text-sm leading-6" style={{ color: c.text2 }}>
                      {feature.description}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section aria-label="Newcomer paths" className="grid gap-4 md:grid-cols-2">
              <a
                className="group rounded-[1.8rem] p-6 transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  border: `1px solid ${c.accentBorder}`,
                  background: c.accentSoft,
                  boxShadow: `0 18px 55px ${withAlpha(theme.accent, '1F')}`,
                  outlineColor: c.accent,
                }}
                href="#join-room"
              >
                <p
                  className="text-xs font-bold uppercase tracking-[0.3em]"
                  style={{ color: c.accent }}
                >
                  For participants
                </p>
                <h2 className="mt-3 text-2xl font-bold" style={{ color: c.text1 }}>
                  I have a room code
                </h2>
                <p className="mt-3 text-sm leading-6" style={{ color: c.text2 }}>
                  Jump straight into the live room from the 6-digit code on the screen and start responding.
                </p>
                <p
                  className="mt-5 text-sm font-bold transition group-hover:translate-x-1"
                  style={{ color: c.accent }}
                >
                  Enter code above
                </p>
              </a>

              <Link
                className="group rounded-[1.8rem] p-6 transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  border: `1px solid ${c.cardBorder}`,
                  background: c.cardBg,
                  boxShadow: isDark
                    ? '0 18px 55px rgba(15, 23, 42, 0.38)'
                    : '0 12px 32px rgba(26, 13, 5, 0.06)',
                  outlineColor: c.accent,
                }}
                to="/host"
              >
                <p
                  className="text-xs font-bold uppercase tracking-[0.3em]"
                  style={{ color: c.text2 }}
                >
                  For facilitators
                </p>
                <h2 className="mt-3 text-2xl font-bold" style={{ color: c.text1 }}>
                  I&apos;m running the session
                </h2>
                <p className="mt-3 text-sm leading-6" style={{ color: c.text2 }}>
                  Sign in as host to create rooms, launch prompts, and keep every response synced to the big screen.
                </p>
                <p
                  className="mt-5 text-sm font-bold transition group-hover:translate-x-1"
                  style={{ color: c.accent }}
                >
                  Open host workspace
                </p>
              </Link>
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <article
                className="mentii-shimmer relative overflow-hidden rounded-[2rem] p-6"
                style={{
                  border: `1px solid ${c.cardBorder}`,
                  background: c.cardBg,
                  boxShadow: isDark
                    ? '0 24px 80px rgba(2, 6, 23, 0.55)'
                    : '0 18px 50px rgba(26, 13, 5, 0.08)',
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at top right, ${withAlpha(theme.accent, '1F')}, transparent 35%)`,
                    pointerEvents: 'none',
                  }}
                />
                <div className="relative space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p
                        className="text-xs font-bold uppercase tracking-[0.3em]"
                        style={{ color: c.accent }}
                      >
                        Live room preview
                      </p>
                      <h2 className="mt-3 text-2xl font-bold" style={{ color: c.text1 }}>
                        See the room respond in real time
                      </h2>
                    </div>
                    <div
                      className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.24em]"
                      style={{
                        border: `1px solid ${c.successBorder}`,
                        background: c.successSoft,
                        color: c.success,
                      }}
                    >
                      Live signal
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_15rem]">
                    <section
                      className="rounded-[1.5rem] p-5"
                      style={{
                        border: `1px solid ${c.cardBorder}`,
                        background: c.inputBg,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p
                            className="text-xs font-bold uppercase tracking-[0.24em]"
                            style={{ color: c.text2 }}
                          >
                            Instant reactions
                          </p>
                          <p className="mt-2 text-lg font-bold" style={{ color: c.text1 }}>
                            What should the team do next?
                          </p>
                        </div>
                        <p className="text-sm" style={{ color: c.text2 }}>
                          84 responses
                        </p>
                      </div>

                      <ul className="mt-6 space-y-4">
                        {reactionSignals.map((signal, index) => {
                          const barColor = theme.optionColors[index % theme.optionColors.length] ?? theme.accent
                          return (
                            <li key={signal.label} className="space-y-2">
                              <div className="flex items-center justify-between gap-3 text-sm">
                                <span style={{ color: c.text1 }}>{signal.label}</span>
                                <span style={{ color: barColor, fontWeight: 700 }}>
                                  {signal.score}%
                                </span>
                              </div>
                              <div
                                className="h-2 overflow-hidden rounded-full"
                                style={{ background: c.cardBorder }}
                              >
                                <span
                                  className="mentii-bar block h-full rounded-full"
                                  style={{
                                    animationDelay: `${index * 0.35}s`,
                                    width: `${signal.score}%`,
                                    background: barColor,
                                    boxShadow: `0 0 12px ${withAlpha(barColor, '66')}`,
                                  }}
                                />
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </section>

                    <section
                      className="rounded-[1.5rem] p-5"
                      style={{
                        border: `1px solid ${c.cardBorder}`,
                        background: c.inputBg,
                      }}
                    >
                      <p
                        className="text-xs font-bold uppercase tracking-[0.24em]"
                        style={{ color: c.text2 }}
                      >
                        Word cloud mode
                      </p>
                      <p className="mt-2 text-lg font-bold" style={{ color: c.text1 }}>
                        The room sounds like this
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        {wordCloudTerms.map((term, index) => {
                          const chipColor = theme.optionColors[index % theme.optionColors.length] ?? theme.accent
                          return (
                            <span
                              key={term}
                              className="mentii-float-chip inline-flex rounded-full px-3 py-2 text-sm font-medium"
                              style={{
                                animationDelay: `${index * 0.4}s`,
                                border: `1px solid ${withAlpha(chipColor, '40')}`,
                                background: withAlpha(chipColor, '14'),
                                color: chipColor,
                              }}
                            >
                              {term}
                            </span>
                          )
                        })}
                      </div>
                    </section>
                  </div>
                </div>
              </article>

              <article
                className="rounded-[2rem] p-6"
                style={{
                  border: `1px solid ${c.cardBorder}`,
                  background: c.cardBg,
                  boxShadow: isDark
                    ? '0 18px 55px rgba(15, 23, 42, 0.38)'
                    : '0 12px 32px rgba(26, 13, 5, 0.06)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
                id="how-it-works"
              >
                <p
                  className="text-xs font-bold uppercase tracking-[0.3em]"
                  style={{ color: c.text2 }}
                >
                  How Mentii works
                </p>
                <h2 className="mt-3 text-2xl font-bold" style={{ color: c.text1 }}>
                  Clear on-ramp for a first visit
                </h2>
                <ol className="mt-6 space-y-4">
                  {audienceJourney.map((step, index) => (
                    <li
                      key={step}
                      className="rounded-[1.4rem] p-4 text-sm leading-6"
                      style={{
                        border: `1px solid ${c.cardBorder}`,
                        background: c.inputBg,
                        color: c.text1,
                      }}
                    >
                      <p
                        className="mb-2 text-xs font-bold uppercase tracking-[0.28em]"
                        style={{ color: c.accent }}
                      >
                        {`Step 0${index + 1}`}
                      </p>
                      <p>{step}</p>
                    </li>
                  ))}
                </ol>
              </article>
            </section>
          </div>

          <aside className="lg:sticky lg:top-8" id="join-room">
            <section
              className="mentii-shimmer relative overflow-hidden rounded-[2rem] p-8"
              style={{
                border: `1px solid ${c.cardBorder}`,
                background: c.cardBg,
                boxShadow: isDark
                  ? '0 24px 90px rgba(2, 6, 23, 0.65)'
                  : '0 24px 64px rgba(26, 13, 5, 0.1)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle at top right, ${withAlpha(theme.accent, '29')}, transparent 30%), radial-gradient(circle at bottom left, ${withAlpha(theme.optionColors[1], '1F')}, transparent 40%)`,
                  pointerEvents: 'none',
                }}
              />
              <div className="relative space-y-6">
                <div className="space-y-3">
                  <p
                    className="text-sm font-bold uppercase tracking-[0.32em]"
                    style={{ color: c.accent }}
                  >
                    Audience entry
                  </p>
                  <h2 className="text-3xl font-bold" style={{ color: c.text1, letterSpacing: '-0.025em' }}>
                    Join a live session
                  </h2>
                  <p
                    className="text-sm leading-6"
                    style={{ color: c.text2 }}
                    id="session-code-hint"
                  >
                    Enter the 6-digit code shown on the big screen to vote, reply, and see the room move live.
                  </p>
                </div>

                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault()
                    submitCurrentCode()
                  }}
                >
                  <label className="block space-y-2" htmlFor="session-code">
                    <span className="text-sm font-bold" style={{ color: c.text1 }}>
                      6-digit code
                    </span>
                    <input
                      aria-describedby={
                        errorMessage ? 'session-code-hint session-code-error' : 'session-code-hint'
                      }
                      aria-invalid={errorMessage ? 'true' : 'false'}
                      autoComplete="one-time-code"
                      className="w-full rounded-[1.6rem] px-4 py-4 text-center outline-none transition focus-visible:outline-2 focus-visible:outline-offset-2"
                      id="session-code"
                      inputMode="numeric"
                      maxLength={7}
                      name="session-code"
                      onChange={(event) => setCode(formatSessionCode(event.target.value))}
                      placeholder="4821 76"
                      style={{
                        background: c.inputBg,
                        border: `1px solid ${code ? c.inputFocusBorder : c.inputBorder}`,
                        color: c.text1,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 28,
                        letterSpacing: '0.35em',
                        boxShadow: code ? `0 0 0 4px ${c.inputFocusShadow}` : 'none',
                        outlineColor: c.accent,
                      }}
                      value={code}
                    />
                  </label>

                  <button
                    className="w-full rounded-[1.6rem] px-4 py-4 font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      background: c.accent,
                      color: c.accentFg,
                      border: 'none',
                      boxShadow: `0 16px 32px ${withAlpha(theme.accent, '40')}`,
                      letterSpacing: '-0.01em',
                      outlineColor: c.accent,
                    }}
                    disabled={isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? 'Checking…' : 'Join room'}
                  </button>
                </form>

                {errorMessage ? (
                  <p
                    className="rounded-[1.4rem] px-4 py-3 text-sm"
                    style={{
                      border: `1px solid ${c.errorBorder}`,
                      background: c.errorSoft,
                      color: c.error,
                    }}
                    id="session-code-error"
                    role="alert"
                  >
                    {errorMessage}
                  </p>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <a
                    className="rounded-[1.4rem] px-4 py-3 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{
                      border: `1px solid ${c.cardBorder}`,
                      background: c.inputBg,
                      color: c.text1,
                      outlineColor: c.accent,
                    }}
                    href="#how-it-works"
                  >
                    New here? See how it works
                  </a>
                  <Link
                    className="rounded-[1.4rem] px-4 py-3 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{
                      border: `1px solid ${c.accentBorder}`,
                      background: c.accentSoft,
                      color: c.accent,
                      outlineColor: c.accent,
                    }}
                    to="/host"
                  >
                    Sign in as host
                  </Link>
                </div>

                <div
                  className="rounded-[1.5rem] p-5"
                  style={{
                    border: `1px solid ${c.cardBorder}`,
                    background: c.inputBg,
                  }}
                >
                  <p
                    className="text-xs font-bold uppercase tracking-[0.28em]"
                    style={{ color: c.text2 }}
                  >
                    Why it works
                  </p>
                  <ul className="mt-4 space-y-3 text-sm leading-6" style={{ color: c.text1 }}>
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
