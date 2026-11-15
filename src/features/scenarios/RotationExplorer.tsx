import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Activity, ArrowUpRight, ChevronRight, CloudRain, Download, Droplets, LocateFixed, MapPinned, Minus, Plus, RotateCcw, ShieldCheck, Sparkles, Sprout, ThermometerSun, Trash2, Upload, X } from 'lucide-react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { Link } from 'react-router-dom'
import { FieldMap, type MapBaseLayer } from '../../components/maps/FieldMap'
import { useSelectedLocation, type GeoPoint } from '../../lib/geo/location'
import { formatPowerMonth, latestCompleteRecord, type PowerMonthlyRecord } from '../../lib/nasa/power'
import { usePowerMonthly } from '../../lib/nasa/use-power-monthly'
import { recordRotationComparison } from '../../lib/impact/rotation-comparison-counter'
import { readSoilProfile, resolveSoilHorizonProvenance, soilSourceLabels, type FarmSoilProfile } from '../../lib/farm/soil-profile'
import { cropCatalog, evaluateRotation, exampleRotationWorkspace, generateRotationOptions, priorityLabels, readRotationWorkspace, rotationCombinedScore, rotationSources, rotationWeightSensitivity, rotationWeightsFor, topRotations, type CropId, type RotationId, type RotationPlan, type RotationPriority, type RotationWorkspace, writeRotationWorkspace } from './rotation-model'
import { emptyRotationConstraints, readRotationConstraints, writeRotationConstraints } from './rotation-constraints'
import { clearSavedParcelBoundary, parseParcelGeoJSON, saveParcelBoundary, useParcelBoundary } from '../../lib/geo/parcel-boundary'
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
  if (profile.horizons?.length) labels.push(`${profile.horizons.length} horizon${profile.horizons.length > 1 ? 's' : ''} · 0–${profile.horizons[profile.horizons.length - 1].bottomCm} cm`)
  return labels
}

function hasGeneralSoilValues(profile: FarmSoilProfile) {
  return profile.texture !== undefined || profile.ph !== undefined || profile.organicMatterPercent !== undefined || profile.effectiveDepthCm !== undefined || profile.drainage !== undefined
}

function sameMonthReference(records: PowerMonthlyRecord[], current: PowerMonthlyRecord | undefined, field: 'precipitationMmPerDay' | 'temperatureC' | 'rootZoneWetness', unit: string) {
  if (!current) return 'Repère indisponible'
  const month = current.date.slice(-2)
  const values = records.filter(record => record.date < current.date && record.date.slice(-2) === month).map(record => record[field]).filter((value): value is number => typeof value === 'number')
  if (!values.length) return 'Pas de mois comparable'
  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const format = (value: number) => value.toLocaleString('fr-FR', { maximumFractionDigits: field === 'rootZoneWetness' ? 0 : 1 })
  const rootValues = field === 'rootZoneWetness' ? [average, minimum, maximum].map(value => value * 100) : [average, minimum, maximum]
  return `Années précédentes · n=${values.length} · moy. ${format(rootValues[0])} · ${format(rootValues[1])}–${format(rootValues[2])} ${unit}`
}

export function RotationExplorer() {
  const { location, selectLocation } = useSelectedLocation()
  const pointKey = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`
  const [baseLayer, setBaseLayer] = useState<MapBaseLayer>('nasa')
  const [showNdvi, setShowNdvi] = useState(true)
  const [mobileContextPanel, setMobileContextPanel] = useState<'local' | 'criteria'>('local')
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const [soilState, setSoilState] = useState(() => ({ pointKey, value: readSoilProfile(location) }))
  const [workspace, setWorkspace] = useState(() => ({ pointKey, value: readRotationWorkspace(location) }))
  const [constraintState, setConstraintState] = useState(() => ({ pointKey, value: readRotationConstraints(location) }))
  const parcel = useParcelBoundary()
  const [parcelError, setParcelError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [constraintError, setConstraintError] = useState('')
  const [generationMessage, setGenerationMessage] = useState('')
  const [drawingParcel, setDrawingParcel] = useState(false)
  const [draftParcelPoints, setDraftParcelPoints] = useState<GeoPoint[]>([])
  const [detailPlanId, setDetailPlanId] = useState<RotationId | null>(null)
  const detailsDialogRef = useRef<HTMLDialogElement>(null)
  const { series: currentSeries, loading: climateLoading, error: climateError, retry: retryClimate } = usePowerMonthly(location)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    setSoilState({ pointKey, value: readSoilProfile(location) })
    setWorkspace({ pointKey, value: readRotationWorkspace(location) })
    setConstraintState({ pointKey, value: readRotationConstraints(location) })
    setSaveError('')
    setConstraintError('')
    setGenerationMessage('')
  }, [pointKey])

  useEffect(() => {
    const reloadLocalExampleData = () => {
      setSoilState({ pointKey, value: readSoilProfile(location) })
      setWorkspace({ pointKey, value: readRotationWorkspace(location) })
      setConstraintState({ pointKey, value: readRotationConstraints(location) })
    }
    window.addEventListener('fieldnova:demo-mode-change', reloadLocalExampleData)
    return () => window.removeEventListener('fieldnova:demo-mode-change', reloadLocalExampleData)
  }, [pointKey, location])

  useEffect(() => {
    if (workspace.pointKey !== pointKey) return
    const defaultExampleWeights = JSON.stringify(exampleRotationWorkspace().priorityWeights)
    if (workspace.value.isExample && JSON.stringify(rotationWeightsFor(workspace.value)) === defaultExampleWeights) return
    try {
      writeRotationWorkspace(location, workspace.value)
      setSaveError('')
    } catch {
      setSaveError('Impossible de sauvegarder ce scénario dans le navigateur.')
    }
  }, [location, pointKey, workspace])

  useEffect(() => {
    if (constraintState.pointKey !== pointKey) return
    try {
      writeRotationConstraints(location, constraintState.value)
      setConstraintError('')
    } catch {
      setConstraintError('Impossible d’enregistrer ces contraintes dans ce navigateur.')
    }
  }, [constraintState, location, pointKey])

  useEffect(() => {
    const dialog = detailsDialogRef.current
    if (detailPlanId && dialog && !dialog.open) dialog.showModal()
  }, [detailPlanId])

  useEffect(() => {
    if (!drawingParcel) return
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancelParcelDrawing()
    }
    window.addEventListener('keydown', cancelOnEscape)
    return () => window.removeEventListener('keydown', cancelOnEscape)
  }, [drawingParcel])

  const currentWorkspace = workspace.pointKey === pointKey ? workspace.value : readRotationWorkspace(location)
  const constraints = constraintState.pointKey === pointKey ? constraintState.value : emptyRotationConstraints()
  const latest = useMemo(() => currentSeries ? latestCompleteRecord(currentSeries.records) : undefined, [currentSeries])
  const climateReferences = {
    precipitation: sameMonthReference(currentSeries?.records ?? [], latest, 'precipitationMmPerDay', 'mm/j'),
    temperature: sameMonthReference(currentSeries?.records ?? [], latest, 'temperatureC', '°C'),
    roots: sameMonthReference(currentSeries?.records ?? [], latest, 'rootZoneWetness', '%'),
  }
  const priorityWeights = rotationWeightsFor(currentWorkspace)
  const selectedPriorities = Object.entries(priorityWeights) as Array<[RotationPriority, 1 | 2 | 3]>
  const prioritySummary = selectedPriorities.map(([priority, weight]) => `${priorityLabels[priority]} ×${weight}`).join(' · ')
  const leaders = topRotations(currentWorkspace.plans, priorityWeights, constraints.unavailableCropIds)
  const sensitivity = rotationWeightSensitivity(currentWorkspace.plans, priorityWeights, constraints.unavailableCropIds)
  const sensitivitySummary = sensitivity
    ? sensitivity.changedCriteria.length
      ? `Le scénario en tête change quand le poids de ${sensitivity.changedCriteria.map(priority => priorityLabels[priority]).join(', ')} varie d’un niveau.`
      : `Aucun changement du scénario en tête sur ${sensitivity.testedVariants} variation(s) d’un niveau des poids actifs.`
    : 'Complétez au moins deux rotations compatibles pour comparer leur stabilité.'
  const detailedPlan = detailPlanId ? currentWorkspace.plans.find(plan => plan.id === detailPlanId) : undefined
  const detailedMetrics = detailedPlan ? evaluateRotation(detailedPlan) : undefined
  const referencePlan = currentWorkspace.plans.find(plan => plan.id === 'reference')
  const referenceMetrics = referencePlan ? evaluateRotation(referencePlan) : undefined
  const detailedUnavailable = detailedPlan && detailedPlan.id !== 'reference'
    ? [...new Set(detailedPlan.crops.filter((id): id is CropId => Boolean(id && constraints.unavailableCropIds.includes(id))))]
    : []
  const soil = soilState.pointKey === pointKey ? soilState.value : readSoilProfile(location)
  const soilValues = soilSummary(soil)
  const soilHasGeneralValues = hasGeneralSoilValues(soil)
  const changeWorkspace = (update: (value: RotationWorkspace) => RotationWorkspace, markAsLocal = false) => {
    setWorkspace(current => {
      const currentValue = current.pointKey === pointKey ? current.value : readRotationWorkspace(location)
      const updated = update(currentValue)
      return { pointKey, value: { ...updated, isExample: markAsLocal ? false : currentValue.isExample } }
    })
  }
  const updateCrop = (planId: RotationId, index: number, value: string) => {
    changeWorkspace(current => ({ ...current, plans: current.plans.map(plan => plan.id === planId ? { ...plan, crops: plan.crops.map((crop, cropIndex) => cropIndex === index ? value as CropId | '' : crop) } : plan) }), true)
  }
  const updatePriorityWeight = (priority: RotationPriority, weight: 0 | 1 | 2 | 3) => changeWorkspace(current => {
    const weights = rotationWeightsFor(current)
    const nextWeights = { ...weights }
    if (weight === 0) delete nextWeights[priority]
    else nextWeights[priority] = weight
    const activePriorities = Object.keys(nextWeights) as RotationPriority[]
    const nextPriority = nextWeights[current.priority] ? current.priority : activePriorities[0] ?? priority
    return { ...current, priority: nextPriority, priorityWeights: nextWeights }
  })
  const toggleUnavailableCrop = (cropId: CropId) => {
    setConstraintState(current => {
      const value = current.pointKey === pointKey ? current.value : readRotationConstraints(location)
      const unavailableCropIds = value.unavailableCropIds.includes(cropId)
        ? value.unavailableCropIds.filter(id => id !== cropId)
        : [...value.unavailableCropIds, cropId]
      return { pointKey, value: { unavailableCropIds } }
    })
    setGenerationMessage('')
  }
  const generateOptions = () => {
    const reference = currentWorkspace.plans.find(plan => plan.id === 'reference')
    if (!reference) return
    const generated = generateRotationOptions(reference, priorityWeights, constraints.unavailableCropIds)
    if (!generated) {
      setGenerationMessage('Il faut au moins deux cultures disponibles pour produire deux options distinctes.')
      return
    }
    recordRotationComparison(location)
    changeWorkspace(current => ({ ...current, plans: current.plans.map(plan => generated.find(candidate => candidate.id === plan.id) ?? plan) }))
    setGenerationMessage('Options classées selon les poids choisis et les cultures déclarées disponibles; les valeurs brutes restent visibles.')
  }
  const openPlanDetails = (planId: RotationId) => setDetailPlanId(planId)
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
    if (drawingParcel) {
      setDraftParcelPoints(current => [...current, point])
      return
    }
    selectLocation(point)
    map?.flyTo({ center: [point.longitude, point.latitude], zoom: Math.max(7, map.getZoom()), duration: 800 })
  }
  const startParcelDrawing = () => {
    setParcelError('')
    setDraftParcelPoints([])
    setDrawingParcel(true)
  }
  const undoParcelVertex = () => setDraftParcelPoints(current => current.slice(0, -1))
  const cancelParcelDrawing = () => {
    setDrawingParcel(false)
    setDraftParcelPoints([])
    setParcelError('')
  }
  const finishParcelDrawing = () => {
    if (draftParcelPoints.length < 3) {
      setParcelError('Ajoutez au moins trois sommets distincts pour former une limite.')
      return
    }
    const positions = draftParcelPoints.map(point => [point.longitude, point.latitude])
    const ring = [...positions, positions[0]]
    try {
      const parsed = parseParcelGeoJSON(JSON.stringify({ type: 'Feature', properties: { name: 'Parcelle dessinée' }, geometry: { type: 'Polygon', coordinates: [ring] } }), 'Parcelle dessinée')
      saveParcelBoundary(parsed)
      map?.fitBounds(parsed.bounds, { padding: { top: 100, right: 320, bottom: 100, left: 320 }, maxZoom: 13, duration: 700 })
      setDrawingParcel(false)
      setDraftParcelPoints([])
      setParcelError('')
    } catch (error) {
      setParcelError(error instanceof Error ? error.message : 'Impossible d’enregistrer cette limite.')
    }
  }
  const locateMe = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(position => {
      moveToPoint({ latitude: Number(position.coords.latitude.toFixed(5)), longitude: Number(position.coords.longitude.toFixed(5)) })
      setLocating(false)
    }, () => setLocating(false), { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 })
  }
  const importParcel = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const parsed = parseParcelGeoJSON(await file.text(), file.name.replace(/\.(geo)?json$/i, '') || 'Parcelle importée')
      saveParcelBoundary(parsed)
      setParcelError('')
      map?.fitBounds(parsed.bounds, { padding: { top: 100, right: 320, bottom: 100, left: 320 }, maxZoom: 13, duration: 700 })
    } catch (error) {
      setParcelError(error instanceof Error ? error.message : 'Impossible de lire ce GeoJSON.')
    }
  }
  const removeParcel = () => {
    clearSavedParcelBoundary()
    setParcelError('')
  }
  const exportDecisionBrief = (includePreciseCoordinates = false) => {
    const leaderIds = new Set(leaders)
    const baseline = currentWorkspace.plans.find(plan => plan.id === 'reference')
    const baselineMetrics = baseline ? evaluateRotation(baseline) : undefined
    const climate = latest
      ? [
          `- Période mensuelle complète la plus récente : ${formatPowerMonth(latest.date)} (${latest.date}).`,
          `- Précipitations moyennes : ${latest.precipitationMmPerDay === undefined ? 'indisponibles' : `${latest.precipitationMmPerDay.toLocaleString('fr-FR')} mm/j`}.`,
          `- Température moyenne : ${latest.temperatureC === undefined ? 'indisponible' : `${latest.temperatureC.toLocaleString('fr-FR')} °C`}.`,
          `- Humidité racinaire modélisée : ${latest.rootZoneWetness === undefined ? 'indisponible' : `${(latest.rootZoneWetness * 100).toLocaleString('fr-FR')} %`}.`,
          `- Centre de maille NASA POWER / MERRA-2 (0,5° × 0,625°) : ${currentSeries?.gridPoint.latitude.toFixed(3)}, ${currentSeries?.gridPoint.longitude.toFixed(3)} · ${currentSeries?.source.join(', ')}.`,
        ]
      : ['- Données climatiques NASA POWER indisponibles pour ce point lors de l’export.']
    const soilLines = [
      `- Texture déclarée : ${soil.texture && soil.texture !== 'unknown' ? ({ sandy: 'sableuse', loamy: 'limoneuse', clayey: 'argileuse' } as const)[soil.texture] : 'inconnue'}.`,
      `- pH déclaré : ${soil.ph === undefined ? 'inconnu' : soil.ph.toLocaleString('fr-FR')}.`,
      `- Matière organique déclarée : ${soil.organicMatterPercent === undefined ? 'inconnue' : `${soil.organicMatterPercent.toLocaleString('fr-FR')} %`}.`,
      `- Profondeur utile déclarée : ${soil.effectiveDepthCm === undefined ? 'inconnue' : `${soil.effectiveDepthCm} cm`}.`,
      `- Drainage déclaré : ${soil.drainage && soil.drainage !== 'unknown' ? ({ poor: 'lent', moderate: 'modéré', good: 'rapide' } as const)[soil.drainage] : 'inconnu'}.`,
      `- Origine déclarée des caractéristiques générales : ${soilHasGeneralValues ? `${soilSourceLabels[soil.sourceType ?? 'farmer-reported']} (non vérifiée)` : 'aucune caractéristique générale renseignée'}.`,
      `- Référence des caractéristiques générales : ${soilHasGeneralValues ? soil.sourceName || 'non précisée' : 'non applicable'}.`,
      `- Date des caractéristiques générales : ${soilHasGeneralValues ? soil.sampleDate || 'non précisée' : 'non applicable'}.`,
      `- Méthode de prélèvement déclarée : ${soil.samplingMethod || 'non précisée'}.`,
      `- Enregistré localement le : ${soil.updatedAt ? new Date(soil.updatedAt).toLocaleDateString('fr-FR') : 'aucune date enregistrée'}.`,
      ...(soil.horizons?.length ? soil.horizons.map((horizon, index) => {
        const texture = horizon.texture && horizon.texture !== 'unknown' ? ({ sandy: 'sableuse', loamy: 'limoneuse', clayey: 'argileuse' } as const)[horizon.texture] : 'inconnue'
        const { sourceType, sourceName, sampleDate, samplingMethod } = resolveSoilHorizonProvenance(horizon, soil)
        return `- Horizon ${index + 1} · ${horizon.topCm}–${horizon.bottomCm} cm : texture ${texture}; pH ${horizon.ph === undefined ? 'inconnu' : horizon.ph.toLocaleString('fr-FR')}; matière organique ${horizon.organicMatterPercent === undefined ? 'inconnue' : `${horizon.organicMatterPercent.toLocaleString('fr-FR')} %`}; origine déclarée ${soilSourceLabels[sourceType]}${sourceName ? ` · ${sourceName}` : ''}; date ${sampleDate || 'non précisée'}${samplingMethod ? `; méthode ${samplingMethod}` : ''} (non vérifiée).`
      }) : ['- Aucun horizon local détaillé n’est renseigné.']),
      '- Les profondeurs non couvertes par les horizons déclarés restent inconnues.',
    ]
    const rotationLines = currentWorkspace.plans.map(plan => {
      const metrics = evaluateRotation(plan)
      const crops = plan.crops.map((id, index) => {
        const crop = cropCatalog.find(item => item.id === id)
        const root = crop?.rootArchitecture === 'fibrous' ? 'racines fasciculées' : crop?.rootArchitecture === 'taproot' ? 'racines pivotantes' : 'racines inconnues'
        return `${index + 1}. ${crop ? `${crop.label} (${crop.familyLabel}${crop.isLegume ? ', légumineuse' : ''}; ${root})` : 'culture non renseignée'}`
      }).join(' → ')
      const result = metrics.complete
        ? `${metrics.distinctFamilies}/5 familles distinctes; ${metrics.repeatedFamilyTransitions} répétition(s) de famille entre années consécutives; ${metrics.legumeSeasons} année(s) avec légumineuse; ${metrics.knownRootTransitions} alternance(s) de racines connues${plan.id !== 'reference' && baselineMetrics?.complete ? `; écarts bruts vs référence : ${signed(metrics.distinctFamilies - baselineMetrics.distinctFamilies)} famille(s), ${signed(metrics.repeatedFamilyTransitions - baselineMetrics.repeatedFamilyTransitions)} répétition(s), ${signed(metrics.legumeSeasons - baselineMetrics.legumeSeasons)} année(s) avec légumineuse, ${signed(metrics.knownRootTransitions - baselineMetrics.knownRootTransitions)} transition(s) racinaire(s)` : ''}`
        : 'succession incomplète; métriques non calculées'
      const score = metrics.complete ? ` · note de tri pondérée ${(rotationCombinedScore(metrics, priorityWeights) * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}/100` : ''
      return `### ${plan.title}${leaderIds.has(plan.id) ? ' — meilleure note de tri' : ''}${score}\n\n${crops}\n\n${result}.`
    })
    const generatedAt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())
    const content = [
      '# Fiche de comparaison FieldNova',
      '',
      `Exportée le ${generatedAt}.`,
      includePreciseCoordinates
        ? `Point suivi : ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}.`
        : 'Coordonnées précises du point suivi omises de cette exportation.',
      `Données du scénario : ${currentWorkspace.isExample ? 'exemple illustratif' : 'scénario enregistré localement'}.`,
      `Critères et poids : ${prioritySummary}. Note de tri pondérée = moyenne des indicateurs normalisés (familles / 5, répétitions inversées / 4, légumineuses / 5, transitions racinaires / 4), pondérée selon ces choix. Cette note sert uniquement à classer les séquences du catalogue.`,
      `Cultures exclues des options candidates : ${constraints.unavailableCropIds.length ? constraints.unavailableCropIds.map(id => cropCatalog.find(crop => crop.id === id)?.label ?? id).join(', ') : 'aucune exclusion renseignée'}.`,
      '',
      '## Rotations comparées',
      '',
      ...rotationLines.flatMap(line => [line, '']),
      '## Contexte climatique NASA POWER',
      '',
      ...climate,
      '',
      'Source : [NASA POWER — API mensuelle](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/). L’API reçoit la coordonnée choisie; le centre et les limites de la maille MERRA-2 de plus proche voisin (0,5° × 0,625°) sont dérivés de la grille native documentée. Les valeurs décrivent cette cellule et une période mensuelle; ce ne sont ni des mesures à la parcelle ni une prévision.',
      '',
      '## Profil local du sol',
      '',
      ...soilLines,
      'Ces champs sont des saisies locales de l’utilisateur; ils ne sont ni vérifiés par laboratoire ni fournis par la NASA.',
      '',
      '## Méthode et limites',
      '',
      `Sources des traits génériques : [${rotationSources.rootArchitecture.label}](${rotationSources.rootArchitecture.url}) et [${rotationSources.legumes.label}](${rotationSources.legumes.url}). Ces références ne valident pas les traits pour cette parcelle ou sa variété.`,
      '',
      'Les indicateurs comptent les familles botaniques, leurs répétitions entre années consécutives, la présence de légumineuses et les transitions entre architectures racinaires documentées. Chaque indicateur sélectionné est normalisé dans une plage de 0 à 1; son poids explicite est compris entre ×1 et ×3. Le générateur explore les séquences complètes du catalogue non exclues, puis ordonne par note pondérée, indicateurs bruts et ordre du catalogue. Les exclusions sont des contraintes saisies par l’utilisateur; le contexte NASA POWER et le profil local ne sont pas intégrés à cette note.',
      '',
      'Cette fiche ne constitue pas un conseil agronomique. Elle ne prédit ni rendement, ni besoin en eau, ni évolution de la santé du sol. Les calendriers, variétés, contraintes de matériel, disponibilité d’eau et règles de succession locales restent à confirmer.',
      '',
    ].join('\n')
    const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = includePreciseCoordinates
      ? `fieldnova-comparaison-${location.latitude.toFixed(4)}-${location.longitude.toFixed(4)}.md`
      : 'fieldnova-comparaison.md'
    link.click()
    URL.revokeObjectURL(url)
  }

  return <section className="rotation-explorer" aria-label="Explorateur de rotations culturales">
    <header className="rotation-heading"><div><h1>Explorer les rotations</h1><p>Comparez des successions de cultures selon des critères visibles et modifiables.</p></div><div className="rotation-heading-actions"><span className="rotation-example-badge">{currentWorkspace.isExample ? 'Exemple illustratif' : 'Scénario local'}</span><button type="button" className="rotation-generate" onClick={generateOptions}><Sparkles size={13} />Générer 2 options</button><details className="rotation-export-menu"><summary className="rotation-export"><Download size={13} />Exporter la fiche</summary><div className="rotation-export-options"><button type="button" onClick={event => { exportDecisionBrief(false); event.currentTarget.closest('details')?.removeAttribute('open') }}>Sans coordonnées précises <small>(conseillé)</small></button><button type="button" onClick={event => { exportDecisionBrief(true); event.currentTarget.closest('details')?.removeAttribute('open') }}>Avec coordonnées précises…</button><p>Le centre de maille NASA reste indiqué; il donne un contexte géographique approximatif.</p></div></details><button type="button" className="rotation-reset" onClick={resetExample}><RotateCcw size={13} />Charger l’exemple</button></div></header>

    <div className="rotation-map-stage">
      <FieldMap center={location} selectedPoint={location} baseLayer={baseLayer} showNdvi={showNdvi} powerGridCell={currentSeries?.gridCell} draftParcelPoints={draftParcelPoints} drawingParcel={drawingParcel} imageryDate={dayBefore(11)} onPointSelect={moveToPoint} onMapReady={setMap} ariaLabel="Carte interactive NASA et position de l’exploitation pour comparer les rotations" />
      <div className="rotation-map-topline"><div className="rotation-location-chip"><MapPinned size={15} /><span>{coordinate(location.latitude, 'N', 'S')} · {coordinate(location.longitude, 'E', 'O')}</span><small>Point suivi</small></div><div className="rotation-map-options"><div className="rotation-base-switch" role="group" aria-label="Fond de carte"><button type="button" className={baseLayer === 'streets' ? 'is-active' : ''} onClick={() => setBaseLayer('streets')}>Plan</button><button type="button" className={baseLayer === 'nasa' ? 'is-active' : ''} onClick={() => setBaseLayer('nasa')}>Satellite</button></div><label><input type="checkbox" checked={showNdvi} onChange={event => setShowNdvi(event.target.checked)} />NDVI</label></div></div>
      <div className="rotation-map-controls" role="group" aria-label="Contrôles de la carte"><button type="button" aria-label="Zoomer" onClick={() => map?.zoomIn({ duration: 220 })}><Plus size={15} /></button><button type="button" aria-label="Dézoomer" onClick={() => map?.zoomOut({ duration: 220 })}><Minus size={15} /></button><button type="button" aria-label="Utiliser ma position" onClick={locateMe} disabled={locating || drawingParcel}><LocateFixed size={14} /></button></div>
      <div className="rotation-mobile-panel-switch" role="group" aria-label="Panneaux de la carte"><button type="button" aria-pressed={mobileContextPanel === 'local'} onClick={() => setMobileContextPanel('local')}>Données & sol</button><button type="button" aria-pressed={mobileContextPanel === 'criteria'} onClick={() => setMobileContextPanel('criteria')}>Critères</button></div>
      <span className="rotation-map-hint">{drawingParcel ? 'Mode dessin actif · chaque clic ajoute un sommet au contour temporaire' : 'Cliquez pour déplacer le point suivi · les profils et séries suivent la position sélectionnée'}</span>

      <aside className={`rotation-context-panel rotation-context-left ${mobileContextPanel === 'local' ? 'is-mobile-active' : 'is-mobile-hidden'}`} aria-label="Contexte du sol local et du climat NASA">
        <header className="rotation-panel-heading"><span className="rotation-panel-icon soil"><Sprout size={15} /></span><span><strong>Sol local</strong><small>{soilHasGeneralValues ? `Origine déclarée : ${soilSourceLabels[soil.sourceType ?? 'farmer-reported']}` : soil.horizons?.length ? 'Origine propre à chaque horizon' : 'Aucune donnée renseignée'}</small></span></header>
        {soilValues.length ? <ul className="rotation-soil-list">{soilValues.map(value => <li key={value}>{value}</li>)}</ul> : <p className="rotation-context-empty">Aucune caractéristique de sol n’est renseignée pour ce point.</p>}
        <Link to="/app/terrain" className="rotation-context-link">Renseigner le profil du sol <ArrowUpRight size={12} /></Link>
        <div className="rotation-parcel-card">
          <div><strong>Limite de parcelle</strong><small>{parcel ? `${parcel.feature.properties?.name ?? 'Parcelle'} · ≈ ${parcel.areaHectares.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha` : 'Importez ou dessinez une limite WGS84'}</small></div>
          <div className="rotation-parcel-actions">
            {drawingParcel ? <><button type="button" className="rotation-parcel-cancel" onClick={cancelParcelDrawing}>Annuler</button><button type="button" className="rotation-parcel-undo" onClick={undoParcelVertex} disabled={!draftParcelPoints.length}>Retour</button><button type="button" className="rotation-parcel-finish" onClick={finishParcelDrawing} disabled={draftParcelPoints.length < 3}>Terminer · {draftParcelPoints.length}</button></> : <>
              <label className="rotation-parcel-import"><Upload size={12} />Importer<input type="file" accept=".geojson,.json,application/geo+json,application/json" aria-label="Importer une limite GeoJSON" onChange={importParcel} /></label>
              <button type="button" className="rotation-parcel-draw" onClick={startParcelDrawing}>Dessiner</button>
              {parcel && <button type="button" className="rotation-parcel-remove" aria-label="Retirer la limite de parcelle" onClick={removeParcel}><Trash2 size={12} /></button>}
            </>}
          </div>
        </div>
        {drawingParcel && <p className="rotation-parcel-drawing-help" role="status">Carte rapprochée au point suivi. Cliquez pour placer les sommets ({draftParcelPoints.length}); « Retour » retire le dernier. Terminez pour enregistrer ou annulez pour conserver la limite actuelle.</p>}
        {parcelError && <p className="rotation-parcel-error" role="alert">{parcelError}</p>}
        {parcel && <small className="rotation-parcel-note">Contour dessiné/importé localement · surface géodésique approximative. Aucune statistique NASA zonale calculée.</small>}
        <div className="rotation-context-divider" />
        <header className="rotation-panel-heading"><span className="rotation-panel-icon climate"><Activity size={15} /></span><span><strong>Contexte NASA POWER</strong><small>{climateLoading ? 'Chargement des données…' : latest ? `${formatPowerMonth(latest.date)} · valeur mensuelle` : 'Données non disponibles'}</small></span></header>
        {climateLoading ? <div className="rotation-context-empty" role="status">Récupération de la série climatique…</div> : climateError ? <div className="rotation-context-error" role="alert">{climateError}<button type="button" onClick={retryClimate}>Réessayer</button></div> : <><div className="rotation-climate-metrics"><span><CloudRain size={13} /><div><small>Pluie moyenne</small><small className="rotation-climate-reference">{climateReferences.precipitation}</small></div><strong>{latest?.precipitationMmPerDay === undefined ? '—' : `${latest.precipitationMmPerDay.toFixed(1).replace('.', ',')} mm/j`}</strong></span><span><ThermometerSun size={13} /><div><small>Température</small><small className="rotation-climate-reference">{climateReferences.temperature}</small></div><strong>{latest?.temperatureC === undefined ? '—' : `${latest.temperatureC.toFixed(1).replace('.', ',')} °C`}</strong></span><span><Droplets size={13} /><div><small>Humidité racinaire</small><small className="rotation-climate-reference">{climateReferences.roots}</small></div><strong>{latest?.rootZoneWetness === undefined ? '—' : `${(latest.rootZoneWetness * 100).toFixed(0).replace('.', ',')} %`}</strong></span></div><small className="rotation-climate-footnote">Repère historique du même mois · pas une prévision</small></>}
        <p className="rotation-context-source">Centre de maille MERRA-2 {currentSeries?.gridPoint.latitude.toFixed(3)}, {currentSeries?.gridPoint.longitude.toFixed(3)} · 0,5° × 0,625° · {currentSeries?.source.join(' + ') ?? 'source en attente'}</p>
      </aside>

      <aside className={`rotation-context-panel rotation-context-right ${mobileContextPanel === 'criteria' ? 'is-mobile-active' : 'is-mobile-hidden'}`} aria-label="Critère de comparaison et explication">
        <fieldset className="rotation-priority-weights"><legend>Critères et poids</legend>{(Object.entries(priorityLabels) as Array<[RotationPriority, string]>).map(([priority, label]) => { const weight = priorityWeights[priority] ?? 0; return <label key={priority}><input type="checkbox" checked={weight > 0} disabled={weight > 0 && selectedPriorities.length === 1} onChange={event => updatePriorityWeight(priority, event.target.checked ? (weight || 1) : 0)} /><span>{label}</span><select aria-label={`Poids de ${label}`} value={weight || 1} disabled={weight === 0} onChange={event => updatePriorityWeight(priority, Number(event.target.value) as 1 | 2 | 3)}><option value={1}>×1</option><option value={2}>×2</option><option value={3}>×3</option></select></label> })}</fieldset>
        <details className="rotation-method-details"><summary>Méthode de comparaison</summary><div><p><strong>Critère détaillé :</strong> {methodPriorityDescription[currentWorkspace.priority]} Les poids actifs sont égaux à 1, 2 ou 3 selon vos choix.</p><p>Chaque indicateur est ramené entre 0 et 1 : familles / 5, répétitions inversées / 4, légumineuses / 5, transitions racinaires documentées / 4. Le score est la moyenne pondérée de ces valeurs, affichée sur 100; il ne représente ni rendement ni bénéfice agricole. Toutes les rotations compatibles à égalité sur la note sont signalées.</p><p><strong>Option A</strong> est la première séquence classée; <strong>Option B</strong> est la suivante. Les égalités sont départagées par familles distinctes, légumineuses, transitions racinaires documentées, moins de répétitions, puis l’ordre du catalogue. Seules les séquences complètes et les exclusions saisies sont prises en compte.</p><p>Le climat NASA et le profil de sol restent du contexte; ils ne participent pas à la note de rotation.</p></div></details>
        <details className="rotation-exclusions"><summary>Cultures indisponibles · {constraints.unavailableCropIds.length}</summary><p>Ces choix excluent une culture des options générées et de leur classement. La référence actuelle reste visible.</p><div>{cropCatalog.map(crop => <label key={crop.id}><input type="checkbox" checked={constraints.unavailableCropIds.includes(crop.id)} onChange={() => toggleUnavailableCrop(crop.id)} /><span>{crop.label}</span></label>)}</div></details>
        <div className="rotation-best-match" aria-live="polite"><small>Options compatibles · {prioritySummary}</small>{leaders.length ? <strong>Meilleure note : {leaders.map(id => currentWorkspace.plans.find(plan => plan.id === id)?.title).join(' · ')}</strong> : <strong>Aucune option complète compatible</strong>}</div>
        <div className={`rotation-sensitivity ${sensitivity?.changedCriteria.length ? 'is-sensitive' : ''}`} aria-live="polite"><strong>Sensibilité du tri</strong><span>{sensitivitySummary}</span><small>{sensitivity ? `Parmi ${sensitivity.completeCount} rotations complètes affichées · poids modifié un par un de ±1, dans la plage ×1–×3.` : 'Aucun résultat n’est calculé tant que deux options ne sont pas complètes.'}</small></div>
        {generationMessage && <p className="rotation-generation-message" role="status">{generationMessage}</p>}
        {constraintError && <p className="rotation-save-error" role="alert">{constraintError}</p>}
        <ul className="rotation-rule-list"><li>Familles et légumineuses comptées depuis le catalogue; l’azote fixé n’est pas estimé.</li><li>Racines pivotantes ou fasciculées comptées seulement si la référence les documente; les autres restent inconnues.</li><li>NASA POWER donne un contexte historique régional; il ne classe pas les cultures et ne prédit pas leur rendement.</li></ul>
        <div className="rotation-source-links"><a href={rotationSources.rootArchitecture.url} target="_blank" rel="noreferrer">{rotationSources.rootArchitecture.label}</a><a href={rotationSources.legumes.url} target="_blank" rel="noreferrer">{rotationSources.legumes.label}</a></div>
        <p className="rotation-catalog-note">Catalogue illustratif France métropolitaine · à adapter et valider localement.</p>
        {saveError && <p className="rotation-save-error" role="alert">{saveError}</p>}
      </aside>
    </div>

    <section className="rotation-plans" aria-label="Rotations culturales sur cinq années à comparer">
      {currentWorkspace.plans.map((plan, planIndex) => <RotationCard key={plan.id} plan={plan} planIndex={planIndex} priority={currentWorkspace.priority} priorityWeights={priorityWeights} isLeader={leaders.includes(plan.id)} example={currentWorkspace.isExample} unavailableCropIds={constraints.unavailableCropIds} onCropChange={updateCrop} onShowDetails={openPlanDetails} />)}
      <p className="rotation-plans-footnote">Options exploratoires triées selon les traits du catalogue et vos exclusions · NASA et le profil local ne prédisent pas l’adaptation des cultures.</p>
    </section>

    <dialog ref={detailsDialogRef} className="rotation-evidence-dialog" aria-labelledby="rotation-evidence-title" onClose={() => setDetailPlanId(null)} onClick={event => { if (event.target === detailsDialogRef.current) detailsDialogRef.current?.close() }}>
      {detailedPlan && detailedMetrics && <div className="rotation-evidence-content">
        <header><div><span className="rotation-panel-icon goal"><ShieldCheck size={15} /></span><span><h2 id="rotation-evidence-title">Pourquoi cette rotation ?</h2><small>{detailedPlan.title} · 5 ans · point {coordinate(location.latitude, 'N', 'S')} · {coordinate(location.longitude, 'E', 'O')}</small></span></div><button type="button" aria-label="Fermer l’analyse" onClick={() => detailsDialogRef.current?.close()}><X size={17} /></button></header>
        <section className="rotation-evidence-section">
          <h3>Critères pondérés et calcul</h3>
          <p>{!detailedMetrics.complete ? `Séquence incomplète (${detailedPlan.crops.filter(Boolean).length}/5 années renseignées) : le score et les écarts ne sont pas calculés.` : <>Note de tri : {(rotationCombinedScore(detailedMetrics, priorityWeights) * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}/100 · {prioritySummary}. {priorityExplanation(detailedMetrics, currentWorkspace.priority)}{detailedPlan.id !== 'reference' && referenceMetrics?.complete ? ` Référence actuelle : ${priorityExplanation(referenceMetrics, currentWorkspace.priority)}.` : ''}</>}</p>
          {detailedPlan.id !== 'reference' && detailedMetrics.complete && referenceMetrics?.complete && <div className="rotation-evidence-deltas" aria-label="Écarts bruts par rapport à la référence">
            <span><strong>{signed(detailedMetrics.distinctFamilies - referenceMetrics.distinctFamilies)}</strong><small>familles</small></span>
            <span><strong>{signed(detailedMetrics.repeatedFamilyTransitions - referenceMetrics.repeatedFamilyTransitions)}</strong><small>répétitions</small></span>
            <span><strong>{signed(detailedMetrics.legumeSeasons - referenceMetrics.legumeSeasons)}</strong><small>années avec légumineuse</small></span>
            <span><strong>{signed(detailedMetrics.knownRootTransitions - referenceMetrics.knownRootTransitions)}</strong><small>transitions racinaires connues</small></span>
          </div>}
          {detailedPlan.id !== 'reference' && detailedMetrics.complete && referenceMetrics?.complete && <><p className="rotation-evidence-tradeoff">{priorityComparison(detailedMetrics, referenceMetrics, currentWorkspace.priority)}</p><p className="rotation-evidence-tradeoff-note">Les autres écarts sont des comptes descriptifs. FieldNova n’évalue ici ni rendement, ni coût, ni besoin en eau, ni matériel ou calendrier local.</p></>}
          <p className="rotation-evidence-verdict">{detailedUnavailable.length ? `Non retenue : ${detailedUnavailable.map(id => cropCatalog.find(crop => crop.id === id)?.label).join(', ')} est/sont déclaré(s) indisponible(s).` : !detailedMetrics.complete ? 'Séquence incomplète; elle n’entre pas dans le classement.' : detailedPlan.id === 'reference' ? 'Cette rotation sert de référence; elle n’est pas une option candidate générée.' : leaders.includes(detailedPlan.id) ? 'Cette option atteint la meilleure note pondérée parmi les rotations complètes compatibles.' : 'Cette option est compatible avec les exclusions déclarées, mais sa note pondérée est inférieure aux options mises en avant.'}</p>
        </section>
        <section className="rotation-evidence-section"><h3>Traits du catalogue, année par année</h3>
          <div className="rotation-evidence-table-wrap"><table className="rotation-evidence-table"><thead><tr><th>Année</th><th>Culture</th><th>Famille</th><th>Légumineuse</th><th>Racines documentées</th></tr></thead><tbody>{detailedPlan.crops.map((cropId, index) => { const crop = cropCatalog.find(item => item.id === cropId); return <tr key={index}><td>{index + 1}</td><td>{crop?.label ?? 'Non renseignée'}</td><td>{crop?.familyLabel ?? '—'}</td><td>{crop ? crop.isLegume ? 'Oui' : 'Non' : '—'}</td><td>{crop?.rootArchitecture === 'fibrous' ? 'Fasciculées' : crop?.rootArchitecture === 'taproot' ? 'Pivotantes' : 'Inconnues'}</td></tr> })}</tbody></table></div>
          <p>Ces traits descriptifs alimentent les comptes; ils ne sont pas des rendements, des besoins en eau ou des effets mesurés sur le sol.</p>
          <div className="rotation-evidence-source-links"><a href={rotationSources.rootArchitecture.url} target="_blank" rel="noreferrer">Racines et successions · DRAAF Hauts-de-France</a><a href={rotationSources.legumes.url} target="_blank" rel="noreferrer">Diversité végétale et légumineuses · INRAE</a></div>
        </section>
        <section className="rotation-evidence-context"><div><h3>Contexte observé pour ce point</h3>{currentSeries && latest ? <p>NASA POWER · {formatPowerMonth(latest.date)} · centre MERRA-2 {currentSeries.gridPoint.latitude.toFixed(3)}, {currentSeries.gridPoint.longitude.toFixed(3)} · {currentSeries.source.join(' + ')}. {latest.precipitationMmPerDay === undefined ? 'Pluie indisponible' : `${latest.precipitationMmPerDay.toLocaleString('fr-FR')} mm/j`} · {latest.temperatureC === undefined ? 'température indisponible' : `${latest.temperatureC.toLocaleString('fr-FR')} °C`}.</p> : <p>{climateLoading ? 'Données NASA POWER en cours de chargement.' : climateError ? `Données NASA indisponibles : ${climateError}` : 'Aucune série NASA POWER chargée pour ce point.'}</p>}</div>
          <div><h3>Profil local du sol</h3><p>{soilValues.length || soil.sampleDate || soil.samplingMethod || soil.sourceName || soil.horizons?.length ? `${soilValues.length ? `${soilValues.join(' · ')} · ` : 'Fiche de prélèvement renseignée · '}${soilHasGeneralValues ? `${soilSourceLabels[soil.sourceType ?? 'farmer-reported']} (origine générale déclarée, non vérifiée)` : 'horizons saisis localement; leur provenance peut différer'}${soil.sourceName ? ` · ${soil.sourceName}` : ''}${soil.sampleDate ? ` · échantillon du ${soil.sampleDate}` : ''}${soil.samplingMethod ? ` · méthode de prélèvement : ${soil.samplingMethod}` : ''}.` : 'Aucune caractéristique de sol renseignée pour ce point.'}</p></div>
          <p className="rotation-evidence-limit">Climat NASA et sol local sont affichés comme éléments de contexte; ils ne participent pas au classement actuel.</p>
        </section>
        <section className="rotation-evidence-section"><h3>Points à vérifier avant toute décision</h3><ul><li>Calendrier local, variété et durée du cycle.</li><li>Disponibilité d’eau, matériel, débouché et règles de succession régionales.</li><li>Les classifications génériques et les données NASA régionales doivent être confrontées aux observations de l’exploitation et à un avis agronomique local.</li></ul></section>
      </div>}
    </dialog>
  </section>
}

function RotationCard({ plan, planIndex, priority, priorityWeights, isLeader, example, unavailableCropIds, onCropChange, onShowDetails }: { plan: RotationPlan; planIndex: number; priority: RotationPriority; priorityWeights: ReturnType<typeof rotationWeightsFor>; isLeader: boolean; example: boolean; unavailableCropIds: CropId[]; onCropChange: (planId: RotationId, index: number, value: string) => void; onShowDetails: (planId: RotationId) => void }) {
  const metrics = evaluateRotation(plan)
  const combinedScore = rotationCombinedScore(metrics, priorityWeights)
  const unavailable = [...new Set(plan.crops.filter((id): id is CropId => Boolean(id && unavailableCropIds.includes(id))))]
  const isReference = plan.id === 'reference'
  const incompatible = unavailable.length > 0 && !isReference
  const icon = planIndex === 0 ? <Sprout size={15} /> : planIndex === 1 ? <RotateCcw size={15} /> : <Activity size={15} />
  return <article className={`rotation-plan-card ${isLeader ? 'is-leading' : ''} ${incompatible ? 'is-incompatible' : ''}`}>
    <header><span className="rotation-card-icon">{icon}</span><span><strong>{plan.title}</strong><small>{example ? 'Cultures d’exemple' : 'Votre scénario'}</small></span>{incompatible && <span className="rotation-incompatible-tag">Hors profil</span>}{isLeader && <span className="rotation-leading-tag">Meilleure note</span>}</header>
    <div className="rotation-season-selects">{plan.crops.map((cropId, index) => <label key={index}><span>Année {index + 1}</span><select aria-label={`${plan.title}, année ${index + 1}`} title={cropCatalog.find(crop => crop.id === cropId)?.label ?? 'Choisir une culture'} value={cropId} onChange={event => onCropChange(plan.id, index, event.target.value)}><option value="">Choisir</option>{cropCatalog.map(crop => <option key={crop.id} value={crop.id} disabled={!isReference && unavailableCropIds.includes(crop.id) && cropId !== crop.id}>{crop.shortLabel}{unavailableCropIds.includes(crop.id) ? ' · indisponible' : ''}</option>)}</select></label>)}</div>
    <div className="rotation-card-metrics" aria-label={`Indicateurs de ${plan.title}`}><span><strong>{metrics.complete ? `${metrics.distinctFamilies}/5` : '—'}</strong><small>familles</small></span><span><strong>{metrics.complete ? metrics.repeatedFamilyTransitions : '—'}</strong><small>répétitions</small></span><span><strong>{metrics.complete ? metrics.legumeSeasons : '—'}</strong><small>légumineuses</small></span><span><strong>{metrics.complete ? metrics.knownRootTransitions : '—'}</strong><small>racines</small></span><span><strong>{metrics.complete ? `${Math.round(combinedScore * 100)}/100` : '—'}</strong><small>note de tri</small></span></div>
    <button type="button" className="rotation-card-detail" onClick={() => onShowDetails(plan.id)} aria-label={`Voir pourquoi pour ${plan.title}`}><span>{incompatible ? `Non retenue : ${unavailable.map(id => cropCatalog.find(crop => crop.id === id)?.shortLabel).join(', ')} indisponible(s).` : metrics.complete ? `${rotationDetail(metrics.distinctFamilies, metrics.repeatedFamilyTransitions, metrics.legumeSeasons, metrics.knownRootTransitions, priority)} Note pondérée ${Math.round(combinedScore * 100)}/100.` : 'Renseignez les 5 années pour comparer ce scénario.'}</span><span>Pourquoi ? <ChevronRight size={10} /></span></button>
  </article>
}

function rotationDetail(families: number, repeats: number, legumes: number, rootTransitions: number, priority: RotationPriority) {
  if (priority === 'diversity') return `${families} famille${families > 1 ? 's' : ''} distincte${families > 1 ? 's' : ''} sur 5 années.`
  if (priority === 'alternation') return `${repeats} répétition${repeats > 1 ? 's' : ''} de famille entre années consécutives.`
  if (priority === 'root') return `${rootTransitions} transition${rootTransitions > 1 ? 's' : ''} entre racines documentées; les cultures inconnues sont ignorées.`
  return `${legumes} année${legumes > 1 ? 's' : ''} avec une légumineuse.`
}

function priorityExplanation(metrics: ReturnType<typeof evaluateRotation>, priority: RotationPriority) {
  if (priority === 'diversity') return `${metrics.distinctFamilies} famille(s) botanique(s) distincte(s) sur cinq années.`
  if (priority === 'alternation') return `${metrics.repeatedFamilyTransitions} répétition(s) de famille entre années consécutives (moins de répétitions donne une valeur de critère plus élevée).`
  if (priority === 'legume') return `${metrics.legumeSeasons} année(s) avec légumineuse sur cinq.`
  return `${metrics.knownRootTransitions} transition(s) entre architectures racinaires connues; les cultures inconnues ne sont pas comptées.`
}

function priorityComparison(metrics: ReturnType<typeof evaluateRotation>, reference: ReturnType<typeof evaluateRotation>, priority: RotationPriority) {
  const difference = priority === 'diversity'
    ? metrics.distinctFamilies - reference.distinctFamilies
    : priority === 'alternation'
      ? reference.repeatedFamilyTransitions - metrics.repeatedFamilyTransitions
      : priority === 'legume'
        ? metrics.legumeSeasons - reference.legumeSeasons
        : metrics.knownRootTransitions - reference.knownRootTransitions
  if (difference === 0) return `Critère choisi : même valeur que la référence (${priorityLabels[priority]}).`
  const quantity = Math.abs(difference)
  const direction = difference > 0 ? 'de plus' : 'de moins'
  const metric = priority === 'diversity'
    ? `famille(s) distincte(s) ${direction}`
    : priority === 'alternation'
      ? `répétition(s) de famille ${difference > 0 ? 'en moins' : 'en plus'}`
      : priority === 'legume'
        ? `année(s) avec légumineuse ${direction}`
        : `transition(s) racinaire(s) documentée(s) ${direction}`
  return `Critère choisi (${priorityLabels[priority]}) : ${quantity} ${metric} que la référence; valeur ${difference > 0 ? 'plus élevée' : 'plus faible'} pour ce critère descriptif.`
}

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value)
}

const methodPriorityDescription: Record<RotationPriority, string> = {
  diversity: 'nombre de familles botaniques distinctes (à maximiser, de 1 à 5).',
  alternation: 'nombre de répétitions de famille entre deux années consécutives (à minimiser, de 0 à 4).',
  legume: 'nombre d’années avec au moins une légumineuse (à maximiser, de 0 à 5).',
  root: 'nombre de transitions entre architectures racinaires connues d’années consécutives (à maximiser, de 0 à 4; valeurs inconnues ignorées).',
}
