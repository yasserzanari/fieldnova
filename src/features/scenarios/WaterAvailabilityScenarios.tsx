import { useEffect, useMemo, useState } from 'react'
import { Droplets, MapPinned, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FieldMap } from '../../components/maps/FieldMap'
import { useSelectedLocation } from '../../lib/geo/location'
import { useParcelBoundary } from '../../lib/geo/parcel-boundary'
import { formatArea, useMeasurementSystem } from '../../lib/units/measurement-units'
import { farmWaterAccessLabels, farmWaterConstraintLabels, readFarmProfile } from '../../lib/farm/farm-profile'
import './water-scenarios.css'

type WaterAssumption = { id: string; name: string; volumeM3: number | null; input: string; inputSystem: 'metric' | 'us-customary' }
type SavedWaterAssumption = { id: string; name: string; volumeM3: number | null }

const maximumAssumptions = 4
const defaultAssumptions = (): SavedWaterAssumption[] => [
  { id: 'reference', name: 'Référence', volumeM3: null },
  { id: 'restriction', name: 'Restriction', volumeM3: null },
]

function storageKey(point: { latitude: number; longitude: number }) {
  return `fieldnova:water-assumptions:v1:${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`
}

function readAssumptions(key: string, system: 'metric' | 'us-customary'): WaterAssumption[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return defaultAssumptions().map(item => ({ ...item, input: '', inputSystem: system }))
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('invalid assumptions')
    const valid = parsed.filter((item): item is SavedWaterAssumption => item && typeof item.id === 'string' && typeof item.name === 'string' && (item.volumeM3 === null || typeof item.volumeM3 === 'number' && Number.isFinite(item.volumeM3) && item.volumeM3 >= 0)).slice(0, maximumAssumptions)
    if (valid.length < 2) return defaultAssumptions().map(item => ({ ...item, input: '', inputSystem: system }))
    return valid.map(item => ({ ...item, name: item.name.slice(0, 32), input: item.volumeM3 === null ? '' : displayVolume(item.volumeM3, system), inputSystem: system }))
  } catch {
    return defaultAssumptions().map(item => ({ ...item, input: '', inputSystem: system }))
  }
}

function displayVolume(volumeM3: number, system: 'metric' | 'us-customary') {
  const displayValue = system === 'us-customary' ? volumeM3 * 264.172 : volumeM3
  return String(Number(displayValue.toFixed(2)))
}

function formatVolume(volumeM3: number, system: 'metric' | 'us-customary') {
  const value = system === 'us-customary' ? volumeM3 * 264.172 : volumeM3
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ${system === 'us-customary' ? 'US gal' : 'm³'}`
}

function formatDepth(volumeM3: number, areaHectares: number, system: 'metric' | 'us-customary') {
  if (!Number.isFinite(areaHectares) || areaHectares <= 0) return null
  const depthMm = volumeM3 / (areaHectares * 10)
  const value = system === 'us-customary' ? depthMm / 25.4 : depthMm
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ${system === 'us-customary' ? 'in' : 'mm'} sur la parcelle`
}

export function WaterAvailabilityScenarios() {
  const { location, selectLocation } = useSelectedLocation()
  const measurementSystem = useMeasurementSystem()
  const parcel = useParcelBoundary()
  const pointKey = storageKey(location)
  const [stored, setStored] = useState(() => ({ key: pointKey, items: readAssumptions(pointKey, measurementSystem) }))
  const [saveError, setSaveError] = useState(false)
  const [baseLayer, setBaseLayer] = useState<'streets' | 'nasa'>('streets')
  const assumptions = stored.key === pointKey ? stored.items : readAssumptions(pointKey, measurementSystem)
  const profile = readFarmProfile(location)
  const filled = useMemo(() => assumptions.filter(item => item.volumeM3 !== null), [assumptions])
  const spread = filled.length > 1 ? Math.max(...filled.map(item => item.volumeM3!)) - Math.min(...filled.map(item => item.volumeM3!)) : null
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - 11)
  const imageryDate = date.toISOString().slice(0, 10)

  useEffect(() => {
    if (stored.key !== pointKey) setStored({ key: pointKey, items: readAssumptions(pointKey, measurementSystem) })
  }, [measurementSystem, pointKey, stored.key])

  const updateAssumptions = (update: (items: WaterAssumption[]) => WaterAssumption[]) => {
    const current = stored.key === pointKey ? stored.items : readAssumptions(pointKey, measurementSystem)
    const next = update(current)
    setStored({ key: pointKey, items: next })
    try {
      const saved: SavedWaterAssumption[] = next.map(({ id, name, volumeM3 }) => ({ id, name, volumeM3 }))
      localStorage.setItem(pointKey, JSON.stringify(saved))
      setSaveError(false)
    } catch {
      setSaveError(true)
    }
  }

  const addAssumption = () => updateAssumptions(items => items.length >= maximumAssumptions ? items : [...items, { id: crypto.randomUUID(), name: `Hypothèse ${items.length + 1}`, volumeM3: null, input: '', inputSystem: measurementSystem }])

  const changeVolume = (id: string, input: string) => {
    const parsed = input.trim() === '' ? null : Number(input.replace(',', '.'))
    const volumeM3 = parsed === null || !Number.isFinite(parsed) || parsed < 0 ? null : measurementSystem === 'us-customary' ? parsed / 264.172 : parsed
    updateAssumptions(items => items.map(item => item.id === id ? { ...item, input, inputSystem: measurementSystem, volumeM3 } : item))
  }

  const changeName = (id: string, name: string) => updateAssumptions(items => items.map(item => item.id === id ? { ...item, name: name.slice(0, 32) } : item))

  return <section className="water-scenarios-page" aria-label="Hypothèses de disponibilité en eau">
    <header className="water-scenarios-heading">
      <div><h1>Hypothèses d’apport d’irrigation</h1><p>Comparez des volumes déclarés ou hypothétiques pour le point suivi.</p></div>
      <span className="water-scenarios-badge"><Droplets size={13} />Aucun besoin de culture estimé</span>
    </header>

    <div className="water-scenarios-map-stage">
      <FieldMap center={location} selectedPoint={location} baseLayer={baseLayer} showNdvi={false} imageryDate={imageryDate} onPointSelect={selectLocation} ariaLabel="Carte de localisation du point pour les hypothèses d’irrigation" />
      <div className="water-map-topline">
        <div className="water-point-chip"><MapPinned size={15} /><span>{location.latitude.toFixed(3)}° · {location.longitude.toFixed(3)}°</span><small>Point suivi</small></div>
        <div className="water-map-switch" role="group" aria-label="Fond de carte">
          <button type="button" aria-pressed={baseLayer === 'streets'} onClick={() => setBaseLayer('streets')}>Plan</button>
          <button type="button" aria-pressed={baseLayer === 'nasa'} onClick={() => setBaseLayer('nasa')}>Satellite NASA</button>
        </div>
      </div>

      <aside className="water-overlay-panel water-input-panel" aria-label="Saisie des hypothèses d’eau">
        <header className="water-panel-heading"><div><span><Droplets size={15} /></span><div><h2>Apport par saison</h2><small>Maximum {maximumAssumptions} hypothèses · enregistrées sur cet appareil</small></div></div></header>
        <div className="water-assumption-list">
          {assumptions.map((item, index) => {
            const unitValue = item.inputSystem === measurementSystem || item.volumeM3 === null ? item.input : displayVolume(item.volumeM3, measurementSystem)
            return <section className="water-assumption-card" key={item.id}>
              <div className="water-assumption-title"><span>{index + 1}</span><input aria-label={`Nom de l’hypothèse ${index + 1}`} maxLength={32} value={item.name} onChange={event => changeName(item.id, event.target.value)} />{assumptions.length > 2 && <button type="button" className="water-remove-button" aria-label={`Supprimer ${item.name || `l’hypothèse ${index + 1}`}`} onClick={() => updateAssumptions(items => items.length <= 2 ? items : items.filter(candidate => candidate.id !== item.id))}><Trash2 size={13} /></button>}</div>
              <label className="water-volume-input"><span>Volume disponible</span><span><input aria-label={`Volume disponible pour ${item.name || `l’hypothèse ${index + 1}`}`} type="number" min="0" step="any" inputMode="decimal" placeholder="À saisir" value={unitValue} onChange={event => changeVolume(item.id, event.target.value)} /><em>{measurementSystem === 'us-customary' ? 'US gal' : 'm³'}</em></span></label>
            </section>
          })}
        </div>
        <button type="button" className="water-add-button" disabled={assumptions.length >= maximumAssumptions} onClick={addAssumption}><Plus size={14} />Ajouter une hypothèse</button>
        <p className={`water-save-state ${saveError ? 'has-error' : ''}`} role="status">{saveError ? 'Enregistrement local impossible dans ce navigateur.' : 'Enregistré localement pour le point suivi.'}</p>
      </aside>

      <aside className="water-overlay-panel water-comparison-panel" aria-label="Comparaison des hypothèses">
        <header className="water-panel-heading"><div><span><ShieldCheck size={15} /></span><div><h2>Comparaison déclarative</h2><small>Écart entre les volumes que vous avez saisis</small></div></div></header>
        <div className="water-farm-context"><span>Accès déclaré</span><strong>{profile ? `${farmWaterAccessLabels[profile.waterAccess]} · ${farmWaterConstraintLabels[profile.waterConstraint]}` : 'Inconnu · profil de ferme non renseigné'}</strong>{profile?.isExample && <small>Profil fictif de démonstration</small>}<Link to="/app/overview" className="water-context-link">{profile ? 'Modifier le profil de ferme' : 'Renseigner l’accès à l’eau'}</Link></div>
        {parcel ? <div className="water-area-context"><span>Surface du contour local</span><strong>{formatArea(parcel.areaHectares, measurementSystem)}</strong><small>Géométrie dessinée ou importée · non vérifiée.</small></div> : <div className="water-area-context is-unknown"><span>Surface du champ</span><strong>Inconnue</strong><small>Ajoutez un contour dans Mon terrain pour convertir les volumes en lame d’eau.</small><Link to="/app/terrain" className="water-context-link">Dessiner ou importer un contour</Link></div>}
        {filled.length > 0 && <div className="water-values-list" aria-label="Volumes d’eau saisis">{filled.map(item => <div key={item.id}><span>{item.name || 'Hypothèse sans nom'}</span><strong>{formatVolume(item.volumeM3!, measurementSystem)}</strong>{parcel && <small>{formatDepth(item.volumeM3!, parcel.areaHectares, measurementSystem)}</small>}</div>)}</div>}
        {filled.length >= 2 ? <div className="water-spread-card"><span>Écart entre vos hypothèses</span><strong>{formatVolume(spread!, measurementSystem)}</strong>{parcel && <small>{formatDepth(spread!, parcel.areaHectares, measurementSystem)}</small>}<small>Cette différence ne représente pas un besoin, une économie ni un effet sur les cultures.</small></div> : <div className="water-empty-state"><strong>Ajoutez au moins deux volumes</strong><span>Le comparateur calcule leur écart brut après saisie.</span></div>}
        <div className="water-missing-data"><strong>Pour estimer un stress hydrique, il manque :</strong><ul><li>le besoin en eau par culture et stade;</li><li>l’efficacité et le calendrier d’irrigation;</li><li>la réserve utile du sol et les apports réellement disponibles.</li></ul></div>
        <p className="water-boundary-note"><ShieldCheck size={13} />Les volumes sont des déclarations de l’exploitation. Ils ne modifient pas le classement des rotations et ne prédisent aucun rendement.</p>
      </aside>
    </div>
  </section>
}
