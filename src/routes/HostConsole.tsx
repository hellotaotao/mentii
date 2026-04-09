import { useParams } from 'react-router-dom'

type HostConsoleProps = {
  mode: 'new' | 'existing'
}

export default function HostConsole({ mode }: HostConsoleProps) {
  const { sessionId = '' } = useParams()

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
        <aside className="rounded-3xl border border-white/10 bg-white/5 p-6">Slide list placeholder</aside>
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          Live preview placeholder
        </section>
        <aside className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-fuchsia-300">Host</p>
          <h1 className="mt-3 text-2xl font-semibold">
            {mode === 'new' ? 'Create a new session' : `Edit session ${sessionId}`}
          </h1>
          <p className="mt-3 text-sm text-slate-300">Phase 0 placeholder for the future host console.</p>
        </aside>
      </section>
    </main>
  )
}
