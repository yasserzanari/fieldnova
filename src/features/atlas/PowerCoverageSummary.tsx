import { ShieldCheck } from 'lucide-react'
import { formatPowerMonth, type PowerMonthlyRecord, type PowerMonthlySeries } from '../../lib/nasa/power'

const indicators: Array<{ code: string; label: string; read: (record: PowerMonthlyRecord) => number | undefined }> = [
  { code: 'PRECTOTCORR', label: 'Pluie moyenne', read: record => record.precipitationMmPerDay },
  { code: 'T2M', label: 'Température moyenne', read: record => record.temperatureC },
  { code: 'T2M_MAX', label: 'Température maximale', read: record => record.temperatureMaxC },
  { code: 'T2M_MIN', label: 'Température minimale', read: record => record.temperatureMinC },
  { code: 'GWETTOP', label: 'Humidité de surface', read: record => record.surfaceSoilWetness },
  { code: 'GWETROOT', label: 'Humidité racinaire', read: record => record.rootZoneWetness },
]

export function PowerCoverageSummary({ series, months = 12 }: { series: PowerMonthlySeries; months?: number }) {
  const requestedMonths = Array.isArray(series.requestedMonths) && series.requestedMonths.length
    ? series.requestedMonths.slice(-months)
    : series.records.slice(-months).map(record => record.date)
  const recordsByMonth = new Map(series.records.map(record => [record.date, record]))
  if (!requestedMonths.length) return null

  return <details className="atlas-coverage-summary">
    <summary><ShieldCheck size={13} /><span>Valeurs disponibles · {requestedMonths.length} mois demandés</span><span className="atlas-coverage-chevron">›</span></summary>
    <p>Présence d’une valeur NASA POWER par mois et indicateur. Les mois manquants restent vides; aucune interpolation, qualité de mesure ou couverture nuageuse n’est déduite.</p>
    <ul>{indicators.map(indicator => {
      const missing = requestedMonths.filter(month => {
        const value = indicator.read(recordsByMonth.get(month) ?? { date: month })
        return typeof value !== 'number' || !Number.isFinite(value)
      })
      const available = requestedMonths.length - missing.length
      return <li key={indicator.code}><span><strong>{indicator.label}</strong><small>{indicator.code}</small></span><span className="atlas-coverage-count">{available}/{requestedMonths.length}<small>mois</small></span><span className={missing.length ? 'atlas-coverage-missing' : 'atlas-coverage-complete'}>{missing.length ? `Absent : ${missing.map(formatPowerMonth).join(', ')}` : 'Aucun manque sur la période'}</span></li>
    })}</ul>
  </details>
}
