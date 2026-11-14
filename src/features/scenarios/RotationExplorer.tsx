import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowUpRight, CloudRain, Droplets, LocateFixed, MapPinned, Minus, Plus, RotateCcw, ShieldCheck, Sprout, ThermometerSun } from 'lucide-react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { Link } from 'react-router-dom'
import { FieldMap, type MapBaseLayer } from '../../components/maps/FieldMap'
import { useSelectedLocation, type GeoPoint } from '../../lib/geo/location'
import { fetchPowerMonthly, formatPowerMonth, latestCompleteRecord, type PowerMonthlySeries } from '../../lib/nasa/power'
import { readSoilProfile, type FarmSoilProfile } from '../../lib/farm/soil-profile'
import { cropCatalog, evaluateRotation, exampleRotationWorkspace, readRotationWorkspace, topRotations, type CropId, type RotationId, type RotationPlan, type RotationPriority, type RotationWorkspace, writeRotationWorkspace } from './rotation-model'
import './rotation-explorer.css'

function dayBefore(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

function coordinate(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(3).replace('.', ',')}° ${value < 0 ? negative : positive}`
}

function soilSummary(profile: FarmSoilProfile) {
  const labels: string[] = []
  const texture = { sandy: 'Sableux', loamy: 'Limoneux', clayey: 'Argileux', unknown: 'Texture inconnue' } as const
  const drainage = { poor: 'Drainage lent', moderate: 'Drainage modéré', good: 'Drainage rapide', unknown: 'Drainage inconnu' } as const
  if (profile.texture) labels.push(texture[profile.texture])
  if (profile.ph !== undefined) labels.push(`pH ${profile.ph.toLocaleString('fr-FR')}`)
  if (profile.organicMatterPercent !== undefined) labels.push(`${profile.organicMatterPercent.toLocaleString('fr-FR')} % MO`)
  if (profile.effectiveDepthCm !== undefined) labels.push(`${profile.effectiveDepthCm} cm`)
  if (profile.drainage) labels.push(drainage[profile.drainage])
  return labels
}

export function RotationExplorer() {
  const { location, selectLocation } = useSelectedLocation()
  const pointKey = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`
  const [baseLayer, setBaseLayer] = useState<MapBaseLayer>('nasa')
  const [showNdvi, setShowNdvi] = useState(true)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const [soilState, setSoilState] = useState(() => ({ pointKey, value: readSoilProfile(location) }))
  const [workspace, setWorkspace] = useState(() => ({ pointKey, value: readRotationWorkspace(location) }))
  const [saveError, setSaveError] = useState('')
  const [series, setSeries] = useState<PowerMonthlySeries | null>(null)
  const [climateLoading, setClimateLoading] = useState(true)
  const [climateError, setClimateError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    setSoilState({ pointKey, value: readSoilProfile(location) })
    setWorkspace({ pointKey, value: readRotationWorkspace(location) })
    setSaveError('')
  }, [pointKey])

  useEffect(() => {
    if (workspace.pointKey !== pointKey || workspace.value.isExample) return
    try {
      writeRotationWorkspace(location, workspace.value)
      setSaveError('')
    } catch {
      setSaveError('Impossible de sauvegarder ce scénario dans le navigateur.')
    }
  }, [location, pointKey, workspace])

  useEffect(() => {
    let current = true
    setClimateLoading(true)
    setClimateError('')
    fetchPowerMonthly(location, 5).then(result => {
      if (current) setSeries(result)
    }).catch(reason => {
      if (current) setClimateError(reason instanceof Error ? reason.message : 'NASA POWER est indisponible.')
    }).finally(() => { if (current) setClimateLoading(false) })
    return () => { current = false }
  }, [location.latitude, location.longitude, refreshKey])

  const currentWorkspace = workspace.pointKey === pointKey ? workspace.value : readRotationWorkspace(location)
  const latest = useMemo(() => series ? latestCompleteRecord(series.records) : undefined, [series])
  const leaders = topRotations(currentWorkspace.plans, currentWorkspace.priority)
  const soil = soilState.pointKey === pointKey ? soilState.value : readSoilProfile(location)
  const soilValues = soilSummary(soil)
  const changeWorkspace = (update: (value: RotationWorkspace) => RotationWorkspace) => {
    setWorkspace(current => ({ pointKey, value: { ...update(current.pointKey === pointKey ? current.value : readRotationWorkspace(location)), isExample: false } }))
  }
  const updateCrop = (planId: RotationId, index: number, value: string) => {
    changeWorkspace(current => ({ ...current, plans: current.plans.map(plan => plan.id === planId ? { ...plan, crops: plan.crops.map((crop, cropIndex) => cropIndex === index ? value as CropId | '' : crop) } : plan) }))
  }
  const updatePriority = (priority: RotationPriority) => changeWorkspace(current => ({ ...current, priority }))
  const resetExample = () => {
    try {
      localStorage.removeItem(`fieldnova:rotation-workspace:v1:${pointKey}`)
      setWorkspace({ pointKey, value: exampleRotationWorkspace() })
      setSaveError('')
    } catch {
      setSaveError('Impossible de réinitialiser le scénario de démonstration.')
    }
  }
  const moveToPoint = (point: GeoPoint) => {
    selectLocation(point)
    map?.flyTo({ center: [point.longitude, point.latitude], zoom: Math.max(7, map.getZoom()), duration: 800 })
  }
  const locateMe = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(position => {
      moveToPoint({ latitude: Number(position.coords.latitude.toFixed(5)), longitude: Number(position.coords.longitude.toFixed(5)) })
      setLocating(false)
    }, () => setLocating(false), { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 })
  }

  return <section className="rotation-explorer" aria-label="Explorateur de rotations culturales">
    <header className="rotation-heading"><div><h1>Explorer les rotations</h1><p>Comparez des successions de cultures selon des critères visibles et modifiables.</p></div><div className="rotation-heading-actions"><span className="rotation-example-badge">{currentWorkspace.isExample ? 'Exemple illustratif' : 'Scénario local'}</span><button type="button" className="rotation-reset" onClick={resetExample}><RotateCcw size={13} />Charger l’exemple</button></div></header>

    <div className="rotation-map-stage">
      <FieldMap center={location} selectedPoint={location} baseLayer={baseLayer} showNdvi={showNdvi} imageryDate={dayBefore(11)} onPointSelect={moveToPoint} onMapReady={setMap} ariaLabel="Carte interactive NASA et position de l’exploitation pour comparer les rotations" />
      <div className="rotation-map-topline"><div className="rotation-location-chip"><MapPinned size={15} /><span>{coordinate(location.latitude, 'N', 'S')} · {coordinate(location.longitude, 'E', 'O')}</span><small>Point suivi</small></div><div className="rotation-map-options"><div className="rotation-base-switch" role="group" aria-label="Fond de carte"><button type="button" className={baseLayer === 'streets' ? 'is-active' : ''} onClick={() => setBaseLayer('streets')}>Plan</button><button type="button" className={baseLayer === 'nasa' ? 'is-active' : ''} onClick={() => setBaseLayer('nasa')}>Satellite</button></div><label><input type="checkbox" checked={showNdvi} onChange={event => setShowNdvi(event.target.checked)} />NDVI</label></div></div>
      <div className="rotation-map-controls" role="group" aria-label="Contrôles de la carte"><button type="button" aria-label="Zoomer" onClick={() => map?.zoomIn({ duration: 220 })}><Plus size={15} /></button><button type="button" aria-label="Dézoomer" onClick={() => map?.zoomOut({ duration: 220 })}><Minus size={15} /></button><button type="button" aria-label="Utiliser ma position" onClick={locateMe} disabled={locating}><LocateFixed size={14} /></button></div>
      <span className="rotation-map-hint">Cliquez pour déplacer le point suivi · les profils et séries suivent la position sélectionnée</span>

      <aside className="rotation-context-panel rotation-context-left" aria-label="Contexte du sol local et du climat NASA">
        <header className="rotation-panel-heading"><span className="rotation-panel-icon soil"><Sprout size={15} /></span><span><strong>Sol local</strong><small>Données saisies par vous</small></span></header>
        {soilValues.length ? <ul className="rotation-soil-list">{soilValues.map(value => <li key={value}>{value}</li>)}</ul> : <p className="rotation-context-empty">Aucune caractéristique de sol n’est renseignée pour ce point.</p>}
        <Link to="/app/terrain" className="rotation-context-link">Renseigner le profil du sol <ArrowUpRight size={12} /></Link>
        <div className="rotation-context-divider" />
        <header className="rotation-panel-heading"><span className="rotation-panel-icon climate"><Activity size={15} /></span><span><strong>Contexte NASA POWER</strong><small>{climateLoading ? 'Chargement des données…' : latest ? `${formatPowerMonth(latest.date)} · valeur mensuelle` : 'Données non disponibles'}</small></span></header>
        {climateLoading ? <div className="rotation-context-empty" role="status">Récupération de la série climatique…</div> : climateError ? <div className="rotation-context-error" role="alert">{climateError}<button type="button" onClick={() => setRefreshKey(value => value + 1)}>Réessayer</button></div> : <div className="rotation-climate-metrics"><span><CloudRain size={13} /><small>Pluie moyenne</small><strong>{latest?.precipitationMmPerDay === undefined ? '—' : `${latest.precipitationMmPerDay.toFixed(1).replace('.', ',')} mm/j`}</strong></span><span><ThermometerSun size={13} /><small>Température</small><strong>{latest?.temperatureC === undefined ? '—' : `${latest.temperatureC.toFixed(1).replace('.', ',')} °C`}</strong></span><span><Droplets size={13} /><small>Humidité racinaire</small><strong>{latest?.rootZoneWetness === undefined ? '—' : `${(latest.rootZoneWetness * 100).toFixed(0)} %`}</strong></span></div>}
        <p className="rotation-context-source">Cellule NASA POWER {series?.gridPoint.latitude.toFixed(3)}, {series?.gridPoint.longitude.toFixed(3)} · {series?.source.join(' + ') ?? 'source en attente'}</p>
      </aside>

      <aside className="rotation-context-panel rotation-context-right" aria-label="Critère de comparaison et explication">
        <header className="rotation-panel-heading"><span className="rotation-panel-icon goal"><ShieldCheck size={15} /></span><span><strong>Votre priorité</strong><small>Modifie les options mises en avant</small></span></header>
        <label className="rotation-priority-label" htmlFor="rotation-priority">Comparer selon</label>
        <select id="rotation-priority" className="rotation-priority-select" value={currentWorkspace.priority} onChange={event => updatePriority(event.target.value as RotationPriority)}><option value="diversity">Diversité des familles</option><option value="alternation">Alternance des familles</option><option value="legume">Présence de légumineuses</option></select>
        <div className="rotation-best-match" aria-live="polite"><small>Options les plus proches de ce critère</small>{leaders.length ? <strong>{leaders.map(id => currentWorkspace.plans.find(plan => plan.id === id)?.title).join(' · ')}</strong> : <strong>Complétez les 3 années d’une rotation</strong>}</div>
        <ul className="rotation-rule-list"><li>Familles botaniques différentes, sans bénéfice de sol présumé.</li><li>La présence de légumineuses est comptée, sans estimer l’azote fixé.</li><li>NASA POWER décrit le climat de la cellule, pas le rendement d’une culture.</li></ul>
        <p className="rotation-catalog-note">Catalogue illustratif France métropolitaine · à adapter et valider localement.</p>
        {saveError && <p className="rotation-save-error" role="alert">{saveError}</p>}
      </aside>
    </div>

    <section className="rotation-plans" aria-label="Rotations de trois saisons à comparer">
      {currentWorkspace.plans.map((plan, planIndex) => <RotationCard key={plan.id} plan={plan} planIndex={planIndex} priority={currentWorkspace.priority} isLeader={leaders.includes(plan.id)} example={currentWorkspace.isExample} onCropChange={updateCrop} />)}
      <p className="rotation-plans-footnote">Indicateurs descriptifs uniquement · aucun rendement, besoin en eau ou effet agronomique n’est prédit.</p>
    </section>
  </section>
}

function RotationCard({ plan, planIndex, priority, isLeader, example, onCropChange }: { plan: RotationPlan; planIndex: number; priority: RotationPriority; isLeader: boolean; example: boolean; onCropChange: (planId: RotationId, index: number, value: string) => void }) {
  const metrics = evaluateRotation(plan)
  const icon = planIndex === 0 ? <Sprout size={15} /> : planIndex === 1 ? <RotateCcw size={15} /> : <Activity size={15} />
  return <article className={`rotation-plan-card ${isLeader ? 'is-leading' : ''}`}>
    <header><span className="rotation-card-icon">{icon}</span><span><strong>{plan.title}</strong><small>{example ? 'Cultures d’exemple' : 'Votre scénario'}</small></span>{isLeader && <span className="rotation-leading-tag">Critère choisi</span>}</header>
    <div className="rotation-season-selects">{plan.crops.map((cropId, index) => <label key={index}><span>Saison {index + 1}</span><select aria-label={`${plan.title}, saison ${index + 1}`} value={cropId} onChange={event => onCropChange(plan.id, index, event.target.value)}><option value="">Choisir une culture</option>{cropCatalog.map(crop => <option key={crop.id} value={crop.id}>{crop.label}</option>)}</select></label>)}</div>
    <div className="rotation-card-metrics" aria-label={`Indicateurs de ${plan.title}`}><span><strong>{metrics.complete ? `${metrics.distinctFamilies}/3` : '—'}</strong><small>familles</small></span><span><strong>{metrics.complete ? metrics.repeatedFamilyTransitions : '—'}</strong><small>répétitions</small></span><span><strong>{metrics.complete ? metrics.legumeSeasons : '—'}</strong><small>légumineuses</small></span></div>
    <p className="rotation-card-detail">{metrics.complete ? rotationDetail(metrics.distinctFamilies, metrics.repeatedFamilyTransitions, metrics.legumeSeasons, priority) : 'Choisissez une culture pour chacune des trois saisons.'}</p>
  </article>
}

function rotationDetail(families: number, repeats: number, legumes: number, priority: RotationPriority) {
  if (priority === 'diversity') return `${families} famille${families > 1 ? 's' : ''} distincte${families > 1 ? 's' : ''} sur 3 saisons.`
  if (priority === 'alternation') return `${repeats} répétition${repeats > 1 ? 's' : ''} de famille entre saisons consécutives.`
  return `${legumes} saison${legumes > 1 ? 's' : ''} avec une légumineuse.`
}
