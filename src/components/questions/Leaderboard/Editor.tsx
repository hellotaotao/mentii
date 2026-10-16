import type { LeaderboardQuestion } from '../../../types/questions'
import { HOST_PROPERTY_TABS, type HostPropertyTab } from '../MultipleChoice/editorTabs'

type LeaderboardEditorProps = {
  activeTab: HostPropertyTab
  onPodiumChange: (podium: boolean) => void
  onTabChange: (tab: HostPropertyTab) => void
  onTitleChange: (title: string) => void
  question: LeaderboardQuestion
}

export default function LeaderboardEditor({
  activeTab,
  onPodiumChange,
  onTabChange,
  onTitleChange,
  question,
}: LeaderboardEditorProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-fuchsia-300">Properties</p>
          <h2 className="mt-2 text-2xl font-semibold">Edit slide</h2>
        </div>
        <div className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
          Autosaving
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-slate-950/70 p-1">
        {HOST_PROPERTY_TABS.map((tab) => (
          <button
            className={`rounded-xl px-3 py-2 text-sm font-medium capitalize transition ${
              tab === activeTab ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:bg-white/5'
            }`}
            key={tab}
            onClick={() => onTabChange(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'type' ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/70 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Slide type</p>
          <h3 className="mt-3 text-lg font-semibold">Leaderboard</h3>
          <p className="mt-3 text-sm text-slate-300">
            Shows cumulative quiz scores for every player in the room. Place one after a quiz question to show who
            moved up, and finish with a podium slide to crown the winners.
          </p>
        </div>
      ) : null}

      {activeTab === 'content' || activeTab === 'customize' ? (
        <div className="mt-6 space-y-5">
          {activeTab === 'content' ? (
            <label className="block space-y-2" htmlFor="question-title">
              <span className="text-sm font-medium text-slate-200">Slide title</span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-300"
                id="question-title"
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="Leaderboard"
                value={question.title}
              />
            </label>
          ) : null}

          <label
            className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4"
            htmlFor="leaderboard-podium"
          >
            <input
              checked={question.config.podium}
              className="mt-1 size-4 accent-cyan-400"
              id="leaderboard-podium"
              onChange={(event) => onPodiumChange(event.target.checked)}
              type="checkbox"
            />
            <span>
              <span className="block text-sm font-medium text-slate-200">Final podium</span>
              <span className="mt-1 block text-sm text-slate-400">
                Reveal 3rd, 2nd and 1st place with confetti. Winners can add their real name from their phone.
              </span>
            </span>
          </label>
        </div>
      ) : null}
    </div>
  )
}
