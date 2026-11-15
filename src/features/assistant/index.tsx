import { useEffect, useRef, useState } from 'react'
import { Activity, ChevronDown, CircleHelp, CloudRain, Droplets, Layers3, Leaf, LocateFixed, Map as MapIcon, MapPin, Maximize2, MessageCircle, Minus, Plus, Send, ShieldCheck, Sparkles, Sprout, ThermometerSun, X } from 'lucide-react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { ThinkingState, type TraceNode } from '../../components/ai-chat/ai-agent-response'
import AISources, { type AISource } from '../../components/ai-chat/ai-sources'
import { MessageActions } from '../../components/ai-chat/message-actions'
import { LiquidMultimodalInput } from '../../components/ai-chat/liquid-multimodal-input'
import { FieldMap, type MapBaseLayer } from '../../components/maps/FieldMap'
import { fetchPowerMonthly, formatPowerMonth, latestCompleteRecord, offlineDemoPowerSeries, type PowerMonthlySeries } from '../../lib/nasa/power'
import { usePowerMonthly } from '../../lib/nasa/use-power-monthly'
import { formatGibsDate, resolveGibsDate, useGibsAvailability } from '../../lib/nasa/gibs-availability'
import { readDemoWorkspace } from '../../lib/demo/demo-workspace'
import { farmWaterAccessLabels, farmWaterConstraintLabels, readFarmProfile } from '../../lib/farm/farm-profile'
import { archiveSoilAnalysis, readSoilProfile, resolveSoilFieldProvenance, resolveSoilHorizonProvenance, soilFieldLabels, soilSourceLabels, writeSoilProfile, type SoilFieldKey } from '../../lib/farm/soil-profile'
import { parseSoilAnalysisCsv } from '../../lib/farm/soil-analysis-csv'
import { readRotationConstraints } from '../scenarios/rotation-constraints'
import { useSelectedLocation, type GeoPoint } from '../../lib/geo/location'
import { evaluateRotation, priorityLabels, readCropCatalog, readRotationWorkspace, rotationCombinedScore, rotationSources, rotationWeightsFor, type CropDefinition, type CropId, type RotationPriority } from '../scenarios/rotation-model'
import { AssistantSoilImportCard, type AssistantSoilImport } from './AssistantSoilImportCard'
import './assistant.css'

type LayerId = 'truecolor' | 'ndvi' | 'surface' | 'root'
type EvidenceTag = { label: string; kind: 'source' | 'calculation' | 'local' | 'limit' | 'missing' }
type Message = { id: number; role: 'user' | 'assistant'; text: string; point?: GeoPoint; trace?: TraceNode[]; traceHeading?: string; running?: boolean; sources?: AISource[]; evidenceTags?: EvidenceTag[]; soilImport?: AssistantSoilImport }
type CodexStatus = 'checking' | 'ready' | 'unavailable'

const sources: AISource[] = [
  { id: 'power', title: 'NASA POWER · données mensuelles', url: 'https://power.larc.nasa.gov/docs/services/api/temporal/monthly/', snippet: 'Série au point de grille NASA POWER : température, précipitations et humidité du sol modélisée.' },
  { id: 'gibs', title: 'NASA GIBS · imagerie et humidité du sol', url: 'https://nasa-gibs.github.io/gibs-api-docs/access-basics/', snippet: 'Tuiles cartographiques MODIS et SMAP affichées à leur résolution native.' },
]
const rotationReferences: AISource[] = [
  { id: 'fieldnova-rotations', title: 'FieldNova · scénarios enregistrés', url: '/app/scenarios', snippet: 'Séquences, priorité, métriques descriptives et contraintes consultées pour le point sélectionné.' },
  { id: 'inpn-taxref', title: rotationSources.botanicalFamilies.label, url: rotationSources.botanicalFamilies.url, snippet: 'Le référentiel taxonomique TAXREF de l’INPN documente la classification des espèces, dont leur famille botanique.' },
  { id: 'draaf-rotation', title: rotationSources.rootArchitecture.label, url: rotationSources.rootArchitecture.url, snippet: 'La DRAAF décrit les rotations, l’alternance des familles et des architectures racinaires; référence régionale à confirmer pour la parcelle.' },
  { id: 'inrae-rotation', title: rotationSources.legumes.label, url: rotationSources.legumes.url, snippet: 'INRAE explique la diversification végétale, les successions pluriannuelles et le rôle des légumineuses.' },
]
const rotationWorkspaceSource: AISource = { id: 'fieldnova-rotations', title: 'FieldNova · scénarios enregistrés', url: '/app/scenarios', snippet: 'Cultures, critères et contraintes enregistrés localement pour le point sélectionné.' }

function soilProfileSource(point: GeoPoint): AISource {
  const profile = readSoilProfile(point)
  const fields: SoilFieldKey[] = ['texture', 'ph', 'organicMatterPercent', 'effectiveDepthCm', 'drainage']
  const knownFields = fields.filter(field => profile[field] !== undefined)
  const fieldCount = knownFields.length
  const horizonCount = profile.horizons?.length ?? 0
  const origin = fieldCount ? knownFields.map(field => `${soilFieldLabels[field]} : ${soilFieldOrigin(profile, field)}`).join(' · ') : horizonCount ? 'origine propre à chaque horizon' : 'aucune valeur déclarée'
  const hasIndependentValues = Boolean(profile.sourceName || profile.sampleDate || profile.samplingMethod)
  const recordNote = !fieldCount && hasIndependentValues ? ` · référence : ${profile.sourceName || 'non précisée'} · échantillon : ${profile.sampleDate || 'date non précisée'}${profile.samplingMethod ? ` · méthode déclarée : ${profile.samplingMethod}` : ''}` : ''
  return {
    id: 'fieldnova-soil',
    title: 'FieldNova · profil local du sol',
    url: '/app/terrain',
    snippet: `${fieldCount} caractéristique(s) générale(s) · ${horizonCount} horizon(s) · origine déclarée : ${origin}${recordNote}. Données locales, non vérifiées.`,
  }
}

function soilFieldOrigin(profile: ReturnType<typeof readSoilProfile>, field: SoilFieldKey) {
  const origin = resolveSoilFieldProvenance(profile, field)
  const date = origin.sampleDate ?? 'date non précisée'
  return `${soilSourceLabels[origin.sourceType]}${origin.sourceName ? ` · ${origin.sourceName}` : ''} · ${date}${origin.samplingMethod ? ` · méthode : ${origin.samplingMethod}` : ''} (non vérifiée)`
}

function farmProfileSource(point: GeoPoint): AISource {
  const profile = readFarmProfile(point)
  return {
    id: 'fieldnova-farm',
    title: 'FieldNova · profil de ferme',
    url: '/app/overview',
    snippet: profile
      ? `${profile.isExample ? 'Profil fictif de démonstration' : 'Profil déclaré localement'} · ${profile.name} · accès et restrictions d’eau déclarés${profile.updatedAt ? ` · mis à jour le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(profile.updatedAt))}` : ''}.`
      : 'Aucun profil de ferme enregistré pour ce point.',
  }
}

const layerOptions: Array<{ id: LayerId; label: string; short: string; icon: typeof Activity }> = [
  { id: 'truecolor', label: 'Image MODIS', short: 'Satellite', icon: Layers3 },
  { id: 'ndvi', label: 'NDVI · MODIS', short: 'NDVI', icon: Leaf },
  { id: 'surface', label: 'Humidité de surface · SMAP', short: 'Surface', icon: Droplets },
  { id: 'root', label: 'Humidité racinaire · SMAP', short: 'Racines', icon: Sprout },
]

function recentImageryDate(days = 11) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

function coordinate(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(3).replace('.', ',')}° ${value < 0 ? negative : positive}`
}

function summarizeForField(answer: string) {
  const explicitSummary = answer.match(/(?:^|\n)\s*En bref\s*:\s*([^\n]+)/i)?.[1]
  const firstParagraph = answer.split(/\n\s*\n/).map(part => part.trim()).find(part => part && !/^(?:\||[-*•]\s|#{1,6}\s)/.test(part)) ?? answer.trim()
  const usableParagraph = explicitSummary ? explicitSummary : /:\s*$/.test(firstParagraph) ? 'La comparaison complète et ses critères sont disponibles dans les détails.' : firstParagraph
  const firstSentence = explicitSummary ? usableParagraph : usableParagraph.match(/^[\s\S]*?[.!?](?:\s|$)/)?.[0] ?? usableParagraph
  const plain = firstSentence.replace(/\*\*|__|[*_`#]/g, '').replace(/\s+/g, ' ').trim()
  if (plain.length <= 220) return plain
  const cut = plain.slice(0, 217).lastIndexOf(' ')
  return `${plain.slice(0, cut > 120 ? cut : 217).trimEnd()}…`
}

function detailedFieldAnswer(answer: string) {
  return answer.replace(/^\s*En bref\s*:\s*[^\n]+\n(?:\s*\n)?/i, '').trim()
}

function makeClimateAnswer(question: string, series: PowerMonthlySeries | null, layer: LayerId, selectedPoint: GeoPoint) {
  if (!series) return 'Je n’ai pas pu charger NASA POWER pour le point sélectionné. Vérifiez la connexion puis réessayez ; aucune valeur de démonstration n’est substituée aux données manquantes.'
  const records = series.records
  const record = latestCompleteRecord(records)
  if (!record) return 'NASA POWER n’a renvoyé aucune observation mensuelle exploitable pour ce point. La carte reste disponible, mais je ne peux pas donner de valeur climatique.'

  const lower = question.toLocaleLowerCase('fr')
  const point = `${coordinate(series.point.latitude, 'N', 'S')} · ${coordinate(series.point.longitude, 'E', 'O')}`
  const prefix = `Pour le point ${point}, la dernière période mensuelle exploitable est ${formatPowerMonth(record.date)}.`
  const requestedLayer = layerOptions.find(item => item.id === layer)?.label
  if (lower.includes('ndvi') || lower.includes('vigueur')) {
    return `${prefix} La carte affiche le NDVI MODIS de NASA GIBS à l’échelle du pixel satellite. Cette image peut être nuageuse ou décalée dans le temps et ne permet pas de comparer une sous-zone de parcelle ici. NASA POWER ne fournit pas le NDVI ; je n’en déduis donc pas un état de culture à partir des données météo.`
  }
  if (lower.includes('irrig') || lower.includes('eau') || lower.includes('humid') || lower.includes('sol')) {
    const root = record.rootZoneWetness
    const surface = record.surfaceSoilWetness
    const values = [root !== undefined ? `humidité racinaire modélisée ${Math.round(root * 100)} %` : '', surface !== undefined ? `humidité de surface modélisée ${Math.round(surface * 100)} %` : ''].filter(Boolean).join(' ; ')
    const farm = readFarmProfile(selectedPoint)
    const farmContext = lower.includes('irrig')
      ? farm ? ` ${farm.isExample ? 'Le profil fictif de démonstration' : 'Le profil local'} de ${farm.name} déclare : ${farmWaterAccessLabels[farm.waterAccess].toLocaleLowerCase('fr')}, ${farmWaterConstraintLabels[farm.waterConstraint].toLocaleLowerCase('fr')}${farm.waterNotes ? `; précision : « ${farm.waterNotes} »` : ''}. Cette déclaration ne mesure pas le volume disponible.` : ' Aucun profil local d’accès à l’eau n’est renseigné pour ce point.'
      : ''
    return `${prefix}${values ? ` NASA POWER estime ${values} sur son pixel de grille.` : ' NASA POWER ne fournit pas de valeur d’humidité exploitable pour ce mois.'} La couche SMAP de la carte est une observation satellite agrégée à environ 9 km. Ces valeurs régionales ne suffisent pas à calculer un besoin, une dose ou une date d’irrigation pour une parcelle. Il faut notamment des mesures terrain, la culture, son stade et l’eau disponible.${farmContext}`
  }
  if (lower.includes('pluie') || lower.includes('précip')) {
    const value = record.precipitationMmPerDay
    return `${prefix}${value !== undefined ? ` Les précipitations NASA POWER sont de ${value.toFixed(1).replace('.', ',')} mm/j en moyenne sur le mois (PRECTOTCORR).` : ' Aucune valeur de précipitation exploitable n’est disponible pour ce mois.'} C’est une moyenne mensuelle au point de grille, pas un cumul des sept derniers jours ni une prévision.`
  }
  if (lower.includes('temp') || lower.includes('chaud') || lower.includes('froid')) {
    return `${prefix}${record.temperatureC !== undefined ? ` La température moyenne NASA POWER est de ${record.temperatureC.toFixed(1).replace('.', ',')} °C` : ' La température moyenne n’est pas disponible'}${record.temperatureMinC !== undefined && record.temperatureMaxC !== undefined ? ` (min. ${record.temperatureMinC.toFixed(1).replace('.', ',')} °C ; max. ${record.temperatureMaxC.toFixed(1).replace('.', ',')} °C)` : ''}. Il s’agit d’une moyenne mensuelle modélisée, pas d’une prévision locale.`
  }
  const summary = [
    record.temperatureC !== undefined ? `température moyenne ${record.temperatureC.toFixed(1).replace('.', ',')} °C` : '',
    record.precipitationMmPerDay !== undefined ? `pluie ${record.precipitationMmPerDay.toFixed(1).replace('.', ',')} mm/j en moyenne mensuelle` : '',
    record.rootZoneWetness !== undefined ? `humidité racinaire modélisée ${Math.round(record.rootZoneWetness * 100)} %` : '',
  ].filter(Boolean).join(' · ')
  return `${prefix}${summary ? ` NASA POWER indique ${summary}.` : ' Aucune mesure climatique exploitable n’est disponible pour ce mois.'} La carte montre ${requestedLayer}. Dites-moi si vous voulez examiner la pluie, la température, l’humidité du sol ou le NDVI. Les séries POWER sont mensuelles et ne constituent ni une prévision ni un diagnostic parcellaire.`
}

function classifyQuestion(question: string) {
  const lower = question.toLocaleLowerCase('fr')
  const asksSoilProfile = /profil de (?:mon |la )?sol|texture|\bph\b|matière organique|drainage|profondeur|horizon|couche|analyse de sol/.test(lower)
  const asksRotation = /rotation|succession|famille botanique|légumineuse|alternance|cultures?/.test(lower)
  const asksFarmProfile = /ma ferme|mon exploitation|accès.{0,3}eau|eau disponible|ressource en eau|approvisionnement en eau|restriction.{0,12}eau|contrainte.{0,12}eau|profil (?:de (?:ma |la )?ferme|d'exploitation|agricole)/.test(lower)
  const asksClimate = /pluie|précip|température|\bchaud\b|\bfroid\b|humidité|climat|météo|nasa|ndvi|vigueur|satellite|imagerie|irrig/.test(lower)
  const asksLayer: LayerId | undefined = /ndvi|vigueur/.test(lower) ? 'ndvi' : /humidité de surface|smap surface/.test(lower) ? 'surface' : /humidité racinaire|humidité du sol|racine/.test(lower) ? 'root' : undefined
  const intent = asksSoilProfile ? 'soil' : asksRotation ? 'rotation' : asksFarmProfile ? 'farm' : asksClimate ? 'climate' : 'unknown'
  return { intent, asksLayer }
}

function asksForUnsupportedFarmDecision(question: string) {
  const lower = question.toLocaleLowerCase('fr')
  const asksIrrigationDose = /\b(?:dose|quantité|volume|combien de)\b.{0,35}\b(?:irrig|eau)|\b(?:irrig|arros).{0,35}\b(?:dose|quantité|volume|combien de|date|quand)|\bquand irriguer\b/.test(lower)
  const asksYieldPrediction = /\b(?:prédire|prediction|prévision|estimer|estimation)\b.{0,35}\b(?:rendement|récolte)|\b(?:rendement|récolte)\b.{0,35}\b(?:prédire|prediction|prévision|estimer|estimation)/.test(lower)
  return asksIrrigationDose || asksYieldPrediction
}

function formatFarmProfileAnswer(point: GeoPoint) {
  const farm = readFarmProfile(point)
  if (!farm) return 'Aucun profil d’exploitation n’est enregistré pour ce point. Vous pouvez le configurer depuis la Vue d’ensemble. FieldNova ne déduit pas l’accès à l’eau ni les priorités de la ferme à partir des données satellite.'
  const catalog = readCropCatalog(point)
  const workspace = readRotationWorkspace(point, catalog)
  const constraints = readRotationConstraints(point, catalog)
  const soil = readSoilProfile(point)
  const reference = workspace.plans.find(plan => plan.id === 'reference')
  const crops = reference?.crops.map(id => catalog.find(crop => crop.id === id)?.shortLabel ?? '').filter(Boolean) ?? []
  const knownSoil = Boolean(soil.texture && soil.texture !== 'unknown' || soil.ph !== undefined || soil.organicMatterPercent !== undefined || soil.effectiveDepthCm !== undefined || soil.drainage && soil.drainage !== 'unknown' || soil.horizons?.length)
  const waterNote = farm.waterNotes ? ` Précision déclarée : « ${farm.waterNotes} ».` : ''
  const prioritySummary = (Object.entries(rotationWeightsFor(workspace)) as Array<[RotationPriority, 1 | 2 | 3]>).map(([priority, weight]) => `${priorityLabels[priority]} ×${weight}`).join(' · ')
  return `${farm.isExample ? 'Ce profil est un exemple fictif et ne décrit pas une exploitation réelle. ' : ''}Le profil local de ${farm.name} indique : ${farmWaterAccessLabels[farm.waterAccess].toLocaleLowerCase('fr')} et ${farmWaterConstraintLabels[farm.waterConstraint].toLocaleLowerCase('fr')}.${waterNote} ${crops.length ? `La rotation actuelle renseignée contient ${crops.join(' → ')}.` : 'Aucune culture n’est renseignée dans la rotation actuelle.'} Sol local : ${knownSoil ? 'des caractéristiques ont été saisies ou importées dans Mon terrain.' : 'aucune caractéristique renseignée; le sol reste inconnu.'} Critères et poids de rotation : ${prioritySummary}. ${constraints.unavailableCropIds.length ? `Cultures exclues des options : ${constraints.unavailableCropIds.map(id => catalog.find(crop => crop.id === id)?.shortLabel ?? id).join(', ')}.` : 'Aucune culture exclue des options.'} Ces éléments sont des déclarations locales; ils ne prouvent pas un volume d’eau disponible et ne constituent pas un conseil agronomique.`
}

function localCropReferences(point: GeoPoint): AISource[] {
  const catalog = readCropCatalog(point)
  const workspace = readRotationWorkspace(point, catalog)
  return [...new Set(workspace.plans.flatMap(plan => plan.crops))]
    .map(id => catalog.find(crop => crop.id === id))
    .filter((crop): crop is CropDefinition => Boolean(crop?.origin === 'local-declaration' && crop.sourceUrl))
    .map(crop => ({
      id: `local-crop-${crop.id}`,
      title: `${crop.label} · ${crop.sourceName ?? 'référence déclarée'}`,
      url: crop.sourceUrl!,
      snippet: `Référence saisie localement pour les traits déclarés de ${crop.label}; FieldNova ne l’a pas vérifiée indépendamment.`,
    }))
}

function formatSoilAnswer(point: GeoPoint) {
  const profile = readSoilProfile(point)
  const fields: Array<{ key: SoilFieldKey; value: string }> = [
    ...(profile.texture && profile.texture !== 'unknown' ? [{ key: 'texture' as const, value: `texture ${({ sandy: 'sableuse', loamy: 'limoneuse', clayey: 'argileuse' } as const)[profile.texture]}` }] : []),
    ...(profile.ph !== undefined ? [{ key: 'ph' as const, value: `pH ${profile.ph.toLocaleString('fr-FR')}` }] : []),
    ...(profile.organicMatterPercent !== undefined ? [{ key: 'organicMatterPercent' as const, value: `${profile.organicMatterPercent.toLocaleString('fr-FR')} % de matière organique` }] : []),
    ...(profile.effectiveDepthCm !== undefined ? [{ key: 'effectiveDepthCm' as const, value: `${profile.effectiveDepthCm} cm de profondeur utile` }] : []),
    ...(profile.drainage && profile.drainage !== 'unknown' ? [{ key: 'drainage' as const, value: `drainage ${({ poor: 'lent', moderate: 'modéré', good: 'rapide' } as const)[profile.drainage]}` }] : []),
  ]
  const entries = fields.map(field => field.value)
  const horizons = profile.horizons?.map((horizon, index) => {
    const texture = horizon.texture && horizon.texture !== 'unknown' ? ({ sandy: 'sableuse', loamy: 'limoneuse', clayey: 'argileuse' } as const)[horizon.texture] : 'inconnue'
    const ph = horizon.ph === undefined ? 'pH inconnu' : `pH ${horizon.ph.toLocaleString('fr-FR')}`
    const organicMatter = horizon.organicMatterPercent === undefined ? 'matière organique inconnue' : `${horizon.organicMatterPercent.toLocaleString('fr-FR')} % de matière organique`
    const { sourceType, sampleDate, sourceName: reference, samplingMethod } = resolveSoilHorizonProvenance(horizon, profile)
    const sample = sampleDate ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${sampleDate}T12:00:00Z`)) : 'date non précisée'
    return `Horizon ${index + 1} (${horizon.topCm}–${horizon.bottomCm} cm) : texture ${texture}, ${ph}, ${organicMatter}. Origine déclarée : ${soilSourceLabels[sourceType]}${reference ? ` · ${reference}` : ''} · ${sample}${samplingMethod ? ` · méthode : ${samplingMethod}` : ''} (non vérifiée).`
  }) ?? []
  if (!entries.length && !horizons.length) {
    if (profile.sampleDate || profile.samplingMethod || profile.sourceName) return `Une fiche de prélèvement est enregistrée au point suivi ${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}${profile.sampleDate ? ` · date ${profile.sampleDate}` : ''}${profile.samplingMethod ? ` · méthode déclarée : ${profile.samplingMethod}` : ''}${profile.sourceName ? ` · référence : ${profile.sourceName}` : ''}. Aucune caractéristique de sol mesurée n’est renseignée. Ces données restent déclaratives et locales.`
    return 'Aucune caractéristique de sol n’est renseignée pour ce point. Ces champs restent inconnus tant qu’ils ne sont pas saisis; vous pouvez les compléter dans « Mon terrain ». Les données NASA de la carte ne remplacent pas une analyse de sol.'
  }
  const profileOrigin = fields.length
    ? `Origine déclarée par caractéristique : ${fields.map(field => `${soilFieldLabels[field.key]} · ${soilFieldOrigin(profile, field.key)}`).join(' ; ')}. `
    : ''
  return `Pour ce point, le profil local saisi dans FieldNova indique : ${entries.length ? `${entries.join(' · ')}. ` : ''}${horizons.length ? `${horizons.join(' ')} Les profondeurs non couvertes restent inconnues. ` : ''}${profileOrigin}Ces valeurs locales ne sont pas des mesures NASA.`
}

function formatRotationAnswer(point: GeoPoint) {
  const catalog = readCropCatalog(point)
  const workspace = readRotationWorkspace(point, catalog)
  const priorityWeights = rotationWeightsFor(workspace)
  const selectedPriorities = Object.entries(priorityWeights) as Array<[RotationPriority, 1 | 2 | 3]>
  const prioritySummary = selectedPriorities.map(([priority, weight]) => `${priorityLabels[priority]} ×${weight}`).join(' · ')
  const constraints = readRotationConstraints(point, catalog)
  const reference = workspace.plans.find(plan => plan.id === 'reference')
  const referenceMetrics = reference ? evaluateRotation(reference, catalog) : undefined
  const plans = workspace.plans.map(plan => {
    const metrics = evaluateRotation(plan, catalog)
    if (!metrics.complete) return `${plan.title} : succession incomplète.`
    const crops = plan.crops.map(id => {
      const crop = catalog.find(item => item.id === id)
      if (!crop) return 'culture inconnue'
      const root = crop.rootArchitecture === 'fibrous' ? 'racines fasciculées' : crop.rootArchitecture === 'taproot' ? 'racines pivotantes' : 'racines non documentées'
      return `${crop.label} (${crop.familyLabel}${crop.isLegume ? ', légumineuse' : ''}, ${root}${crop.origin === 'local-declaration' ? ', traits locaux non vérifiés' : ''})`
    }).join(' → ')
    const unavailable = plan.id === 'reference' ? [] : [...new Set(plan.crops.filter((id): id is CropId => Boolean(id && constraints.unavailableCropIds.includes(id))))]
    const constraintStatus = unavailable.length ? ` Option exclue du classement car le profil déclare ${unavailable.map(id => catalog.find(crop => crop.id === id)?.label ?? id).join(', ')} indisponible(s).` : ''
    const comparison = plan.id !== 'reference' && metrics.complete && referenceMetrics?.complete
      ? ` Écarts bruts par rapport à la référence : ${metrics.distinctFamilies - referenceMetrics.distinctFamilies} famille(s), ${metrics.repeatedFamilyTransitions - referenceMetrics.repeatedFamilyTransitions} répétition(s), ${metrics.legumeSeasons - referenceMetrics.legumeSeasons} année(s) avec légumineuse, ${metrics.knownRootTransitions - referenceMetrics.knownRootTransitions} transition(s) racinaire(s) documentée(s).`
      : ''
    const rankingScore = metrics.complete ? (rotationCombinedScore(metrics, priorityWeights) * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : undefined
    const priorityEvidence = plan.id !== 'reference' ? ` Note de tri pondérée : ${rankingScore === undefined ? 'non calculée, séquence incomplète' : `${rankingScore}/100`} avec ${prioritySummary}.` : ''
    return `${plan.title} (${crops}) : ${metrics.distinctFamilies} familles botaniques distinctes, ${metrics.repeatedFamilyTransitions} répétition(s) de famille, ${metrics.legumeSeasons} année(s) avec légumineuse et ${metrics.knownRootTransitions} transition(s) entre architectures racinaires connues.${comparison}${priorityEvidence}${constraintStatus}`
  })
  const unavailableLabels = constraints.unavailableCropIds.map(id => catalog.find(crop => crop.id === id)?.label ?? id)
  return `${workspace.isExample ? 'Les scénarios affichés sont des exemples sur cinq années.' : 'Voici les scénarios enregistrés pour ce point.'} Critères et poids : ${prioritySummary}. La note normalisée sert uniquement au tri descriptif. ${unavailableLabels.length ? `Cultures déclarées indisponibles pour les options : ${unavailableLabels.join(', ')}. ` : 'Aucune culture déclarée indisponible. '}${plans.join(' ')} Les architectures racinaires absentes de la référence sont laissées inconnues. Ces indicateurs décrivent la séquence; ils ne prédisent ni rendement ni amélioration du sol. La référence racinaire est régionale et doit être confirmée localement. Vous pouvez modifier les cultures et contraintes dans l’onglet Scénarios.`
}

function traceNode(id: string, toolName: string, label: string, primary: string, secondary: string, status: 'completed' | 'failed' = 'completed'): TraceNode {
  const args = toolName === 'fetch' ? { url: label } : toolName === 'read' ? { path: label } : { label }
  return { id, type: 'tool', toolName, args, primary, secondary, status }
}

export function AssistantPage() {
  const { location, selectLocation } = useSelectedLocation()
  const [layer, setLayer] = useState<LayerId>('truecolor')
  const { series, loading: loadingData, error: dataError } = usePowerMonthly(location)
  const { availability: gibsAvailability, error: gibsDateError } = useGibsAvailability()
  const [codexStatus, setCodexStatus] = useState<CodexStatus>('checking')
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: 'assistant', text: 'Bonjour. Je peux consulter les données climatiques mensuelles NASA POWER et afficher les couches MODIS ou SMAP sur la carte. Cliquez sur la carte pour changer le point suivi, puis demandez-moi la pluie, la température, le NDVI ou l’humidité du sol.' },
  ])
  const [showDetails, setShowDetails] = useState(true)
  const [mobileView, setMobileView] = useState<'chat' | 'map'>('chat')
  const [expandedAnswers, setExpandedAnswers] = useState<Record<number, boolean>>({})
  const [baseLayer, setBaseLayer] = useState<MapBaseLayer>('nasa')
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const lastId = useRef(1)

  useEffect(() => {
    let active = true
    fetch('/api/codex/status').then(response => response.json()).then(result => {
      if (active) setCodexStatus(result.available ? 'ready' : 'unavailable')
    }).catch(() => { if (active) setCodexStatus('unavailable') })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const thread = threadRef.current
    if (thread) thread.scrollTop = thread.scrollHeight
  }, [messages])

  const handleSend = async (prompt: string, files: File[]) => {
    const question = prompt.trim() || (files.length ? `Analyse cette pièce jointe : ${files.map(file => file.name).join(', ')}` : '')
    if (!question) return
    const id = ++lastId.current
    const userId = ++lastId.current
    const route = classifyQuestion(question)
    const unsupportedFarmDecision = asksForUnsupportedFarmDecision(question)
    const messagePoint = { latitude: location.latitude, longitude: location.longitude }
    const requestedLayer = route.asksLayer ?? layer
    if (route.asksLayer) setLayer(route.asksLayer)
    setMessages(current => [...current, { id: userId, role: 'user', text: question, point: messagePoint }, { id, role: 'assistant', text: '', point: messagePoint, running: true }])
    const trace: TraceNode[] = []
    let currentSeries = series
    let answer: string
    let evidence = ''
    let traceHeading = 'Aucun outil exécuté'
    let usedSources: AISource[] = []
    let evidenceTags: EvidenceTag[] = []
    let soilImport: AssistantSoilImport | undefined
    if (files.length) {
      if (files.length !== 1) {
        answer = 'Joignez un seul fichier CSV d’analyse de sol à la fois. Aucune pièce jointe n’a été lue ni transmise.'
        evidenceTags = [{ label: 'Un seul CSV accepté', kind: 'missing' }, { label: 'Aucun contenu transmis', kind: 'limit' }]
      } else {
        const file = files[0]
        const isCsv = file.name.toLocaleLowerCase('fr').endsWith('.csv')
        if (!isCsv) {
          answer = 'Ce format n’est pas analysé dans l’assistant. Joignez un CSV d’analyse de sol (1 Mo maximum); les PDF et images ne sont pas lus ni transmis à Codex CLI.'
          evidenceTags = [{ label: 'Format non pris en charge', kind: 'missing' }, { label: 'Fichier non transmis', kind: 'limit' }]
        } else if (!file.size || file.size > 1_000_000) {
          answer = 'Le CSV doit contenir des données et ne pas dépasser 1 Mo. Le fichier n’a pas été lu ni enregistré.'
          evidenceTags = [{ label: 'Limite CSV · 1 Mo', kind: 'missing' }, { label: 'Aucune donnée enregistrée', kind: 'limit' }]
        } else {
          try {
            const parsed = parseSoilAnalysisCsv(await file.text())
            trace.push({ id: `soil-csv-read-${id}`, type: 'step', primary: 'CSV lu dans ce navigateur', secondary: `${file.name} · aucun envoi au serveur ou à Codex CLI`, status: 'completed' })
            if (!parsed.valid) {
              answer = `Le CSV n’a pas été importé : ${parsed.error}`
              trace.push({ id: `soil-csv-invalid-${id}`, type: 'step', primary: 'Validation du CSV échouée', secondary: parsed.error, status: 'failed' })
              traceHeading = 'CSV d’analyse du sol refusé'
              evidenceTags = [{ label: 'Fichier local', kind: 'local' }, { label: 'Format invalide', kind: 'missing' }]
            } else {
              soilImport = { ...parsed.value, fileName: file.name, point: messagePoint, state: 'ready' }
              const date = parsed.value.sampleDate ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${parsed.value.sampleDate}T12:00:00Z`)) : 'date non renseignée'
              answer = `Aperçu validé : ${parsed.value.rowCount} horizon(s) · ${parsed.value.laboratory ?? 'laboratoire non indiqué'} · ${date}. Rien n’est enregistré avant votre confirmation.`
              trace.push({ id: `soil-csv-valid-${id}`, type: 'step', primary: 'Horizon(s) et métadonnées validés', secondary: `${parsed.value.rowCount} ligne(s) · profil du sol au point ${coordinate(messagePoint.latitude, 'N', 'S')} · ${coordinate(messagePoint.longitude, 'E', 'O')}`, status: 'completed' })
              traceHeading = 'Import local en attente de confirmation'
              evidenceTags = [{ label: 'CSV lu localement', kind: 'local' }, { label: 'Aucune donnée enregistrée', kind: 'limit' }]
            }
          } catch {
            answer = 'Le fichier CSV n’a pas pu être lu. Vérifiez qu’il s’agit d’un fichier texte de moins de 1 Mo, puis réessayez.'
            trace.push({ id: `soil-csv-failed-${id}`, type: 'step', primary: 'Lecture du CSV impossible', secondary: 'Aucune donnée n’a été enregistrée.', status: 'failed' })
            traceHeading = 'Lecture du fichier échouée'
            evidenceTags = [{ label: 'Fichier local', kind: 'local' }, { label: 'Aucune donnée enregistrée', kind: 'limit' }]
          }
        }
      }
    } else if (route.intent === 'soil') {
      const profile = readSoilProfile(location)
      const knownFields = Object.values(profile).filter(value => value !== undefined).length
      trace.push(traceNode(`soil-${id}`, 'read', 'Profil de sol local · navigateur', 'Profil local consulté', knownFields ? `${knownFields} champ(s) renseigné(s) pour le point suivi` : 'Aucun champ de sol renseigné', 'completed'))
      traceHeading = 'Profil de sol local consulté'
      answer = formatSoilAnswer(location)
      evidence = answer
      usedSources = [soilProfileSource(location)]
      evidenceTags = [{ label: 'Déclaration locale', kind: 'local' }, { label: 'Mesure non vérifiée', kind: 'limit' }]
    } else if (route.intent === 'rotation') {
      const catalog = readCropCatalog(location)
      const workspace = readRotationWorkspace(location, catalog)
      const constraints = readRotationConstraints(location, catalog)
      const completePlans = workspace.plans.filter(plan => evaluateRotation(plan, catalog).complete).length
      const weights = Object.entries(rotationWeightsFor(workspace)).map(([priority, weight]) => `${priorityLabels[priority as RotationPriority]} ×${weight}`).join(' · ')
      trace.push(traceNode(`rotation-${id}`, 'read', 'Scénarios de rotation · navigateur', 'Rotations et contraintes consultées', `${completePlans}/3 scénario(s) complet(s) · critères ${weights} · ${constraints.unavailableCropIds.length} culture(s) indisponible(s)`, 'completed'))
      traceHeading = 'Scénarios de rotation consultés'
      answer = formatRotationAnswer(location)
      evidence = answer
      usedSources = [...rotationReferences, ...localCropReferences(location)]
      evidenceTags = [{ label: 'Données locales', kind: 'local' }, { label: 'Calcul FieldNova', kind: 'calculation' }, { label: 'Indicateur descriptif', kind: 'limit' }]
    } else if (route.intent === 'farm') {
      const profile = readFarmProfile(location)
      const catalog = readCropCatalog(location)
      const workspace = readRotationWorkspace(location, catalog)
      const constraints = readRotationConstraints(location, catalog)
      const weights = Object.entries(rotationWeightsFor(workspace)).map(([priority, weight]) => `${priorityLabels[priority as RotationPriority]} ×${weight}`).join(' · ')
      trace.push(traceNode(`farm-${id}`, 'read', 'Profil de ferme et contraintes locales · navigateur', profile ? `Profil de ${profile.name} consulté` : 'Aucun profil de ferme renseigné', `${farmWaterAccessLabels[profile?.waterAccess ?? 'unknown']} · critères de rotation ${weights} · ${constraints.unavailableCropIds.length} culture(s) exclue(s)`, 'completed'))
      traceHeading = 'Profil et contraintes de ferme consultés'
      answer = formatFarmProfileAnswer(location)
      evidence = answer
      usedSources = [farmProfileSource(location), soilProfileSource(location), rotationWorkspaceSource, ...localCropReferences(location)]
      evidenceTags = [{ label: 'Déclarations locales', kind: 'local' }, { label: 'Calcul FieldNova', kind: 'calculation' }, { label: 'Non vérifié sur le terrain', kind: 'limit' }]
    } else if (route.intent === 'unknown' || unsupportedFarmDecision) {
      answer = unsupportedFarmDecision
        ? 'Je ne peux pas calculer une dose ou une date d’irrigation, ni prédire un rendement. Les séries NASA disponibles sont mensuelles et régionales; il manque notamment des mesures de parcelle, la culture et son stade, l’état hydrique local et les contraintes réelles. Je peux expliquer les données climatiques disponibles, lire les informations saisies dans FieldNova ou comparer les rotations enregistrées. Aucun calcul de conseil n’a été exécuté.'
        : 'Je ne peux pas traiter cette question avec les outils disponibles dans FieldNova. Je peux consulter les séries NASA POWER mensuelles, les couches NASA de la carte, le profil local du sol et les rotations enregistrées. Aucune donnée n’a été consultée pour cette question.'
      evidence = answer
      evidenceTags = unsupportedFarmDecision
        ? [{ label: 'Décision non calculable', kind: 'missing' }, { label: 'Données insuffisantes', kind: 'limit' }]
        : [{ label: 'Hors périmètre FieldNova', kind: 'missing' }, { label: 'Aucun outil consulté', kind: 'limit' }]
      trace.push({ id: `scope-${id}`, type: 'step', primary: unsupportedFarmDecision ? 'Demande de conseil non prise en charge' : 'Question hors périmètre FieldNova', secondary: 'Aucun outil NASA ou calcul de scénario exécuté', status: 'completed' })
      traceHeading = 'Limite de réponse expliquée'
    } else {
      let failed = false
      const seriesAlreadyLoaded = Boolean(currentSeries && currentSeries.point.latitude === location.latitude && currentSeries.point.longitude === location.longitude)
      try {
        if (!seriesAlreadyLoaded) {
          currentSeries = await fetchPowerMonthly(location, 5)
        }
      } catch {
        const demo = readDemoWorkspace()
        const isDemoPoint = demo
          && location.latitude.toFixed(4) === demo.point.latitude.toFixed(4)
          && location.longitude.toFixed(4) === demo.point.longitude.toFixed(4)
        currentSeries = isDemoPoint ? offlineDemoPowerSeries(location, 5) : null
        failed = !currentSeries
      }
      const record = currentSeries ? latestCompleteRecord(currentSeries.records) : undefined
      const isDemoSnapshot = currentSeries?.deliveryMode === 'demo-fixture'
      const demoSnapshotNote = isDemoSnapshot ? `Extrait NASA POWER hors ligne · capturé le ${currentSeries?.fetchedAt.slice(0, 10)} · dernière période exploitable ${record ? formatPowerMonth(record.date) : 'inconnue'} · aucune requête actuelle.` : ''
      const gridLabel = currentSeries ? `Centre maille MERRA-2 ${coordinate(currentSeries.gridPoint.latitude, 'N', 'S')} · ${coordinate(currentSeries.gridPoint.longitude, 'E', 'O')} · résolution 0,5° × 0,625°` : 'La requête n’a pas abouti'
      trace.push(traceNode(`power-${id}`, seriesAlreadyLoaded || isDemoSnapshot ? 'read' : 'fetch', isDemoSnapshot ? 'Extrait NASA POWER local · mode démonstration' : seriesAlreadyLoaded ? 'Série NASA POWER chargée · contexte du point' : 'NASA POWER · API mensuelle', failed ? 'NASA POWER indisponible' : isDemoSnapshot ? 'Extrait local consulté · aucune requête réseau' : seriesAlreadyLoaded ? 'Série chargée consultée' : 'Série récupérée', [record ? formatPowerMonth(record.date) : '', gridLabel, demoSnapshotNote].filter(Boolean).join(' · '), failed ? 'failed' : 'completed'))
      if (route.asksLayer) {
        const label = layerOptions.find(item => item.id === route.asksLayer)?.label ?? 'Couche NASA'
        trace.push({ id: `map-${id}`, type: 'step', primary: 'Couche affichée sur la carte', secondary: label, status: 'completed' })
      }
      traceHeading = isDemoSnapshot ? 'Extrait NASA POWER consulté · mode démo' : route.asksLayer ? 'NASA POWER consulté · carte mise à jour' : 'NASA POWER consulté'
      answer = makeClimateAnswer(question, currentSeries, requestedLayer, location)
      if (demoSnapshotNote) answer = `${demoSnapshotNote}\n\n${answer}`
      evidence = [demoSnapshotNote, answer].filter(Boolean).join('\n\n')
      usedSources = [{ ...sources[0], snippet: demoSnapshotNote || sources[0].snippet }, ...(route.asksLayer ? [sources[1]] : [])]
      evidenceTags = currentSeries && latestCompleteRecord(currentSeries.records)
        ? [{ label: isDemoSnapshot ? 'NASA POWER · extrait local daté' : 'NASA POWER · donnée mensuelle modélisée', kind: 'source' }, ...(route.asksLayer?.includes('ndvi') ? [{ label: 'Imagerie NASA GIBS', kind: 'source' } as EvidenceTag] : []), { label: 'Maille régionale · pas un diagnostic parcellaire', kind: 'limit' }]
        : [{ label: 'Donnée NASA indisponible', kind: 'missing' }, { label: 'Aucune valeur de remplacement', kind: 'limit' }]
    }
    if (!files.length && codexStatus === 'ready' && route.intent !== 'unknown' && !unsupportedFarmDecision) {
      try {
        const response = await fetch('/api/codex/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            history: messages.filter(message => message.text).slice(-6).map(message => ({ role: message.role, text: message.text })),
            evidence,
          }),
        })
        const result = await response.json()
        if (!response.ok || typeof result.answer !== 'string') throw new Error(result.error ?? 'Codex CLI indisponible.')
        answer = result.answer
        trace.push({ id: `codex-${id}`, type: 'step', primary: 'Réponse formulée par Codex CLI', secondary: 'Contexte FieldNova fourni · session éphémère', status: 'completed' })
        traceHeading = traceHeading === 'Aucun outil exécuté' ? 'Codex CLI · aucune donnée terrain consultée' : 'Outils FieldNova · réponse Codex CLI'
      } catch {
        trace.push({ id: `codex-${id}`, type: 'step', primary: 'Codex CLI indisponible · réponse locale utilisée', secondary: 'Aucune donnée supplémentaire n’a été consultée', status: 'failed' })
        traceHeading = 'Réponse locale FieldNova'
      }
    } else if (!files.length && codexStatus === 'unavailable' && route.intent !== 'unknown' && !unsupportedFarmDecision) {
      trace.push({ id: `codex-${id}`, type: 'step', primary: 'Codex CLI non connecté · réponse locale utilisée', secondary: 'Connectez Codex CLI sur le serveur de démonstration', status: 'failed' })
      traceHeading = 'Réponse locale FieldNova'
    }
    setMessages(current => current.map(message => message.id === id ? { ...message, text: answer, trace, traceHeading, running: false, sources: usedSources.length ? usedSources : undefined, evidenceTags, soilImport } : message))
  }

  const saveSoilImport = (messageId: number, imported: AssistantSoilImport) => {
    try {
      const existing = readSoilProfile(imported.point)
      const preservedFieldProvenance = Object.fromEntries(
        (Object.keys(soilFieldLabels) as SoilFieldKey[])
          .filter(field => existing[field] !== undefined)
          .map(field => [field, resolveSoilFieldProvenance(existing, field)]),
      ) as typeof existing.fieldProvenance
      const profile = {
        ...existing,
        horizons: imported.horizons.map(horizon => ({ ...horizon })),
        sourceType: 'lab-analysis' as const,
        sourceName: imported.laboratory,
        sampleDate: imported.sampleDate,
        samplingMethod: imported.samplingMethod,
        fieldProvenance: { ...preservedFieldProvenance, ...existing.fieldProvenance },
      }
      const canArchive = Boolean(imported.sampleDate && imported.samplingMethod && imported.horizons.some(horizon => horizon.ph !== undefined || horizon.organicMatterPercent !== undefined || (horizon.texture && horizon.texture !== 'unknown')))
      if (canArchive) archiveSoilAnalysis(imported.point, profile)
      else writeSoilProfile(imported.point, profile)
      window.dispatchEvent(new CustomEvent('fieldnova:soil-profile-change', { detail: { point: imported.point } }))
      setMessages(current => current.map(message => message.id === messageId && message.soilImport ? {
        ...message,
        text: canArchive ? 'L’analyse et ses horizons ont été ajoutés au profil local et archivés. Les caractéristiques générales déjà saisies ont été conservées.' : 'Les horizons ont été ajoutés au profil local. Les caractéristiques générales déjà saisies ont été conservées; l’échantillon pourra être archivé quand sa date et sa méthode seront renseignées.',
        soilImport: { ...message.soilImport, state: 'saved', archived: canArchive, error: undefined },
        evidenceTags: [{ label: 'Profil local mis à jour', kind: 'local' }, { label: canArchive ? 'Échantillon archivé' : 'Archive à compléter', kind: canArchive ? 'calculation' : 'limit' }],
      } : message))
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'L’enregistrement local a échoué.'
      setMessages(current => current.map(message => message.id === messageId && message.soilImport ? { ...message, soilImport: { ...message.soilImport, error: messageText } } : message))
    }
  }

  const activeLayer = layerOptions.find(item => item.id === layer)!
  const dismissSoilImport = (messageId: number) => setMessages(current => current.map(message => message.id === messageId && message.soilImport
    ? { ...message, text: 'Aperçu ignoré. Le profil de sol n’a pas été modifié.', soilImport: undefined, evidenceTags: [{ label: 'Aucune donnée enregistrée', kind: 'limit' }] }
    : message))
  const LayerIcon = activeLayer.icon
  const latest = series ? latestCompleteRecord(series.records) : undefined
  const soilValue = latest?.rootZoneWetness
  const imageryDate = recentImageryDate()
  const displayedGibsDate = layer === 'truecolor'
    ? resolveGibsDate(imageryDate, gibsAvailability?.trueColor)
    : layer === 'ndvi'
      ? resolveGibsDate(imageryDate, gibsAvailability?.ndvi)
      : layer === 'surface'
        ? gibsAvailability?.surfaceSoil.at(-1)?.end ?? null
        : gibsAvailability?.rootSoil.at(-1)?.end ?? null
  const gibsDateLabel = displayedGibsDate ? formatGibsDate(displayedGibsDate) : gibsDateError ? 'date source indisponible' : 'date en chargement'
  const displayedGibsProduct = layer === 'truecolor' || layer === 'ndvi' ? 'MODIS' : layer === 'surface' ? 'SMAP surface' : 'SMAP racines'
  const requestedDateNote = (layer === 'truecolor' || layer === 'ndvi') && displayedGibsDate && displayedGibsDate !== imageryDate ? ` · cible ${formatGibsDate(imageryDate)}` : ''
  const suggestedQuestions = [
    ...(latest?.precipitationMmPerDay !== undefined ? [{ label: 'Pluie du mois', question: 'Quelle est la pluie mensuelle NASA POWER ?' }] : []),
    ...(latest?.temperatureC !== undefined ? [{ label: 'Température', question: 'Que montrent les températures mensuelles NASA POWER ?' }] : []),
    ...(latest?.rootZoneWetness !== undefined || latest?.surfaceSoilWetness !== undefined ? [{ label: 'Humidité modélisée', question: 'Explique l’humidité du sol observée pour ce point.' }] : []),
    [{ label: layer === 'ndvi' ? 'Limites du NDVI' : 'Voir le NDVI', question: layer === 'ndvi' ? 'Explique les limites du NDVI affiché.' : 'Affiche le NDVI et explique ses limites.' }],
    { label: 'Profil de sol', question: 'Lis mon profil de sol pour ce point.' },
    { label: 'Profil de ferme', question: 'Résume mon profil de ferme et mes contraintes d’eau.' },
    { label: 'Mes rotations', question: 'Compare mes rotations pour ce point.' },
  ].flat()

  return (
    <section className={`assistant-workspace assistant-mobile-${mobileView}`} aria-label="Assistant agricole et carte NASA interactive">
      <div className="assistant-mobile-view-switcher" role="group" aria-label="Vue mobile de l’assistant">
        <button type="button" aria-pressed={mobileView === 'chat'} onClick={() => setMobileView('chat')}><MessageCircle size={16} /> Chat</button>
        <button type="button" aria-pressed={mobileView === 'map'} onClick={() => setMobileView('map')}><MapIcon size={16} /> Carte</button>
      </div>
      <aside className="assistant-chat-panel">
        <header className="assistant-chat-header">
          <div className="assistant-avatar"><Sparkles size={18} /></div>
          <div className="assistant-chat-heading"><h1>Assistant FieldNova</h1><p>Point actif · {coordinate(location.latitude, 'N', 'S')} · {coordinate(location.longitude, 'E', 'O')}</p></div>
          <button className="assistant-quiet-icon" type="button" title="Informations sur cet assistant" aria-label="À propos de cet assistant" onClick={() => setShowDetails(value => !value)}><CircleHelp size={17} /></button>
        </header>
        <div className={`assistant-demo-notice ${codexStatus === 'unavailable' ? 'is-warning' : ''}`}><span><ShieldCheck size={14} /></span><p><strong>{codexStatus === 'checking' ? 'Connexion à Codex CLI…' : codexStatus === 'ready' ? 'Codex CLI connecté · outils FieldNova actifs' : 'Codex CLI indisponible · mode données locales'}</strong><small>{codexStatus === 'ready' ? 'Codex rédige les réponses à partir des résultats NASA et des données du terrain consultées par FieldNova. Les CSV de sol sont lus localement et soumis à confirmation; aucun fichier ne lui est transmis.' : 'Les outils NASA et locaux restent disponibles. Les CSV de sol sont lus dans le navigateur après sélection; aucun fichier n’est transmis.'}</small></p></div>
        <div className="assistant-chat-context"><span className="assistant-context-pill"><MapPin size={12} /> Coordonnée sélectionnée</span><span>{loadingData ? 'NASA POWER…' : dataError ? 'Données indisponibles' : latest ? `Données · ${formatPowerMonth(latest.date)}` : 'Aucune observation récente'}</span></div>
        <div className="assistant-thread" ref={threadRef} aria-live="polite">
          {showDetails && <div className="assistant-welcome"><span><Sparkles size={14} /></span><p>Posez une question : l’assistant interroge la série mensuelle NASA POWER et met à jour les couches réellement visibles sur la carte. Les données régionales ne remplacent pas des mesures de parcelle.</p><button type="button" aria-label="Masquer les informations" onClick={() => setShowDetails(false)}><X size={13} /></button></div>}
          {messages.map(message => <article key={message.id} className={`assistant-message message-${message.role}`}>
            {message.role === 'assistant' && <div className="assistant-message-mark"><Sparkles size={14} /></div>}
            <div className="assistant-message-body">
              {message.role === 'user' ? <div className="assistant-user-bubble">{message.text}</div> : <>
                {message.point && <small className="assistant-answer-point">Point utilisé · {message.point.latitude.toFixed(5).replace('.', ',')}° · {message.point.longitude.toFixed(5).replace('.', ',')}°</small>}
                {Boolean(message.trace?.length) && <ThinkingState nodes={message.trace!} autoPlay={Boolean(message.running)} defaultExpanded={Boolean(message.running)} workingLabel={message.running ? 'Exécution des outils FieldNova' : message.traceHeading ?? 'Activité de l’assistant'} onSettled={() => setMessages(current => current.map(item => item.id === message.id ? { ...item, running: false } : item))} className="assistant-trace" />}
                {Boolean(message.evidenceTags?.length) && <div className="assistant-evidence-tags" aria-label="Nature et limites des éléments utilisés">{message.evidenceTags!.map((tag, index) => <span key={`${message.id}-${index}`} className={`is-${tag.kind}`}>{tag.label}</span>)}</div>}
                {message.text && summarizeForField(message.text).length + 80 < message.text.trim().length ? <div className="assistant-field-answer"><div className="assistant-field-summary"><strong>En bref</strong><p>{summarizeForField(message.text)}</p></div><div className="assistant-answer-details"><button type="button" aria-expanded={Boolean(expandedAnswers[message.id])} onClick={() => setExpandedAnswers(current => ({ ...current, [message.id]: !current[message.id] }))}>{expandedAnswers[message.id] ? 'Masquer les détails' : 'Voir la réponse détaillée'}</button>{expandedAnswers[message.id] && <div className="assistant-answer-full"><p className="assistant-answer-text">{detailedFieldAnswer(message.text)}</p>{message.sources && <AISources className="assistant-sources" label="Sources utilisées" sources={message.sources} />}<MessageActions text={message.text} actions={['copy', 'feedback']} quiet={false} className="assistant-actions" /></div>}</div></div> : message.text ? <><p className="assistant-answer-text">{message.text}</p>{message.sources && <AISources className="assistant-sources" label="Sources utilisées" sources={message.sources} />}<MessageActions text={message.text} actions={['copy', 'feedback']} quiet={false} className="assistant-actions" /></> : message.running ? <p className="assistant-pending">Consultation des données sélectionnées…</p> : null}
                {message.soilImport && <AssistantSoilImportCard value={message.soilImport} onApply={() => saveSoilImport(message.id, message.soilImport!)} onDismiss={() => dismissSoilImport(message.id)} />}
              </>}
            </div>
          </article>)}
        </div>
        <div className="assistant-suggestions" aria-label="Questions suggérées selon les données disponibles">
          <span>Essayer</span>
          {suggestedQuestions.map(item => <button type="button" key={item.label} onClick={() => handleSend(item.question, [])}>{item.label} <ChevronDown size={12} /></button>)}
        </div>
        <div className="assistant-composer-wrap">
          <LiquidMultimodalInput className="assistant-composer" defaultModel="fast" placeholder="Demandez à propos des données NASA…" maxHeight={110} onSubmit={handleSend} />
          <div className="assistant-composer-foot"><span><span className="assistant-online-dot" /> Codex CLI {codexStatus === 'checking' ? '· vérification' : codexStatus === 'ready' ? '· connecté' : '· local'} · NASA POWER {loadingData ? '· chargement' : dataError ? '· indisponible' : '· connecté'}</span><span>CSV sol · 1 Mo max · local · Entrée pour envoyer</span></div>
        </div>
      </aside>

      <div className="assistant-map-area">
        <header className="assistant-map-header"><div><span className="assistant-map-kicker"><Layers3 size={14} /> EXPLORATION NASA · GIBS</span><h2>Carte du point suivi <ChevronDown size={16} /></h2><p>Cliquez sur la carte pour déplacer le point partagé avec les autres vues.</p></div><div className="assistant-map-header-actions"><span className="assistant-demo-chip">{displayedGibsProduct} · {gibsDateLabel}{requestedDateNote}</span><button type="button" className="assistant-expand-map" aria-label="Recentrer la carte" onClick={() => map?.flyTo({ center: [location.longitude, location.latitude], zoom: 5 })}><Maximize2 size={15} /></button></div></header>
        <div className="assistant-map-canvas">
          <FieldMap center={location} selectedPoint={location} baseLayer={baseLayer} showNdvi={layer === 'ndvi'} showSurfaceSoil={layer === 'surface'} showRootSoil={layer === 'root'} powerGridCell={series?.point.latitude === location.latitude && series.point.longitude === location.longitude ? series.gridCell : null} imageryDate={imageryDate} onPointSelect={selectLocation} onMapReady={setMap} ariaLabel="Carte interactive NASA GIBS et OpenStreetMap" />
          <div className="assistant-map-toolbar"><div className="assistant-zoom-stack"><button type="button" aria-label="Zoom avant" onClick={() => map?.zoomIn({ duration: 250 })}><Plus size={16} /></button><button type="button" aria-label="Zoom arrière" onClick={() => map?.zoomOut({ duration: 250 })}><Minus size={16} /></button></div><button type="button" aria-label="Utiliser ma position" onClick={() => navigator.geolocation?.getCurrentPosition(position => selectLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }))}><LocateFixed size={16} /></button></div>
          <div className="assistant-map-top-overlay"><span><span className="assistant-live-indicator" />Point partagé</span><span>{coordinate(location.latitude, 'N', 'S')}</span><span>{coordinate(location.longitude, 'E', 'O')}</span></div>
          <div className="assistant-map-layer-card"><div className="assistant-map-layer-title"><span><LayerIcon size={15} /></span><div><strong>{activeLayer.label}</strong><small>GIBS · {gibsDateLabel}{requestedDateNote}</small></div><button type="button" aria-label="Fond de carte" onClick={() => setBaseLayer(value => value === 'nasa' ? 'streets' : 'nasa')}><ChevronDown size={15} /></button></div><div className="assistant-layer-choices">{layerOptions.map(item => { const Icon = item.icon; return <button key={item.id} type="button" className={layer === item.id ? 'is-active' : ''} onClick={() => setLayer(item.id)}><Icon size={13} />{item.short}</button> })}</div><button type="button" className="assistant-base-toggle" onClick={() => setBaseLayer(value => value === 'nasa' ? 'streets' : 'nasa')}>{baseLayer === 'nasa' ? 'Passer au plan de rues' : 'Passer au fond NASA'}</button><p><ShieldCheck size={12} /> Résolution satellite régionale · pas parcellaire</p></div>
          <div className="assistant-map-legend"><span><i className={`legend-gradient legend-${layer}`} />Couche NASA active</span><small>Pixel satellite ≠ contour de parcelle</small></div>
          <div className="assistant-scale"><span />Échelle indiquée sur la carte</div>
        </div>
        <footer className="assistant-map-footer"><div className="assistant-footer-title"><Sprout size={16} /><span><strong>Point NASA suivi</strong><small>{series?.point.latitude === location.latitude && series.point.longitude === location.longitude ? `Centre maille POWER · ${coordinate(series.gridPoint.latitude, 'N', 'S')} · ${coordinate(series.gridPoint.longitude, 'E', 'O')} · 0,5° × 0,625°` : 'Coordonnée choisie sur la carte'}</small></span></div><div className="assistant-soil-stat"><span className="soil-stat-icon moisture"><Droplets size={14} /></span><span><small>Humidité racinaire · POWER</small><strong>{soilValue !== undefined ? `${Math.round(soilValue * 100)} %` : 'Non disponible'} <em>{latest ? formatPowerMonth(latest.date) : ''}</em></strong></span></div><div className="assistant-soil-stat"><span className="soil-stat-icon weather"><ThermometerSun size={14} /></span><span><small>Température · POWER</small><strong>{latest?.temperatureC !== undefined ? `${latest.temperatureC.toFixed(1).replace('.', ',')} °C` : 'Non disponible'} <em>{latest ? formatPowerMonth(latest.date) : ''}</em></strong></span></div><div className="assistant-soil-stat"><span className="soil-stat-icon organic"><CloudRain size={14} /></span><span><small>Pluie moyenne · POWER</small><strong>{latest?.precipitationMmPerDay !== undefined ? `${latest.precipitationMmPerDay.toFixed(1).replace('.', ',')} mm/j` : 'Non disponible'} <em>{latest ? formatPowerMonth(latest.date) : ''}</em></strong></span></div><button type="button" className="assistant-map-details" onClick={() => handleSend('Explique les données NASA POWER pour ce point.', [])}>Analyser les données <Send size={13} /></button></footer>
      </div>
    </section>
  )
}
