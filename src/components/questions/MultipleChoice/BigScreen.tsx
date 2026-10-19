import { Pie, PieChart } from 'recharts'
import { slideColor } from '../../../lib/presentationTheme'
import type { MultipleChoiceQuestion, MultipleChoiceResults } from '../../../types/questions'
import { ResponseCount, SlideLayout } from '../../slides/SlideChrome'

type MultipleChoiceBigScreenProps = {
  question: MultipleChoiceQuestion
  results: MultipleChoiceResults
}

const MAX_BAR_HEIGHT = 380

function formatShare(count: number, total: number) {
  return total === 0 ? '0%' : `${Math.round((count / total) * 100)}%`
}

function BarResults({ results, total }: { results: MultipleChoiceResults; total: number }) {
  const maxCount = Math.max(...results.totals.map((entry) => entry.count), 0)

  return (
    <div className="flex h-full items-end justify-center gap-10" data-testid="results-summary">
      {results.totals.map((entry, index) => {
        const height = maxCount === 0 ? 0 : Math.max(12, (entry.count / maxCount) * MAX_BAR_HEIGHT)

        return (
          <div className="flex w-[200px] min-w-0 flex-col items-center" key={entry.optionIdx}>
            <p className="text-[40px] font-bold tabular-nums">{entry.count}</p>
            <p className="text-[22px] tabular-nums text-slide-muted">{formatShare(entry.count, total)}</p>
            <div className="mt-4 flex w-full items-end" style={{ height: MAX_BAR_HEIGHT }}>
              <div
                className="w-full rounded-t-2xl transition-[height] duration-500 ease-out"
                style={{ backgroundColor: slideColor(index), height }}
              />
            </div>
            <div className="h-[3px] w-full bg-slide-line" />
            <p className="mt-5 line-clamp-2 text-center text-[26px] font-medium leading-tight">{entry.label}</p>
          </div>
        )
      })}
    </div>
  )
}

function PieResults({ donut, results, total }: { donut: boolean; results: MultipleChoiceResults; total: number }) {
  const hasVotes = total > 0

  return (
    <div className="flex h-full items-center justify-center gap-24">
      <PieChart height={460} width={460}>
        <Pie
          animationDuration={400}
          data={
            hasVotes
              ? results.totals.map((entry, index) => ({ ...entry, fill: slideColor(index) }))
              : [{ count: 1, fill: 'var(--slide-subtle)', label: 'No votes yet', optionIdx: -1 }]
          }
          dataKey="count"
          innerRadius={donut ? 130 : 0}
          isAnimationActive={hasVotes}
          nameKey="label"
          outerRadius={220}
          paddingAngle={hasVotes && results.totals.filter((entry) => entry.count > 0).length > 1 ? 1.5 : 0}
          stroke="none"
        />
      </PieChart>

      <ul className="w-[560px] space-y-5" data-testid="results-summary">
        {results.totals.map((entry, index) => (
          <li className="flex items-center gap-5 text-[28px]" key={entry.optionIdx}>
            <span className="size-6 shrink-0 rounded-full" style={{ backgroundColor: slideColor(index) }} />
            <span className="min-w-0 flex-1 truncate font-medium">{entry.label}</span>
            <span className="font-bold tabular-nums">{entry.count}</span>
            <span className="w-20 text-right tabular-nums text-slide-muted">{formatShare(entry.count, total)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function MultipleChoiceBigScreen({ question, results }: MultipleChoiceBigScreenProps) {
  const totalResponses = results.totals.reduce((sum, entry) => sum + entry.count, 0)

  return (
    <SlideLayout footer={<ResponseCount count={totalResponses} />} title={question.title}>
      {question.config.chartType === 'bar' ? (
        <BarResults results={results} total={totalResponses} />
      ) : (
        <PieResults donut={question.config.chartType === 'donut'} results={results} total={totalResponses} />
      )}
    </SlideLayout>
  )
}
