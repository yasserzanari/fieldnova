import type { ComponentProps } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../components/charts/chart'
import type { ChartConfig } from '../../components/charts/chart'

type RainfallRow = { month: string; actual: number; normal: number; area: number }

const rainfall: RainfallRow[] = [
  { month: 'Mars', actual: 28, normal: 35, area: 28 },
  { month: 'Avr.', actual: 42, normal: 39, area: 42 },
  { month: 'Mai', actual: 36, normal: 48, area: 36 },
  { month: 'Juin', actual: 53, normal: 52, area: 53 },
  { month: 'Juil.', actual: 24, normal: 58, area: 24 },
  { month: 'Août', actual: 31, normal: 46, area: 31 },
]

const chartConfig = {
  actual: { label: 'Observé', color: '#2b7547' },
  normal: { label: 'Médiane 10 ans', color: '#bc8443' },
} satisfies ChartConfig

function RainfallTooltip({ payload, ...props }: ComponentProps<typeof ChartTooltipContent>) {
  return <ChartTooltipContent {...props} payload={payload?.filter(item => item.dataKey !== 'area')} />
}

export function ClimateChart() {
  return (
    <div className="overview-chart-area">
      <div className="overview-chart-summary">Août : 31 mm observés · médiane : 46 mm</div>
      <ChartContainer config={chartConfig} className="overview-climate-chart" aria-label="Pluie mensuelle observée et médiane illustrative en millimètres, de mars à août 2025">
        <ComposedChart data={rainfall} margin={{ top: 8, right: 7, left: -23, bottom: 0 }}>
          <defs>
            <linearGradient id="overviewRainGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartConfig.actual.color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={chartConfig.actual.color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" strokeOpacity={0.8} horizontal vertical={false} />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#746a57' }} tickMargin={7} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#746a57' }} tickFormatter={value => `${value}`} domain={[0, 70]} ticks={[0, 35, 70]} />
          <ReferenceLine x="Août" stroke="#2b7547" strokeWidth={1} strokeDasharray="3 3" />
          <ChartTooltip content={<RainfallTooltip indicator="line" labelFormatter={label => `${label} 2025`} formatter={(value, name) => <span className="overview-tooltip-value">{value} mm <small>{name === 'actual' ? 'Observé' : 'Médiane 10 ans'}</small></span>} />} cursor={{ stroke: '#8b8a7c', strokeDasharray: '3 3' }} />
          <Area type="linear" dataKey="area" stroke="transparent" fill="url(#overviewRainGradient)" strokeWidth={0} dot={false} isAnimationActive={false} />
          <Line type="linear" dataKey="actual" stroke={chartConfig.actual.color} strokeWidth={2.2} dot={{ fill: '#fffefa', strokeWidth: 2, r: 3.5, stroke: chartConfig.actual.color }} isAnimationActive={false} />
          <Line type="linear" dataKey="normal" stroke={chartConfig.normal.color} strokeWidth={1.8} strokeDasharray="4 4" dot={{ fill: '#fffefa', strokeWidth: 1.5, r: 2.8, stroke: chartConfig.normal.color, strokeDasharray: '0' }} isAnimationActive={false} />
        </ComposedChart>
      </ChartContainer>
      <div className="overview-chart-legend"><span><i className="legend-observed" />Observé</span><span><i className="legend-normal" />Médiane 10 ans</span></div>
    </div>
  )
}
