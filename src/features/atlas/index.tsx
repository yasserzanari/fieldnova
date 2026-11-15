import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, ArrowLeft, ArrowRight, CloudRain, Download, Droplets, Layers2, LocateFixed, MapPinned, Minus, Pause, Play, Plus, Search, ShieldCheck, Satellite, Sun, ThermometerSun, X } from 'lucide-react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { Link } from 'react-router-dom'
import { FieldMap, type MapBaseLayer } from '../../components/maps/FieldMap'
import { PowerClimateChart } from '../../components/charts/PowerClimateChart'
import { PowerCoverageSummary } from './PowerCoverageSummary'
import { PowerHistoricalContext } from './PowerHistoricalContext'
import { ClimateYearComparison } from './ClimateYearComparison'
import { useSelectedLocation, type GeoPoint } from '../../lib/geo/location'
import { formatPowerMonth, latestCompleteRecord } from '../../lib/nasa/power'
import { formatGibsDate, listGibsDates, resolveGibsDate, sampleGibsDates, useGibsAvailability } from '../../lib/nasa/gibs-availability'
import { downloadPowerMonthlyCsv } from '../../lib/nasa/power-export'
import { usePowerMonthly } from '../../lib/nasa/use-power-monthly'
import { formatPrecipitationRate, formatPrecipitationTotal, formatTemperature, useMeasurementSystem } from '../../lib/units/measurement-units'
import './atlas.css'

function daysAgo(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

function formatCoord(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(3).replace('.', ',')}° ${value < 0 ? negative : positive}`
}

const climateRanges = [
  { months: 3, label: '3 mois', control: '3 m' },
  { months: 6, label: '6 mois', control: '6 m' },
  { months: 12, label: '12 mois', control: '1 an' },
  { months: 36, label: '3 ans', control: '3 ans' },
  { months: 60, label: '5 ans', control: '5 ans' },
] as const

export function AtlasPage() {
  const { location, selectLocation } = useSelectedLocation()
  const measurementSystem = useMeasurementSystem()
  const [baseLayer, setBaseLayer] = useState<MapBaseLayer>('nasa')
  const [showNdvi, setShowNdvi] = useState(true)
  const [imageryDate, setImageryDate] = useState(daysAgo(11))
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const [coordinateInput, setCoordinateInput] = useState(`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`)
  const [coordinateError, setCoordinateError] = useState('')
  const [range, setRange] = useState(12)
  const [showTimeline, setShowTimeline] = useState(false)
  const [showPeriodComparison, setShowPeriodComparison] = useState(false)
  const [mobileView, setMobileView] = useState<'map' | 'layers' | 'point' | 'timeline'>('map')
  const [locating, setLocating] = useState(false)
  const [playingNdvi, setPlayingNdvi] = useState(false)
  const { availability: gibsAvailability, error: gibsAvailabilityError } = useGibsAvailability()
  const { series, loading, error, retry } = usePowerMonthly(location)

  useEffect(() => {
    setCoordinateInput(`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`)
    setCoordinateError('')
  }, [location.latitude, location.longitude])

  const latest = useMemo(() => series ? latestCompleteRecord(series.records) : undefined, [series])
  const latestDate = latest ? formatPowerMonth(latest.date) : 'aucune période valide'
  const rangeLabel = climateRanges.find(item => item.months === range)?.label ?? '12 mois'
  const visibleRecords = series?.records.slice(-range) ?? []
  const ndviDates = useMemo(() => {
    const latestAllowed = daysAgo(1)
    const oldestAllowed = daysAgo(366)
    const recentDates = listGibsDates(gibsAvailability?.ndvi).filter(date => date >= oldestAllowed && date <= latestAllowed)
    return sampleGibsDates(recentDates, 8)
  }, [gibsAvailability])
  const activeNdviDate = resolveGibsDate(imageryDate, gibsAvailability?.ndvi)
  const activeNdviIndex = useMemo(() => {
    if (!activeNdviDate || !ndviDates.length || activeNdviDate < ndviDates[0] || activeNdviDate > ndviDates[ndviDates.length - 1]) return -1
    const timestamp = Date.parse(`${activeNdviDate}T00:00:00Z`)
    return ndviDates.reduce((nearest, date, index) => Math.abs(Date.parse(`${date}T00:00:00Z`) - timestamp) < Math.abs(Date.parse(`${ndviDates[nearest]}T00:00:00Z`) - timestamp) ? index : nearest, 0)
  }, [activeNdviDate, ndviDates])
  const visiblePeriod = visibleRecords.length
    ? `${formatPowerMonth(visibleRecords[0].date)} – ${formatPowerMonth(visibleRecords[visibleRecords.length - 1].date)} · ${visibleRecords.length} mois disponibles`
    : 'données en attente'
  const gridPoint = series?.gridPoint
  const annualSummary = useMemo(() => {
    const records = [...(series?.records ?? [])].sort((a, b) => a.date.localeCompare(b.date)).slice(-12)
    const precipitation = records.flatMap(record => record.precipitationMmPerDay === undefined ? [] : [{
      value: record.precipitationMmPerDay * new Date(Date.UTC(Number(record.date.slice(0, 4)), Number(record.date.slice(4, 6)), 0)).getUTCDate(),
    }])
    const temperatures = records.flatMap(record => record.temperatureC === undefined ? [] : [record.temperatureC])
    const maxima = records.flatMap(record => record.temperatureMaxC === undefined ? [] : [record.temperatureMaxC])
    const minima = records.flatMap(record => record.temperatureMinC === undefined ? [] : [record.temperatureMinC])
    return {
      precipitationMm: precipitation.length === 12 ? precipitation.reduce((sum, row) => sum + row.value, 0) : undefined,
      precipitationMonths: precipitation.length,
      averageTemperatureC: temperatures.length ? temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length : undefined,
      temperatureMonths: temperatures.length,
      highestMaxC: maxima.length ? Math.max(...maxima) : undefined,
      lowestMinC: minima.length ? Math.min(...minima) : undefined,
      extremeMonths: Math.min(maxima.length, minima.length),
    }
  }, [series])

  const moveToPoint = (point: GeoPoint) => {
    selectLocation(point)
    map?.flyTo({ center: [point.longitude, point.latitude], zoom: Math.max(7, map.getZoom()), duration: 850 })
    setCoordinateError('')
  }

  const submitCoordinates = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = coordinateInput.trim().split(/[;,\s]+/).filter(Boolean).map(value => Number(value.replace(',', '.')))
    if (values.length !== 2 || !Number.isFinite(values[0]) || !Number.isFinite(values[1]) || Math.abs(values[0]) > 90 || Math.abs(values[1]) > 180) {
      setCoordinateError('Entrez latitude puis longitude (−90 à 90, −180 à 180).')
      return
    }
    moveToPoint({ latitude: values[0], longitude: values[1] })
  }

  const locateMe = () => {
    if (!navigator.geolocation) { setCoordinateError('La géolocalisation n’est pas disponible sur cet appareil.'); return }
    setLocating(true)
    setCoordinateError('')
    navigator.geolocation.getCurrentPosition(position => {
      moveToPoint({ latitude: Number(position.coords.latitude.toFixed(5)), longitude: Number(position.coords.longitude.toFixed(5)) })
      setLocating(false)
    }, reason => {
      setCoordinateError(reason.code === reason.PERMISSION_DENIED ? 'Autorisez la position ou choisissez un point sur la carte.' : 'Position indisponible. Choisissez un point sur la carte.')
      setLocating(false)
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 })
  }

  const selectPoint = (point: GeoPoint) => {
    selectLocation(point)
    setCoordinateError('')
  }

  const moveNdviDate = (step: number) => {
    if (!ndviDates.length) return
    setPlayingNdvi(false)
    const index = activeNdviIndex < 0 ? ndviDates.length - 1 : activeNdviIndex
    const nextIndex = Math.max(0, Math.min(ndviDates.length - 1, index + step))
    setImageryDate(ndviDates[nextIndex])
  }

  const startNdviPlayback = () => {
    if (!ndviDates.length) return
    if (activeNdviIndex < 0 || activeNdviIndex === ndviDates.length - 1) setImageryDate(ndviDates[0])
    setPlayingNdvi(true)
  }

  useEffect(() => {
    if (!playingNdvi) return
    const timer = window.setTimeout(() => {
      if (activeNdviIndex < 0 || activeNdviIndex >= ndviDates.length - 1) setPlayingNdvi(false)
      else setImageryDate(ndviDates[activeNdviIndex + 1])
    }, 1100)
    return () => window.clearTimeout(timer)
  }, [playingNdvi, activeNdviIndex, ndviDates])

  useEffect(() => {
    if (!showNdvi) setPlayingNdvi(false)
  }, [showNdvi])

  return <section className={`atlas-page mobile-view-${mobileView}`} aria-label="Atlas interactif des couches NASA">
    <header className="atlas-heading">
      <div className="atlas-title"><h1>Atlas</h1><span className="atlas-title-divider" /><p>Explorez l’imagerie NASA et les séries climatiques au point choisi</p></div>
      <div className="atlas-heading-actions"><button type="button" className={`atlas-history-toggle ${showTimeline ? 'is-active' : ''}`} aria-expanded={showTimeline} aria-controls="atlas-climate-history" onClick={() => setShowTimeline(value => { const next = !value; if (window.matchMedia('(max-width: 820px)').matches) setMobileView(next ? 'timeline' : 'map'); return next })}><Activity size={14} /><span>Historique climatique</span></button><form className="atlas-search" onSubmit={submitCoordinates} role="search"><Search size={16} aria-hidden="true" /><input aria-label="Coordonnées, latitude puis longitude" value={coordinateInput} onChange={event => setCoordinateInput(event.target.value)} placeholder="Latitude, longitude" /><button type="submit" aria-label="Aller aux coordonnées"><MapPinned size={15} /></button></form></div>
    </header>

    <nav className="atlas-mobile-tabs" role="group" aria-label="Panneau de l’Atlas">
      {([['map', 'Carte'], ['layers', 'Couches'], ['point', 'Point suivi'], ['timeline', 'Historique']] as const).map(([view, label]) => <button key={view} type="button" aria-pressed={mobileView === view} className={mobileView === view ? 'is-active' : ''} onClick={() => { setMobileView(view); setShowTimeline(view === 'timeline') }}>{label}</button>)}
    </nav>

    <div className="atlas-map-stage">
      <FieldMap center={location} selectedPoint={location} baseLayer={baseLayer} showNdvi={showNdvi} powerGridCell={series?.point.latitude === location.latitude && series.point.longitude === location.longitude ? series.gridCell : null} imageryDate={imageryDate} onPointSelect={selectPoint} onMapReady={setMap} ariaLabel="Carte interactive OpenStreetMap et couches satellite NASA GIBS" />
      <div className="atlas-map-toolbar">
        <div className="atlas-base-switch" role="group" aria-label="Fond de carte"><button type="button" aria-pressed={baseLayer === 'streets'} className={baseLayer === 'streets' ? 'is-active' : ''} onClick={() => setBaseLayer('streets')}>Plan</button><button type="button" aria-pressed={baseLayer === 'nasa'} className={baseLayer === 'nasa' ? 'is-active' : ''} onClick={() => setBaseLayer('nasa')}>Image NASA</button></div>
        <label className="atlas-ndvi-toggle"><input type="checkbox" checked={showNdvi} onChange={event => setShowNdvi(event.target.checked)} /><Activity size={14} /> NDVI</label>
        <label className="atlas-image-date">Date souhaitée <input type="date" value={imageryDate} max={daysAgo(1)} onChange={event => setImageryDate(event.target.value)} /></label>
      </div>
      <div className="atlas-map-controls" role="group" aria-label="Contrôles de la carte"><button type="button" aria-label="Zoomer" onClick={() => map?.zoomIn({ duration: 250 })}><Plus size={16} /></button><button type="button" aria-label="Dézoomer" onClick={() => map?.zoomOut({ duration: 250 })}><Minus size={16} /></button><button type="button" aria-label="Utiliser ma position" title="Utiliser ma position" onClick={locateMe} disabled={locating}><LocateFixed size={15} /></button></div>
      {showNdvi && <div className="atlas-ndvi-playback" role="group" aria-label="Lecture chronologique des composites NDVI NASA">
        <button type="button" aria-label="Composite NDVI précédent" title="Image NDVI précédente" onClick={() => moveNdviDate(-1)} disabled={!ndviDates.length || activeNdviIndex < 0 || activeNdviIndex <= 0}><ArrowLeft size={14} /></button>
        <button type="button" className="atlas-ndvi-play-toggle" aria-label={playingNdvi ? 'Mettre en pause les images NDVI' : 'Lire les images NDVI'} title={playingNdvi ? 'Pause' : 'Lire les composites'} onClick={playingNdvi ? () => setPlayingNdvi(false) : startNdviPlayback} disabled={!ndviDates.length}>{playingNdvi ? <Pause size={14} /> : <Play size={14} />}</button>
        <button type="button" aria-label="Composite NDVI suivant" title="Image NDVI suivante" onClick={() => moveNdviDate(1)} disabled={!ndviDates.length || activeNdviIndex < 0 || activeNdviIndex >= ndviDates.length - 1}><ArrowRight size={14} /></button>
        <span className="atlas-ndvi-playback-label"><strong>{activeNdviDate ? formatGibsDate(activeNdviDate) : 'Dates NASA en chargement'}</strong><small>{gibsAvailabilityError ? 'Dates de composites indisponibles' : activeNdviIndex < 0 ? 'Date sélectionnée hors des 12 derniers mois' : `Composite 8 jours · ${activeNdviIndex + 1} / ${ndviDates.length} · pas de 8 jours`}</small></span>
      </div>}
      <span className="atlas-map-click-hint">Cliquez sur la carte pour choisir un point et charger NASA POWER</span>
      {coordinateError && <p className="atlas-coordinate-error" role="alert">{coordinateError}</p>}

      <aside className="atlas-float-panel atlas-layers-panel" aria-label="Couches de l’Atlas">
        <header className="atlas-panel-header"><div><Layers2 size={18} /><div><h2>Imagerie NASA</h2><p>Produits satellite disponibles</p></div></div><span className="atlas-layer-count">{showNdvi ? '2' : '1'}</span></header>
        <div className="atlas-source-option"><span className="atlas-source-swatch nasa-satellite" /><span><strong>MODIS Terra · True Color</strong><small>Réflectance corrigée · GIBS</small></span><span className="atlas-source-tag">NASA</span></div>
        <label className="atlas-source-option atlas-checkbox-option"><input type="checkbox" checked={showNdvi} onChange={event => setShowNdvi(event.target.checked)} /><span className="atlas-source-swatch nasa-ndvi" /><span><strong>MODIS Terra · NDVI 8 jours</strong><small>Indice satellitaire de végétation</small></span></label>
        <label className="atlas-panel-date"><span>Date souhaitée</span><input type="date" value={imageryDate} max={daysAgo(1)} onChange={event => setImageryDate(event.target.value)} /></label>
        <div className="atlas-panel-source"><Satellite size={16} /><span><strong>NASA EOSDIS GIBS</strong><small>Tuile cartographique en imagerie reprojetée</small></span></div>
        <div className="atlas-panel-note"><ShieldCheck size={13} /><span>Le NDVI est un produit satellitaire régional. Il ne constitue pas une mesure de parcelle.</span></div>
      </aside>

      <aside className="atlas-float-panel atlas-selection-panel" aria-label="Séries climatiques du point sélectionné">
        <header className="atlas-selection-heading"><div><span className="atlas-polygon-icon" /><div><h2>Point suivi</h2><p>{formatCoord(location.latitude, 'N', 'S')} · {formatCoord(location.longitude, 'E', 'O')}</p></div></div><button type="button" aria-label="Centrer sur ma position" onClick={locateMe} disabled={locating}><LocateFixed size={15} /></button></header>
        <div className="atlas-selection-content"><p className="atlas-grid-point">{gridPoint ? `Centre maille NASA POWER · ${gridPoint.latitude.toFixed(3)}, ${gridPoint.longitude.toFixed(3)} · 0,5° × 0,625°` : 'Cellule de grille NASA en attente'}</p>
        {loading ? <div className="atlas-data-state" role="status">Chargement de NASA POWER…</div> : error ? <div className="atlas-data-error" role="alert"><span>{error}</span><button type="button" onClick={retry}>Réessayer</button></div> : <>
          <div className="atlas-live-metrics">
            <AtlasMetric icon={<CloudRain size={14} />} label="Pluie moyenne" value={latest?.precipitationMmPerDay === undefined ? '—' : formatPrecipitationRate(latest.precipitationMmPerDay, measurementSystem)} source="PRECTOTCORR" />
            <AtlasMetric icon={<ThermometerSun size={14} />} label="Température moyenne" value={latest?.temperatureC === undefined ? '—' : formatTemperature(latest.temperatureC, measurementSystem)} source="T2M" />
            <AtlasMetric icon={<Sun size={14} />} label="Température maximale" value={latest?.temperatureMaxC === undefined ? '—' : formatTemperature(latest.temperatureMaxC, measurementSystem)} source="T2M_MAX" />
            <AtlasMetric icon={<ThermometerSun size={14} />} label="Température minimale" value={latest?.temperatureMinC === undefined ? '—' : formatTemperature(latest.temperatureMinC, measurementSystem)} source="T2M_MIN" />
            <AtlasMetric icon={<Droplets size={14} />} label="Humidité de surface modélisée" value={latest?.surfaceSoilWetness === undefined ? '—' : `${(latest.surfaceSoilWetness * 100).toFixed(0)} %`} source="GWETTOP" />
            <AtlasMetric icon={<Droplets size={14} />} label="Humidité racinaire modélisée" value={latest?.rootZoneWetness === undefined ? '—' : `${(latest.rootZoneWetness * 100).toFixed(0)} %`} source="GWETROOT" />
          </div>
          <p className="atlas-live-source">Dernière période exploitable · {latestDate} · NASA POWER · {series?.source.join(' + ')}</p>
          <section className="atlas-annual-summary" aria-label="Résumé des douze derniers mois NASA POWER"><h3>Résumé · 12 derniers mois</h3><div className="atlas-summary-metrics">
            <AtlasSummaryMetric label="Pluie estimée" value={annualSummary.precipitationMm === undefined ? '—' : formatPrecipitationTotal(annualSummary.precipitationMm, measurementSystem)} detail={annualSummary.precipitationMm === undefined ? `${annualSummary.precipitationMonths}/12 mois · cumul incomplet` : '12 mois complets · cumul estimé'} />
            <AtlasSummaryMetric label="Température moyenne" value={annualSummary.averageTemperatureC === undefined ? '—' : formatTemperature(annualSummary.averageTemperatureC, measurementSystem)} detail={`${annualSummary.temperatureMonths}/12 mois disponibles`} />
            <AtlasSummaryMetric label="Plage annuelle min. – max." value={annualSummary.highestMaxC === undefined || annualSummary.lowestMinC === undefined ? '—' : `${formatTemperature(annualSummary.lowestMinC, measurementSystem)} → ${formatTemperature(annualSummary.highestMaxC, measurementSystem)}`} detail={`${annualSummary.extremeMonths}/12 mois · T2M_MIN à T2M_MAX`} />
          </div></section>
          {series && <PowerHistoricalContext series={series} system={measurementSystem} />}
          {series && <PowerCoverageSummary series={series} />}
        </>}
        <div className="atlas-panel-note"><ShieldCheck size={13} /><span>Valeurs mensuelles sur cellule de grille, pas des observations de la ferme.</span></div>
        <Link to="/app/data-trust" className="atlas-provenance-link">Sources et limites des données <span>›</span></Link></div>
      </aside>

      {showTimeline && <section id="atlas-climate-history" className={`atlas-data-timeline ${showPeriodComparison ? 'is-period-comparison-open' : ''}`} aria-label="Graphiques climatiques NASA POWER">
      <div className="atlas-timeline-controls"><div><span className="timeline-icon"><Activity size={16} /></span><span><strong>Série climatique NASA POWER</strong><small>{rangeLabel} demandés · {visiblePeriod} · point suivi</small></span></div><div className="atlas-timeline-actions"><div className="timeline-ranges" role="group" aria-label="Période du graphique">{climateRanges.map(({ months, label, control }) => <button key={months} type="button" aria-pressed={range === months} className={range === months ? 'is-active' : ''} aria-label={`Afficher les ${label} précédents`} title={`Afficher les ${label} précédents`} onClick={() => setRange(months)}>{control}</button>)}</div><button className="atlas-export-button" type="button" aria-label="Télécharger les séries mensuelles NASA POWER en CSV, avec coordonnées arrondies à 0,001 degré" title="CSV · coordonnées arrondies à 0,001° · valeurs absentes conservées vides" disabled={!series} onClick={() => series && downloadPowerMonthlyCsv(series)}><Download size={14} /><span>CSV</span></button></div></div>
      <button type="button" className="atlas-history-close" aria-label="Fermer l’historique climatique" onClick={() => { setShowTimeline(false); setMobileView('map') }}><X size={15} /></button>
      <div className="atlas-timeline-content"><PowerClimateChart records={series?.records ?? []} requestedMonths={series?.requestedMonths} source={series?.source.join(' + ') ?? 'en attente'} months={range} title="Précipitations et température · données mensuelles NASA" compact />{series && <ClimateYearComparison series={series} measurementSystem={measurementSystem} onExpanded={setShowPeriodComparison} />}</div>
      </section>}
    </div>
  </section>
}

function AtlasMetric({ icon, label, value, source }: { icon: React.ReactNode; label: string; value: string; source: string }) {
  return <div className="atlas-live-metric"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>NASA POWER · {source}</em></div></div>
}

function AtlasSummaryMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="atlas-summary-metric"><small>{label}</small><strong>{value}</strong><em>{detail}</em></div>
}
