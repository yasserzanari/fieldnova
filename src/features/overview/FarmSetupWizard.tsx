import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, MapPin, Sprout, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { GeoPoint } from '../../lib/geo/location'
import { farmWaterAccessLabels, farmWaterConstraintLabels, readFarmProfile, writeFarmProfile, type FarmProfile, type FarmWaterAccess, type FarmWaterConstraint } from '../../lib/farm/farm-profile'
import { readSoilProfile, soilSourceLabels } from '../../lib/farm/soil-profile'
import { cropCatalog, exampleRotationWorkspace, priorityLabels, readRotationWorkspace, type CropId, type RotationPriority, writeRotationWorkspace } from '../scenarios/rotation-model'
import { readRotationConstraints, writeRotationConstraints } from '../scenarios/rotation-constraints'
import './farm-setup-wizard.css'

const steps = [
  { title: 'Ferme & point', description: 'Nom et emplacement à associer au profil.' },
  { title: 'Rotation actuelle', description: 'Cultures déjà observées, année par année.' },
  { title: 'Accès à l’eau', description: 'Régime déclaré et restrictions connues.' },
  { title: 'Cultures possibles', description: 'Exclusions à appliquer aux options générées.' },
  { title: 'Priorité', description: 'Critère descriptif utilisé pour classer les rotations.' },
] as const

type Draft = {
  name: string
  locationConfirmed: boolean
  crops: Array<CropId | ''>
  waterAccess: FarmWaterAccess
  waterConstraint: FarmWaterConstraint
  waterNotes: string
  unavailableCropIds: CropId[]
  priority: RotationPriority | ''
}

function initialDraft(point: GeoPoint): Draft {
  const farm = readFarmProfile(point)
  const workspace = readRotationWorkspace(point)
  const reference = workspace.plans.find(plan => plan.id === 'reference')
  const constraints = readRotationConstraints(point)
  const exampleFarm = farm?.isExample === true
  return {
    name: farm?.name ?? '',
    locationConfirmed: Boolean(farm),
    crops: workspace.isExample && !exampleFarm ? ['', '', '', '', ''] : Array.from({ length: 5 }, (_, index) => reference?.crops[index] ?? ''),
    waterAccess: farm?.waterAccess ?? 'unknown',
    waterConstraint: farm?.waterConstraint ?? 'unknown',
    waterNotes: farm?.waterNotes ?? '',
    unavailableCropIds: constraints.unavailableCropIds,
    priority: workspace.isExample && !exampleFarm ? '' : workspace.priority,
  }
}

function formatCoordinate(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(3).replace('.', ',')}° ${value < 0 ? negative : positive}`
}

export function FarmSetupWizard({ open, point, onClose, onSaved }: { open: boolean; point: GeoPoint; onClose: () => void; onSaved: (profile: FarmProfile) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const stepTitleRef = useRef<HTMLHeadingElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState(() => initialDraft(point))
  const [errors, setErrors] = useState<{ name?: string; location?: string; priority?: string; save?: string }>({})
  const pointKey = `${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      setStep(0)
      setDraft(initialDraft(point))
      setErrors({})
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open, pointKey])

  useEffect(() => {
    if (open) stepTitleRef.current?.focus()
  }, [step, open])

  const selectedCrops = useMemo(() => draft.crops.filter(Boolean).length, [draft.crops])
  const soil = readSoilProfile(point)
  const soilHasFieldOrigins = Boolean(Object.keys(soil.fieldProvenance ?? {}).length)
  const hasSoilInformation = Boolean(soil.texture && soil.texture !== 'unknown' || soil.ph !== undefined || soil.organicMatterPercent !== undefined || soil.effectiveDepthCm !== undefined || soil.drainage && soil.drainage !== 'unknown' || soil.horizons?.length || soilHasFieldOrigins)
  const update = <Key extends keyof Draft>(key: Key, value: Draft[Key]) => setDraft(current => ({ ...current, [key]: value }))

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (step < steps.length - 1) {
      setStep(current => Math.min(steps.length - 1, current + 1))
      return
    }
    const nextErrors: typeof errors = {}
    if (!draft.name.trim()) nextErrors.name = 'Donnez un nom à votre exploitation.'
    if (!draft.locationConfirmed) nextErrors.location = 'Confirmez que ce point est représentatif de la ferme.'
    if (!draft.priority) nextErrors.priority = 'Choisissez le critère qui compte le plus pour vous.'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      const invalidStep = nextErrors.name || nextErrors.location ? 0 : 4
      setStep(invalidStep)
      if (nextErrors.name) requestAnimationFrame(() => nameRef.current?.focus())
      return
    }

    try {
      const workspace = readRotationWorkspace(point)
      const example = exampleRotationWorkspace()
      const blankCrops: Array<CropId | ''> = ['', '', '', '', '']
      const plans = workspace.isExample
        ? example.plans.map(plan => ({ ...plan, crops: plan.id === 'reference' ? draft.crops : blankCrops }))
        : workspace.plans.map(plan => plan.id === 'reference' ? { ...plan, crops: draft.crops } : plan)
      const savedProfile = writeFarmProfile(point, {
        name: draft.name,
        waterAccess: draft.waterAccess,
        waterConstraint: draft.waterConstraint,
        waterNotes: draft.waterNotes,
        isExample: readFarmProfile(point)?.isExample === true,
      })
      writeRotationWorkspace(point, { plans, priority: draft.priority as RotationPriority, isExample: false })
      writeRotationConstraints(point, { unavailableCropIds: draft.unavailableCropIds })
      onSaved(savedProfile)
      onClose()
    } catch (reason) {
      setErrors(current => ({ ...current, save: reason instanceof Error ? reason.message : 'Impossible d’enregistrer ce profil dans le navigateur.' }))
    }
  }

  const toggleCropExclusion = (cropId: CropId) => {
    const selected = draft.unavailableCropIds.includes(cropId)
    update('unavailableCropIds', selected ? draft.unavailableCropIds.filter(id => id !== cropId) : [...draft.unavailableCropIds, cropId])
  }

  return <dialog ref={dialogRef} className="farm-setup-dialog" aria-labelledby="farm-setup-title" onClose={onClose} onClick={event => { if (event.target === dialogRef.current) onClose() }}>
    <form className="farm-setup-form" onSubmit={save}>
      <header className="farm-setup-heading">
        <span className="farm-setup-icon"><Sprout size={18} /></span>
        <div><h2 id="farm-setup-title">Configurer ma ferme</h2><p>Ces informations guident les comparaisons; elles ne constituent pas un diagnostic agronomique.</p></div>
        <button className="farm-setup-close" type="button" onClick={onClose} aria-label="Fermer le formulaire"><X size={18} /></button>
      </header>

      <nav className="farm-setup-steps" aria-label="Étapes du profil ferme">
        {steps.map((item, index) => <button className={`farm-setup-step ${step === index ? 'is-active' : ''} ${step > index ? 'is-complete' : ''}`} key={item.title} type="button" aria-current={step === index ? 'step' : undefined} onClick={() => setStep(index)}>
          <span className="farm-setup-step-number">{step > index ? <Check size={13} /> : `0${index + 1}`}</span><span>{item.title}</span>
        </button>)}
      </nav>

      <section className="farm-setup-step-content" aria-labelledby="farm-setup-step-title">
        <div className="farm-setup-step-title"><div><h3 id="farm-setup-step-title" ref={stepTitleRef} tabIndex={-1}>{steps[step].title}</h3><p>{steps[step].description}</p></div><span>{String(step + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}</span></div>

        {step === 0 && <div className="farm-setup-fields">
          <label>Nom de l’exploitation<input ref={nameRef} type="text" maxLength={80} autoComplete="organization" placeholder="Ex. Ferme des Chênes" value={draft.name} onChange={event => { update('name', event.target.value); setErrors(current => ({ ...current, name: undefined })) }} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'farm-name-error' : undefined} />{errors.name && <small id="farm-name-error" className="farm-setup-error">{errors.name}</small>}</label>
          <div className="farm-setup-location-card"><MapPin size={17} /><div><strong>Point associé au profil</strong><span>{formatCoordinate(point.latitude, 'N', 'S')} · {formatCoordinate(point.longitude, 'E', 'O')}</span><small>Les séries NASA utilisent une maille régionale; ce point ne dessine pas la parcelle.</small></div></div>
          <label className="farm-setup-confirm"><input type="checkbox" checked={draft.locationConfirmed} onChange={event => { update('locationConfirmed', event.target.checked); setErrors(current => ({ ...current, location: undefined })) }} aria-invalid={Boolean(errors.location)} /><span>Ce point suivi représente l’emplacement de ma ferme.</span></label>
          {errors.location && <small className="farm-setup-error">{errors.location}</small>}
          <div className="farm-setup-soil-card"><span><strong>État du profil de sol</strong><small>{hasSoilInformation ? soilHasFieldOrigins ? 'Données locales présentes · origines déclarées par caractéristique' : `Données locales présentes · ${soilSourceLabels[soil.sourceType ?? 'farmer-reported']}` : 'Aucune analyse ou caractéristique locale saisie'}</small></span><Link to="/app/terrain" target="_blank" rel="noreferrer">{hasSoilInformation ? 'Consulter Mon terrain' : 'Renseigner le sol'}</Link></div>
          <p className="farm-setup-help">Si ce n’est pas le bon endroit, fermez cette fenêtre, choisissez le point sur la carte, puis rouvrez le profil.</p>
        </div>}

        {step === 1 && <div className="farm-setup-fields">
          <p className="farm-setup-help">{readFarmProfile(point)?.isExample ? 'Ces valeurs appartiennent au cas fictif de démonstration. Modifiez-les pour explorer le parcours; elles ne décrivent pas une ferme réelle.' : 'Saisissez uniquement les cultures que vous avez réellement observées. Les cinq années sont facultatives; les champs vides resteront inconnus.'}</p>
          <div className="farm-setup-crop-grid">{draft.crops.map((crop, index) => <label key={index}>Année {index + 1}<select value={crop} onChange={event => update('crops', draft.crops.map((value, cropIndex) => cropIndex === index ? event.target.value as CropId | '' : value))}><option value="">Non renseignée</option>{cropCatalog.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>)}</div>
          <p className="farm-setup-data-note">{selectedCrops}/5 années renseignées. Les rotations d’exemple ne sont jamais reprises comme votre historique.</p>
        </div>}

        {step === 2 && <div className="farm-setup-fields">
          <div className="farm-setup-choice-list" role="radiogroup" aria-label="Accès à l’eau pour l’exploitation">{(Object.entries(farmWaterAccessLabels) as Array<[FarmWaterAccess, string]>).map(([value, label]) => <label className={draft.waterAccess === value ? 'is-selected' : ''} key={value}><input type="radio" name="farm-water-access" value={value} checked={draft.waterAccess === value} onChange={() => update('waterAccess', value)} /><span><strong>{label}</strong><small>{value === 'rainfed' ? 'Pas de ressource d’irrigation déclarée.' : value === 'irrigated' ? 'L’eau peut être disponible pour cette ferme.' : value === 'mixed' ? 'L’accès varie selon les champs ou les saisons.' : 'FieldNova ne déduit pas l’accès à l’eau depuis les satellites.'}</small></span></label>)}</div>
          <label>Restrictions connues<select value={draft.waterConstraint} onChange={event => update('waterConstraint', event.target.value as FarmWaterConstraint)}>{(Object.entries(farmWaterConstraintLabels) as Array<[FarmWaterConstraint, string]>).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Précision facultative<textarea rows={2} maxLength={240} value={draft.waterNotes} onChange={event => update('waterNotes', event.target.value)} placeholder="Ex. restriction locale connue, période ou source de l’information" /><small>{draft.waterNotes.length}/240 caractères · déclaration de l’exploitation</small></label>
        </div>}

        {step === 3 && <div className="farm-setup-fields">
          <p className="farm-setup-help">Les cultures cochées seront exclues des options générées pour ce point. La rotation actuelle reste visible pour comparaison.</p>
          <div className="farm-setup-exclusion-grid">{cropCatalog.map(crop => <label key={crop.id}><input type="checkbox" checked={draft.unavailableCropIds.includes(crop.id)} onChange={() => toggleCropExclusion(crop.id)} /><span>{crop.label}</span></label>)}</div>
          <p className="farm-setup-data-note">{draft.unavailableCropIds.length} culture{draft.unavailableCropIds.length === 1 ? '' : 's'} exclue{draft.unavailableCropIds.length === 1 ? '' : 's'} des options.</p>
        </div>}

        {step === 4 && <div className="farm-setup-fields">
          <p className="farm-setup-help">Cette priorité ne prédit ni rendement ni bénéfice pour le sol; elle choisit seulement quel indicateur descriptif est mis en avant.</p>
          <label>Ce qui compte le plus pour vous<select value={draft.priority} onChange={event => { update('priority', event.target.value as RotationPriority | ''); setErrors(current => ({ ...current, priority: undefined })) }} aria-invalid={Boolean(errors.priority)} aria-describedby={errors.priority ? 'farm-priority-error' : undefined}><option value="">Choisir une priorité</option>{(Object.entries(priorityLabels) as Array<[RotationPriority, string]>).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{errors.priority && <small id="farm-priority-error" className="farm-setup-error">{errors.priority}</small>}</label>
          <div className="farm-setup-review"><h4>Récapitulatif</h4><dl><div><dt>Ferme</dt><dd>{draft.name.trim() || 'À renseigner'}</dd></div><div><dt>Point suivi</dt><dd>{formatCoordinate(point.latitude, 'N', 'S')} · {formatCoordinate(point.longitude, 'E', 'O')}</dd></div><div><dt>Rotation actuelle</dt><dd>{selectedCrops}/5 années connues</dd></div><div><dt>Accès à l’eau</dt><dd>{farmWaterAccessLabels[draft.waterAccess]} · {farmWaterConstraintLabels[draft.waterConstraint]}</dd></div><div><dt>Cultures exclues</dt><dd>{draft.unavailableCropIds.length || 'Aucune'}</dd></div><div><dt>Priorité</dt><dd>{draft.priority ? priorityLabels[draft.priority] : 'À choisir'}</dd></div></dl></div>
          {errors.save && <p className="farm-setup-error" role="alert">{errors.save}</p>}
          <p className="farm-setup-privacy">Le profil et les réglages sont enregistrés dans ce navigateur; FieldNova ne les envoie pas à un serveur.</p>
        </div>}
      </section>

      <footer className="farm-setup-footer">
        <button className="farm-setup-back" type="button" disabled={step === 0} onClick={() => setStep(current => Math.max(0, current - 1))}><ArrowLeft size={15} />Précédent</button>
        <div className="farm-setup-pagination" aria-label={`Étape ${step + 1} sur ${steps.length}`}><span>{String(step + 1).padStart(2, '0')}</span><i />{String(steps.length).padStart(2, '0')}</div>
        {step < steps.length - 1 ? <button className="farm-setup-next" type="button" onClick={() => setStep(current => Math.min(steps.length - 1, current + 1))}>Continuer<ArrowRight size={15} /></button> : <button className="farm-setup-save" type="submit"><Check size={15} />Enregistrer le profil</button>}
      </footer>
    </form>
  </dialog>
}
