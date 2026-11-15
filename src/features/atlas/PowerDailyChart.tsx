import type { MeasurementSystem } from '../../lib/units/measurement-units'
import { climatePrecipitationRateUnit, climateTemperatureUnit, formatPrecipitationRate, formatPrecipitationTotal, formatTemperature } from '../../lib/units/measurement-units'
import type { PowerDailySeries } from '../../lib/nasa/power-daily'

type DailyPoint = { x: number; y: number; value: number; date: string; index: number }
const LEFT = 38
const RIGHT = 682

function linePath(points: DailyPoint[]) {
  return points.map((point, index) => (index === 0 ? 'M' : 'L') + ' ' + point.x.toFixed(2) + ' ' + point.y.toFixed(2)).join(' ')
}

function continuousSegments(points: DailyPoint[]) {
  const segments: DailyPoint[][] = []
  for (const point of points) {
    const current = segments.at(-1)
    if (!current || current.at(-1)!.index !== point.index - 1) segments.push([point])
    else current.push(point)
  }
  return segments.filter(segment => segment.length > 1)
}

function displayTemperature(value: number, system: MeasurementSystem) {
  return system === 'us-customary' ? value * 9 / 5 + 32 : value
}

export function PowerDailyChart({ series, system }: { series: PowerDailySeries; system: MeasurementSystem }) {
  const records = series.records
  const expected = series.requestedDays.length
  const rainByDay = records.map(record => record.precipitationMmPerDay === undefined ? undefined : system === 'us-customary' ? record.precipitationMmPerDay / 25.4 : record.precipitationMmPerDay)
  const rain = rainByDay.filter((value): value is number => value !== undefined)
  const maximums = records.flatMap(record => record.temperatureMaxC === undefined ? [] : [displayTemperature(record.temperatureMaxC, system)])
  const minimums = records.flatMap(record => record.temperatureMinC === undefined ? [] : [displayTemperature(record.temperatureMinC, system)])
  const rainSum = rain.reduce((sum, value) => sum + value, 0)
  const peakRain = rain.length ? Math.max(...rain) : undefined
  const recordHigh = records.flatMap(record => record.temperatureMaxC === undefined ? [] : [{ date: record.date, value: record.temperatureMaxC }]).sort((a, b) => b.value - a.value)[0]
  const recordLow = records.flatMap(record => record.temperatureMinC === undefined ? [] : [{ date: record.date, value: record.temperatureMinC }]).sort((a, b) => a.value - b.value)[0]
  const lastDate = series.requestedDays.at(-1) ?? (String(series.year) + '-01-01')
  const completeCalendarYear = lastDate === String(series.year) + '-12-31'
  const completeRainCoverage = rain.length === expected
  const rainMax = Math.max(1, ...rain)
  const tempValues = [...maximums, ...minimums]
  const tempFloor = tempValues.length ? Math.floor(Math.min(...tempValues) / 5) * 5 : 0
  const tempCeiling = tempValues.length ? Math.max(tempFloor + 5, Math.ceil(Math.max(...tempValues) / 5) * 5) : 5
  const plotTopRain = 13
  const plotBottomRain = 53
  const plotTopTemp = 66
  const plotBottomTemp = 107
  const stepX = records.length > 1 ? (RIGHT - LEFT) / (records.length - 1) : 0
  const xAt = (index: number) => records.length > 1 ? LEFT + stepX * index : (LEFT + RIGHT) / 2
  const rainBars = records.flatMap((record, index) => rainByDay[index] === undefined ? [] : [{
    x: xAt(index),
    y: plotBottomRain - rainByDay[index]! / rainMax * (plotBottomRain - plotTopRain),
    value: rainByDay[index]!,
    date: record.date,
  }])
  const highPoints = records.flatMap((record, index) => record.temperatureMaxC === undefined ? [] : [{
    x: xAt(index),
    y: plotBottomTemp - (displayTemperature(record.temperatureMaxC, system) - tempFloor) / (tempCeiling - tempFloor) * (plotBottomTemp - plotTopTemp),
    value: displayTemperature(record.temperatureMaxC, system),
    date: record.date,
    index,
  }])
  const lowPoints = records.flatMap((record, index) => record.temperatureMinC === undefined ? [] : [{
    x: xAt(index),
    y: plotBottomTemp - (displayTemperature(record.temperatureMinC, system) - tempFloor) / (tempCeiling - tempFloor) * (plotBottomTemp - plotTopTemp),
    value: displayTemperature(record.temperatureMinC, system),
    date: record.date,
    index,
  }])
  const monthLabels = records.flatMap((record, index) => record.date.slice(8) === '01' ? [{
    date: record.date,
    x: xAt(index),
    label: new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(new Date(record.date + 'T00:00:00Z')),
  }] : [])
  const precipitationUnit = system === 'us-customary' ? 'in' : 'mm'
  const temperatureUnit = system === 'us-customary' ? '°F' : '°C'
  const dateLabel = (iso: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z'))

  return <div className="atlas-daily-chart-wrap">
    <div className="atlas-daily-stats" aria-label={'Statistiques journalières NASA POWER pour ' + series.year}>
      <div><small>{completeCalendarYear && completeRainCoverage ? 'Cumul annuel' : 'Cumul des jours renseignés'}</small><strong>{formatPrecipitationTotal(rainSum, system)}</strong><em>{rain.length}/{expected} jours · PRECTOTCORR</em></div>
      <div><small>Plus forte pluie journalière</small><strong>{peakRain === undefined ? '—' : formatPrecipitationRate(peakRain, system, 1)}</strong><em>{rain.length}/{expected} jours renseignés</em></div>
      <div><small>Maximum journalier le plus élevé</small><strong>{recordHigh ? formatTemperature(recordHigh.value, system) : '—'}</strong><em>{recordHigh ? dateLabel(recordHigh.date) : maximums.length + '/' + expected + ' jours'}</em></div>
      <div><small>Minimum journalier le plus bas</small><strong>{recordLow ? formatTemperature(recordLow.value, system) : '—'}</strong><em>{recordLow ? dateLabel(recordLow.date) : minimums.length + '/' + expected + ' jours'}</em></div>
    </div>
    <svg className="atlas-daily-chart" viewBox="0 0 720 138" preserveAspectRatio="none" role="img" aria-label={'NASA POWER quotidien ' + series.year + ' : pluie PRECTOTCORR et températures minimales et maximales T2M'}>
      <title>{'NASA POWER quotidien · ' + series.year + ' · pluie, température minimale et maximale'}</title>
      {[0, .5, 1].map((fraction, index) => <g key={'rain-' + index}><line x1={LEFT} x2={RIGHT} y1={plotBottomRain - fraction * (plotBottomRain - plotTopRain)} y2={plotBottomRain - fraction * (plotBottomRain - plotTopRain)} className="atlas-daily-gridline" /><text x={LEFT - 5} y={plotBottomRain - fraction * (plotBottomRain - plotTopRain) + 3} textAnchor="end" className="atlas-daily-axis-label">{(rainMax * fraction).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</text></g>)}
      {[0, .5, 1].map((fraction, index) => <g key={'temp-' + index}><line x1={LEFT} x2={RIGHT} y1={plotBottomTemp - fraction * (plotBottomTemp - plotTopTemp)} y2={plotBottomTemp - fraction * (plotBottomTemp - plotTopTemp)} className="atlas-daily-gridline" /><text x={RIGHT + 5} y={plotBottomTemp - fraction * (plotBottomTemp - plotTopTemp) + 3} textAnchor="start" className="atlas-daily-axis-label">{(tempFloor + fraction * (tempCeiling - tempFloor)).toFixed(0)}°</text></g>)}
      {rainBars.map(bar => <rect key={'rain-' + bar.date} x={bar.x - Math.max(.45, Math.min(2, stepX * .36))} y={bar.y} width={Math.max(.9, Math.min(4, stepX * .72))} height={Math.max(.7, plotBottomRain - bar.y)} rx=".4" className="atlas-daily-rain-bar"><title>{dateLabel(bar.date) + ' · PRECTOTCORR ' + bar.value.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' ' + precipitationUnit + '/j'}</title></rect>)}
      {continuousSegments(highPoints).map(segment => <path key={'high-' + segment[0].date} d={linePath(segment)} className="atlas-daily-high-line" />)}
      {continuousSegments(lowPoints).map(segment => <path key={'low-' + segment[0].date} d={linePath(segment)} className="atlas-daily-low-line" />)}
      {monthLabels.map(month => <text key={month.date} x={month.x} y="130" textAnchor="middle" className="atlas-daily-month-label">{month.label}</text>)}
      <text x={LEFT} y="9" className="atlas-daily-axis-caption">Pluie · {precipitationUnit}/jour</text>
      <text x={RIGHT} y="62" textAnchor="end" className="atlas-daily-axis-caption">Température · {temperatureUnit}</text>
    </svg>
    <div className="atlas-daily-legend"><span><i className="rain" />Pluie quotidienne</span><span><i className="high" />T2M_MAX</span><span><i className="low" />T2M_MIN</span><span>{records.filter(record => record.precipitationMmPerDay !== undefined || record.temperatureMaxC !== undefined || record.temperatureMinC !== undefined).length}/{expected} jours reçus</span></div>
    <details className="atlas-daily-table"><summary>Valeurs quotidiennes · tableau accessible</summary><div role="region" aria-label={'Valeurs quotidiennes NASA POWER · ' + series.year} tabIndex={0}><table><thead><tr><th>Date UTC</th><th>PRECTOTCORR · {climatePrecipitationRateUnit(system)}</th><th>T2M_MAX · {climateTemperatureUnit(system)}</th><th>T2M_MIN · {climateTemperatureUnit(system)}</th></tr></thead><tbody>{records.map(record => <tr key={record.date}><th scope="row">{dateLabel(record.date)}</th><td>{record.precipitationMmPerDay === undefined ? 'Manquant' : formatPrecipitationRate(record.precipitationMmPerDay, system)}</td><td>{record.temperatureMaxC === undefined ? 'Manquant' : formatTemperature(record.temperatureMaxC, system)}</td><td>{record.temperatureMinC === undefined ? 'Manquant' : formatTemperature(record.temperatureMinC, system)}</td></tr>)}</tbody></table></div></details>
    <p className="atlas-daily-note">NASA POWER · estimation quotidienne à la grille demandée · jours manquants non interpolés · températures et pluie n’évaluent pas la réponse d’une culture.</p>
  </div>
}
