import type { OpenEndedQuestion } from '../../../types/questions'
import { HOST_PROPERTY_TABS, type HostPropertyTab } from '../MultipleChoice/editorTabs'

type OpenEndedEditorProps = {
  activeTab: HostPropertyTab
  onMaxLengthChange: (maxLength: number) => void
  onTabChange: (tab: HostPropertyTab) => void
  onTitleChange: (title: string) => void
  question: OpenEndedQuestion
}

export default function OpenEndedEditor({
  activeTab,
  onMaxLengthChange,
  onTabChange,
  onTitleChange,
  question,
}: OpenEndedEditorProps) {
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
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Question type</p>
          <h3 className="mt-3 text-lg font-semibold">Open Ended</h3>
          <p className="mt-3 text-sm text-slate-300">
            Collect longer free-text responses and stream them onto the big screen as readable cards.
          </p>
        </div>
      ) : null}

      {activeTab === 'content' ? (
        <div className="mt-6 space-y-5">
          <label className="block space-y-2" htmlFor="question-title">
            <span className="text-sm font-medium text-slate-200">Question title</span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-300"
              id="question-title"
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Ask for a thoughtful response"
              value={question.title}
            />
          </label>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
            Keep prompts focused so responses stay concise enough for the big-screen stream.
          </div>
        </div>
      ) : null}

      {activeTab === 'customize' ? (
        <div className="mt-6 space-y-4">
          <label className="block space-y-2" htmlFor="open-ended-max-length">
            <span className="text-sm font-medium text-slate-200">Maximum response length</span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-300"
              id="open-ended-max-length"
              max={500}
              min={40}
              onChange={(event) => onMaxLengthChange(Number(event.target.value))}
              type="number"
              value={question.config.maxLength}
            />
          </label>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
            Each participant submits a single response. New submissions replace their earlier answer.
          </div>
        </div>
      ) : null}
    </div>
  )
}
