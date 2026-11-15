import { ArrowDownRight, ArrowUpRight, Minus, ShieldCheck } from 'lucide-react'
import type { PowerMonthlyRecord, PowerMonthlySeries } from '../../lib/nasa/power'
import { formatPowerMonth } from '../../lib/nasa/power'
import { formatPrecipitationTotal, formatTemperature, type MeasurementSystem } from '../../lib/units/measurement-units'

type Metric = 'precipitation' | 'temperature' | 'rootWetness'
type MetricSummary = {
  metric: Metric
  current: number
  reference: number
  unitDelta: number
  percentDelta?: number
  referencePeriods: number
}

function monthDays(month: string) {
  const [year, number] = month.split('-').map(Number)
  return new Date(Date.UTC(year, number, 0)).getUTCDate()
}

function monthlyValue(record: PowerMonthlyRecord | undefined, metric: Metric, month: string) {
  if (!record) return undefined
  if (metric === 'precipitation') return record.precipitationMmPerDay === undefined ? undefined : record.precipitationMmPerDay * monthDays(month)
  if (metric === 'temperature') return record.temperatureC
  return record.rootZoneWetness
}

function summarizeMetric(series: PowerMonthlySeries, metric: Metric, months: string[], records: Map<string, PowerMonthlyRecord>): MetricSummary | null {
  if (months.length !== 12) return null
  const currentValues = months.map(month => monthlyValue(records.get(month), metric, month))
  if (!currentValues.every((value): value is number => typeof value === 'number' && Number.isFinite(value))) return null
  const current = metric === 'precipitation'
    ? currentValues.reduce((sum, value) => sum + value, 0)
    : currentValues.reduce((sum, value) => sum + value, 0) / 12

  const endIndex = series.requestedMonths.indexOf(months[0])
  if (endIndex < 36) return null
  const baselines: number[] = []
  for (let period = 1; period <= 4; period++) {
    const start = endIndex - period * 12
    const window = series.requestedMonths.slice(start, start + 12)
    if (window.length !== 12) continue
    const values = window.map(month => monthlyValue(records.get(month), metric, month))
    if (!values.every((value): value is number => typeof value === 'number' && Number.isFinite(value))) continue
    baselines.push(metric === 'precipitation'
      ? values.reduce((sum, value) => sum + value, 0)
      : values.reduce((sum, value) => sum + value, 0) / 12)
  }
  if (baselines.length < 3) return null
  const reference = baselines.reduce((sum, value) => sum + value, 0) / baselines.length
  const unitDelta = current - reference
  return {
    metric,
    current,
    reference,
    unitDelta,
    percentDelta: metric === 'precipitation' && reference > 0 ? unitDelta / reference * 100 : undefined,
    referencePeriods: baselines.length,
  }
}

function formatDelta(summary: MetricSummary, system: MeasurementSystem) {
  if (summary.metric === 'precipitation') {
    const percent = summary.percentDelta === undefined ? '' : ` · ${summary.percentDelta > 0 ? '+' : ''}${summary.percentDelta.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} %`
    return `${summary.unitDelta > 0 ? '+' : ''}${formatPrecipitationTotal(summary.unitDelta, system)}${percent}`
  }
  if (summary.metric === 'temperature') {
    const delta = system === 'us-customary' ? summary.unitDelta * 9 / 5 : summary.unitDelta
    return `${delta > 0 ? '+' : ''}${Math.abs(delta).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} °${system === 'us-customary' ? 'F' : 'C'}`
  }
  return `${summary.unitDelta > 0 ? '+' : ''}${(summary.unitDelta * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} points de pourcentage`
}

function currentValue(summary: MetricSummary, system: MeasurementSystem) {
  if (summary.metric === 'precipitation') return formatPrecipitationTotal(summary.current, system)
  if (summary.metric === 'temperature') return formatTemperature(summary.current, system)
  return `${(summary.current * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`
}

function referenceValue(summary: MetricSummary, system: MeasurementSystem) {
  if (summary.metric === 'precipitation') return formatPrecipitationTotal(summary.reference, system)
  if (summary.metric === 'temperature') return formatTemperature(summary.reference, system)
  return `${(summary.reference * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`
}

function MetricRow({ summary, system, label }: { summary: MetricSummary; system: MeasurementSystem; label: string }) {
  const unchanged = Math.abs(summary.unitDelta) < (summary.metric === 'temperature' ? 0.05 : summary.metric === 'rootWetness' ? 0.0005 : 0.5)
  const Icon = unchanged ? Minus : summary.unitDelta > 0 ? ArrowUpRight : ArrowDownRight
  return <li>
    <span className="atlas-history-stat-label">{label}</span>
    <strong>{currentValue(summary, system)}</strong>
    <span className={`atlas-history-stat-delta ${unchanged ? 'is-flat' : ''}`}><Icon size={12} aria-hidden="true" />{unchanged ? 'Proche' : formatDelta(summary, system)}</span>
    <small>Réf. : {referenceValue(summary, system)}</small>
  </li>
}

export function PowerHistoricalContext({ series, system }: { series: PowerMonthlySeries; system: MeasurementSystem }) {
  const records = new Map(series.records.map(record => [record.date, record]))
  const lastRecordMonth = [...series.records].sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.date
  if (!lastRecordMonth) return null
  const closedMonths = series.requestedMonths.filter(month => month <= lastRecordMonth)
  const recentMonths = closedMonths.slice(-12)
  const precipitation = summarizeMetric(series, 'precipitation', recentMonths, records)
  const temperature = summarizeMetric(series, 'temperature', recentMonths, records)
  const rootWetness = summarizeMetric(series, 'rootWetness', recentMonths, records)
  const summaries = [precipitation, temperature, rootWetness]
  const available = summaries.filter((item): item is MetricSummary => item !== null)
  const first = recentMonths[0]
  const last = recentMonths.at(-1)
  const referenceCount = available.length ? Math.min(...available.map(item => item.referencePeriods)) : 0
  const maxReferenceCount = available.length ? Math.max(...available.map(item => item.referencePeriods)) : 0

  return <details className="atlas-historical-context">
    <summary><ShieldCheck size={13} /><span>Repère climatique · 12 mois vs historique</span><span className="atlas-coverage-chevron">›</span></summary>
    {available.length ? <>
      <p className="atlas-history-note">Comparaison descriptive au point NASA POWER : {first ? formatPowerMonth(first) : '—'} à {last ? formatPowerMonth(last) : '—'} face aux fenêtres précédentes de 12 mois complètes. Aucun mois manquant n’est interpolé.</p>
      <ul className="atlas-history-stats">
        {precipitation && <MetricRow summary={precipitation} system={system} label="Cumul de pluie estimé" />}
        {temperature && <MetricRow summary={temperature} system={system} label="Température moyenne" />}
        {rootWetness && <MetricRow summary={rootWetness} system={system} label="Humidité racinaire modélisée" />}
      </ul>
      <small className="atlas-history-footnote">Référence : {referenceCount === maxReferenceCount ? `${referenceCount}` : `${referenceCount} à ${maxReferenceCount}`} fenêtres complètes de 12 mois antérieures selon l’indicateur. Ce repère n’est pas une normale climatique.</small>
    </> : <p className="atlas-history-note">Repère indisponible : il faut 12 mois récents complets et au moins 3 fenêtres annuelles antérieures complètes. Les valeurs présentes et leur couverture restent consultables dans l’historique.</p>}
  </details>
}
