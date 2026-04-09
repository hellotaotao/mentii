import type { MultipleChoiceQuestion } from '../../../types/questions'
import { HOST_PROPERTY_TABS, type HostPropertyTab } from './editorTabs'

type MultipleChoiceEditorProps = {
  activeTab: HostPropertyTab
  onAddOption: () => void
  onChartTypeChange: (chartType: MultipleChoiceQuestion['config']['chartType']) => void
  onOptionChange: (index: number, value: string) => void
  onRemoveOption: (index: number) => void
  onTabChange: (tab: HostPropertyTab) => void
  onTitleChange: (title: string) => void
  question: MultipleChoiceQuestion
}

const chartStyleLabels = {
  bar: 'Horizontal bars',
  donut: 'Donut',
  pie: 'Pie',
} as const

export default function MultipleChoiceEditor({
  activeTab,
  onAddOption,
  onChartTypeChange,
  onOptionChange,
  onRemoveOption,
  onTabChange,
  onTitleChange,
  question,
}: MultipleChoiceEditorProps) {
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
          <h3 className="mt-3 text-lg font-semibold">Multiple Choice</h3>
          <p className="mt-3 text-sm text-slate-300">
            Single-select answers that can be presented later as bars, donut charts, or pie charts.
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
              placeholder="Ask your audience something great"
              value={question.title}
            />
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-200">Answer options</p>
              <button
                className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                onClick={onAddOption}
                type="button"
              >
                Add option
              </button>
            </div>

            {question.config.options.map((option, index) => (
              <div className="flex items-center gap-3" key={`${question.id}-option-${index}`}>
                <label className="min-w-0 flex-1 space-y-2" htmlFor={`${question.id}-option-${index}`}>
                  <span className="text-sm text-slate-300">{`Option ${index + 1}`}</span>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-300"
                    id={`${question.id}-option-${index}`}
                    onChange={(event) => onOptionChange(index, event.target.value)}
                    value={option}
                  />
                </label>

                <button
                  aria-label={`Remove option ${index + 1}`}
                  className="mt-6 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-rose-300 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={question.config.options.length <= 2}
                  onClick={() => onRemoveOption(index)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === 'customize' ? (
        <div className="mt-6 space-y-4">
          <label className="block space-y-2" htmlFor="chart-style">
            <span className="text-sm font-medium text-slate-200">Chart style</span>
            <select
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-300"
              id="chart-style"
              onChange={(event) =>
                onChartTypeChange(event.target.value as MultipleChoiceQuestion['config']['chartType'])
              }
              value={question.config.chartType}
            >
              {Object.entries(chartStyleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
            Audience phones stay minimal. Only the big-screen route will render these chart choices in a later
            phase.
          </div>
        </div>
      ) : null}
    </div>
  )
}
