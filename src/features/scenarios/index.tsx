import { useMemo, useState, type CSSProperties } from 'react'
import { Activity, CalendarDays, CloudRain, Droplets, ExternalLink, LocateFixed, MapPinned, RefreshCw, ShieldCheck, ThermometerSun } from 'lucide-react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { Link } from 'react-router-dom'
import { FieldMap, type MapBaseLayer } from '../../components/maps/FieldMap'
import { PowerClimateChart } from '../../components/charts/PowerClimateChart'
import { useSelectedLocation, type GeoPoint } from '../../lib/geo/location'
import { formatPowerMonth, type PowerMonthlyRecord } from '../../lib/nasa/power'
import { usePowerMonthly } from '../../lib/nasa/use-power-monthly'
import { climatePrecipitationRateUnit, climateTemperatureUnit, formatPrecipitationRate, formatTemperature, useMeasurementSystem } from '../../lib/units/measurement-units'
import { RotationExplorer } from './RotationExplorer'
import { WaterAvailabilityScenarios } from './WaterAvailabilityScenarios'
import './scenarios.css'

type CaseId = 'reference' | 'dry' | 'heat' | 'year'
type Priority = 'water' | 'rain' | 'heat'
type ClimateCase = { id: CaseId; title: string; description: string; period: string; count: number; rain?: number; temperature?: number; wetness?: number }

const caseCopy: Record<CaseId, { title: string; description: string; icon: typeof Activity }> = {
  reference: { title: 'Référence récente', description: '12 dernières valeurs mensuelles valides', icon: Activity },
  dry: { title: 'Période la plus sèche', description: 'Fenêtre de 3 mois avec le moins de pluie', icon: CloudRain },
  heat: { title: 'Période la plus chaude', description: 'Fenêtre de 3 mois avec la température la plus élevée', icon: ThermometerSun },
  year: { title: 'Année observée', description: 'Année civile complète dans la série', icon: CalendarDays },
}

const priorityCopy: Record<Priority, { title: string; icon: typeof Activity }> = {
  water: { title: 'Humidité racinaire', icon: Droplets },
  rain: { title: 'Précipitations', icon: CloudRain },
  heat: { title: 'Température', icon: ThermometerSun },
}

function daysAgo(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

function average(values: Array<number | undefined>) {
  const present = values.filter((value): value is number => value !== undefined && Number.isFinite(value))
  return present.length ? present.reduce((sum, value) => sum + value, 0) / present.length : undefined
}

function summarizeCase(id: CaseId, records: PowerMonthlyRecord[]): ClimateCase | undefined {
  if (!records.length) return undefined
  const labels = records.map(record => formatPowerMonth(record.date))
  const first = labels[0]
  const last = labels[labels.length - 1]
  return {
    id,
    ...caseCopy[id],
    period: first === last ? first : `${first} – ${last}`,
    count: records.length,
    rain: average(records.map(record => record.precipitationMmPerDay)),
    temperature: average(records.map(record => record.temperatureC)),
    wetness: average(records.map(record => record.rootZoneWetness)),
  }
}

function completeObservedYears(records: PowerMonthlyRecord[]) {
  const grouped = new Map<string, Set<string>>()
  for (const record of records) {
    const [year, month] = record.date.split('-')
    if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) continue
    const months = grouped.get(year) ?? new Set<string>()
    months.add(month)
    grouped.set(year, months)
  }
  return [...grouped.entries()].filter(([, months]) => months.size === 12 && Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')).every(month => months.has(month))).map(([year]) => year).sort((left, right) => right.localeCompare(left))
}

function deriveCases(records: PowerMonthlyRecord[], selectedYear: string): ClimateCase[] {
  const result: ClimateCase[] = []
  const reference = summarizeCase('reference', records.slice(-12))
  if (reference) result.push(reference)

  const yearRows = selectedYear ? records.filter(record => record.date.startsWith(`${selectedYear}-`)) : []
  const yearCase = yearRows.length === 12 ? summarizeCase('year', yearRows) : undefined
  if (yearCase) result.push({ ...yearCase, title: `${caseCopy.year.title} · ${selectedYear}`, description: caseCopy.year.description })

  const monthNumber = (record: PowerMonthlyRecord) => Number(record.date.slice(0, 4)) * 12 + Number(record.date.slice(5, 7))
  const windows = Array.from({ length: Math.max(0, records.length - 2) }, (_, index) => records.slice(index, index + 3)).filter(window => window.length === 3 && monthNumber(window[1]) - monthNumber(window[0]) === 1 && monthNumber(window[2]) - monthNumber(window[1]) === 1)
  const driestWindow = windows.filter(window => window.every(record => record.precipitationMmPerDay !== undefined)).sort((left, right) => (average(left.map(row => row.precipitationMmPerDay)) ?? Infinity) - (average(right.map(row => row.precipitationMmPerDay)) ?? Infinity))[0]
  const hottestWindow = windows.filter(window => window.every(record => record.temperatureC !== undefined)).sort((left, right) => (average(right.map(row => row.temperatureC)) ?? -Infinity) - (average(left.map(row => row.temperatureC)) ?? -Infinity))[0]
  const dry = driestWindow && summarizeCase('dry', driestWindow)
  const heat = hottestWindow && summarizeCase('heat', hottestWindow)
  if (dry) result.push(dry)
  if (heat) result.push(heat)
  return result
}

function formatMetric(value: number | undefined, unit: string, decimals = 1) {
  return value === undefined ? '—' : `${value.toFixed(decimals).replace('.', ',')} ${unit}`
}

function formatCoord(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(3).replace('.', ',')}° ${value < 0 ? negative : positive}`
}

export function ScenariosPage() {
  const [mode, setMode] = useState<'rotations' | 'climate' | 'water'>('rotations')
  return <div className="scenario-hub">
    <div className="scenario-hub-toolbar" role="group" aria-label="Modes des scénarios">
      <span>Comparer</span>
      <button type="button" aria-pressed={mode === 'rotations'} className={mode === 'rotations' ? 'is-active' : ''} onClick={() => setMode('rotations')}>Rotations culturales</button>
      <button type="button" aria-pressed={mode === 'climate'} className={mode === 'climate' ? 'is-active' : ''} onClick={() => setMode('climate')}>Climat historique</button>
      <button type="button" aria-pressed={mode === 'water'} className={mode === 'water' ? 'is-active' : ''} onClick={() => setMode('water')}>Hypothèses d’eau</button>
    </div>
    <div className={`scenario-hub-content ${mode === 'water' ? 'is-water-mode' : ''}`}>{mode === 'rotations' ? <RotationExplorer /> : mode === 'climate' ? <ClimateScenariosPage /> : <WaterAvailabilityScenarios />}</div>
  </div>
}

function ClimateScenariosPage() {
  const { location, selectLocation } = useSelectedLocation()
  const measurementSystem = useMeasurementSystem()
  const [baseLayer, setBaseLayer] = useState<MapBaseLayer>('nasa')
  const [showNdvi, setShowNdvi] = useState(false)
  const [imageryDate, setImageryDate] = useState(daysAgo(11))
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const { series, loading, error, retry } = usePowerMonthly(location)
  const [activeCases, setActiveCases] = useState<CaseId[]>(['reference', 'dry', 'heat'])
  const [selectedYear, setSelectedYear] = useState('')
  const [priority, setPriority] = useState<Priority>('water')
  const [range, setRange] = useState(12)
  const [locating, setLocating] = useState(false)

  const observedYears = useMemo(() => completeObservedYears(series?.records ?? []), [series])
  const activeYear = observedYears.includes(selectedYear) ? selectedYear : observedYears[0] ?? ''
  const cases = useMemo(() => deriveCases(series?.records ?? [], activeYear), [series, activeYear])
  const displayedCases = cases.filter(item => activeCases.includes(item.id))
  const recommendationMetric = priority === 'water' ? 'wetness' : priority === 'rain' ? 'rain' : 'temperature'
  const recommended = [...displayedCases].filter(item => item[recommendationMetric] !== undefined).sort((left, right) => {
    const first = left[recommendationMetric]!
    const second = right[recommendationMetric]!
    return priority === 'heat' ? second - first : first - second
  })[0]

  const toggleCase = (id: CaseId) => setActiveCases(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])
  const selectPoint = (point: GeoPoint) => selectLocation(point)
  const locateMe = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(position => {
      const point = { latitude: Number(position.coords.latitude.toFixed(5)), longitude: Number(position.coords.longitude.toFixed(5)) }
      selectLocation(point)
      map?.flyTo({ center: [point.longitude, point.latitude], zoom: 9, duration: 850 })
      setLocating(false)
    }, () => setLocating(false), { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 })
  }

  return <section className="scenarios-page" aria-label="Comparaison historique des conditions NASA">
    <header className="scenarios-heading"><div><h1>Scénarios climatiques</h1><p>Comparez des périodes réellement observées par NASA POWER au point sélectionné.</p></div><span className="scenario-data-badge"><i />Historique NASA · sans prévision</span></header>

    <div className="scenario-map-stage">
      <FieldMap center={location} selectedPoint={location} baseLayer={baseLayer} showNdvi={showNdvi} powerGridCell={series?.point.latitude === location.latitude && series.point.longitude === location.longitude ? series.gridCell : null} imageryDate={imageryDate} onPointSelect={selectPoint} onMapReady={setMap} ariaLabel="Carte interactive satellite NASA et point de sélection des scénarios" />
      <div className="scenario-map-topline">
        <div className="scenario-point-chip"><MapPinned size={15} /><span>{formatCoord(location.latitude, 'N', 'S')} · {formatCoord(location.longitude, 'E', 'O')}</span><small>Point de comparaison</small></div>
        <div className="scenario-map-options"><div className="scenario-base-switch" role="group" aria-label="Fond de carte"><button type="button" aria-pressed={baseLayer === 'streets'} className={baseLayer === 'streets' ? 'is-active' : ''} onClick={() => setBaseLayer('streets')}>Plan</button><button type="button" aria-pressed={baseLayer === 'nasa'} className={baseLayer === 'nasa' ? 'is-active' : ''} onClick={() => setBaseLayer('nasa')}>Image NASA</button></div><label><input type="checkbox" checked={showNdvi} onChange={event => setShowNdvi(event.target.checked)} /><Activity size={13} />NDVI 8 j</label><label className="scenario-image-date">Date souhaitée<input type="date" value={imageryDate} max={daysAgo(1)} onChange={event => setImageryDate(event.target.value)} /></label></div>
      </div>
      <div className="scenario-map-controls" role="group" aria-label="Contrôles de la carte"><button type="button" aria-label="Zoomer" onClick={() => map?.zoomIn({ duration: 250 })}><span>+</span></button><button type="button" aria-label="Dézoomer" onClick={() => map?.zoomOut({ duration: 250 })}><span>−</span></button><button type="button" aria-label="Utiliser ma position" onClick={locateMe} disabled={locating}><LocateFixed size={15} /></button></div>
      <span className="scenario-map-hint">Cliquez sur la carte pour choisir le point d’analyse</span>

      <aside className="scenario-panel scenario-config-panel" aria-label="Périodes historiques à comparer">
        <header className="scenario-panel-heading"><div><span className="scenario-icon"><Activity size={16} /></span><span><h2>Périodes historiques</h2><small>Statistiques calculées sur NASA POWER</small></span></div><span className="scenario-count">{activeCases.length}/{cases.length}</span></header>
        {loading ? <div className="scenario-data-state" role="status">Chargement des séries NASA…</div> : error ? <div className="scenario-data-error" role="alert">{error}<button type="button" onClick={retry}><RefreshCw size={12} />Réessayer</button></div> : <>
          {observedYears.length > 0 && <label className="scenario-year-control"><span><CalendarDays size={13} /><span><strong>Année à examiner</strong><small>Années complètes présentes dans la série</small></span></span><select aria-label="Année historique à comparer" value={activeYear} onChange={event => setSelectedYear(event.target.value)}>{observedYears.map(year => <option key={year} value={year}>{year}</option>)}</select></label>}
          <div className="scenario-select-list">{cases.map(item => { const Icon = caseCopy[item.id].icon; return <label key={item.id} className={`scenario-choice ${item.id} ${activeCases.includes(item.id) ? 'is-selected' : ''}`}><input type="checkbox" checked={activeCases.includes(item.id)} onChange={() => toggleCase(item.id)} /><span className="scenario-choice-icon"><Icon size={15} /></span><span><strong>{item.title}</strong><small>{item.period} · {item.count} mois</small></span></label> })}</div>
          <div className="scenario-priority-heading"><strong>Classer les périodes par</strong><span>Critère de surveillance historique</span></div>
          <div className="scenario-priority-list" role="radiogroup" aria-label="Critère de surveillance">{(Object.keys(priorityCopy) as Priority[]).map(id => { const Icon = priorityCopy[id].icon; return <label key={id} className={`scenario-priority ${priority === id ? 'is-active' : ''}`}><input type="radio" name="scenario-priority" checked={priority === id} onChange={() => setPriority(id)} /><Icon size={14} /><span>{priorityCopy[id].title}</span></label> })}</div>
        </>}
        <div className="scenario-source-note"><ShieldCheck size={13} /><span>Moyennes des mois observés disponibles; aucune interpolation. Elles ne testent pas la réponse d’une culture et ne prédisent aucun rendement.</span></div>
        <Link to="/app/atlas" className="scenario-atlas-link">Explorer les couches NASA <ExternalLink size={13} /></Link>
      </aside>

      <aside className="scenario-panel scenario-results-panel" aria-label="Comparaison des observations NASA">
        <header className="scenario-panel-heading results-heading"><div><span className="scenario-icon results-icon"><Droplets size={16} /></span><span><h2>Mesures par période</h2><small>NASA POWER · maille MERRA-2 (0,5° × 0,625°)</small></span></div></header>
        {loading ? <div className="scenario-data-state" role="status">Récupération de NASA POWER…</div> : error ? <div className="scenario-data-error" role="alert">Données indisponibles pour ce point.</div> : displayedCases.length ? <>
          <div className="scenario-results-table" style={{ '--scenario-count': Math.max(1, displayedCases.length) } as CSSProperties} role="table" aria-label="Moyennes NASA POWER des périodes historiques"><div className="scenario-table-row table-header" role="row"><span role="columnheader">Indicateur moyen</span>{displayedCases.map(item => <span key={item.id} className={`scenario-cell-${item.id}`} role="columnheader">{item.title}</span>)}</div>
            <MetricRow icon={<CloudRain size={14} />} label={`Pluie · ${climatePrecipitationRateUnit(measurementSystem)}`} metric="rain" records={displayedCases} measurementSystem={measurementSystem} />
            <MetricRow icon={<ThermometerSun size={14} />} label={`Température · ${climateTemperatureUnit(measurementSystem)}`} metric="temperature" records={displayedCases} measurementSystem={measurementSystem} />
            <MetricRow icon={<Droplets size={14} />} label="Humidité racinaire · %" metric="wetness" records={displayedCases} measurementSystem={measurementSystem} />
          </div>
          {recommended ? <div className="scenario-recommendation"><span className="recommendation-mark"><ShieldCheck size={17} /></span><div><small>Période à examiner · critère {priorityCopy[priority].title.toLocaleLowerCase('fr')}</small><strong>{recommended.title} · {recommended.period}</strong><p>Cette période historique présente la valeur la plus défavorable parmi celles sélectionnées, selon le critère choisi.</p></div></div> : <p className="scenario-no-comparison">Aucune valeur disponible pour ce critère dans les périodes sélectionnées. Les cellules sans mesure restent vides.</p>}
        </> : <div className="scenario-empty-state"><Activity size={22} /><strong>Sélectionnez une période</strong><span>Activez au moins une période historique.</span></div>}
        <p className="scenario-results-source">NASA POWER · {series?.source.join(' + ') ?? 'source en attente'} · paramètres mensuels. Les données de grille ne sont pas des mesures de parcelle.</p>
      </aside>
    </div>

    <section className="scenario-chart-section" aria-label="Historique climatique NASA POWER">
        <div className="scenario-chart-toolbar"><div><span className="scenario-chart-icon"><Activity size={16} /></span><span><strong>Historique climatique</strong><small>{range} derniers mois disponibles · centre MERRA-2 {series?.gridPoint.latitude.toFixed(3)}, {series?.gridPoint.longitude.toFixed(3)}</small></span></div><div className="scenario-chart-ranges" role="group" aria-label="Période du graphique">{[[3, '3 mois'], [6, '6 mois'], [12, '1 an']].map(([months, label]) => <button key={months} type="button" aria-pressed={range === months} className={range === months ? 'is-active' : ''} onClick={() => setRange(Number(months))}>{label}</button>)}</div></div>
      <PowerClimateChart records={series?.records ?? []} requestedMonths={series?.requestedMonths} source={series?.source.join(' + ') ?? 'en attente'} months={range} title="Précipitations moyennes et température · NASA POWER" />
    </section>
  </section>
}

function MetricRow({ icon, label, metric, records, measurementSystem }: { icon: React.ReactNode; label: string; metric: 'rain' | 'temperature' | 'wetness'; records: ClimateCase[]; measurementSystem: ReturnType<typeof useMeasurementSystem> }) {
  return <div className="scenario-table-row metric-row" role="row"><span role="rowheader">{icon}{label}</span>{records.map(item => { const value = metric === 'rain' ? item.rain === undefined ? '—' : formatPrecipitationRate(item.rain, measurementSystem) : metric === 'temperature' ? item.temperature === undefined ? '—' : formatTemperature(item.temperature, measurementSystem) : formatMetric(item.wetness === undefined ? undefined : item.wetness * 100, '%', 0); return <span key={item.id} className={`scenario-cell-${item.id}`} role="cell" title={`${item.period} · ${value}`}>{value}</span> })}</div>
}
