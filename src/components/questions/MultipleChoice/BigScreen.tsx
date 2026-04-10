import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MultipleChoiceQuestion, MultipleChoiceResults } from '../../../types/questions'

type MultipleChoiceBigScreenProps = {
  question: MultipleChoiceQuestion
  results: MultipleChoiceResults
}

const chartColors = ['#22d3ee', '#818cf8', '#f472b6', '#f59e0b', '#34d399']

function getChartColor(index: number) {
  return chartColors[index % chartColors.length]
}

export default function MultipleChoiceBigScreen({
  question,
  results,
}: MultipleChoiceBigScreenProps) {
  const totalResponses = results.totals.reduce((sum, total) => sum + total.count, 0)
  const [chartWidth, setChartWidth] = useState(920)

  useEffect(() => {
    function updateChartWidth() {
      setChartWidth(Math.min(920, Math.max(320, window.innerWidth - 96)))
    }

    updateChartWidth()
    window.addEventListener('resize', updateChartWidth)

    return () => {
      window.removeEventListener('resize', updateChartWidth)
    }
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <div className="space-y-4 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">{question.config.chartType}</p>
        <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">{question.title}</h1>
        <p className="text-base text-slate-300">{`${totalResponses} total responses`}</p>
      </div>

      <div className="flex justify-center overflow-x-auto rounded-[32px] border border-white/10 bg-white/5 p-6">
        {question.config.chartType === 'bar' ? (
          <BarChart data={results.totals} height={340} layout="vertical" width={chartWidth}>
            <XAxis allowDecimals={false} stroke="#94a3b8" type="number" />
            <YAxis dataKey="label" stroke="#e2e8f0" type="category" width={180} />
            <Tooltip />
            <Bar animationDuration={350} dataKey="count" radius={[0, 18, 18, 0]}>
              {results.totals.map((total, index) => (
                <Cell fill={getChartColor(index)} key={total.optionIdx} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <PieChart height={360} width={chartWidth}>
            <Tooltip />
            <Pie
              animationDuration={350}
              data={results.totals}
              dataKey="count"
              innerRadius={question.config.chartType === 'donut' ? 110 : 0}
              nameKey="label"
              outerRadius={150}
              paddingAngle={2}
            >
              {results.totals.map((total, index) => (
                <Cell fill={getChartColor(index)} key={total.optionIdx} />
              ))}
            </Pie>
          </PieChart>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="results-summary">
        {results.totals.map((total) => (
          <div
            className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-left"
            key={total.optionIdx}
          >
            <p className="text-sm font-medium text-slate-200">{total.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{`${total.count} votes`}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
