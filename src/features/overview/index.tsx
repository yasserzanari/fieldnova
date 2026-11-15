import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, ChevronRight, CloudRain, Droplets, ExternalLink, LocateFixed, MapPinned, Minus, Plus, RefreshCw, Satellite, Search, ShieldCheck, Sprout, ThermometerSun } from 'lucide-react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { Link } from 'react-router-dom'
import { FieldMap, type MapBaseLayer } from '../../components/maps/FieldMap'
import { useSelectedLocation, type GeoPoint } from '../../lib/geo/location'
import { formatPowerMonth, latestCompleteRecord } from '../../lib/nasa/power'
import { usePowerMonthly } from '../../lib/nasa/use-power-monthly'
import { formatPrecipitationRate, formatTemperature, useMeasurementSystem } from '../../lib/units/measurement-units'
import { readRotationComparisonCount, ROTATION_COMPARISON_RECORDED_EVENT, rotationComparisonStorageKey } from '../../lib/impact/rotation-comparison-counter'
import { readFarmProfile, type FarmProfile } from '../../lib/farm/farm-profile'
import { readSoilProfile } from '../../lib/farm/soil-profile'
import { evaluateRotation, readCropCatalog, readRotationWorkspace } from '../scenarios/rotation-model'
import { PowerClimateChart } from '../../components/charts/PowerClimateChart'
import { FarmSetupWizard } from './FarmSetupWizard'
import './overview.css'

function daysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

function formatCoord(value: number, suffix: string) {
  return `${Math.abs(value).toFixed(3).replace('.', ',')}° ${suffix}`
}

export function OverviewPage() {
  const measurementSystem = useMeasurementSystem()
  const { location, selectLocation } = useSelectedLocation()
  const [baseLayer, setBaseLayer] = useState<MapBaseLayer>('streets')
  const [showNdvi, setShowNdvi] = useState(false)
  const [imageryDate, setImageryDate] = useState(daysAgo(2))
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const { series, loading, error, retry } = usePowerMonthly(location)
  const [farmProfile, setFarmProfile] = useState<FarmProfile | null>(() => readFarmProfile(location))
  const [comparisonCount, setComparisonCount] = useState(() => readRotationComparisonCount(location))
  const [evidence, setEvidence] = useState(() => { const catalog = readCropCatalog(location); return { soil: readSoilProfile(location), rotation: readRotationWorkspace(location, catalog) } })
  const [farmSetupOpen, setFarmSetupOpen] = useState(false)
  const [latitude, setLatitude] = useState(String(location.latitude))
  const [longitude, setLongitude] = useState(String(location.longitude))
  const [coordError, setCoordError] = useState('')
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    setLatitude(String(location.latitude))
    setLongitude(String(location.longitude))
    setFarmProfile(readFarmProfile(location))
    setComparisonCount(readRotationComparisonCount(location))
    const catalog = readCropCatalog(location)
    setEvidence({ soil: readSoilProfile(location), rotation: readRotationWorkspace(location, catalog) })
    setCoordError('')
  }, [location.latitude, location.longitude])

  useEffect(() => {
    const reloadLocalData = () => {
      setFarmProfile(readFarmProfile(location))
      const catalog = readCropCatalog(location)
      setEvidence({ soil: readSoilProfile(location), rotation: readRotationWorkspace(location, catalog) })
    }
    window.addEventListener('fieldnova:demo-mode-change', reloadLocalData)
    return () => window.removeEventListener('fieldnova:demo-mode-change', reloadLocalData)
  }, [location.latitude, location.longitude])

  useEffect(() => {
    const refreshCount = () => setComparisonCount(readRotationComparisonCount(location))
    const refreshFromStorage = (event: StorageEvent) => {
      if (event.key === rotationComparisonStorageKey(location)) refreshCount()
    }
    window.addEventListener(ROTATION_COMPARISON_RECORDED_EVENT, refreshCount)
    window.addEventListener('storage', refreshFromStorage)
    return () => {
      window.removeEventListener(ROTATION_COMPARISON_RECORDED_EVENT, refreshCount)
      window.removeEventListener('storage', refreshFromStorage)
    }
  }, [location.latitude, location.longitude])

  const latest = useMemo(() => series ? latestCompleteRecord(series.records) : undefined, [series])
  const updatePoint = (point: GeoPoint) => {
    selectLocation(point)
    setCoordError('')
  }

  const applyCoordinates = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const point = { latitude: Number(latitude.replace(',', '.')), longitude: Number(longitude.replace(',', '.')) }
    if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) || Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180) {
      setCoordError('Latitude : −90 à 90 · longitude : −180 à 180.')
      return
    }
    updatePoint(point)
    map?.flyTo({ center: [point.longitude, point.latitude], zoom: Math.max(map.getZoom(), 7), duration: 850 })
  }

  const locateMe = () => {
    if (!navigator.geolocation) { setCoordError('La géolocalisation n’est pas disponible sur cet appareil.'); return }
    setLocating(true)
    setCoordError('')
    navigator.geolocation.getCurrentPosition(position => {
      const point = { latitude: Number(position.coords.latitude.toFixed(5)), longitude: Number(position.coords.longitude.toFixed(5)) }
      updatePoint(point)
      map?.flyTo({ center: [point.longitude, point.latitude], zoom: 9, duration: 900 })
      setLocating(false)
    }, reason => {
      setCoordError(reason.code === reason.PERMISSION_DENIED ? 'Autorisez la position dans votre navigateur ou cliquez sur la carte.' : 'Position indisponible. Cliquez sur la carte pour choisir un point.')
      setLocating(false)
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 })
  }

  const latestDate = latest ? formatPowerMonth(latest.date) : 'aucune période valide'
  const dataPoint = series?.gridPoint
  const soilAvailable = Boolean(evidence.soil.texture || evidence.soil.ph !== undefined || evidence.soil.organicMatterPercent !== undefined || evidence.soil.effectiveDepthCm !== undefined || evidence.soil.drainage || evidence.soil.horizons?.length)
  const catalog = readCropCatalog(location)
  const completeRotations = evidence.rotation.plans.filter(plan => evaluateRotation(plan, catalog).complete).length
  const rotationAvailable = !evidence.rotation.isExample && completeRotations > 0
  const farmAvailable = Boolean(farmProfile && !farmProfile.isExample)
  const nasaAvailable = Boolean(series && latest)
  const availableEvidenceCount = [nasaAvailable, farmAvailable, soilAvailable, rotationAvailable].filter(Boolean).length

  return (
    <section className="overview-page" aria-label="Vue d’ensemble avec données NASA en direct">
      <header className="overview-heading">
        <div><h1>Vue d’ensemble</h1><p>Choisissez un point sur la carte pour charger le climat NASA à cet emplacement.</p></div>
        <button className="overview-farm-profile-button" type="button" onClick={() => setFarmSetupOpen(true)} aria-label={farmProfile ? `Modifier le profil de ${farmProfile.name}` : 'Configurer le profil de ma ferme'}>
          <span className="overview-farm-profile-icon"><Sprout size={16} /></span><span><strong>{farmProfile?.name ?? 'Configurer ma ferme'}</strong><small>{farmProfile?.isExample ? 'Profil fictif · exemple agricole' : farmProfile ? 'Profil enregistré localement' : 'Ajouter mes priorités et contraintes'}</small></span><ChevronRight size={16} />
        </button>
      </header>

      <div className="overview-map-stage">
        <FieldMap center={location} selectedPoint={location} baseLayer={baseLayer} showNdvi={showNdvi} powerGridCell={series?.point.latitude === location.latitude && series.point.longitude === location.longitude ? series.gridCell : null} imageryDate={imageryDate} onPointSelect={updatePoint} onMapReady={setMap} ariaLabel="Carte interactive OpenStreetMap et couches NASA GIBS" />
        <div className="overview-map-topline">
          <div className="map-location"><MapPinned size={15} /><span>{formatCoord(location.latitude, location.latitude < 0 ? 'S' : 'N')} · {formatCoord(location.longitude, location.longitude < 0 ? 'O' : 'E')}</span><small>Point suivi</small></div>
          <div className="overview-map-options">
            <div className="map-mode-switch" role="group" aria-label="Fond de carte">
              <button type="button" className={baseLayer === 'streets' ? 'is-active' : ''} onClick={() => setBaseLayer('streets')}><MapPinned size={13} />Plan</button>
              <button type="button" className={baseLayer === 'nasa' ? 'is-active' : ''} onClick={() => setBaseLayer('nasa')}><Satellite size={13} />NASA</button>
              <button type="button" className={showNdvi ? 'is-active' : ''} onClick={() => setShowNdvi(value => !value)}><Activity size={13} />NDVI</button>
            </div>
            <label className="overview-imagery-date">Date souhaitée <input type="date" value={imageryDate} max={daysAgo(1)} onChange={event => setImageryDate(event.target.value)} /></label>
          </div>
        </div>

        <div className="overview-map-controls" role="group" aria-label="Contrôles de la carte">
          <button className="map-control" type="button" aria-label="Zoomer" onClick={() => map?.zoomIn({ duration: 250 })}><Plus size={17} /></button>
          <button className="map-control" type="button" aria-label="Dézoomer" onClick={() => map?.zoomOut({ duration: 250 })}><Minus size={17} /></button>
          <button className="map-control" type="button" aria-label="Centrer sur ma position" title="Ma position" onClick={locateMe} disabled={locating}><LocateFixed size={16} /></button>
        </div>
        <span className="overview-map-click-hint">Cliquez sur la carte pour interroger NASA POWER à cet endroit</span>

        <aside className="overview-panel overview-parcels-panel" aria-label="Point suivi et coordonnées">
          <header className="overview-panel-heading"><div><h2>Point d’analyse</h2><p>{dataPoint ? `Centre maille NASA POWER · ${dataPoint.latitude.toFixed(3)}, ${dataPoint.longitude.toFixed(3)} · 0,5° × 0,625°` : 'Chargement de la cellule NASA…'}</p></div><span className="panel-icon"><MapPinned size={17} /></span></header>
          <form className="overview-coordinate-form" onSubmit={applyCoordinates}>
            <label><span>Latitude</span><input inputMode="decimal" value={latitude} onChange={event => setLatitude(event.target.value)} aria-label="Latitude" /></label>
            <label><span>Longitude</span><input inputMode="decimal" value={longitude} onChange={event => setLongitude(event.target.value)} aria-label="Longitude" /></label>
            <button type="submit" aria-label="Appliquer les coordonnées"><Search size={14} /></button>
          </form>
          {coordError && <p className="overview-coordinate-error" role="alert">{coordError}</p>}
          <button className="overview-locate-action" type="button" onClick={locateMe} disabled={locating}><LocateFixed size={14} />{locating ? 'Localisation…' : 'Utiliser ma position'}</button>
          <div className="overview-point-note"><ShieldCheck size={13} /><span>Le point cliqué est rapproché de la cellule de grille NASA correspondante. Ce n’est pas une mesure de parcelle.</span></div>
          <section className="overview-evidence" aria-label="Couverture des données disponibles">
            <header><strong>Éléments disponibles</strong><span>{availableEvidenceCount}/4</span></header>
            <p>Sources exploitables · les exemples sont exclus</p>
            <EvidenceRow label="Climat NASA" detail={nasaAvailable ? `${series?.records.length ?? 0} mois chargés` : loading ? 'Chargement…' : 'Indisponible'} available={nasaAvailable} to="/app/atlas" />
            <EvidenceRow label="Profil ferme" detail={farmProfile ? farmProfile.isExample ? 'Exemple fictif' : 'Déclaré localement' : 'Absent'} available={farmAvailable} to="#farm-profile" onClick={() => setFarmSetupOpen(true)} />
            <EvidenceRow label="Sol" detail={soilAvailable ? 'Renseigné localement' : 'Inconnu'} available={soilAvailable} to="/app/terrain" />
            <EvidenceRow label="Rotations" detail={rotationAvailable ? `${completeRotations} plan${completeRotations > 1 ? 's' : ''} renseigné${completeRotations > 1 ? 's' : ''}` : evidence.rotation.isExample ? 'Exemple fictif' : 'À renseigner'} available={rotationAvailable} to="/app/scenarios" />
          </section>
          <div className="overview-comparison-count" aria-label={`${comparisonCount} comparaisons générées pour ce point`}><span><Activity size={13} /></span><strong>{comparisonCount}</strong><div><b>Comparaisons générées</b><small>Pour ce point · stockées sur cet appareil</small></div></div>
          <Link to="/app/atlas" className="overview-panel-link">Ouvrir l’Atlas NASA <ExternalLink size={14} /></Link>
        </aside>

        <aside className="overview-panel overview-climate-panel" aria-label="Dernière période climatique NASA POWER">
          <header className="overview-panel-heading"><div><h2>Climat & eau · NASA POWER</h2><p>{loading ? 'Chargement de la série mensuelle…' : `Dernière période disponible · ${latestDate}`}</p></div><span className="panel-icon climate-icon"><CloudRain size={18} /></span></header>
          {loading ? <div className="overview-loading"><span className="overview-spinner" />Récupération de données NASA…</div> : error ? <div className="overview-api-error" role="alert"><span>{error}</span><button type="button" onClick={retry}><RefreshCw size={13} />Réessayer</button></div> : <>
            <div className="climate-indicators">
              <Metric icon={<CloudRain size={17} />} tone="rain" label="Pluie moyenne mensuelle" value={latest?.precipitationMmPerDay === undefined ? '—' : formatPrecipitationRate(latest.precipitationMmPerDay, measurementSystem)} detail="NASA POWER · PRECTOTCORR" />
              <Metric icon={<ThermometerSun size={17} />} tone="temp" label="Température moyenne" value={latest?.temperatureC === undefined ? '—' : formatTemperature(latest.temperatureC, measurementSystem)} detail="NASA POWER · T2M" />
              <Metric icon={<Droplets size={17} />} tone="water" label="Humidité racinaire modélisée" value={latest?.rootZoneWetness === undefined ? '—' : `${(latest.rootZoneWetness * 100).toFixed(0)} %`} detail="NASA POWER · GWETROOT" />
            </div>
            {series && <div className="overview-data-footnote">Mois de {latestDate} · NASA POWER · {series.source.join(' + ')} · UTC</div>}
          </>}
        </aside>
      </div>

      <div className="overview-bottom-grid">
        <PowerClimateChart records={series?.records ?? []} title="Série climatique NASA · 12 derniers mois" source={series?.source.join(' + ') ?? 'en attente'} />
        <PowerClimateChart records={series?.records ?? []} mode="soil" source={series?.source.join(' + ') ?? 'en attente'} />
      </div>
      <FarmSetupWizard open={farmSetupOpen} point={location} onClose={() => setFarmSetupOpen(false)} onSaved={setFarmProfile} />
    </section>
  )
}

function Metric({ icon, tone, label, value, detail }: { icon: React.ReactNode; tone: string; label: string; value: string; detail: string }) {
  return <div className="climate-indicator"><span className={`climate-symbol ${tone}`}>{icon}</span><span><small>{label}</small><strong>{value}</strong><em>{detail}</em></span></div>
}

function EvidenceRow({ label, detail, available, to, onClick }: { label: string; detail: string; available: boolean; to: string; onClick?: () => void }) {
  if (onClick) return <button className="overview-evidence-row" type="button" onClick={onClick}><span className={available ? 'is-available' : ''} aria-hidden="true" /><strong>{label}</strong><small>{detail}</small></button>
  return <Link className="overview-evidence-row" to={to}><span className={available ? 'is-available' : ''} aria-hidden="true" /><strong>{label}</strong><small>{detail}</small></Link>
}
