import { useParams } from 'react-router-dom'

export default function VotePage() {
  const { sessionCode = '' } = useParams()

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Audience</p>
        <h1 className="mt-3 text-3xl font-semibold">Session {sessionCode}</h1>
        <p className="mt-4 text-base text-slate-300">
          Phase 0 placeholder. Later phases will replace this with the live voting UI.
        </p>
      </section>
    </main>
  )
}
