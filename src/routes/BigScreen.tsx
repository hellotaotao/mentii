import { useParams } from 'react-router-dom'

export default function BigScreen() {
  const { sessionId = '' } = useParams()

  return (
    <main className="flex min-h-screen flex-col bg-slate-950 text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-8 py-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-amber-300">Big screen</p>
          <h1 className="mt-2 text-2xl font-semibold">Session {sessionId}</h1>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Join code</p>
          <p className="mt-2 text-2xl font-semibold tracking-[0.35em]">4821 76</p>
        </div>
      </header>
      <section className="flex flex-1 items-center justify-center px-8">
        <div className="w-full max-w-5xl rounded-[32px] border border-white/10 bg-white/5 p-10 text-center">
          <h2 className="text-4xl font-semibold">Presentation placeholder</h2>
          <p className="mt-4 text-lg text-slate-300">
            Phase 0 only establishes the layout skeleton. Realtime charts arrive in later phases.
          </p>
        </div>
      </section>
    </main>
  )
}
