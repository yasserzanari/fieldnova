import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Download, FileSpreadsheet, Layers3, Pencil, Save, Trash2, Upload, X } from 'lucide-react'
import type { GeoPoint } from '../../lib/geo/location'
import { clearSoilProfile, readSoilProfile, resolveSoilHorizonProvenance, soilSourceLabels, validateSoilHorizons, type FarmSoilProfile, type SoilHorizon, writeSoilProfile } from '../../lib/farm/soil-profile'
import { parseSoilAnalysisCsv, soilAnalysisCsvTemplate, type SoilAnalysisCsvImport } from '../../lib/farm/soil-analysis-csv'

const textureLabels = { sandy: 'Sableux', loamy: 'Limoneux', clayey: 'Argileux', unknown: 'Inconnu' } as const
const drainageLabels = { poor: 'Lent', moderate: 'Modéré', good: 'Rapide', unknown: 'Inconnu' } as const
type SoilCsvPreview = SoilAnalysisCsvImport & { fileName: string }

function decimal(value: number) {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}

export function SoilProfileEditor({ point }: { point: GeoPoint }) {
  const [profile, setProfile] = useState<FarmSoilProfile>(() => readSoilProfile(point))
  const [draft, setDraft] = useState<FarmSoilProfile>({})
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [csvError, setCsvError] = useState('')
  const [csvPreview, setCsvPreview] = useState<SoilCsvPreview>()
  const [appliedImportFile, setAppliedImportFile] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
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
    setDraft({ ...profile, horizons: profile.horizons?.map(horizon => ({ ...horizon })) ?? [] })
    setError('')
    setCsvError('')
    setCsvPreview(undefined)
    setAppliedImportFile('')
    setOpen(true)
  }

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const horizonError = validateSoilHorizons(draft.horizons ?? [])
    if (horizonError) {
      setError(horizonError)
      return
    }
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

  const hasGeneralProfile = profile.texture !== undefined || profile.ph !== undefined || profile.organicMatterPercent !== undefined || profile.effectiveDepthCm !== undefined || profile.drainage !== undefined
  const hasSampleMetadata = Boolean(profile.sampleDate || profile.samplingMethod || profile.sourceName)
  const hasProfile = hasGeneralProfile || Boolean(profile.horizons?.length) || hasSampleMetadata
  const fieldSource = `${soilSourceLabels[profile.sourceType ?? 'farmer-reported']}${profile.sourceName ? ` · ${profile.sourceName}` : ''}${profile.sampleDate ? ` · ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${profile.sampleDate}T12:00:00Z`))}` : ''}${profile.samplingMethod ? ` · méthode : ${profile.samplingMethod}` : ''} · non vérifiée`
  const generalFieldRows = [
    { label: 'Texture', value: profile.texture && profile.texture !== 'unknown' ? textureLabels[profile.texture] : undefined },
    { label: 'pH', value: profile.ph === undefined ? undefined : decimal(profile.ph) },
    { label: 'Matière organique', value: profile.organicMatterPercent === undefined ? undefined : `${decimal(profile.organicMatterPercent)} %` },
    { label: 'Profondeur utile', value: profile.effectiveDepthCm === undefined ? undefined : `${decimal(profile.effectiveDepthCm)} cm` },
    { label: 'Drainage', value: profile.drainage && profile.drainage !== 'unknown' ? drainageLabels[profile.drainage] : undefined },
  ]
  const hasDraftValue = draft.texture !== undefined || draft.ph !== undefined || draft.organicMatterPercent !== undefined || draft.effectiveDepthCm !== undefined || draft.drainage !== undefined
    || Boolean(draft.horizons?.length || draft.sampleDate || draft.samplingMethod?.trim() || draft.sourceName?.trim())
  const soilSummary = [
    profile.texture && profile.texture !== 'unknown' ? textureLabels[profile.texture] : undefined,
    profile.ph !== undefined ? `pH ${decimal(profile.ph)}` : undefined,
    profile.organicMatterPercent !== undefined ? `${decimal(profile.organicMatterPercent)} % MO` : undefined,
    profile.effectiveDepthCm !== undefined ? `${decimal(profile.effectiveDepthCm)} cm` : undefined,
    profile.drainage && profile.drainage !== 'unknown' ? `Drainage ${drainageLabels[profile.drainage].toLowerCase()}` : undefined,
    profile.horizons?.length ? `${profile.horizons.length} horizon${profile.horizons.length > 1 ? 's' : ''} · 0–${profile.horizons[profile.horizons.length - 1].bottomCm} cm` : undefined,
    profile.samplingMethod ? `Méthode · ${profile.samplingMethod}` : undefined,
  ].filter(Boolean)

  const addHorizon = () => {
    const horizons = draft.horizons ?? []
    if (horizons.length >= 5) return setError('Un profil peut contenir au maximum cinq horizons.')
    const topCm = horizons[horizons.length - 1]?.bottomCm ?? 0
    const bottomCm = Math.min(topCm + 30, 400)
    if (bottomCm <= topCm) return setError('La profondeur maximale de 400 cm est atteinte.')
    setDraft(value => ({ ...value, horizons: [...(value.horizons ?? []), { topCm, bottomCm }] }))
    setError('')
  }

  const updateHorizon = (index: number, update: Partial<SoilHorizon>) => setDraft(value => ({
    ...value,
    horizons: (value.horizons ?? []).map((horizon, horizonIndex) => horizonIndex === index ? { ...horizon, ...update } : horizon),
  }))

  const removeHorizon = (index: number) => setDraft(value => ({ ...value, horizons: (value.horizons ?? []).filter((_, horizonIndex) => horizonIndex !== index) }))

  const readCsvFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setCsvPreview(undefined)
    setAppliedImportFile('')
    if (!file.name.toLocaleLowerCase('fr').endsWith('.csv')) return setCsvError('Sélectionnez un fichier .csv. Les PDF et photos ne sont pas analysés.')
    if (!file.size || file.size > 1_000_000) return setCsvError('Le fichier doit contenir des données et ne pas dépasser 1 Mo.')
    try {
      const parsed = parseSoilAnalysisCsv(await file.text())
      if (!parsed.valid) return setCsvError(parsed.error)
      setCsvError('')
      setCsvPreview({ ...parsed.value, fileName: file.name })
    } catch {
      setCsvError('Lecture du fichier impossible. Vérifiez qu’il s’agit bien d’un CSV en texte brut.')
    }
  }

  const applyCsvPreview = () => {
    if (!csvPreview) return
    setDraft(value => ({
      ...value,
      horizons: csvPreview.horizons.map(horizon => ({ ...horizon })),
    }))
    setAppliedImportFile(csvPreview.fileName)
    setCsvPreview(undefined)
    setCsvError('')
  }

  const downloadCsvTemplate = () => {
    const url = URL.createObjectURL(new Blob([soilAnalysisCsvTemplate()], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'modele-analyse-de-sol.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return <>
    <div className={`terrain-profile-missing ${hasProfile ? 'has-user-profile' : ''}`}>
      <span className="terrain-profile-icon"><Layers3 size={16} /></span>
      <span className="terrain-profile-copy">
        <strong>{hasProfile ? !hasGeneralProfile && profile.horizons?.length ? 'Profil de sol par horizons' : profile.sourceType === 'lab-analysis' ? 'Analyse de laboratoire déclarée' : 'Profil de sol déclaré par vous' : 'Texture, pH et matière organique'}</strong>
        <small>{hasProfile ? [soilSummary.join(' · '), profile.sourceName, profile.sampleDate ? `Échantillon du ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${profile.sampleDate}T12:00:00Z`))}` : undefined].filter(Boolean).join(' · ') || 'Profil enregistré, champs encore inconnus.' : 'Aucune analyse ou mesure locale enregistrée pour ce point.'}</small>
      </span>
      <button className="terrain-profile-edit" type="button" onClick={edit} aria-label={hasProfile ? 'Modifier le profil de sol local' : 'Renseigner le profil de sol local'}><Pencil size={13} /><span>{hasProfile ? 'Modifier' : 'Renseigner'}</span></button>
    </div>
    {hasProfile && <section className="terrain-field-provenance" aria-label="État et provenance de chaque champ de sol">
      <header><strong>État des champs généraux</strong><small>Origine commune déclarée · non vérifiée</small></header>
      <dl>{generalFieldRows.map(field => <div key={field.label}><dt>{field.label}</dt><dd><strong>{field.value ?? 'Inconnu'}</strong><span className={field.value ? 'is-known' : ''}>{field.value ? 'Renseigné' : 'Non renseigné'}</span></dd></div>)}</dl>
      {hasGeneralProfile && <small className="terrain-field-source">Origine appliquée aux valeurs renseignées : {fieldSource}. Aucun niveau de fiabilité indépendant n’est calculé.</small>}
      {!hasGeneralProfile && <small className="terrain-field-source">Aucun champ général saisi. La provenance des horizons est affichée avec leur composition.</small>}
    </section>}
    {hasSampleMetadata && <p className="terrain-profile-date">Fiche de prélèvement · point suivi {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)} · {profile.sampleDate ? `date ${profile.sampleDate}` : 'date non renseignée'} · {profile.samplingMethod ? `méthode : ${profile.samplingMethod}` : 'méthode non renseignée'}.</p>}
    {profile.horizons?.length ? <SoilHorizonVisual horizons={profile.horizons} defaultSourceType={profile.sourceType} defaultSourceName={profile.sourceName} defaultSampleDate={profile.sampleDate} defaultSamplingMethod={profile.samplingMethod} /> : null}
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
          <section className="terrain-horizon-editor terrain-soil-field-wide" aria-label="Horizons de sol déclarés">
            <header><span><strong>Composition par profondeur</strong><small>Ajoutez uniquement les couches décrites par votre relevé ou analyse.</small></span></header>
            <div className="terrain-horizon-import-actions">
              <button type="button" onClick={() => csvInputRef.current?.click()}><Upload size={12} />Importer CSV</button>
              <button type="button" onClick={downloadCsvTemplate}><Download size={12} />Modèle CSV</button>
              <button type="button" onClick={addHorizon} disabled={(draft.horizons?.length ?? 0) >= 5}>Ajouter un horizon</button>
            </div>
            <input ref={csvInputRef} className="terrain-csv-file-input" type="file" accept=".csv,text/csv" onChange={readCsvFile} aria-label="Importer une analyse de sol au format CSV" />
            {csvError && <p className="terrain-horizon-csv-error" role="alert">{csvError}</p>}
            {csvPreview && <div className="terrain-horizon-csv-preview" aria-label="Aperçu des mesures importées">
              <div className="terrain-horizon-csv-preview-heading"><FileSpreadsheet size={15} /><span><strong>{csvPreview.fileName}</strong><small>{csvPreview.rowCount} intervalle{csvPreview.rowCount > 1 ? 's' : ''} détecté{csvPreview.rowCount > 1 ? 's' : ''} · rien n’est encore enregistré</small></span></div>
              <ul>{csvPreview.horizons.map((horizon, index) => <li key={`${horizon.topCm}-${horizon.bottomCm}-${index}`}><strong>{horizon.topCm}–{horizon.bottomCm} cm</strong><span>{horizon.texture ? textureLabels[horizon.texture].toLocaleLowerCase('fr') : 'texture non renseignée'} · pH {horizon.ph?.toLocaleString('fr-FR') ?? 'inconnu'} · MO {horizon.organicMatterPercent === undefined ? 'inconnue' : `${horizon.organicMatterPercent.toLocaleString('fr-FR')} %`}</span></li>)}</ul>
              <small>Origine déclarée : analyse de laboratoire · {csvPreview.laboratory || 'laboratoire non précisé'} · {csvPreview.sampleDate || 'date non précisée'}{csvPreview.samplingMethod ? ` · méthode : ${csvPreview.samplingMethod}` : ''} (non vérifiée).</small>
              <small>L’application remplacera la liste d’horizons du brouillon. Les autres champs et leur origine resteront inchangés.</small>
              <div className="terrain-horizon-csv-preview-actions"><button type="button" onClick={() => setCsvPreview(undefined)}>Annuler</button><button type="button" onClick={applyCsvPreview}>Utiliser ces valeurs</button></div>
            </div>}
            {appliedImportFile && <p className="terrain-horizon-csv-applied">Valeurs prêtes à enregistrer depuis {appliedImportFile}. Vérifiez-les puis enregistrez le profil.</p>}
            {(draft.horizons ?? []).map((horizon, index) => <fieldset className="terrain-horizon-fields" key={index}>
              <legend>Horizon {index + 1}</legend>
              <button className="terrain-horizon-remove" type="button" aria-label={`Supprimer l’horizon ${index + 1}`} onClick={() => removeHorizon(index)}><Trash2 size={12} /></button>
              <label>Début (cm)<input type="number" min="0" max="399" step="1" value={horizon.topCm} onChange={event => updateHorizon(index, { topCm: event.target.value === '' ? Number.NaN : Number(event.target.value) })} /></label>
              <label>Fin (cm)<input type="number" min="1" max="400" step="1" value={horizon.bottomCm} onChange={event => updateHorizon(index, { bottomCm: event.target.value === '' ? Number.NaN : Number(event.target.value) })} /></label>
              <label>Texture<select value={horizon.texture ?? ''} onChange={event => updateHorizon(index, { texture: (event.target.value || undefined) as SoilHorizon['texture'] })}><option value="">Inconnue</option><option value="sandy">Sableux</option><option value="loamy">Limoneux</option><option value="clayey">Argileux</option><option value="unknown">Non déterminée</option></select></label>
              <label>pH<input type="number" min="0" max="14" step="0.1" value={horizon.ph ?? ''} onChange={event => updateHorizon(index, { ph: event.target.value === '' ? undefined : Number(event.target.value) })} /></label>
              <label>Matière org. (%)<input type="number" min="0" max="100" step="0.1" value={horizon.organicMatterPercent ?? ''} onChange={event => updateHorizon(index, { organicMatterPercent: event.target.value === '' ? undefined : Number(event.target.value) })} /></label>
            </fieldset>)}
            {!(draft.horizons?.length) && <p className="terrain-horizon-empty">Aucun horizon détaillé. Les caractéristiques globales restent enregistrables séparément.</p>}
            <small className="terrain-horizon-disclaimer">Les intervalles peuvent laisser des zones non décrites. Leur saisie ne constitue pas une classification pédologique; rien n’est extrapolé.</small>
          </section>
          <label>Origine des données<select value={draft.sourceType ?? 'farmer-reported'} onChange={event => setDraft(value => ({ ...value, sourceType: event.target.value as FarmSoilProfile['sourceType'] }))}><option value="farmer-reported">Déclarée par l’exploitation</option><option value="lab-analysis">Analyse de laboratoire</option><option value="other-source">Autre source</option></select></label>
          <label>Date de l’échantillon<input type="date" value={draft.sampleDate ?? ''} onChange={event => setDraft(value => ({ ...value, sampleDate: event.target.value || undefined }))} /></label>
          <label className="terrain-soil-field-wide">Laboratoire ou référence de source <span className="terrain-soil-optional">Facultatif</span><input type="text" maxLength={120} placeholder="Ex. laboratoire, numéro d’analyse ou organisme" value={draft.sourceName ?? ''} onChange={event => setDraft(value => ({ ...value, sourceName: event.target.value || undefined }))} /></label>
          <label className="terrain-soil-field-wide">Méthode de prélèvement <span className="terrain-soil-optional">Facultatif</span><input type="text" maxLength={120} placeholder="Ex. tarière · composite 0–20 cm" value={draft.samplingMethod ?? ''} onChange={event => setDraft(value => ({ ...value, samplingMethod: event.target.value || undefined }))} /></label>
        </div>
        {error && <p className="terrain-soil-form-error" role="alert">{error}</p>}
        <footer className="terrain-soil-form-actions">{hasProfile && <button className="terrain-soil-delete" type="button" onClick={remove}><Trash2 size={14} />Effacer ce profil</button>}<button className="terrain-soil-save" type="submit"><Save size={14} />Enregistrer</button></footer>
        <p className="terrain-soil-privacy">Le point, l’origine, la date et la méthode sont déclarés par vous et non vérifiés par FieldNova. Ces informations restent sur cet appareil; elles ne sont envoyées à aucun service.</p>
      </form>
    </dialog>
  </>
}

function SoilHorizonVisual({ horizons, defaultSourceType, defaultSourceName, defaultSampleDate, defaultSamplingMethod }: { horizons: SoilHorizon[]; defaultSourceType?: FarmSoilProfile['sourceType']; defaultSourceName?: string; defaultSampleDate?: string; defaultSamplingMethod?: string }) {
  const layers: Array<SoilHorizon & { gap: boolean }> = horizons.flatMap((horizon, index) => {
    const previousBottom = horizons[index - 1]?.bottomCm ?? 0
    const gap = horizon.topCm > previousBottom ? [{ topCm: previousBottom, bottomCm: horizon.topCm, texture: 'unknown' as const, gap: true }] : []
    return [...gap, { ...horizon, gap: false }]
  })
  const depth = horizons[horizons.length - 1]?.bottomCm ?? 0
  const sources = [...new Set(horizons.map(horizon => horizonSourceSummary(horizon, defaultSourceType, defaultSourceName, defaultSampleDate, defaultSamplingMethod)))]
  return <div className="terrain-horizon-visual" aria-label={`Profil de sol déclaré de 0 à ${depth} centimètres`}>
    <div><strong>Horizons saisis</strong><small>Profondeurs déclarées · intervalles manquants inconnus</small><small className="terrain-horizon-source">Origine déclarée (non vérifiée) : {sources.join(' · ')}</small></div>
    <div className="terrain-horizon-stack" role="list">{layers.map((layer, index) => {
      const texture = layer.texture && layer.texture !== 'unknown' ? textureLabels[layer.texture].toLocaleLowerCase('fr') : 'texture inconnue'
      const values = [layer.ph !== undefined ? `pH ${decimal(layer.ph)}` : '', layer.organicMatterPercent !== undefined ? `${decimal(layer.organicMatterPercent)} % MO` : ''].filter(Boolean).join(' · ')
      const source = layer.gap ? '' : horizonSourceSummary(layer, defaultSourceType, defaultSourceName, defaultSampleDate, defaultSamplingMethod)
      return <div key={`${layer.topCm}-${layer.bottomCm}-${index}`} className={`terrain-horizon-layer ${layer.gap ? 'is-gap' : `texture-${layer.texture ?? 'unknown'}`}`} role="listitem" aria-label={`${layer.topCm} à ${layer.bottomCm} cm · ${texture}${values ? ` · ${values}` : ''}${source ? ` · Origine déclarée : ${source}` : ''}`} title={`${layer.topCm}–${layer.bottomCm} cm · ${texture}${values ? ` · ${values}` : ''}${source ? ` · ${source}` : ''}`}><span>{layer.topCm}–{layer.bottomCm} cm</span><strong>{layer.gap ? 'Non décrit' : texture}</strong>{values && <small>{values}</small>}</div>
    })}</div>
    <small className="terrain-horizon-beyond">Au-delà de {depth} cm : non documenté.</small>
  </div>
}

function horizonSourceSummary(horizon: SoilHorizon, defaultSourceType?: FarmSoilProfile['sourceType'], defaultSourceName?: string, defaultSampleDate?: string, defaultSamplingMethod?: string) {
  const { sourceType, sourceName, sampleDate, samplingMethod } = resolveSoilHorizonProvenance(horizon, { sourceType: defaultSourceType, sourceName: defaultSourceName, sampleDate: defaultSampleDate, samplingMethod: defaultSamplingMethod })
  const date = sampleDate ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${sampleDate}T12:00:00Z`)) : undefined
  return [soilSourceLabels[sourceType], sourceName, date, samplingMethod ? `méthode : ${samplingMethod}` : undefined].filter(Boolean).join(' · ')
}
