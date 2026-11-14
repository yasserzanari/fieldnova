import { CloudRain, Droplets } from 'lucide-react'
import { formatPowerMonth, type PowerMonthlyRecord } from '../../lib/nasa/power'

type Props = { records: PowerMonthlyRecord[]; source: string; mode?: 'climate' | 'soil'; title?: string }
type PlotPoint = { x: number; y: number; value: number; month: string; date: string }

const LEFT = 48
const RIGHT = 682
const TOP = 10
const BOTTOM = 82

function linePath(points: PlotPoint[]) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

function finite(values: Array<number | undefined>) {
  return values.filter((value): value is number => value !== undefined && Number.isFinite(value))
}

export function ClimateChart({ records, source, mode = 'climate', title }: Props) {
  const visible = records.slice(-12).map(record => ({ ...record, month: formatPowerMonth(record.date) }))
  const isSoil = mode === 'soil'
  const allValues = finite(visible.map(row => isSoil ? row.rootZoneWetness : row.precipitationMmPerDay))
  const tempValues = finite(visible.map(row => row.temperatureC))
  const hasData = allValues.length > 0 || (!isSoil && tempValues.length > 0)
  const latest = [...visible].reverse().find(row => isSoil ? row.rootZoneWetness !== undefined : row.precipitationMmPerDay !== undefined || row.temperatureC !== undefined)
  const valueMax = isSoil ? 1 : Math.max(1, Math.ceil((Math.max(...allValues, 0) * 1.15) * 2) / 2)
  const tempMin = tempValues.length ? Math.floor(Math.min(...tempValues) / 5) * 5 : 0
  const tempMax = tempValues.length ? Math.max(tempMin + 5, Math.ceil(Math.max(...tempValues) / 5) * 5) : 5
  const stepX = visible.length > 1 ? (RIGHT - LEFT) / (visible.length - 1) : 0
  const xAt = (index: number) => visible.length === 1 ? (LEFT + RIGHT) / 2 : LEFT + index * stepX
  const valuePoints = visible.flatMap((row, index) => {
    const raw = isSoil ? row.rootZoneWetness : row.precipitationMmPerDay
    if (raw === undefined || !Number.isFinite(raw)) return []
    const value = isSoil ? raw * 100 : raw
    return [{ x: xAt(index), y: BOTTOM - (value / valueMax) * (BOTTOM - TOP), value, month: row.month, date: row.date }]
  })
  const tempPoints: PlotPoint[] = isSoil ? [] : visible.flatMap((row, index) => row.temperatureC === undefined || !Number.isFinite(row.temperatureC) ? [] : [{
    x: xAt(index), y: BOTTOM - ((row.temperatureC - tempMin) / (tempMax - tempMin)) * (BOTTOM - TOP), value: row.temperatureC, month: row.month, date: row.date,
  }])
  const labelIndexes = visible.map((_, index) => index).filter(index => index === 0 || index === visible.length - 1 || index % Math.max(1, Math.ceil(visible.length / 6)) === 0)

  return <section className={`overview-bottom-panel overview-chart-panel ${isSoil ? 'is-soil-chart' : ''}`} aria-label={title ?? (isSoil ? 'Humidité racinaire mensuelle' : 'Précipitations et température mensuelles')}>
    <header className="overview-bottom-heading"><div><span className={`bottom-icon ${isSoil ? 'soil-icon' : 'calendar-icon'}`}>{isSoil ? <Droplets size={16} /> : <CloudRain size={16} />}</span><div><h2>{title ?? (isSoil ? 'Humidité racinaire · NASA POWER' : 'Climat mensuel · NASA POWER')}</h2><p>{isSoil ? 'GWETROOT · fraction du modèle de zone racinaire' : 'PRECTOTCORR · mm/j moyen mensuel   ·   T2M · °C'}</p></div></div><span className="data-quality">Données NASA · {source}</span></header>
    <div className="overview-chart-summary">{latest ? `Dernière valeur exploitable · ${latest.month}` : 'Aucune valeur NASA valide sur la période affichée'}{!isSoil && latest?.precipitationMmPerDay !== undefined ? ` · ${latest.precipitationMmPerDay.toFixed(2).replace('.', ',')} mm/j` : ''}{!isSoil && latest?.temperatureC !== undefined ? ` · ${latest.temperatureC.toFixed(1).replace('.', ',')} °C` : ''}{isSoil && latest?.rootZoneWetness !== undefined ? ` · ${(latest.rootZoneWetness * 100).toFixed(0)} %` : ''}</div>
    {hasData ? <svg className="overview-climate-chart" viewBox="0 0 720 110" role="img" aria-label={isSoil ? 'Humidité racinaire modélisée par mois, donnée NASA POWER' : 'Précipitations moyennes quotidiennes par mois et température moyenne, données NASA POWER'}>
      <title>{isSoil ? 'Humidité racinaire NASA POWER' : 'Climat mensuel NASA POWER'}</title>
      {[0, .5, 1].map((fraction, index) => {
        const y = BOTTOM - fraction * (BOTTOM - TOP)
        const value = valueMax * fraction
        return <g key={fraction}><line x1={LEFT} x2={RIGHT} y1={y} y2={y} className="overview-chart-gridline" /><text x={LEFT - 7} y={y + 3} className="overview-chart-tick" textAnchor="end">{isSoil ? `${Math.round(value)}%` : Number(value.toFixed(1))}</text>{!isSoil && <text x={RIGHT + 7} y={y + 3} className="overview-chart-tick" textAnchor="start">{(tempMin + fraction * (tempMax - tempMin)).toFixed(0)}°</text>}{index === 0 && <title>NASA POWER</title>}</g>
      })}
      {isSoil ? <>
        <path d={`${linePath(valuePoints)} L ${valuePoints[valuePoints.length - 1]?.x ?? RIGHT} ${BOTTOM} L ${valuePoints[0]?.x ?? LEFT} ${BOTTOM} Z`} className="overview-chart-soil-area" />
        <path d={linePath(valuePoints)} className="overview-chart-soil-line" />
        {valuePoints.map(point => <circle key={point.date} cx={point.x} cy={point.y} r="2.5" className="overview-chart-soil-dot"><title>{point.month} · GWETROOT {(point.value * 100).toFixed(1)} % (modélisé)</title></circle>)}
      </> : <>
        {valuePoints.map(point => <rect key={point.date} x={point.x - Math.min(12, Math.max(4, stepX * .24)) / 2} y={point.y} width={Math.min(12, Math.max(4, stepX * .24))} height={Math.max(1, BOTTOM - point.y)} rx="2" className="overview-chart-rain-bar"><title>{point.month} · PRECTOTCORR {point.value.toFixed(2)} mm/j (moyenne mensuelle)</title></rect>)}
        {tempPoints.length > 1 && <path d={linePath(tempPoints)} className="overview-chart-temp-line" />}
        {tempPoints.map(point => <circle key={point.date} cx={point.x} cy={point.y} r="2.7" className="overview-chart-temp-dot"><title>{point.month} · T2M {point.value.toFixed(1)} °C</title></circle>)}
      </>}
      {labelIndexes.map(index => <text key={visible[index].date} x={xAt(index)} y="101" className="overview-chart-month" textAnchor="middle">{visible[index].month}</text>)}
    </svg> : <div className="overview-chart-empty" role="status">{records.length ? 'NASA POWER n’a pas de valeur exploitable pour cet indicateur.' : 'Chargement des données NASA POWER…'}</div>}
    <footer className="overview-chart-legend">{isSoil ? <span><i className="legend-wetness" />GWETROOT · humidité racinaire modélisée (%)</span> : <><span><i className="legend-precip" />PRECTOTCORR · mm/j</span><span><i className="legend-temperature" />T2M · °C</span></>}</footer>
  </section>
}
