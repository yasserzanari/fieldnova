import { useMemo, useState } from 'react'
import { Droplets, Layers3, LocateFixed, MapPinned, Minus, Plus, Satellite, ShieldCheck, Sprout } from 'lucide-react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { Link } from 'react-router-dom'
import { FieldMap, type MapBaseLayer } from '../../components/maps/FieldMap'
import { PowerClimateChart } from '../../components/charts/PowerClimateChart'
import { useSelectedLocation, type GeoPoint } from '../../lib/geo/location'
import { formatPowerMonth, latestCompleteRecord } from '../../lib/nasa/power'
import { usePowerMonthly } from '../../lib/nasa/use-power-monthly'
import { SoilProfileEditor } from './SoilProfileEditor'
import './terrain.css'

type SoilLayer = 'surface' | 'root'

function daysAgo(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

function coordinate(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(3).replace('.', ',')}° ${value < 0 ? negative : positive}`
}

export function TerrainPage() {
  const { location, selectLocation } = useSelectedLocation()
  const [baseLayer, setBaseLayer] = useState<MapBaseLayer>('nasa')
  const [soilLayer, setSoilLayer] = useState<SoilLayer>('root')
  const imageryDate = daysAgo(11)
  const imageDateLabel = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${imageryDate}T12:00:00Z`))
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const [locating, setLocating] = useState(false)
  const { series, loading, error, retry } = usePowerMonthly(location)

  const latest = useMemo(() => series ? latestCompleteRecord(series.records) : undefined, [series])
  const gridPoint = series?.gridPoint
  const latestDate = latest ? formatPowerMonth(latest.date) : 'aucune période valide'

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

  return <section className="terrain-page" aria-label="Sol et humidité au point sélectionné">
    <header className="terrain-heading"><div><h1>Mon terrain</h1><p>Humidité de surface, zone racinaire et données de sol pour le point choisi</p></div><span className="terrain-data-live"><i />Sources NASA connectées</span></header>

    <div className="terrain-map-stage">
      <FieldMap center={location} selectedPoint={location} baseLayer={baseLayer} showNdvi={false} showSurfaceSoil={soilLayer === 'surface'} showRootSoil={soilLayer === 'root'} powerGridCell={series?.point.latitude === location.latitude && series.point.longitude === location.longitude ? series.gridCell : null} imageryDate={imageryDate} onPointSelect={selectPoint} onMapReady={setMap} ariaLabel="Carte interactive NASA GIBS avec humidité des sols SMAP" />
      <div className="terrain-map-topline">
        <div className="terrain-map-location"><MapPinned size={15} /><span>{coordinate(location.latitude, 'N', 'S')} · {coordinate(location.longitude, 'E', 'O')}</span><small>Point suivi</small></div>
        <div className="terrain-map-options">
          <div className="terrain-base-switch" role="group" aria-label="Fond de carte"><button type="button" className={baseLayer === 'streets' ? 'is-active' : ''} onClick={() => setBaseLayer('streets')}>Plan</button><button type="button" className={baseLayer === 'nasa' ? 'is-active' : ''} onClick={() => setBaseLayer('nasa')}>Satellite</button></div>
          <span className="terrain-latest-chip">MODIS · {imageDateLabel} · SMAP récent</span>
        </div>
      </div>
      <div className="terrain-map-controls" role="group" aria-label="Contrôles de la carte"><button type="button" aria-label="Zoomer" onClick={() => map?.zoomIn({ duration: 250 })}><Plus size={16} /></button><button type="button" aria-label="Dézoomer" onClick={() => map?.zoomOut({ duration: 250 })}><Minus size={16} /></button><button type="button" aria-label="Utiliser ma position" onClick={locateMe} disabled={locating}><LocateFixed size={15} /></button></div>
      <span className="terrain-map-click-hint">Cliquez pour choisir un point · la couche SMAP s’affiche à une résolution native d’environ 9 km</span>

      <aside className="terrain-panel terrain-layers-panel" aria-label="Couches d’humidité des sols">
        <header className="terrain-panel-heading"><div><span className="terrain-heading-icon"><Layers3 size={17} /></span><span><h2>Humidité du sol · NASA SMAP</h2><small>Produit L4 analysé · carte quotidienne</small></span></div><Satellite size={17} className="terrain-heading-satellite" /></header>
        <div className="terrain-layer-choice" role="group" aria-label="Profondeur du produit d’humidité">
          <button type="button" className={soilLayer === 'surface' ? 'is-selected' : ''} onClick={() => setSoilLayer('surface')}><span className="terrain-layer-icon surface"><Droplets size={15} /></span><span><strong>Surface</strong><small>SMAP L4 · analyse de surface</small></span><i /></button>
          <button type="button" className={soilLayer === 'root' ? 'is-selected' : ''} onClick={() => setSoilLayer('root')}><span className="terrain-layer-icon roots"><Sprout size={15} /></span><span><strong>Zone racinaire</strong><small>SMAP L4 · analyse racinaire</small></span><i /></button>
        </div>
        <div className="terrain-smap-source"><Satellite size={14} /><span><strong>NASA SMAP · L4</strong><small>Humidité analysée, modèle assimilant des observations SMAP · grille 9 km</small></span></div>
        <div className="terrain-note"><ShieldCheck size={13} /><span>Cette couche cartographique est modélisée et agrégée sur une grille large. Elle ne mesure pas directement votre parcelle.</span></div>
        <div className="terrain-smap-legend"><span>Humidité volumique · m³/m³ · légende NASA</span><img src="https://gibs.earthdata.nasa.gov/legends/SMAP_Analyzed_Soil_Moisture_H.svg" alt="Légende NASA SMAP pour l’humidité volumique du sol. Noir : aucune donnée." /></div>
        <div className="terrain-data-source-link"><Link to="/app/data-trust">Voir les sources et limites des données <span>›</span></Link></div>
      </aside>

      <aside className="terrain-panel terrain-soil-panel" aria-label="Mesures climatiques NASA POWER et état des données de sol">
        <header className="terrain-soil-heading"><div><span className="terrain-heading-icon soil"><Droplets size={17} /></span><span><h2>Sol & eau · NASA POWER</h2><small>{loading ? 'Chargement de la série mensuelle…' : `Dernière période disponible · ${latestDate}`}</small></span></div><button type="button" className="terrain-refresh" aria-label="Actualiser les données NASA" onClick={retry}><span>↻</span></button></header>
        {loading ? <div className="terrain-data-state" role="status">Récupération des données NASA…</div> : error ? <div className="terrain-data-error" role="alert">{error}<button type="button" onClick={retry}>Réessayer</button></div> : <>
          <p className="terrain-grid-location">Centre maille NASA POWER · {gridPoint?.latitude.toFixed(3)}, {gridPoint?.longitude.toFixed(3)} · 0,5° × 0,625°</p>
          <SoilMetric label="Humidité de surface modélisée" parameter="GWETTOP" value={latest?.surfaceSoilWetness} color="surface" />
          <SoilMetric label="Humidité racinaire modélisée" parameter="GWETROOT" value={latest?.rootZoneWetness} color="root" />
          <p className="terrain-model-detail">Fractions relatives issues du modèle NASA POWER · UTC · {series?.source.join(' + ')}</p>
        </>}
        <SoilProfileEditor point={location} />
        <div className="terrain-note"><ShieldCheck size={13} /><span>Les valeurs POWER et SMAP sont deux produits différents ; la carte SMAP ne donne pas la valeur numérique du point cliqué.</span></div>
      </aside>
    </div>

    <section className="terrain-soil-chart" aria-label="Évolution mensuelle de l’humidité du sol">
      <div className="terrain-chart-heading"><div><span className="terrain-heading-icon soil"><Droplets size={17} /></span><span><strong>Évolution de l’humidité du sol</strong><small>NASA POWER · point suivi · valeurs mensuelles modélisées</small></span></div></div>
      <PowerClimateChart records={series?.records ?? []} source={series?.source.join(' + ') ?? 'en attente'} mode="soil" title="Humidité de surface et zone racinaire · NASA POWER" />
    </section>
  </section>
}

function SoilMetric({ label, parameter, value, color }: { label: string; parameter: string; value?: number; color: 'surface' | 'root' }) {
  const percent = value === undefined ? undefined : Math.max(0, Math.min(100, value * 100))
  return <div className="terrain-moisture-metric"><div className="terrain-moisture-label"><span>{label}</span><strong>{percent === undefined ? '—' : `${percent.toFixed(0)} %`}</strong></div><div className={`terrain-moisture-track ${color}`}><span style={{ width: percent === undefined ? '0%' : `${percent}%` }} /></div><small>NASA POWER · {parameter} · indice modélisé</small></div>
}
