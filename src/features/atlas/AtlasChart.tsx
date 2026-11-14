import type { ComponentProps } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../components/charts/chart'
import type { ChartConfig } from '../../components/charts/chart'

const data = [
  { date: '20 déc.', observed: 0.49, median: 0.47, area: 0.49 },
  { date: '05 janv.', observed: 0.53, median: 0.49, area: 0.53 },
  { date: '20 janv.', observed: 0.57, median: 0.52, area: 0.57 },
  { date: '05 févr.', observed: 0.59, median: 0.51, area: 0.59 },
  { date: '20 févr.', observed: 0.60, median: 0.53, area: 0.60 },
  { date: '20 mars', observed: 0.62, median: 0.55, area: 0.62 },
]

const chartConfig = {
  observed: { label: 'NDVI observé · exemple', color: '#2b7547' },
  median: { label: 'Médiane indicative', color: '#bc8443' },
} satisfies ChartConfig

function NdviTooltip({ payload, ...props }: ComponentProps<typeof ChartTooltipContent>) {
  return <ChartTooltipContent {...props} payload={payload?.filter(item => item.dataKey !== 'area')} />
}

export function AtlasChart({ selectedDate, selectedValue, parcelId }: { selectedDate: string; selectedValue: number; parcelId: string }) {
  const offset = parcelId === 'P-04' ? 0.06 : parcelId === 'P-07' ? -0.04 : 0
  const parcelData = data.map(row => ({ ...row, observed: Math.max(.1, Math.min(.9, row.observed + offset)), area: Math.max(.1, Math.min(.9, row.observed + offset)) }))
  return (
    <div className="atlas-chart-wrap">
      <p className="atlas-chart-summary">{selectedDate} · NDVI {selectedValue.toFixed(2).replace('.', ',')} · progression illustrative</p>
      <ChartContainer config={chartConfig} className="atlas-chart" aria-label="Évolution illustrative du NDVI, indice sans unité, de décembre à mars">
        <ComposedChart data={parcelData} margin={{ top: 5, right: 5, left: -24, bottom: 0 }}>
          <defs><linearGradient id="atlasNdviGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chartConfig.observed.color} stopOpacity={.23} /><stop offset="100%" stopColor={chartConfig.observed.color} stopOpacity={.02} /></linearGradient></defs>
          <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" strokeOpacity={.8} horizontal vertical={false} />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#746a57' }} tickMargin={6} />
          <YAxis domain={[.4, .8]} ticks={[.4, .6, .8]} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#746a57' }} tickFormatter={value => Number(value).toFixed(1).replace('.', ',')} />
          <ReferenceLine y={.55} stroke="#bc8443" strokeDasharray="3 3" />
          <ChartTooltip content={<NdviTooltip indicator="line" labelFormatter={label => `${label} 2025`} formatter={(value, name) => <span className="atlas-tooltip-value">{Number(value).toFixed(2).replace('.', ',')} <small>{name === 'observed' ? 'NDVI exemple' : 'Médiane illustrative'}</small></span>} />} cursor={{ stroke: '#8b8a7c', strokeDasharray: '3 3' }} />
          <Area type="linear" dataKey="area" stroke="transparent" fill="url(#atlasNdviGradient)" strokeWidth={0} dot={false} isAnimationActive={false} />
          <Line type="linear" dataKey="observed" stroke={chartConfig.observed.color} strokeWidth={2} dot={{ fill: '#fffefa', strokeWidth: 2, r: 3, stroke: chartConfig.observed.color }} isAnimationActive={false} />
          <Line type="linear" dataKey="median" stroke={chartConfig.median.color} strokeWidth={1.7} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ChartContainer>
    </div>
  )
}
