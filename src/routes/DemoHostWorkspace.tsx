import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Eye, Play, Sparkles, Users } from 'lucide-react'
import { demoHostRoom, getDemoSlideResponseCount } from '../lib/demoHostData'

function getQuestionTypeLabel(type: string) {
  switch (type) {
    case 'multiple_choice':
      return 'Multiple choice'
    case 'word_cloud':
      return 'Word cloud'
    case 'scales':
      return 'Scales'
    case 'open_ended':
      return 'Open ended'
    default:
      return type
  }
}

export default function DemoHostWorkspace() {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)

  const activeSlide = useMemo(
    () => demoHostRoom.slides[activeSlideIndex] ?? demoHostRoom.slides[0],
    [activeSlideIndex],
  )

  const responseCount = getDemoSlideResponseCount(activeSlide)

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-slate-950 px-6 py-6 text-white sm:px-8 lg:px-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="mentii-grid absolute inset-0 opacity-35" />
        <div className="mentii-orb mentii-float-slow absolute -left-20 top-10 h-72 w-72 rounded-full bg-cyan-400/[0.20]" />
        <div className="mentii-orb mentii-float-delayed absolute right-[-4rem] top-20 h-96 w-96 rounded-full bg-fuchsia-500/[0.14]" />
        <div className="mentii-orb mentii-float-slow absolute bottom-[-8rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-emerald-400/[0.12]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.05] px-5 py-5 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.38em] text-cyan-200">Mentii demo</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Demo host workspace
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Seeded room preview for first-time visitors. Explore the host workflow, switch between sample slides,
              and see how live audience input looks before you sign in.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/12 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:border-cyan-200/45 hover:bg-cyan-300/16 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
              to="/host#host-sign-in"
            >
              Create a real room
              <ChevronRight className="size-4" />
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/[0.10] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
              to={`/?code=${demoHostRoom.code}`}
            >
              Join demo room
              <Play className="size-4" />
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="space-y-5 rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_24px_90px_rgba(2,6,23,0.45)] backdrop-blur-xl">
            <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.06] p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Seeded room preview</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{demoHostRoom.name}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-200">
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Room code</p>
                  <p className="mt-2 text-xl font-semibold text-white">{demoHostRoom.code}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Audience</p>
                  <p className="mt-2 text-xl font-semibold text-white">{demoHostRoom.attendeeCount}</p>
                </div>
              </div>
            </div>

            <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.06] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Demo slides</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">See how the host flow works</h2>
                </div>
                <Sparkles className="size-5 text-cyan-200" />
              </div>

              <div className="mt-5 space-y-3">
                {demoHostRoom.slides.map((slide, index) => {
                  const buttonLabel = `Slide ${index + 1}: ${slide.question.title}`
                  const isActive = index === activeSlideIndex
                  return (
                    <button
                      key={slide.question.id}
                      aria-pressed={isActive}
                      className={`w-full rounded-[1.4rem] border px-4 py-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 ${
                        isActive
                          ? 'border-cyan-300/35 bg-cyan-300/12 text-white shadow-[0_18px_45px_rgba(8,145,178,0.2)]'
                          : 'border-white/10 bg-slate-900/55 text-slate-200 hover:border-white/18 hover:bg-white/[0.08]'
                      }`}
                      onClick={() => setActiveSlideIndex(index)}
                      type="button"
                    >
                      <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/90">{buttonLabel}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{slide.hostMove}</p>
                    </button>
                  )
                })}
              </div>
            </section>
          </aside>

          <section className="space-y-5">
            <article className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_90px_rgba(2,6,23,0.45)] backdrop-blur-xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Active slide</p>
                  <h2 className="text-3xl font-semibold text-white">{activeSlide.question.title}</h2>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-slate-200">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2">
                    <Eye className="size-4 text-cyan-200" />
                    {getQuestionTypeLabel(activeSlide.question.type)}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2">
                    <Users className="size-4 text-cyan-200" />
                    {responseCount} responses
                  </span>
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
                <section data-testid="demo-stage" className="rounded-[1.6rem] border border-white/10 bg-slate-950/70 p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Audience prompt</p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">{activeSlide.question.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{activeSlide.audiencePrompt}</p>

                  {activeSlide.results.type === 'multiple_choice' ? (
                    <ul className="mt-6 space-y-4">
                      {activeSlide.results.totals.map((total, index) => (
                        <li key={total.optionIdx} className="space-y-2">
                          <div className="flex items-center justify-between gap-3 text-sm text-slate-200">
                            <span>{total.label}</span>
                            <span className="font-medium text-cyan-200">{total.count}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <span
                              className="mentii-bar block h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300"
                              style={{
                                animationDelay: `${index * 0.2}s`,
                                width: `${Math.max(18, (total.count / responseCount) * 100)}%`,
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {activeSlide.results.type === 'word_cloud' ? (
                    <div className="mt-6 flex flex-wrap gap-3">
                      {activeSlide.results.words.map((word, index) => (
                        <span
                          key={word.word}
                          className="mentii-float-chip inline-flex rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-50"
                          style={{ animationDelay: `${index * 0.25}s` }}
                        >
                          {word.word}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {activeSlide.results.type === 'scales' ? (
                    <div className="mt-6 space-y-4">
                      <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.05] p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Average readiness</p>
                        <p className="mt-2 text-4xl font-semibold text-white">{activeSlide.results.average.toFixed(1)} / 5</p>
                      </div>
                      <ul className="space-y-3">
                        {activeSlide.results.distribution.map((bucket, index) => (
                          <li key={bucket.rating} className="space-y-2">
                            <div className="flex items-center justify-between gap-3 text-sm text-slate-200">
                              <span>{`Rating ${bucket.rating}`}</span>
                              <span className="font-medium text-cyan-200">{bucket.count}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                              <span
                                className="mentii-bar block h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300"
                                style={{
                                  animationDelay: `${index * 0.2}s`,
                                  width: `${Math.max(14, (bucket.count / responseCount) * 100)}%`,
                                }}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {activeSlide.results.type === 'open_ended' ? (
                    <ul className="mt-6 space-y-3">
                      {activeSlide.results.responses.map((response) => (
                        <li key={response.id} className="rounded-[1.2rem] border border-white/10 bg-white/[0.05] p-4 text-sm leading-6 text-slate-200">
                          {response.text}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>

                <section className="space-y-4">
                  <article className="rounded-[1.6rem] border border-white/10 bg-white/[0.06] p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Host move</p>
                    <p className="mt-3 text-base leading-7 text-slate-100">{activeSlide.hostMove}</p>
                  </article>
                  <article className="rounded-[1.6rem] border border-white/10 bg-white/[0.06] p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Why it works</p>
                    <p className="mt-3 text-base leading-7 text-slate-100">{activeSlide.whyItWorks}</p>
                  </article>
                  <article className="rounded-[1.6rem] border border-white/10 bg-white/[0.06] p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Try the real thing</p>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      This demo is intentionally seeded and anonymous. Create a real room when you want to save slides,
                      launch your own prompts, and run a live session with your audience.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/12 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:border-cyan-200/45 hover:bg-cyan-300/16 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                        to="/host#host-sign-in"
                      >
                        Create your own room
                        <ChevronRight className="size-4" />
                      </Link>
                    </div>
                  </article>
                </section>
              </div>
            </article>
          </section>
        </section>
      </div>
    </main>
  )
}
