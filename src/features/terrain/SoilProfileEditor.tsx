import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Layers3, Pencil, Save, Trash2, X } from 'lucide-react'
import type { GeoPoint } from '../../lib/geo/location'
import { clearSoilProfile, readSoilProfile, soilSourceLabels, type FarmSoilProfile, writeSoilProfile } from '../../lib/farm/soil-profile'

const textureLabels = { sandy: 'Sableux', loamy: 'Limoneux', clayey: 'Argileux', unknown: 'Inconnu' } as const
const drainageLabels = { poor: 'Lent', moderate: 'Modéré', good: 'Rapide', unknown: 'Inconnu' } as const

function decimal(value: number) {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}

export function SoilProfileEditor({ point }: { point: GeoPoint }) {
  const [profile, setProfile] = useState<FarmSoilProfile>(() => readSoilProfile(point))
  const [draft, setDraft] = useState<FarmSoilProfile>({})
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const locationKey = `${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`

  useEffect(() => {
    setProfile(readSoilProfile(point))
    setOpen(false)
  }, [locationKey])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const edit = () => {
    setDraft({ ...profile })
    setError('')
    setOpen(true)
  }

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!hasDraftValue) {
      setError('Renseignez au moins une caractéristique connue, ou fermez sans enregistrer.')
      return
    }
    try {
      const saved = writeSoilProfile(point, draft)
      setProfile(saved)
      setError('')
      setOpen(false)
    } catch {
      setError('Enregistrement local impossible. Vérifiez l’espace de stockage du navigateur.')
    }
  }

  const remove = () => {
    try {
      clearSoilProfile(point)
      setProfile({})
      setOpen(false)
      setError('')
    } catch {
      setError('Suppression impossible dans le stockage local du navigateur.')
    }
  }

  const hasProfile = profile.texture !== undefined || profile.ph !== undefined || profile.organicMatterPercent !== undefined || profile.effectiveDepthCm !== undefined || profile.drainage !== undefined
  const hasDraftValue = draft.texture !== undefined || draft.ph !== undefined || draft.organicMatterPercent !== undefined || draft.effectiveDepthCm !== undefined || draft.drainage !== undefined
  const soilSummary = [
    profile.texture && profile.texture !== 'unknown' ? textureLabels[profile.texture] : undefined,
    profile.ph !== undefined ? `pH ${decimal(profile.ph)}` : undefined,
    profile.organicMatterPercent !== undefined ? `${decimal(profile.organicMatterPercent)} % MO` : undefined,
    profile.effectiveDepthCm !== undefined ? `${decimal(profile.effectiveDepthCm)} cm` : undefined,
    profile.drainage && profile.drainage !== 'unknown' ? `Drainage ${drainageLabels[profile.drainage].toLowerCase()}` : undefined,
  ].filter(Boolean)

  return <>
    <div className={`terrain-profile-missing ${hasProfile ? 'has-user-profile' : ''}`}>
      <span className="terrain-profile-icon"><Layers3 size={16} /></span>
      <span className="terrain-profile-copy">
        <strong>{hasProfile ? profile.sourceType === 'lab-analysis' ? 'Analyse de laboratoire déclarée' : 'Profil de sol déclaré par vous' : 'Texture, pH et matière organique'}</strong>
        <small>{hasProfile ? [soilSummary.join(' · '), profile.sourceName, profile.sampleDate ? `Échantillon du ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${profile.sampleDate}T12:00:00Z`))}` : undefined].filter(Boolean).join(' · ') || 'Profil enregistré, champs encore inconnus.' : 'Aucune analyse ou mesure locale enregistrée pour ce point.'}</small>
      </span>
      <button className="terrain-profile-edit" type="button" onClick={edit} aria-label={hasProfile ? 'Modifier le profil de sol local' : 'Renseigner le profil de sol local'}><Pencil size={13} /><span>{hasProfile ? 'Modifier' : 'Renseigner'}</span></button>
    </div>
    {profile.updatedAt && <p className="terrain-profile-date">Enregistré localement · {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(profile.updatedAt))} · Origine déclarée : {soilSourceLabels[profile.sourceType ?? 'farmer-reported']} (non vérifiée)</p>}

    <dialog ref={dialogRef} className="terrain-soil-dialog" aria-labelledby="soil-profile-title" onClose={() => setOpen(false)} onClick={event => { if (event.target === dialogRef.current) setOpen(false) }}>
      <form className="terrain-soil-form" onSubmit={save}>
        <header className="terrain-soil-form-heading"><span className="terrain-heading-icon soil"><Layers3 size={17} /></span><span><h2 id="soil-profile-title">Profil de sol local</h2><small>Point suivi · {point.latitude.toFixed(3)}, {point.longitude.toFixed(3)}</small></span><button type="button" className="terrain-soil-close" onClick={() => setOpen(false)} aria-label="Fermer"><X size={17} /></button></header>
        <p className="terrain-soil-form-note">Saisissez uniquement des valeurs connues. Elles sont enregistrées dans ce navigateur et restent distinctes des données NASA.</p>
        <div className="terrain-soil-fields">
          <label>Texture du sol<select value={draft.texture ?? ''} onChange={event => setDraft(value => ({ ...value, texture: (event.target.value || undefined) as FarmSoilProfile['texture'] }))}><option value="">Non renseignée</option><option value="sandy">Sableux</option><option value="loamy">Limoneux</option><option value="clayey">Argileux</option><option value="unknown">Inconnue</option></select></label>
          <label>pH<input type="number" min="0" max="14" step="0.1" inputMode="decimal" placeholder="Ex. 6,5" value={draft.ph ?? ''} onChange={event => setDraft(value => ({ ...value, ph: event.target.value === '' ? undefined : Number(event.target.value) }))} /></label>
          <label>Matière organique (%)<input type="number" min="0" max="100" step="0.1" inputMode="decimal" placeholder="Ex. 2,4" value={draft.organicMatterPercent ?? ''} onChange={event => setDraft(value => ({ ...value, organicMatterPercent: event.target.value === '' ? undefined : Number(event.target.value) }))} /></label>
          <label>Profondeur utile (cm)<input type="number" min="0" max="400" step="1" inputMode="numeric" placeholder="Ex. 90" value={draft.effectiveDepthCm ?? ''} onChange={event => setDraft(value => ({ ...value, effectiveDepthCm: event.target.value === '' ? undefined : Number(event.target.value) }))} /></label>
          <label className="terrain-soil-field-wide">Drainage<select value={draft.drainage ?? ''} onChange={event => setDraft(value => ({ ...value, drainage: (event.target.value || undefined) as FarmSoilProfile['drainage'] }))}><option value="">Non renseigné</option><option value="poor">Lent</option><option value="moderate">Modéré</option><option value="good">Rapide</option><option value="unknown">Inconnu</option></select></label>
          <label>Origine des données<select value={draft.sourceType ?? 'farmer-reported'} onChange={event => setDraft(value => ({ ...value, sourceType: event.target.value as FarmSoilProfile['sourceType'] }))}><option value="farmer-reported">Déclarée par l’exploitation</option><option value="lab-analysis">Analyse de laboratoire</option><option value="other-source">Autre source</option></select></label>
          <label>Date de l’échantillon<input type="date" value={draft.sampleDate ?? ''} onChange={event => setDraft(value => ({ ...value, sampleDate: event.target.value || undefined }))} /></label>
          <label className="terrain-soil-field-wide">Laboratoire ou référence de source <span className="terrain-soil-optional">Facultatif</span><input type="text" maxLength={120} placeholder="Ex. laboratoire, numéro d’analyse ou organisme" value={draft.sourceName ?? ''} onChange={event => setDraft(value => ({ ...value, sourceName: event.target.value || undefined }))} /></label>
        </div>
        {error && <p className="terrain-soil-form-error" role="alert">{error}</p>}
        <footer className="terrain-soil-form-actions">{hasProfile && <button className="terrain-soil-delete" type="button" onClick={remove}><Trash2 size={14} />Effacer ce profil</button>}<button className="terrain-soil-save" type="submit"><Save size={14} />Enregistrer</button></footer>
        <p className="terrain-soil-privacy">L’origine et la date sont déclarées par vous et non vérifiées par FieldNova. Ces informations restent sur cet appareil; elles ne sont envoyées à aucun service.</p>
      </form>
    </dialog>
  </>
}
