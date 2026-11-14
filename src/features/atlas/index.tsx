import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, CloudRain, Droplets, Layers2, LocateFixed, MapPinned, Minus, Plus, Search, ShieldCheck, Satellite, Sun, ThermometerSun } from 'lucide-react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { Link } from 'react-router-dom'
import { FieldMap, type MapBaseLayer } from '../../components/maps/FieldMap'
import { PowerClimateChart } from '../../components/charts/PowerClimateChart'
import { useSelectedLocation, type GeoPoint } from '../../lib/geo/location'
import { fetchPowerMonthly, formatPowerMonth, latestCompleteRecord, type PowerMonthlySeries } from '../../lib/nasa/power'
import './atlas.css'

function daysAgo(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

function formatCoord(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(3).replace('.', ',')}° ${value < 0 ? negative : positive}`
}

export function AtlasPage() {
  const { location, selectLocation } = useSelectedLocation()
  const [baseLayer, setBaseLayer] = useState<MapBaseLayer>('nasa')
  const [showNdvi, setShowNdvi] = useState(true)
  const [imageryDate, setImageryDate] = useState(daysAgo(11))
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const [coordinateInput, setCoordinateInput] = useState(`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`)
  const [coordinateError, setCoordinateError] = useState('')
  const [series, setSeries] = useState<PowerMonthlySeries | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [range, setRange] = useState(12)
  const [locating, setLocating] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setCoordinateInput(`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`)
    setCoordinateError('')
  }, [location.latitude, location.longitude])

  useEffect(() => {
    let current = true
    setLoading(true)
    setError('')
    fetchPowerMonthly(location, 5).then(result => {
      if (current) setSeries(result)
    }).catch(reason => {
      if (current) setError(reason instanceof Error ? reason.message : 'Impossible de charger NASA POWER.')
    }).finally(() => {
      if (current) setLoading(false)
    })
    return () => { current = false }
  }, [location.latitude, location.longitude, refreshKey])

  const latest = useMemo(() => series ? latestCompleteRecord(series.records) : undefined, [series])
  const latestDate = latest ? formatPowerMonth(latest.date) : 'aucune période valide'
  const gridPoint = series?.gridPoint

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

  return <section className="atlas-page" aria-label="Atlas interactif des couches NASA">
    <header className="atlas-heading">
      <div className="atlas-title"><h1>Atlas</h1><span className="atlas-title-divider" /><p>Explorez l’imagerie NASA et les séries climatiques au point choisi</p></div>
      <form className="atlas-search" onSubmit={submitCoordinates} role="search"><Search size={16} aria-hidden="true" /><input aria-label="Coordonnées, latitude puis longitude" value={coordinateInput} onChange={event => setCoordinateInput(event.target.value)} placeholder="Latitude, longitude" /><button type="submit" aria-label="Aller aux coordonnées"><MapPinned size={15} /></button></form>
    </header>

    <div className="atlas-map-stage">
      <FieldMap center={location} selectedPoint={location} baseLayer={baseLayer} showNdvi={showNdvi} imageryDate={imageryDate} onPointSelect={selectPoint} onMapReady={setMap} ariaLabel="Carte interactive OpenStreetMap et couches satellite NASA GIBS" />
      <div className="atlas-map-toolbar">
        <div className="atlas-base-switch" role="group" aria-label="Fond de carte"><button type="button" className={baseLayer === 'streets' ? 'is-active' : ''} onClick={() => setBaseLayer('streets')}>Plan</button><button type="button" className={baseLayer === 'nasa' ? 'is-active' : ''} onClick={() => setBaseLayer('nasa')}>Image NASA</button></div>
        <label className="atlas-ndvi-toggle"><input type="checkbox" checked={showNdvi} onChange={event => setShowNdvi(event.target.checked)} /><Activity size={14} /> NDVI</label>
        <label className="atlas-image-date">Date affichée <input type="date" value={imageryDate} max={daysAgo(1)} onChange={event => setImageryDate(event.target.value)} /></label>
      </div>
      <div className="atlas-map-controls" role="group" aria-label="Contrôles de la carte"><button type="button" aria-label="Zoomer" onClick={() => map?.zoomIn({ duration: 250 })}><Plus size={16} /></button><button type="button" aria-label="Dézoomer" onClick={() => map?.zoomOut({ duration: 250 })}><Minus size={16} /></button><button type="button" aria-label="Utiliser ma position" title="Utiliser ma position" onClick={locateMe} disabled={locating}><LocateFixed size={15} /></button></div>
      <span className="atlas-map-click-hint">Cliquez sur la carte pour choisir un point et charger NASA POWER</span>
      {coordinateError && <p className="atlas-coordinate-error" role="alert">{coordinateError}</p>}

      <aside className="atlas-float-panel atlas-layers-panel" aria-label="Couches de l’Atlas">
        <header className="atlas-panel-header"><div><Layers2 size={18} /><div><h2>Imagerie NASA</h2><p>Produits satellite disponibles</p></div></div><span className="atlas-layer-count">{showNdvi ? '2' : '1'}</span></header>
        <div className="atlas-source-option"><span className="atlas-source-swatch nasa-satellite" /><span><strong>MODIS Terra · True Color</strong><small>Réflectance corrigée · GIBS</small></span><span className="atlas-source-tag">NASA</span></div>
        <label className="atlas-source-option atlas-checkbox-option"><input type="checkbox" checked={showNdvi} onChange={event => setShowNdvi(event.target.checked)} /><span className="atlas-source-swatch nasa-ndvi" /><span><strong>MODIS Terra · NDVI 8 jours</strong><small>Indice satellitaire de végétation</small></span></label>
        <label className="atlas-panel-date"><span>Date de la couche</span><input type="date" value={imageryDate} max={daysAgo(1)} onChange={event => setImageryDate(event.target.value)} /></label>
        <div className="atlas-panel-source"><Satellite size={16} /><span><strong>NASA EOSDIS GIBS</strong><small>Tuile cartographique en imagerie reprojetée</small></span></div>
        <div className="atlas-panel-note"><ShieldCheck size={13} /><span>Le NDVI est un produit satellitaire régional. Il ne constitue pas une mesure de parcelle.</span></div>
      </aside>

      <aside className="atlas-float-panel atlas-selection-panel" aria-label="Séries climatiques du point sélectionné">
        <header className="atlas-selection-heading"><div><span className="atlas-polygon-icon" /><div><h2>Point suivi</h2><p>{formatCoord(location.latitude, 'N', 'S')} · {formatCoord(location.longitude, 'E', 'O')}</p></div></div><button type="button" aria-label="Centrer sur ma position" onClick={locateMe} disabled={locating}><LocateFixed size={15} /></button></header>
        <p className="atlas-grid-point">{gridPoint ? `Cellule NASA POWER · ${gridPoint.latitude.toFixed(3)}, ${gridPoint.longitude.toFixed(3)}` : 'Cellule de grille NASA en attente'}</p>
        {loading ? <div className="atlas-data-state" role="status">Chargement de NASA POWER…</div> : error ? <div className="atlas-data-error" role="alert"><span>{error}</span><button type="button" onClick={() => setRefreshKey(value => value + 1)}>Réessayer</button></div> : <>
          <div className="atlas-live-metrics">
            <AtlasMetric icon={<CloudRain size={14} />} label="Pluie moyenne" value={latest?.precipitationMmPerDay === undefined ? '—' : `${latest.precipitationMmPerDay.toFixed(2).replace('.', ',')} mm/j`} source="PRECTOTCORR" />
            <AtlasMetric icon={<ThermometerSun size={14} />} label="Température moyenne" value={latest?.temperatureC === undefined ? '—' : `${latest.temperatureC.toFixed(1).replace('.', ',')} °C`} source="T2M" />
            <AtlasMetric icon={<Sun size={14} />} label="Température maximale" value={latest?.temperatureMaxC === undefined ? '—' : `${latest.temperatureMaxC.toFixed(1).replace('.', ',')} °C`} source="T2M_MAX" />
            <AtlasMetric icon={<ThermometerSun size={14} />} label="Température minimale" value={latest?.temperatureMinC === undefined ? '—' : `${latest.temperatureMinC.toFixed(1).replace('.', ',')} °C`} source="T2M_MIN" />
            <AtlasMetric icon={<Droplets size={14} />} label="Humidité de surface modélisée" value={latest?.surfaceSoilWetness === undefined ? '—' : `${(latest.surfaceSoilWetness * 100).toFixed(0)} %`} source="GWETTOP" />
            <AtlasMetric icon={<Droplets size={14} />} label="Humidité racinaire modélisée" value={latest?.rootZoneWetness === undefined ? '—' : `${(latest.rootZoneWetness * 100).toFixed(0)} %`} source="GWETROOT" />
          </div>
          <p className="atlas-live-source">Dernière période exploitable · {latestDate} · NASA POWER · {series?.source.join(' + ')}</p>
        </>}
        <div className="atlas-panel-note"><ShieldCheck size={13} /><span>Valeurs mensuelles sur cellule de grille, pas des observations de la ferme.</span></div>
        <Link to="/app/data-trust" className="atlas-provenance-link">Sources et limites des données <span>›</span></Link>
      </aside>
    </div>

    <section className="atlas-data-timeline" aria-label="Graphiques climatiques NASA POWER">
      <div className="atlas-timeline-controls"><div><span className="timeline-icon"><Activity size={16} /></span><span><strong>Série climatique NASA POWER</strong><small>{range} derniers mois · point suivi</small></span></div><div className="timeline-ranges" role="group" aria-label="Période du graphique">{[[3, '3 mois'], [6, '6 mois'], [12, '1 an']].map(([months, label]) => <button key={months} type="button" className={range === months ? 'is-active' : ''} onClick={() => setRange(Number(months))}>{label}</button>)}</div></div>
      <PowerClimateChart records={series?.records ?? []} source={series?.source.join(' + ') ?? 'en attente'} months={range} title="Précipitations et température · données mensuelles NASA" />
    </section>
  </section>
}

function AtlasMetric({ icon, label, value, source }: { icon: React.ReactNode; label: string; value: string; source: string }) {
  return <div className="atlas-live-metric"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>NASA POWER · {source}</em></div></div>
}
