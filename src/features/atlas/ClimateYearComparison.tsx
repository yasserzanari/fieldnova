import { useMemo, useState, type SyntheticEvent } from 'react'
import { formatPowerMonth, type PowerMonthlyRecord, type PowerMonthlySeries } from '../../lib/nasa/power'
import { climatePrecipitationRateUnit, climateTemperatureUnit, formatPrecipitationRate, formatTemperature, type MeasurementSystem } from '../../lib/units/measurement-units'

type Metric = {
  code: string
  label: string
  read: (record: PowerMonthlyRecord) => number | undefined
  format: (value: number, system: MeasurementSystem) => string
  formatDelta: (value: number, system: MeasurementSystem) => string
}

const number = (value: number) => value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${number(Math.abs(value))}`

const metrics: Metric[] = [
  { code: 'PRECTOTCORR', label: 'Pluie moyenne quotidienne', read: record => record.precipitationMmPerDay, format: formatPrecipitationRate, formatDelta: (value, system) => `${signed(system === 'us-customary' ? value / 25.4 : value)} ${climatePrecipitationRateUnit(system)}` },
  { code: 'T2M', label: 'Température moyenne', read: record => record.temperatureC, format: formatTemperature, formatDelta: (value, system) => `${signed(system === 'us-customary' ? value * 9 / 5 : value)} ${climateTemperatureUnit(system)}` },
  { code: 'T2M_MAX', label: 'Température maximale', read: record => record.temperatureMaxC, format: formatTemperature, formatDelta: (value, system) => `${signed(system === 'us-customary' ? value * 9 / 5 : value)} ${climateTemperatureUnit(system)}` },
  { code: 'T2M_MIN', label: 'Température minimale', read: record => record.temperatureMinC, format: formatTemperature, formatDelta: (value, system) => `${signed(system === 'us-customary' ? value * 9 / 5 : value)} ${climateTemperatureUnit(system)}` },
  { code: 'GWETTOP', label: 'Humidité de surface modélisée', read: record => record.surfaceSoilWetness, format: value => `${number(value * 100)} %`, formatDelta: value => `${signed(value * 100)} points` },
  { code: 'GWETROOT', label: 'Humidité racinaire modélisée', read: record => record.rootZoneWetness, format: value => `${number(value * 100)} %`, formatDelta: value => `${signed(value * 100)} points` },
]

export function ClimateYearComparison({ series, measurementSystem, onExpanded }: { series: PowerMonthlySeries; measurementSystem: MeasurementSystem; onExpanded: (expanded: boolean) => void }) {
  const years = useMemo(() => {
    const months = series.requestedMonths.length ? series.requestedMonths : series.records.map(record => record.date).slice(-60)
    return [...new Set(months.map(date => date.slice(0, 4)))].sort()
  }, [series])
  const defaultB = years.at(-1) ?? ''
  const defaultA = years.at(-2) ?? ''
  const [yearA, setYearA] = useState('')
  const [yearB, setYearB] = useState('')
  const selectedA = years.includes(yearA) ? yearA : defaultA
  const selectedB = years.includes(yearB) ? yearB : defaultB
  const recordsByMonth = useMemo(() => new Map(series.records.map(record => [record.date, record])), [series.records])
  const monthSlots = useMemo(() => {
    const available = new Set(series.requestedMonths.length ? series.requestedMonths : series.records.map(record => record.date))
    return Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')).filter(month => available.has(`${selectedA}-${month}`) && available.has(`${selectedB}-${month}`))
  }, [selectedA, selectedB, series])

  const toggleExpanded = (event: SyntheticEvent<HTMLDetailsElement>) => onExpanded(event.currentTarget.open)

  return <details className="atlas-period-comparison" onToggle={toggleExpanded}>
    <summary>Comparer deux années · mêmes mois calendaires</summary>
    <div className="atlas-period-comparison-body">
      {years.length < 2 ? <p className="atlas-period-comparison-note">Il faut au moins deux années demandées pour comparer les mêmes mois.</p> : <>
        <div className="atlas-period-selectors">
          <label>Période A<select value={selectedA} onChange={event => setYearA(event.target.value)} aria-label="Année de comparaison A">{years.map(year => <option key={year} value={year} disabled={year === selectedB}>{year}</option>)}</select></label>
          <span aria-hidden="true">→</span>
          <label>Période B<select value={selectedB} onChange={event => setYearB(event.target.value)} aria-label="Année de comparaison B">{years.map(year => <option key={year} value={year} disabled={year === selectedA}>{year}</option>)}</select></label>
        </div>
        <p className="atlas-period-comparison-note">Mois calendaires comparés : {monthSlots.length ? monthSlots.map(month => formatPowerMonth(`${selectedA}-${month}`)).join(', ') : 'aucune période commune'}. Chaque variable utilise seulement les paires de valeurs présentes; aucune interpolation ni réponse culturale n’est estimée.</p>
        <div className="atlas-period-table-wrap" role="region" aria-label={`Comparaison climatique ${selectedA} et ${selectedB}`} tabIndex={0}>
          <table><thead><tr><th scope="col">Indicateur</th><th scope="col">{selectedA}</th><th scope="col">{selectedB}</th><th scope="col">Écart B − A</th><th scope="col">Mois communs</th></tr></thead>
            <tbody>{metrics.map(metric => {
              const paired = monthSlots.flatMap(month => {
                const a = metric.read(recordsByMonth.get(`${selectedA}-${month}`) ?? { date: `${selectedA}-${month}` })
                const b = metric.read(recordsByMonth.get(`${selectedB}-${month}`) ?? { date: `${selectedB}-${month}` })
                return a !== undefined && b !== undefined && Number.isFinite(a) && Number.isFinite(b) ? [{ a, b }] : []
              })
              const averageA = paired.length ? paired.reduce((sum, value) => sum + value.a, 0) / paired.length : undefined
              const averageB = paired.length ? paired.reduce((sum, value) => sum + value.b, 0) / paired.length : undefined
              const delta = averageA === undefined || averageB === undefined ? undefined : averageB - averageA
              return <tr key={metric.code}><th scope="row"><strong>{metric.label}</strong><small>{metric.code}</small></th><td>{averageA === undefined ? '—' : metric.format(averageA, measurementSystem)}</td><td>{averageB === undefined ? '—' : metric.format(averageB, measurementSystem)}</td><td>{delta === undefined ? '—' : metric.formatDelta(delta, measurementSystem)}</td><td>{paired.length}/{monthSlots.length}</td></tr>
            })}</tbody>
          </table>
        </div>
        <p className="atlas-period-comparison-footnote">T2M · moyennes mensuelles en {climateTemperatureUnit(measurementSystem)} · PRECTOTCORR · débit quotidien moyen en {climatePrecipitationRateUnit(measurementSystem)} · GWETTOP/GWETROOT · humidités modélisées en points de pourcentage.</p>
      </>}
    </div>
  </details>
}
