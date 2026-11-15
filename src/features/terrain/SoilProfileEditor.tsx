import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Download, FileSpreadsheet, Layers3, Pencil, Save, Trash2, Upload, X } from 'lucide-react'
import type { GeoPoint } from '../../lib/geo/location'
import { archiveSoilAnalysis, clearSoilProfile, readSoilProfile, resolveSoilFieldProvenance, resolveSoilHorizonProvenance, soilFieldLabels, soilSourceLabels, validateSoilHorizons, type FarmSoilProfile, type SoilAnalysisSnapshot, type SoilFieldKey, type SoilFieldProvenance, type SoilHorizon, writeSoilProfile } from '../../lib/farm/soil-profile'
import { parseSoilAnalysisCsv, soilAnalysisCsvTemplate, type SoilAnalysisCsvImport } from '../../lib/farm/soil-analysis-csv'
import { formatLength, useMeasurementSystem } from '../../lib/units/measurement-units'

const textureLabels = { sandy: 'Sableux', loamy: 'Limoneux', clayey: 'Argileux', unknown: 'Inconnu' } as const
const drainageLabels = { poor: 'Lent', moderate: 'Modéré', good: 'Rapide', unknown: 'Inconnu' } as const
type SoilCsvPreview = SoilAnalysisCsvImport & { fileName: string }

function decimal(value: number) {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}

export function SoilProfileEditor({ point }: { point: GeoPoint }) {
  const measurementSystem = useMeasurementSystem()
  const [profile, setProfile] = useState<FarmSoilProfile>(() => readSoilProfile(point))
  const [draft, setDraft] = useState<FarmSoilProfile>({})
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [csvError, setCsvError] = useState('')
  const [csvPreview, setCsvPreview] = useState<SoilCsvPreview>()
  const [appliedImportFile, setAppliedImportFile] = useState('')
  const [comparisonNewerId, setComparisonNewerId] = useState('')
  const [comparisonOlderId, setComparisonOlderId] = useState('')
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

  const archiveDraft = () => {
    const horizonError = validateSoilHorizons(draft.horizons ?? [])
    if (horizonError) return setError(horizonError)
    try {
      const saved = archiveSoilAnalysis(point, draft)
      setProfile(saved)
      setError('')
      setOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Archivage local impossible. Vérifiez l’espace de stockage du navigateur.')
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
  const hasFieldMetadata = Boolean(Object.keys(profile.fieldProvenance ?? {}).length)
  const hasProfile = hasGeneralProfile || Boolean(profile.horizons?.length) || hasSampleMetadata || hasFieldMetadata
  const fieldSource = `${soilSourceLabels[profile.sourceType ?? 'farmer-reported']}${profile.sourceName ? ` · ${profile.sourceName}` : ''}${profile.sampleDate ? ` · ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${profile.sampleDate}T12:00:00Z`))}` : ''}${profile.samplingMethod ? ` · méthode : ${profile.samplingMethod}` : ''} · non vérifiée`
  const generalFieldRows = [
    { key: 'texture' as const, label: soilFieldLabels.texture, value: profile.texture && profile.texture !== 'unknown' ? textureLabels[profile.texture] : undefined },
    { key: 'ph' as const, label: soilFieldLabels.ph, value: profile.ph === undefined ? undefined : decimal(profile.ph) },
    { key: 'organicMatterPercent' as const, label: soilFieldLabels.organicMatterPercent, value: profile.organicMatterPercent === undefined ? undefined : `${decimal(profile.organicMatterPercent)} %` },
    { key: 'effectiveDepthCm' as const, label: soilFieldLabels.effectiveDepthCm, value: profile.effectiveDepthCm === undefined ? undefined : formatLength(profile.effectiveDepthCm, measurementSystem) },
    { key: 'drainage' as const, label: soilFieldLabels.drainage, value: profile.drainage && profile.drainage !== 'unknown' ? drainageLabels[profile.drainage] : undefined },
  ]
  const acquisitionRows = [
    { label: 'Texture', known: Boolean(profile.texture && profile.texture !== 'unknown' || profile.horizons?.some(horizon => horizon.texture && horizon.texture !== 'unknown')) },
    { label: 'pH', known: profile.ph !== undefined || Boolean(profile.horizons?.some(horizon => horizon.ph !== undefined)) },
    { label: 'Matière organique', known: profile.organicMatterPercent !== undefined || Boolean(profile.horizons?.some(horizon => horizon.organicMatterPercent !== undefined)) },
    { label: 'Profondeur utile', known: profile.effectiveDepthCm !== undefined },
    { label: 'Drainage observé', known: Boolean(profile.drainage && profile.drainage !== 'unknown') },
  ]
  const missingAcquisitionCount = acquisitionRows.filter(row => !row.known).length
  const hasDraftValue = draft.texture !== undefined || draft.ph !== undefined || draft.organicMatterPercent !== undefined || draft.effectiveDepthCm !== undefined || draft.drainage !== undefined
    || Boolean(draft.horizons?.length || draft.sampleDate || draft.samplingMethod?.trim() || draft.sourceName?.trim() || Object.keys(draft.fieldProvenance ?? {}).length)
  const soilSummary = [
    profile.texture && profile.texture !== 'unknown' ? textureLabels[profile.texture] : undefined,
    profile.ph !== undefined ? `pH ${decimal(profile.ph)}` : undefined,
    profile.organicMatterPercent !== undefined ? `${decimal(profile.organicMatterPercent)} % MO` : undefined,
    profile.effectiveDepthCm !== undefined ? formatLength(profile.effectiveDepthCm, measurementSystem) : undefined,
    profile.drainage && profile.drainage !== 'unknown' ? `Drainage ${drainageLabels[profile.drainage].toLowerCase()}` : undefined,
    profile.horizons?.length ? `${profile.horizons.length} horizon${profile.horizons.length > 1 ? 's' : ''} · 0–${profile.horizons[profile.horizons.length - 1].bottomCm} cm` : undefined,
    profile.samplingMethod ? `Méthode · ${profile.samplingMethod}` : undefined,
  ].filter(Boolean)
  const analysisHistory = [...(profile.analysisHistory ?? [])].sort((a, b) => b.sampleDate.localeCompare(a.sampleDate) || b.archivedAt.localeCompare(a.archivedAt))
  const newerSnapshot = analysisHistory.find(snapshot => snapshot.id === comparisonNewerId) ?? analysisHistory[0]
  const olderSnapshot = analysisHistory.find(snapshot => snapshot.id === comparisonOlderId && snapshot.id !== newerSnapshot?.id)
    ?? analysisHistory.find(snapshot => snapshot.id !== newerSnapshot?.id)

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

  const updateFieldProvenance = (field: SoilFieldKey, update: Partial<SoilFieldProvenance>) => setDraft(value => {
    const fieldProvenance = { ...value.fieldProvenance }
    const next = { ...fieldProvenance[field], ...update }
    if (Object.values(next).some(Boolean)) fieldProvenance[field] = next
    else delete fieldProvenance[field]
    return { ...value, fieldProvenance: Object.keys(fieldProvenance).length ? fieldProvenance : undefined }
  })

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
        <strong>{hasProfile ? hasFieldMetadata ? 'Profil de sol · origines par champ' : !hasGeneralProfile && profile.horizons?.length ? 'Profil de sol par horizons' : profile.sourceType === 'lab-analysis' ? 'Analyse de laboratoire déclarée' : 'Profil de sol déclaré par vous' : 'Texture, pH et matière organique'}</strong>
        <small>{hasProfile ? [soilSummary.join(' · '), profile.sourceName, profile.sampleDate ? `Échantillon du ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${profile.sampleDate}T12:00:00Z`))}` : undefined].filter(Boolean).join(' · ') || 'Profil enregistré, champs encore inconnus.' : 'Aucune analyse ou mesure locale enregistrée pour ce point.'}</small>
      </span>
      <button className="terrain-profile-edit" type="button" onClick={edit} aria-label={hasProfile ? 'Modifier le profil de sol local' : 'Renseigner le profil de sol local'}><Pencil size={13} /><span>{hasProfile ? 'Modifier' : 'Renseigner'}</span></button>
    </div>
    {hasProfile && <section className="terrain-field-provenance" aria-label="État et provenance de chaque champ de sol">
      <header><strong>État et origine par champ</strong><small>Chaque origine reste une déclaration non vérifiée.</small></header>
      <dl>{generalFieldRows.map(field => {
        const provenance = resolveSoilFieldProvenance(profile, field.key)
        const sourceDate = provenance.sampleDate ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${provenance.sampleDate}T12:00:00Z`)) : undefined
        const source = [soilSourceLabels[provenance.sourceType], provenance.sourceName, sourceDate, provenance.samplingMethod ? `méthode : ${provenance.samplingMethod}` : undefined].filter(Boolean).join(' · ')
        return <div className="terrain-field-provenance-row" key={field.label}><dt>{field.label}</dt><dd><strong>{field.value ?? 'Inconnu'}</strong><span className={field.value ? 'is-known' : ''}>{field.value ? 'Renseigné' : 'Non renseigné'}</span></dd><small>{field.value ? `${source} · non vérifiée` : 'Aucune valeur à attribuer'}</small></div>
      })}</dl>
      {hasGeneralProfile && <small className="terrain-field-source">Les champs sans origine spécifique héritent de la fiche générale : {fieldSource}. Aucune fiabilité indépendante n’est calculée.</small>}
      {!hasGeneralProfile && <small className="terrain-field-source">Aucun champ général saisi. La provenance des horizons est affichée avec leur composition.</small>}
    </section>}
    <details className="terrain-acquisition-plan">
      <summary>Plan de collecte du sol · {missingAcquisitionCount} champ{missingAcquisitionCount > 1 ? 's' : ''} à documenter</summary>
      <p>Rassemblez les résultats d’une analyse ou vos observations locales; ne remplissez que les valeurs connues. Les données NASA de la carte ne remplacent pas ces informations.</p>
      <ul>{acquisitionRows.map(row => <li key={row.label}><span>{row.label}</span><strong className={row.known ? 'is-known' : ''}>{row.known ? 'Renseigné · origine non vérifiée' : 'À recueillir si disponible'}</strong></li>)}</ul>
      <small>Cette liste ne classe pas les analyses par valeur scientifique. Les propriétés du sol ne modifient pas le classement descriptif des rotations dans cette version.</small>
      <button type="button" onClick={edit}>{hasProfile ? 'Compléter le profil' : 'Saisir les données connues'}</button>
    </details>
    <details className="terrain-indicator-guide">
      <summary>Comprendre les indicateurs du sol</summary>
      <p>La santé du sol ne se résume pas à une valeur unique. Cette fiche explique ce que les champs renseignés décrivent et les mesures qui manquent; FieldNova ne calcule pas de note de santé.</p>
      <div className="terrain-indicator-grid">
        <article><h3>pH · indicateur chimique</h3><p>Décrit l’acidité ou l’alcalinité. Son interprétation dépend du sol, de la culture et de la méthode d’analyse.</p><small>Pour comparer : même méthode d’extraction, profondeur et laboratoire si possible.</small></article>
        <article><h3>Matière organique · indicateur chimique</h3><p>Participe aux fonctions de fertilité, de structure et de stabilité; un pourcentage seul ne décrit pas toutes ces fonctions.</p><small>À conserver : méthode du laboratoire, unité et profondeur de l’échantillon.</small></article>
        <article><h3>Texture, profondeur et drainage · contexte physique</h3><p>Décrivent des propriétés du profil et le déplacement de l’eau. Elles ne mesurent pas à elles seules la structure, l’infiltration ou le tassement.</p><small>À documenter : horizon, profondeur, lieu et méthode d’observation.</small></article>
        <article><h3>Mesures complémentaires à recueillir</h3><p>La densité apparente, l’infiltration, la stabilité des agrégats, la compaction et l’activité biologique nécessitent des observations ou protocoles dédiés.</p><small>Aucune de ces mesures n’est déduite par FieldNova des images satellite ou du profil actuel.</small></article>
      </div>
      <small className="terrain-indicator-method-note">Pour suivre une évolution, comparez des prélèvements du même champ, à profondeur et méthode comparables. Une référence régionale ou une analyse seule ne suffit pas à conclure à une amélioration.</small>
      <nav aria-label="Références sur les indicateurs de santé du sol"><a href="https://www.nrcs.usda.gov/conservation-basics/soil/soil-health/soil-health-assessment" target="_blank" rel="noreferrer">USDA NRCS · Évaluer la santé du sol</a><a href="https://www.fao.org/land-water/land/land-governance-and-planning/land-resources-planning-toolbox/detail/visual-soil--field-assessment-tool-%28vs-fast%29/en" target="_blank" rel="noreferrer">FAO · Évaluation visuelle du sol</a></nav>
    </details>
    {hasSampleMetadata && <p className="terrain-profile-date">Fiche de prélèvement · point suivi {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)} · {profile.sampleDate ? `date ${profile.sampleDate}` : 'date non renseignée'} · {profile.samplingMethod ? `méthode : ${profile.samplingMethod}` : 'méthode non renseignée'}.</p>}
    {profile.horizons?.length ? <SoilHorizonVisual horizons={profile.horizons} defaultSourceType={profile.sourceType} defaultSourceName={profile.sourceName} defaultSampleDate={profile.sampleDate} defaultSamplingMethod={profile.samplingMethod} /> : null}
    {analysisHistory.length > 0 && <SoilAnalysisHistory history={analysisHistory} newer={newerSnapshot} older={olderSnapshot} onNewerChange={setComparisonNewerId} onOlderChange={setComparisonOlderId} />}
    {profile.updatedAt && <p className="terrain-profile-date">Enregistré localement · {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(profile.updatedAt))} · Origine déclarée : {soilSourceLabels[profile.sourceType ?? 'farmer-reported']} (non vérifiée)</p>}

    <dialog ref={dialogRef} className="terrain-soil-dialog" aria-labelledby="soil-profile-title" onClose={() => setOpen(false)} onClick={event => { if (event.target === dialogRef.current) setOpen(false) }}>
      <form className="terrain-soil-form" onSubmit={save}>
        <header className="terrain-soil-form-heading"><span className="terrain-heading-icon soil"><Layers3 size={17} /></span><span><h2 id="soil-profile-title">Profil de sol local</h2><small>Point suivi · {point.latitude.toFixed(3)}, {point.longitude.toFixed(3)}</small></span><button type="button" className="terrain-soil-close" onClick={() => setOpen(false)} aria-label="Fermer"><X size={17} /></button></header>
        <p className="terrain-soil-form-note">Saisissez uniquement des valeurs connues. Elles sont enregistrées dans ce navigateur et restent distinctes des données NASA.</p>
        <div className="terrain-soil-fields">
          <div className="terrain-soil-field"><label>Texture du sol<select value={draft.texture ?? ''} onChange={event => setDraft(value => ({ ...value, texture: (event.target.value || undefined) as FarmSoilProfile['texture'] }))}><option value="">Non renseignée</option><option value="sandy">Sableux</option><option value="loamy">Limoneux</option><option value="clayey">Argileux</option><option value="unknown">Inconnue</option></select></label><SoilFieldOriginEditor field="texture" profile={draft} onChange={updateFieldProvenance} /></div>
          <div className="terrain-soil-field"><label>pH<input type="number" min="0" max="14" step="0.1" inputMode="decimal" placeholder="Ex. 6,5" value={draft.ph ?? ''} onChange={event => setDraft(value => ({ ...value, ph: event.target.value === '' ? undefined : Number(event.target.value) }))} /></label><SoilFieldOriginEditor field="ph" profile={draft} onChange={updateFieldProvenance} /></div>
          <div className="terrain-soil-field"><label>Matière organique (%)<input type="number" min="0" max="100" step="0.1" inputMode="decimal" placeholder="Ex. 2,4" value={draft.organicMatterPercent ?? ''} onChange={event => setDraft(value => ({ ...value, organicMatterPercent: event.target.value === '' ? undefined : Number(event.target.value) }))} /></label><SoilFieldOriginEditor field="organicMatterPercent" profile={draft} onChange={updateFieldProvenance} /></div>
          <div className="terrain-soil-field"><label>Profondeur utile (cm)<input type="number" min="0" max="400" step="1" inputMode="numeric" placeholder="Ex. 90" value={draft.effectiveDepthCm ?? ''} onChange={event => setDraft(value => ({ ...value, effectiveDepthCm: event.target.value === '' ? undefined : Number(event.target.value) }))} /></label><SoilFieldOriginEditor field="effectiveDepthCm" profile={draft} onChange={updateFieldProvenance} /></div>
          <div className="terrain-soil-field"><label>Drainage<select value={draft.drainage ?? ''} onChange={event => setDraft(value => ({ ...value, drainage: (event.target.value || undefined) as FarmSoilProfile['drainage'] }))}><option value="">Non renseigné</option><option value="poor">Lent</option><option value="moderate">Modéré</option><option value="good">Rapide</option><option value="unknown">Inconnu</option></select></label><SoilFieldOriginEditor field="drainage" profile={draft} onChange={updateFieldProvenance} /></div>
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
      <label className="terrain-soil-field-wide">Méthode de prélèvement <span className="terrain-soil-optional">Facultatif</span><input type="text" maxLength={120} placeholder="Ex. tarière · composite 0–20 cm" value={draft.samplingMethod ?? ''} onChange={event => setDraft(value => ({ ...value, samplingMethod: event.target.value || undefined }))} /><small>Une méthode renseignée est requise pour archiver et comparer des échantillons.</small></label>
        </div>
        {error && <p className="terrain-soil-form-error" role="alert">{error}</p>}
        <footer className="terrain-soil-form-actions">{hasProfile && <button className="terrain-soil-delete" type="button" onClick={remove}><Trash2 size={14} />Effacer ce profil</button>}<button className="terrain-soil-save" type="submit"><Save size={14} />Enregistrer</button><button className="terrain-soil-archive" type="button" onClick={archiveDraft} disabled={draft.sourceType !== 'lab-analysis' || !draft.sampleDate || !draft.samplingMethod?.trim() || !draft.horizons?.some(horizon => horizon.ph !== undefined || horizon.organicMatterPercent !== undefined || (horizon.texture && horizon.texture !== 'unknown'))}>Archiver cet échantillon</button></footer>
        <p className="terrain-soil-privacy">Le point, l’origine, la date et la méthode sont déclarés par vous et non vérifiés par FieldNova. Ces informations restent sur cet appareil; elles ne sont envoyées à aucun service.</p>
      </form>
    </dialog>
  </>
}

function SoilAnalysisHistory({ history, newer, older, onNewerChange, onOlderChange }: { history: SoilAnalysisSnapshot[]; newer?: SoilAnalysisSnapshot; older?: SoilAnalysisSnapshot; onNewerChange: (id: string) => void; onOlderChange: (id: string) => void }) {
  const measurementSystem = useMeasurementSystem()
  const formatDate = (date: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
  const sameMethod = Boolean(newer?.samplingMethod && older?.samplingMethod && newer.samplingMethod.trim() === older.samplingMethod.trim())
  const intervals = [...new Map([...(newer?.horizons ?? []), ...(older?.horizons ?? [])].map(horizon => [`${horizon.topCm}-${horizon.bottomCm}`, horizon])).values()].sort((a, b) => a.topCm - b.topCm || a.bottomCm - b.bottomCm)
  const horizonAt = (snapshot: SoilAnalysisSnapshot | undefined, interval: SoilHorizon) => snapshot?.horizons.find(horizon => horizon.topCm === interval.topCm && horizon.bottomCm === interval.bottomCm)
  const showNumber = (value: number | undefined, suffix = '') => value === undefined ? '—' : `${decimal(value)}${suffix}`
  return <section className="terrain-soil-history" aria-label="Historique des analyses de sol">
    <header><strong>Historique des analyses</strong><small>{history.length} échantillon{history.length > 1 ? 's' : ''} archivé{history.length > 1 ? 's' : ''} sur cet appareil</small></header>
    {history.length > 1 && <div className="terrain-soil-history-pickers">
      <label>Échantillon A<select value={newer?.id ?? ''} onChange={event => onNewerChange(event.target.value)}>{history.map(snapshot => <option key={snapshot.id} value={snapshot.id}>{formatDate(snapshot.sampleDate)}{snapshot.sourceName ? ` · ${snapshot.sourceName}` : ''}</option>)}</select></label>
      <label>Échantillon B<select value={older?.id ?? ''} onChange={event => onOlderChange(event.target.value)}>{history.filter(snapshot => snapshot.id !== newer?.id).map(snapshot => <option key={snapshot.id} value={snapshot.id}>{formatDate(snapshot.sampleDate)}{snapshot.sourceName ? ` · ${snapshot.sourceName}` : ''}</option>)}</select></label>
    </div>}
    {newer && older ? <>
      <p className={`terrain-soil-history-warning ${sameMethod ? 'is-comparable' : ''}`}>{sameMethod ? `Méthode identique : ${newer.samplingMethod}. Les écarts numériques ci-dessous sont descriptifs.` : 'Méthodes différentes : les valeurs restent visibles, aucun écart n’est calculé.'}</p>
      <div className="terrain-soil-history-table-wrap"><table><thead><tr><th>Profondeur</th><th>{formatDate(older.sampleDate)}</th><th>{formatDate(newer.sampleDate)}</th><th>Écart</th></tr></thead><tbody>{intervals.map(interval => {
        const oldHorizon = horizonAt(older, interval)
        const newHorizon = horizonAt(newer, interval)
        const matchingDepth = Boolean(oldHorizon && newHorizon)
        const delta = (oldValue?: number, newValue?: number, suffix = '') => matchingDepth && sameMethod && oldValue !== undefined && newValue !== undefined ? `${newValue - oldValue > 0 ? '+' : ''}${decimal(newValue - oldValue)}${suffix}` : '—'
        const display = (horizon: SoilHorizon | undefined) => horizon ? `${horizon.texture && horizon.texture !== 'unknown' ? textureLabels[horizon.texture] : 'Texture —'} · pH ${showNumber(horizon.ph)} · MO ${showNumber(horizon.organicMatterPercent, ' %')}` : 'Pas de mesure à cet intervalle'
        const textureChange = oldHorizon?.texture && newHorizon?.texture && oldHorizon.texture !== 'unknown' && newHorizon.texture !== 'unknown' ? oldHorizon.texture === newHorizon.texture ? 'identique' : 'différente' : '—'
        return <tr key={`${interval.topCm}-${interval.bottomCm}`}><th scope="row">{formatLength(interval.topCm, measurementSystem)}–{formatLength(interval.bottomCm, measurementSystem)}</th><td>{display(oldHorizon)}</td><td>{display(newHorizon)}</td><td>{matchingDepth ? `Texture ${textureChange} · pH ${delta(oldHorizon?.ph, newHorizon?.ph)} · MO ${delta(oldHorizon?.organicMatterPercent, newHorizon?.organicMatterPercent, ' pt')}` : 'Profondeurs différentes'}</td></tr>
      })}</tbody></table></div>
      <small className="terrain-soil-history-note">Comparaison à intervalle exact uniquement. Une valeur manquante ou une méthode différente empêche le calcul. Les écarts ne constituent pas une interprétation agronomique.</small>
    </> : newer ? <div className="terrain-soil-history-single"><span>{formatDate(newer.sampleDate)} · {newer.sourceName ?? 'Laboratoire non précisé'}</span><small>{newer.horizons.length} intervalle{newer.horizons.length > 1 ? 's' : ''} archivé{newer.horizons.length > 1 ? 's' : ''} · méthode : {newer.samplingMethod}</small><small>Archivez un second échantillon pour afficher une comparaison.</small></div> : null}
  </section>
}

function SoilFieldOriginEditor({ field, profile, onChange }: { field: SoilFieldKey; profile: FarmSoilProfile; onChange: (field: SoilFieldKey, update: Partial<SoilFieldProvenance>) => void }) {
  const override = profile.fieldProvenance?.[field]
  const isDistinctOrigin = override?.sourceType !== undefined && override.sourceType !== (profile.sourceType ?? 'farmer-reported')
  return <details className="terrain-field-origin-editor">
    <summary>{isDistinctOrigin ? 'Origine spécifique déclarée' : override ? 'Détails de source propres à ce champ' : 'Utiliser une autre origine ?'}</summary>
    <div className="terrain-field-origin-fields">
      <label>Origine du champ<select value={override?.sourceType ?? ''} onChange={event => onChange(field, { sourceType: (event.target.value || undefined) as SoilFieldProvenance['sourceType'] })}>
        <option value="">Hériter de la fiche générale</option>
        <option value="farmer-reported">Déclarée par l’exploitation</option>
        <option value="lab-analysis">Analyse de laboratoire</option>
        <option value="other-source">Autre source</option>
      </select></label>
      <label>Référence de ce champ<input type="text" maxLength={120} placeholder="Ex. labo, numéro d’analyse" value={override?.sourceName ?? ''} onChange={event => onChange(field, { sourceName: event.target.value || undefined })} /></label>
      <label>Date de ce champ<input type="date" value={override?.sampleDate ?? ''} onChange={event => onChange(field, { sampleDate: event.target.value || undefined })} /></label>
      <label>Méthode de ce champ<input type="text" maxLength={120} placeholder="Facultatif" value={override?.samplingMethod ?? ''} onChange={event => onChange(field, { samplingMethod: event.target.value || undefined })} /></label>
      {override && <button type="button" onClick={() => onChange(field, { sourceType: undefined, sourceName: undefined, sampleDate: undefined, samplingMethod: undefined })}>Effacer cette origine</button>}
      <small>Champ : {soilFieldLabels[field]}. La source et ses métadonnées sont déclarées par l’utilisateur et ne sont pas vérifiées par FieldNova.</small>
    </div>
  </details>
}

function SoilHorizonVisual({ horizons, defaultSourceType, defaultSourceName, defaultSampleDate, defaultSamplingMethod }: { horizons: SoilHorizon[]; defaultSourceType?: FarmSoilProfile['sourceType']; defaultSourceName?: string; defaultSampleDate?: string; defaultSamplingMethod?: string }) {
  const measurementSystem = useMeasurementSystem()
  const layers: Array<SoilHorizon & { gap: boolean }> = horizons.flatMap((horizon, index) => {
    const previousBottom = horizons[index - 1]?.bottomCm ?? 0
    const gap = horizon.topCm > previousBottom ? [{ topCm: previousBottom, bottomCm: horizon.topCm, texture: 'unknown' as const, gap: true }] : []
    return [...gap, { ...horizon, gap: false }]
  })
  const depth = horizons[horizons.length - 1]?.bottomCm ?? 0
  const sources = [...new Set(horizons.map(horizon => horizonSourceSummary(horizon, defaultSourceType, defaultSourceName, defaultSampleDate, defaultSamplingMethod)))]
  return <div className="terrain-horizon-visual" aria-label={`Profil de sol déclaré de 0 à ${formatLength(depth, measurementSystem)}`}>
    <div><strong>Horizons saisis</strong><small>Profondeurs déclarées · intervalles manquants inconnus</small><small className="terrain-horizon-source">Origine déclarée (non vérifiée) : {sources.join(' · ')}</small></div>
    <div className="terrain-horizon-stack" role="list">{layers.map((layer, index) => {
      const texture = layer.texture && layer.texture !== 'unknown' ? textureLabels[layer.texture].toLocaleLowerCase('fr') : 'texture inconnue'
      const values = [layer.ph !== undefined ? `pH ${decimal(layer.ph)}` : '', layer.organicMatterPercent !== undefined ? `${decimal(layer.organicMatterPercent)} % MO` : ''].filter(Boolean).join(' · ')
      const source = layer.gap ? '' : horizonSourceSummary(layer, defaultSourceType, defaultSourceName, defaultSampleDate, defaultSamplingMethod)
      return <div key={`${layer.topCm}-${layer.bottomCm}-${index}`} className={`terrain-horizon-layer ${layer.gap ? 'is-gap' : `texture-${layer.texture ?? 'unknown'}`}`} role="listitem" aria-label={`${formatLength(layer.topCm, measurementSystem)} à ${formatLength(layer.bottomCm, measurementSystem)} · ${texture}${values ? ` · ${values}` : ''}${source ? ` · Origine déclarée : ${source}` : ''}`} title={`${formatLength(layer.topCm, measurementSystem)}–${formatLength(layer.bottomCm, measurementSystem)} · ${texture}${values ? ` · ${values}` : ''}${source ? ` · ${source}` : ''}`}><span>{formatLength(layer.topCm, measurementSystem)}–{formatLength(layer.bottomCm, measurementSystem)}</span><strong>{layer.gap ? 'Non décrit' : texture}</strong>{values && <small>{values}</small>}</div>
    })}</div>
    <small className="terrain-horizon-beyond">Au-delà de {formatLength(depth, measurementSystem)} : non documenté.</small>
  </div>
}

function horizonSourceSummary(horizon: SoilHorizon, defaultSourceType?: FarmSoilProfile['sourceType'], defaultSourceName?: string, defaultSampleDate?: string, defaultSamplingMethod?: string) {
  const { sourceType, sourceName, sampleDate, samplingMethod } = resolveSoilHorizonProvenance(horizon, { sourceType: defaultSourceType, sourceName: defaultSourceName, sampleDate: defaultSampleDate, samplingMethod: defaultSamplingMethod })
  const date = sampleDate ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${sampleDate}T12:00:00Z`)) : undefined
  return [soilSourceLabels[sourceType], sourceName, date, samplingMethod ? `méthode : ${samplingMethod}` : undefined].filter(Boolean).join(' · ')
}
