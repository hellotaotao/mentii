import type { WordCloudQuestion } from '../../../types/questions'
import { HOST_PROPERTY_TABS, type HostPropertyTab } from '../MultipleChoice/editorTabs'

type WordCloudEditorProps = {
  activeTab: HostPropertyTab
  onAllowMultipleSubmissionsChange: (allowMultipleSubmissions: boolean) => void
  onTabChange: (tab: HostPropertyTab) => void
  onTitleChange: (title: string) => void
  question: WordCloudQuestion
}

export default function WordCloudEditor({
  activeTab,
  onAllowMultipleSubmissionsChange,
  onTabChange,
  onTitleChange,
  question,
}: WordCloudEditorProps) {
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
          <h3 className="mt-3 text-lg font-semibold">Word Cloud</h3>
          <p className="mt-3 text-sm text-slate-300">
            Audience members submit short words or phrases, and the big screen grows each word by frequency.
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
              placeholder="Ask for one word"
              value={question.title}
            />
          </label>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
            Keep prompts short so audience members can answer quickly from their phones.
          </div>
        </div>
      ) : null}

      {activeTab === 'customize' ? (
        <div className="mt-6 space-y-4">
          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <input
              checked={question.config.allowMultipleSubmissions}
              className="mt-1 size-4 rounded border-white/20 bg-slate-900 text-cyan-400 focus:ring-cyan-300"
              onChange={(event) => onAllowMultipleSubmissionsChange(event.target.checked)}
              type="checkbox"
            />
            <div>
              <p className="text-sm font-medium text-slate-100">Allow repeated submissions</p>
              <p className="mt-1 text-sm text-slate-300">
                Leave this on for classic word clouds so participants can send more than one idea.
              </p>
            </div>
          </label>
        </div>
      ) : null}
    </div>
  )
}
