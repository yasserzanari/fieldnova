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
import { fieldObservationKindLabel, readFieldObservations, writeFieldObservations, type FieldObservation, type ObservationKind } from '../../lib/farm/field-observations'
import { archiveSoilAnalysis, readSoilProfile, resolveSoilFieldProvenance, resolveSoilHorizonProvenance, soilFieldLabels, soilSourceLabels, writeSoilProfile, type SoilFieldKey } from '../../lib/farm/soil-profile'
import { parseSoilAnalysisCsv } from '../../lib/farm/soil-analysis-csv'
import { readRotationConstraints } from '../scenarios/rotation-constraints'
import { formatCropMonthWindow, monthWindowsOverlap, readCropCalendar, readFarmWorkWindows } from '../scenarios/crop-calendar'
import { declaredFarmOperationCount, farmOperations, operationAvailabilityLabels, readFarmOperationProfile } from '../../lib/farm/operation-availability'
import { useSelectedLocation, type GeoPoint } from '../../lib/geo/location'
import { formatLength, formatPrecipitationRate, formatTemperature, useMeasurementSystem } from '../../lib/units/measurement-units'
import { evaluateRotation, priorityLabels, readCropCatalog, readRotationWorkspace, rotationCombinedScore, rotationScoreMissingTraits, rotationSources, rotationWeightsFor, type CropDefinition, type CropId, type RotationPriority } from '../scenarios/rotation-model'
import { AssistantSoilImportCard, type AssistantSoilImport } from './AssistantSoilImportCard'
import { AssistantObservationCard, type AssistantObservationDraft } from './AssistantObservationCard'
import './assistant.css'

type LayerId = 'truecolor' | 'ndvi' | 'surface' | 'root' | 'soilgrids-clay'
type Intent = 'soil' | 'calendar' | 'farm' | 'rotation' | 'climate' | 'map' | 'observations' | 'unknown'
type EvidenceTag = { label: string; kind: 'source' | 'calculation' | 'local' | 'limit' | 'missing' }
type Message = { id: number; role: 'user' | 'assistant'; text: string; point?: GeoPoint; intent?: Intent; trace?: TraceNode[]; traceHeading?: string; running?: boolean; sources?: AISource[]; evidenceTags?: EvidenceTag[]; soilImport?: AssistantSoilImport; observationDraft?: AssistantObservationDraft }
type CodexStatus = 'checking' | 'ready' | 'unavailable'

const sources: AISource[] = [
  { id: 'power', title: 'NASA POWER · données mensuelles', url: 'https://power.larc.nasa.gov/docs/services/api/temporal/monthly/', snippet: 'Série au point de grille NASA POWER : température, précipitations et humidité du sol modélisée.' },
  { id: 'gibs', title: 'NASA GIBS · imagerie et humidité du sol', url: 'https://nasa-gibs.github.io/gibs-api-docs/access-basics/', snippet: 'Tuiles cartographiques MODIS et SMAP affichées à leur résolution native.' },
  { id: 'soilgrids', title: 'ISRIC SoilGrids · argile cartographiée', url: 'https://maps.isric.org/mapserv/clay?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities', snippet: 'Couche WMS SoilGrids 2.0 clay_0-5cm_mean, prédiction cartographique en fraction massique. Pixel nominal de 250 m; aucune valeur ponctuelle n’est extraite.' },
]
const rotationReferences: AISource[] = [
  { id: 'fieldnova-rotations', title: 'FieldNova · scénarios enregistrés', url: '/app/scenarios', snippet: 'Séquences, priorité, métriques descriptives et contraintes consultées pour le point sélectionné.' },
  { id: 'inpn-taxref', title: rotationSources.botanicalFamilies.label, url: rotationSources.botanicalFamilies.url, snippet: 'Le référentiel taxonomique TAXREF de l’INPN documente la classification des espèces, dont leur famille botanique.' },
  { id: 'draaf-rotation', title: rotationSources.rootArchitecture.label, url: rotationSources.rootArchitecture.url, snippet: 'La DRAAF décrit les rotations, l’alternance des familles et des architectures racinaires; référence régionale à confirmer pour la parcelle.' },
  { id: 'inrae-rotation', title: rotationSources.legumes.label, url: rotationSources.legumes.url, snippet: 'INRAE explique la diversification végétale, les successions pluriannuelles et le rôle des légumineuses.' },
]
const rotationWorkspaceSource: AISource = { id: 'fieldnova-rotations', title: 'FieldNova · scénarios enregistrés', url: '/app/scenarios', snippet: 'Cultures, critères et contraintes enregistrés localement pour le point sélectionné.' }
const fieldJournalSource: AISource = { id: 'fieldnova-field-journal', title: 'FieldNova · journal de terrain local', url: '/app/terrain', snippet: 'Observations ajoutées par l’utilisateur pour le point suivi; déclarations locales non vérifiées, distinctes des données NASA.' }

function cropCalendarSources(point: GeoPoint): AISource[] {
  const catalog = readCropCatalog(point)
  const calendar = readCropCalendar(point)
  const workWindows = readFarmWorkWindows(point)
  const declaredSources = catalog.flatMap(crop => {
    const entry = calendar[crop.id]
    if (!entry?.sourceUrl) return []
    return [{ id: `crop-calendar-${crop.id}`, title: `${crop.label} · source de calendrier déclarée`, url: entry.sourceUrl, snippet: `${entry.sourceName || 'Référence'} saisie par l’utilisateur pour le calendrier de ${crop.label}; non vérifiée indépendamment par FieldNova.` }]
  })
  return [{ id: 'fieldnova-crop-calendar', title: 'FieldNova · calendrier cultural local', url: '/app/scenarios', snippet: `Fenêtres de semis et de récolte des cultures et disponibilités habituelles de la ferme saisies localement pour le point suivi (${formatCropMonthWindow(workWindows.sowing)}; ${formatCropMonthWindow(workWindows.harvest)}); aucune date par défaut ni validation agronomique.` }, ...declaredSources]
}

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

function farmOperationsSource(point: GeoPoint): AISource {
  const profile = readFarmOperationProfile(point)
  return {
    id: 'fieldnova-farm-operations',
    title: 'FieldNova · opérations et matériel déclarés',
    url: '/app/scenarios',
    snippet: `${declaredFarmOperationCount(profile)}/7 opérations ont un statut ou une précision saisie localement; données non vérifiées et sans comparaison aux besoins des cultures.`,
  }
}

const layerOptions: Array<{ id: LayerId; label: string; short: string; source: 'NASA GIBS' | 'ISRIC SoilGrids'; icon: typeof Activity }> = [
  { id: 'truecolor', label: 'Image MODIS', short: 'Satellite', source: 'NASA GIBS', icon: Layers3 },
  { id: 'ndvi', label: 'NDVI · MODIS', short: 'NDVI', source: 'NASA GIBS', icon: Leaf },
  { id: 'surface', label: 'Humidité de surface · SMAP', short: 'Surface', source: 'NASA GIBS', icon: Droplets },
  { id: 'root', label: 'Humidité racinaire · SMAP', short: 'Racines', source: 'NASA GIBS', icon: Sprout },
  { id: 'soilgrids-clay', label: 'Argile cartographiée · 0–5 cm', short: 'Argile', source: 'ISRIC SoilGrids', icon: Layers3 },
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

function makeClimateAnswer(question: string, series: PowerMonthlySeries | null, layer: LayerId, selectedPoint: GeoPoint, measurementSystem: ReturnType<typeof useMeasurementSystem>) {
  if (!series) return 'Je n’ai pas pu charger NASA POWER pour le point sélectionné. Vérifiez la connexion puis réessayez ; aucune valeur de démonstration n’est substituée aux données manquantes.'
  const records = series.records
  const record = latestCompleteRecord(records)
  if (!record) return 'NASA POWER n’a renvoyé aucune observation mensuelle exploitable pour ce point. La carte reste disponible, mais je ne peux pas donner de valeur climatique.'

  const lower = question.toLocaleLowerCase('fr')
  const point = `${coordinate(series.point.latitude, 'N', 'S')} · ${coordinate(series.point.longitude, 'E', 'O')}`
  const prefix = `Pour le point ${point}, la dernière période mensuelle exploitable est ${formatPowerMonth(record.date)}.`
  const requestedLayer = layerOptions.find(item => item.id === layer)?.label
  const asksPrecipitation = /pluie|précip/.test(lower)
  const asksTemperature = /temp|chaud|froid/.test(lower)
  const asksSoilMoisture = /irrig|eau|humid|\bsol\b/.test(lower)
  const asksVegetation = /ndvi|vigueur/.test(lower)
  const requestedMetrics = [asksPrecipitation, asksTemperature, asksSoilMoisture, asksVegetation].filter(Boolean).length
  if (requestedMetrics > 1) {
    const metrics = [
      asksPrecipitation
        ? record.precipitationMmPerDay !== undefined
          ? `Pluie : ${formatPrecipitationRate(record.precipitationMmPerDay, measurementSystem)} en moyenne journalière sur le mois (PRECTOTCORR).`
          : 'Pluie : aucune valeur exploitable pour cette période.'
        : '',
      asksTemperature
        ? record.temperatureC !== undefined
          ? `Température moyenne : ${formatTemperature(record.temperatureC, measurementSystem)}${record.temperatureMinC !== undefined && record.temperatureMaxC !== undefined ? ` (min. ${formatTemperature(record.temperatureMinC, measurementSystem)} ; max. ${formatTemperature(record.temperatureMaxC, measurementSystem)})` : ''}.`
          : 'Température moyenne : aucune valeur exploitable pour cette période.'
        : '',
      asksSoilMoisture
        ? [
            record.rootZoneWetness !== undefined ? `humidité racinaire modélisée ${Math.round(record.rootZoneWetness * 100)} %` : '',
            record.surfaceSoilWetness !== undefined ? `humidité de surface modélisée ${Math.round(record.surfaceSoilWetness * 100)} %` : '',
          ].filter(Boolean).join(' ; ') || 'Aucune humidité de sol exploitable pour cette période.'
        : '',
      asksVegetation
        ? `NDVI : la carte affiche ${requestedLayer ?? 'le produit MODIS de NASA GIBS'} à l’échelle du pixel satellite; NASA POWER ne fournit pas de valeur NDVI numérique.`
        : '',
    ].filter(Boolean)
    return `${prefix} ${metrics.join(' ')} Ces observations sont mensuelles ou régionales selon le produit; elles ne constituent ni une prévision ni un diagnostic de parcelle.`
  }
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
    return `${prefix}${value !== undefined ? ` Les précipitations NASA POWER sont de ${formatPrecipitationRate(value, measurementSystem)} en moyenne sur le mois (PRECTOTCORR).` : ' Aucune valeur de précipitation exploitable n’est disponible pour ce mois.'} C’est une moyenne mensuelle au point de grille, pas un cumul des sept derniers jours ni une prévision.`
  }
  if (lower.includes('temp') || lower.includes('chaud') || lower.includes('froid')) {
    return `${prefix}${record.temperatureC !== undefined ? ` La température moyenne NASA POWER est de ${formatTemperature(record.temperatureC, measurementSystem)}` : ' La température moyenne n’est pas disponible'}${record.temperatureMinC !== undefined && record.temperatureMaxC !== undefined ? ` (min. ${formatTemperature(record.temperatureMinC, measurementSystem)} ; max. ${formatTemperature(record.temperatureMaxC, measurementSystem)})` : ''}. Il s’agit d’une moyenne mensuelle modélisée, pas d’une prévision locale.`
  }
  const summary = [
    record.temperatureC !== undefined ? `température moyenne ${formatTemperature(record.temperatureC, measurementSystem)}` : '',
    record.precipitationMmPerDay !== undefined ? `pluie ${formatPrecipitationRate(record.precipitationMmPerDay, measurementSystem)} en moyenne mensuelle` : '',
    record.rootZoneWetness !== undefined ? `humidité racinaire modélisée ${Math.round(record.rootZoneWetness * 100)} %` : '',
  ].filter(Boolean).join(' · ')
  return `${prefix}${summary ? ` NASA POWER indique ${summary}.` : ' Aucune mesure climatique exploitable n’est disponible pour ce mois.'} La carte montre ${requestedLayer}. Dites-moi si vous voulez examiner la pluie, la température, l’humidité du sol ou le NDVI. Les séries POWER sont mensuelles et ne constituent ni une prévision ni un diagnostic parcellaire.`
}

function classifyQuestion(question: string, contextualIntent?: Intent) {
  const lower = question.toLocaleLowerCase('fr')
  const asksObservations = /journal|observations? de (?:terrain|champ)|notes? de (?:terrain|champ)|observations?.{0,24}(?:enregistr|saisi|noté)|(?:enregistr|saisi|noté).{0,24}observations?|historique.{0,24}(?:terrain|champ|irrigation|semis|récolte)|qu['’]ai-je (?:fait|noté|observé)|qu['’]est-ce que j['’]ai (?:fait|noté|observé)|(?:semis|semé|semer|récolte|récolté|irrigation|irrigué).{0,30}(?:noté|enregistr|fait|observ)|(?:noté|enregistr|fait|observ).{0,30}(?:semis|semé|récolte|irrigation|irrigué)|(?:semé|irrigué|récolté|noté|observé).{0,20}(?:quand|date|historique)|(?:ajoute|ajouter|consigne|consigner|enregistre|enregistrer).{0,45}(?:journal|observation|note de terrain|semis|récolte|irrigation)/.test(lower)
  const asksLayer: LayerId | undefined = /ndvi|vigueur/.test(lower) ? 'ndvi' : /humidit[eé] de surface|smap surface/.test(lower) ? 'surface' : /humidit[eé] racinaire|humidit[eé] du sol|racine/.test(lower) ? 'root' : /soilgrids|argile/.test(lower) && /cartographi|surface|carte|couche|soilgrids|affiche|montre|visualise|active/.test(lower) ? 'soilgrids-clay' : undefined
  const asksMapAction = Boolean(asksLayer && /affiche|montr|visualis|active/.test(lower)) || Boolean(asksLayer && /carte/.test(lower) && /sol|argile|ndvi|smap/.test(lower))
  const asksSoilProfile = /profil de (?:mon |la )?sol|texture|\bph\b|matière organique|drainage|profondeur|horizon|couche|analyse de sol/.test(lower) && (!asksMapAction || /profil|analyse|\bph\b|matière organique|drainage|profondeur|horizon/.test(lower))
  const asksCalendar = /calendrier.{0,18}(?:cultural|culture|semis|récolte)|\bsemis\b|\bsemer\b|\brécolter\b|\bplanter\b|\b(?:date|période|fenêtre|quand).{0,20}récolte\b|\brécolte.{0,15}(?:date|période|fenêtre)\b|fenêtre.{0,15}travail|disponibilité.{0,20}(?:ferme|semis|récolte)|mois où.{0,20}(?:semer|récolter)/.test(lower)
  const asksEquipment = /matériel|équipement|tracteur|semoir|moissonneuse|prestataire|opérations? faisables/.test(lower)
  const asksRotation = /rotation|succession|famille botanique|légumineuse|alternance|cultures?|préférence|préférée?s?/.test(lower)
  const asksFarmProfile = /ma ferme|mon exploitation|accès.{0,3}eau|eau disponible|ressource en eau|approvisionnement en eau|restriction.{0,12}eau|contrainte.{0,12}eau|profil (?:de (?:ma |la )?ferme|d'exploitation|agricole)/.test(lower) || asksEquipment
  const asksClimateData = /pluie|précip|température|\bchaud\b|\bfroid\b|climat|météo|irrig/.test(lower) || /humidité/.test(lower) && !asksLayer
  const asksClimate = asksClimateData || /nasa|ndvi|vigueur|satellite|imagerie/.test(lower)
  const asksMapOnly = asksMapAction && !asksClimateData && !asksSoilProfile && !asksCalendar && !asksEquipment && !asksRotation && !asksFarmProfile && !asksObservations
  const intent: Intent = asksMapOnly ? 'map' : asksObservations ? 'observations' : asksSoilProfile ? 'soil' : asksEquipment ? 'farm' : asksCalendar ? 'calendar' : asksRotation ? 'rotation' : asksFarmProfile ? 'farm' : asksClimate ? 'climate' : 'unknown'
  const contextual = intent === 'unknown' && contextualIntent !== undefined
  return { intent: contextual ? contextualIntent : intent, asksObservations, asksSoilProfile, asksCalendar, asksEquipment, asksFarmProfile, asksRotation, asksClimate, asksClimateData, asksLayer, contextual }
}

function isContextualFollowup(question: string) {
  const normalized = question.toLocaleLowerCase('fr').trim().replace(/[?!.,…]+$/g, '').replace(/\s+/g, ' ')
  return /^(?:et\s+(?:(?:alors|pour|dans|ça|cela|ce|cette|celui|celle|là)\b)?|pourquoi(?:\s+(?:ça|cela|ce|cette|l’option|l’alternative))?|comment\s+(?:ça|cela|ce|cette|l’option|l’alternative)|qu’est-ce que ça|qu’est-ce que cela|que signifie(?:\s+(?:ça|cela))?|peux-tu\s+(?:détailler|préciser|expliquer)|tu peux\s+(?:détailler|préciser|expliquer)|détaille|précise|explique|et si)\b/.test(normalized)
}

function asksForUnsupportedFarmDecision(question: string) {
  const lower = question.toLocaleLowerCase('fr')
  const asksIrrigationDose = /\b(?:dose|quantité|volume|combien de)\b.{0,35}\b(?:irrig|eau)|\b(?:irrig|arros).{0,35}\b(?:dose|quantité|volume|combien de|date|quand)|\bquand irriguer\b/.test(lower)
  const asksYieldPrediction = /\b(?:prédire|prediction|prévision|estimer|estimation)\b.{0,35}\b(?:rendement|récolte)|\b(?:rendement|récolte)\b.{0,35}\b(?:prédire|prediction|prévision|estimer|estimation)/.test(lower)
  return asksIrrigationDose || asksYieldPrediction
}

function asksToRecordObservation(question: string) {
  return /\b(?:ajoute|ajouter|consigne|consigner|enregistre|enregistrer|note)\b.{0,60}\b(?:journal|observation|note de terrain|semis|récolte|irrigation)\b/i.test(question)
}

function observationTextFromRequest(question: string) {
  const explicit = question.match(/(?:\:|[«“"]).+?(?:[»”"])?\s*$/)
  if (explicit) return explicit[0].replace(/^\s*(?:\:|[«“"]+)\s*/, '').replace(/[»”"]+\s*$/, '').trim()
  return question.trim().slice(0, 1000)
}

function observationKindFromRequest(question: string): ObservationKind {
  const lower = question.toLocaleLowerCase('fr')
  return /\bsemis?\b|\bsemé\b|\bsemer\b/.test(lower) ? 'semis'
    : /\brécoltes?\b|\brécolté\b|\brécolter\b/.test(lower) ? 'recolte'
      : /\birrigations?\b|\birrigué\b|\barrosage\b|\barrosé\b/.test(lower) ? 'irrigation' : 'note'
}

function todayForObservation() {
  const date = new Date()
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

function formatFarmProfileAnswer(point: GeoPoint, question: string) {
  const farm = readFarmProfile(point)
  const operations = readFarmOperationProfile(point)
  const operationCount = declaredFarmOperationCount(operations)
  const lower = question.toLocaleLowerCase('fr')
  const asksEquipment = /matériel|équipement|tracteur|semoir|moissonneuse|prestataire|opérations? faisables/.test(lower)
  const operationSummary = farmOperations.map(operation => {
    const entry = operations[operation.id]
    return `${operation.label} : ${operationAvailabilityLabels[entry.availability]}${entry.equipment ? ` · ${entry.equipment}` : ''}${entry.note ? ` · ${entry.note}` : ''}`
  }).join('. ')
  if (asksEquipment) return `${operationCount ? `${operationCount}/7 opérations ont une déclaration. ` : 'Aucune opération n’est renseignée; leur disponibilité reste inconnue. '}${operationSummary}. Ces statuts et précisions sont des déclarations locales, non vérifiées. FieldNova ne compare pas ces déclarations à des besoins par culture et ne peut pas conclure qu’une rotation est faisable. Vous pouvez les modifier dans Scénarios > Matériel & opérations.`
  if (!farm) return `Aucun profil d’exploitation n’est enregistré pour ce point. Vous pouvez le configurer depuis la Vue d’ensemble. FieldNova ne déduit pas l’accès à l’eau ni les priorités de la ferme à partir des données satellite.${operationCount ? ` ${operationCount}/7 opérations de matériel ont toutefois été déclarées dans Scénarios.` : ''}`
  const catalog = readCropCatalog(point)
  const workspace = readRotationWorkspace(point, catalog)
  const constraints = readRotationConstraints(point, catalog)
  const soil = readSoilProfile(point)
  const reference = workspace.plans.find(plan => plan.id === 'reference')
  const crops = reference?.crops.map(id => catalog.find(crop => crop.id === id)?.shortLabel ?? '').filter(Boolean) ?? []
  const knownSoil = Boolean(soil.texture && soil.texture !== 'unknown' || soil.ph !== undefined || soil.organicMatterPercent !== undefined || soil.effectiveDepthCm !== undefined || soil.drainage && soil.drainage !== 'unknown' || soil.horizons?.length)
  const waterNote = farm.waterNotes ? ` Précision déclarée : « ${farm.waterNotes} ».` : ''
  const prioritySummary = (Object.entries(rotationWeightsFor(workspace)) as Array<[RotationPriority, 1 | 2 | 3]>).map(([priority, weight]) => `${priorityLabels[priority]} ×${weight}`).join(' · ')
  return `${farm.isExample ? 'Ce profil est un exemple fictif et ne décrit pas une exploitation réelle. ' : ''}Le profil local de ${farm.name} indique : ${farmWaterAccessLabels[farm.waterAccess].toLocaleLowerCase('fr')} et ${farmWaterConstraintLabels[farm.waterConstraint].toLocaleLowerCase('fr')}.${waterNote} ${crops.length ? `La rotation actuelle renseignée contient ${crops.join(' → ')}.` : 'Aucune culture n’est renseignée dans la rotation actuelle.'} Sol local : ${knownSoil ? 'des caractéristiques ont été saisies ou importées dans Mon terrain.' : 'aucune caractéristique renseignée; le sol reste inconnu.'} Critères et poids de rotation : ${prioritySummary}. ${constraints.unavailableCropIds.length ? `Cultures exclues des options : ${constraints.unavailableCropIds.map(id => catalog.find(crop => crop.id === id)?.shortLabel ?? id).join(', ')}.` : 'Aucune culture exclue des options.'} ${constraints.preferredCropIds.length ? `Cultures préférées déclarées : ${constraints.preferredCropIds.map(id => catalog.find(crop => crop.id === id)?.shortLabel ?? id).join(', ')}; ce choix personnel intervient dans le tri uniquement si le critère correspondant est actif.` : 'Aucune culture préférée déclarée.'}${operationCount ? ` Opérations déclarées (${operationCount}/7) : ${operationSummary}.` : ' Aucune disponibilité de matériel ou d’opération n’est renseignée.'} Ces éléments sont des déclarations locales; ils ne prouvent pas un volume d’eau disponible et ne constituent pas un conseil agronomique.`
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

function formatSoilAnswer(point: GeoPoint, measurementSystem: ReturnType<typeof useMeasurementSystem>) {
  const profile = readSoilProfile(point)
  const fields: Array<{ key: SoilFieldKey; value: string }> = [
    ...(profile.texture && profile.texture !== 'unknown' ? [{ key: 'texture' as const, value: `texture ${({ sandy: 'sableuse', loamy: 'limoneuse', clayey: 'argileuse' } as const)[profile.texture]}` }] : []),
    ...(profile.ph !== undefined ? [{ key: 'ph' as const, value: `pH ${profile.ph.toLocaleString('fr-FR')}` }] : []),
    ...(profile.organicMatterPercent !== undefined ? [{ key: 'organicMatterPercent' as const, value: `${profile.organicMatterPercent.toLocaleString('fr-FR')} % de matière organique` }] : []),
    ...(profile.effectiveDepthCm !== undefined ? [{ key: 'effectiveDepthCm' as const, value: `${formatLength(profile.effectiveDepthCm, measurementSystem)} de profondeur utile` }] : []),
    ...(profile.drainage && profile.drainage !== 'unknown' ? [{ key: 'drainage' as const, value: `drainage ${({ poor: 'lent', moderate: 'modéré', good: 'rapide' } as const)[profile.drainage]}` }] : []),
  ]
  const entries = fields.map(field => field.value)
  const horizons = profile.horizons?.map((horizon, index) => {
    const texture = horizon.texture && horizon.texture !== 'unknown' ? ({ sandy: 'sableuse', loamy: 'limoneuse', clayey: 'argileuse' } as const)[horizon.texture] : 'inconnue'
    const ph = horizon.ph === undefined ? 'pH inconnu' : `pH ${horizon.ph.toLocaleString('fr-FR')}`
    const organicMatter = horizon.organicMatterPercent === undefined ? 'matière organique inconnue' : `${horizon.organicMatterPercent.toLocaleString('fr-FR')} % de matière organique`
    const { sourceType, sampleDate, sourceName: reference, samplingMethod } = resolveSoilHorizonProvenance(horizon, profile)
    const sample = sampleDate ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${sampleDate}T12:00:00Z`)) : 'date non précisée'
    return `Horizon ${index + 1} (${formatLength(horizon.topCm, measurementSystem)}–${formatLength(horizon.bottomCm, measurementSystem)}) : texture ${texture}, ${ph}, ${organicMatter}. Origine déclarée : ${soilSourceLabels[sourceType]}${reference ? ` · ${reference}` : ''} · ${sample}${samplingMethod ? ` · méthode : ${samplingMethod}` : ''} (non vérifiée).`
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

function formatFieldObservationsAnswer(point: GeoPoint, question: string) {
  const lower = question.toLocaleLowerCase('fr')
  const requestedKind: ObservationKind | undefined = /\bsemis?\b|\bsemé\b|\bsemer\b/.test(lower) ? 'semis'
    : /\brécoltes?\b|\brécolté\b|\brécolter\b/.test(lower) ? 'recolte'
      : /\birrigations?\b|\birrigué\b|\barrosage\b|\barrosé\b/.test(lower) ? 'irrigation' : undefined
  const entries = readFieldObservations(point).filter(entry => !requestedKind || entry.kind === requestedKind)
  if (!entries.length) return `Aucune observation${requestedKind ? ` de ${fieldObservationKindLabel(requestedKind).toLocaleLowerCase('fr')}` : ''} n’est enregistrée dans le journal local de ce point. Vous pouvez en ajouter dans Mon terrain > Journal. FieldNova ne déduit pas ces événements des données NASA.`
  const visible = entries.slice(0, 12).map(entry => {
    const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${entry.date}T12:00:00Z`))
    return `${date} · ${fieldObservationKindLabel(entry.kind)}${entry.crop ? ` · ${entry.crop}` : ''}${entry.author ? ` · auteur déclaré : ${entry.author}` : ''} — « ${entry.note} »`
  })
  return `Journal local pour le point ${coordinate(point.latitude, 'N', 'S')} · ${coordinate(point.longitude, 'E', 'O')} : ${entries.length} observation(s)${requestedKind ? ` de ${fieldObservationKindLabel(requestedKind).toLocaleLowerCase('fr')}` : ''}. ${visible.join(' ')}${entries.length > visible.length ? ` ${entries.length - visible.length} autre(s) entrée(s) ne sont pas affichées ici.` : ''} Ces entrées sont des déclarations saisies par l’utilisateur sur cet appareil; elles ne sont ni vérifiées ni des mesures NASA.`
}

function formatRotationAnswer(point: GeoPoint) {
  const catalog = readCropCatalog(point)
  const workspace = readRotationWorkspace(point, catalog)
  const priorityWeights = rotationWeightsFor(workspace)
  const selectedPriorities = Object.entries(priorityWeights) as Array<[RotationPriority, 1 | 2 | 3]>
  const prioritySummary = selectedPriorities.map(([priority, weight]) => `${priorityLabels[priority]} ×${weight}`).join(' · ')
  const constraints = readRotationConstraints(point, catalog)
  const reference = workspace.plans.find(plan => plan.id === 'reference')
  const referenceMetrics = reference ? evaluateRotation(reference, catalog, constraints.preferredCropIds) : undefined
  const plans = workspace.plans.map(plan => {
    const metrics = evaluateRotation(plan, catalog, constraints.preferredCropIds)
    if (!metrics.complete) return `${plan.title} : succession incomplète.`
    const crops = plan.crops.map(id => {
      const crop = catalog.find(item => item.id === id)
      if (!crop) return 'culture inconnue'
      const root = crop.rootArchitecture === 'fibrous' ? 'racines fasciculées' : crop.rootArchitecture === 'taproot' ? 'racines pivotantes' : 'racines non documentées'
      return `${crop.label} (${crop.familyLabel}${crop.isLegume === true ? ', légumineuse' : crop.isLegume === false ? ', non légumineuse' : ', statut légumineuse inconnu'}, ${root}${crop.origin === 'local-declaration' ? ', traits locaux non vérifiés' : ''})`
    }).join(' → ')
    const unavailable = plan.id === 'reference' ? [] : [...new Set(plan.crops.filter((id): id is CropId => Boolean(id && constraints.unavailableCropIds.includes(id))))]
    const constraintStatus = unavailable.length ? ` Option exclue du classement car le profil déclare ${unavailable.map(id => catalog.find(crop => crop.id === id)?.label ?? id).join(', ')} indisponible(s).` : ''
    const comparison = plan.id !== 'reference' && metrics.complete && referenceMetrics?.complete && rotationCombinedScore(metrics, priorityWeights) !== undefined && rotationCombinedScore(referenceMetrics, priorityWeights) !== undefined
      ? ` Écarts bruts par rapport à la référence : ${metrics.distinctFamilies - referenceMetrics.distinctFamilies} famille(s), ${metrics.repeatedFamilyTransitions - referenceMetrics.repeatedFamilyTransitions} répétition(s), ${metrics.legumeSeasons - referenceMetrics.legumeSeasons} année(s) avec légumineuse, ${metrics.knownRootTransitions - referenceMetrics.knownRootTransitions} transition(s) racinaire(s) documentée(s), ${metrics.preferredCropSeasons - referenceMetrics.preferredCropSeasons} année(s) avec culture préférée.`
      : ''
    const scoreValue = metrics.complete ? rotationCombinedScore(metrics, priorityWeights) : undefined
    const rankingScore = scoreValue === undefined ? undefined : (scoreValue * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })
    const missingTraits = rotationScoreMissingTraits(metrics, priorityWeights)
    const priorityEvidence = plan.id !== 'reference' ? ` Note de tri pondérée : ${rankingScore === undefined ? metrics.complete ? `suspendue, trait(s) inconnu(s) : ${missingTraits.join(' et ')}` : 'non calculée, séquence incomplète' : `${rankingScore}/100`} avec ${prioritySummary}.` : ''
    return `${plan.title} (${crops}) : ${metrics.distinctFamilies} familles botaniques distinctes, ${metrics.repeatedFamilyTransitions} répétition(s) de famille, ${metrics.legumeSeasons} année(s) avec légumineuse connue${metrics.unknownLegumeSeasons ? ` et ${metrics.unknownLegumeSeasons} statut(s) inconnu(s)` : ''}, ${metrics.knownRootTransitions} transition(s) entre architectures racinaires connues${metrics.unknownRootSeasons ? ` et ${metrics.unknownRootSeasons} architecture(s) inconnue(s)` : ''}, ${metrics.preferredCropSeasons}/5 année(s) avec culture préférée déclarée.${comparison}${priorityEvidence}${constraintStatus}`
  })
  const unavailableLabels = constraints.unavailableCropIds.map(id => catalog.find(crop => crop.id === id)?.label ?? id)
  const preferredLabels = constraints.preferredCropIds.map(id => catalog.find(crop => crop.id === id)?.label ?? id)
  return `${workspace.isExample ? 'Les scénarios affichés sont des exemples sur cinq années.' : 'Voici les scénarios enregistrés pour ce point.'} Critères et poids : ${prioritySummary}. La note normalisée sert uniquement au tri descriptif. ${unavailableLabels.length ? `Cultures déclarées indisponibles pour les options : ${unavailableLabels.join(', ')}. ` : 'Aucune culture déclarée indisponible. '}${preferredLabels.length ? `Cultures préférées déclarées par l’utilisateur : ${preferredLabels.join(', ')}; cette préférence personnelle compte uniquement si son critère est actif, elle ne constitue pas un élément agronomique. ` : 'Aucune préférence de culture n’est déclarée. '}${plans.join(' ')} Les architectures racinaires absentes de la référence sont laissées inconnues. Ces indicateurs décrivent la séquence; ils ne prédisent ni rendement ni amélioration du sol. La référence racinaire est régionale et doit être confirmée localement. Vous pouvez modifier les cultures et contraintes dans l’onglet Scénarios.`
}

function formatCropCalendarAnswer(question: string, point: GeoPoint) {
  const catalog = readCropCatalog(point)
  const calendar = readCropCalendar(point)
  const workWindows = readFarmWorkWindows(point)
  const lower = question.toLocaleLowerCase('fr')
  const availability = `Disponibilités habituelles déclarées par la ferme : semis ${formatCropMonthWindow(workWindows.sowing)} · récolte ${formatCropMonthWindow(workWindows.harvest)}.`
  const requestedCrop = catalog.find(crop => lower.includes(crop.label.toLocaleLowerCase('fr')) || lower.includes(crop.shortLabel.toLocaleLowerCase('fr')))
  const describe = (crop: CropDefinition) => {
    const entry = calendar[crop.id]
    const overlapLabel = (overlap: boolean | undefined) => overlap === undefined ? 'inconnu' : overlap ? 'chevauchement mensuel déclaré' : 'aucun chevauchement mensuel déclaré'
    if (!entry?.sowing && !entry?.harvest) return `${crop.label} : aucune fenêtre de semis ou de récolte saisie; chevauchements avec la disponibilité : semis ${overlapLabel(undefined)}, récolte ${overlapLabel(undefined)}.`
    const windows = [`semis ${formatCropMonthWindow(entry.sowing)}`, `récolte ${formatCropMonthWindow(entry.harvest)}`].join(' · ')
    const overlap = `Chevauchement avec les disponibilités déclarées : semis ${overlapLabel(monthWindowsOverlap(entry.sowing, workWindows.sowing))}, récolte ${overlapLabel(monthWindowsOverlap(entry.harvest, workWindows.harvest))}.`
    const source = entry.sourceName ? ` Source déclarée : ${entry.sourceName}${entry.sourceUrl ? ` (${entry.sourceUrl})` : ''}; elle n’est pas vérifiée par FieldNova.` : ' Aucune source n’est associée à ces dates.'
    return `${crop.label} : ${windows}. ${overlap}${source}`
  }
  if (requestedCrop) return `${availability} ${describe(requestedCrop)} Les fenêtres et chevauchements sont des déclarations mensuelles locales, pas une validation de faisabilité ni une recommandation de date. Elles sont consultables dans Scénarios > Rotations culturales.`
  const declared = catalog.filter(crop => calendar[crop.id]?.sowing || calendar[crop.id]?.harvest)
  if (!declared.length) return `${availability} Aucun calendrier cultural n’est renseigné pour ce point; les chevauchements restent inconnus. Aucune date n’est déduite du climat ou d’une région. Vous pouvez saisir vos fenêtres et leur source dans Scénarios > Rotations culturales > Calendrier cultural.`
  const entries = declared.map(describe).join(' ')
  const unknownCount = catalog.length - declared.length
  return `${availability} Calendriers déclarés pour ${declared.length} culture(s) au point suivi : ${entries}${unknownCount ? ` Pour ${unknownCount} autre(s) culture(s), aucune fenêtre n’est renseignée.` : ''} Ces dates et chevauchements viennent des déclarations locales; ils ne valident pas la faisabilité agronomique et ne constituent pas un conseil. Pour une culture précise, indiquez son nom.`
}

function traceNode(id: string, toolName: string, label: string, primary: string, secondary: string, status: 'completed' | 'failed' = 'completed'): TraceNode {
  const args = toolName === 'fetch' ? { url: label } : toolName === 'read' ? { path: label } : { label }
  return { id, type: 'tool', toolName, args, primary, secondary, status }
}

export function AssistantPage() {
  const { location, selectLocation } = useSelectedLocation()
  const measurementSystem = useMeasurementSystem()
  const [layer, setLayer] = useState<LayerId>('truecolor')
  const { series, loading: loadingData, error: dataError } = usePowerMonthly(location)
  const { availability: gibsAvailability, error: gibsDateError } = useGibsAvailability()
  const [codexStatus, setCodexStatus] = useState<CodexStatus>('checking')
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: 'assistant', text: 'Bonjour. Je peux consulter les données climatiques mensuelles NASA POWER, afficher les couches MODIS, SMAP ou SoilGrids, et retrouver vos observations du journal local. Cliquez sur la carte pour changer le point suivi, puis demandez-moi la pluie, la température, le NDVI, l’argile cartographiée, l’humidité du sol ou ce que vous avez noté au champ.' },
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

  useEffect(() => {
    if (mobileView !== 'map' || !map) return
    let layerFrame = 0
    const frame = window.requestAnimationFrame(() => {
      map.resize()
      if (map.isStyleLoaded() && map.getLayer('soilgrids-clay')) {
        map.setLayoutProperty('soilgrids-clay', 'visibility', 'none')
        layerFrame = window.requestAnimationFrame(() => {
          if (!map.isStyleLoaded() || !map.getLayer('soilgrids-clay')) return
          map.setLayoutProperty('soilgrids-clay', 'visibility', layer === 'soilgrids-clay' ? 'visible' : 'none')
          map.triggerRepaint()
        })
      }
    })
    return () => { window.cancelAnimationFrame(frame); window.cancelAnimationFrame(layerFrame) }
  }, [layer, map, mobileView])

  const handleSend = async (prompt: string, files: File[]) => {
    const question = prompt.trim() || (files.length ? `Analyse cette pièce jointe : ${files.map(file => file.name).join(', ')}` : '')
    if (!question) return
    const id = ++lastId.current
    const userId = ++lastId.current
    const unsupportedFarmDecision = asksForUnsupportedFarmDecision(question)
    const lastUserMessage = [...messages].reverse().find(message => message.role === 'user')
    const contextualIntent = !unsupportedFarmDecision && isContextualFollowup(question) && lastUserMessage?.intent !== 'unknown' ? lastUserMessage?.intent : undefined
    const route = classifyQuestion(question, contextualIntent)
    const messagePoint = { latitude: location.latitude, longitude: location.longitude }
    const requestedLayer = route.asksLayer ?? layer
    if (route.asksLayer) setLayer(route.asksLayer)
    setMessages(current => [...current, { id: userId, role: 'user', text: question, point: messagePoint, intent: unsupportedFarmDecision ? 'unknown' : route.intent }, { id, role: 'assistant', text: '', point: messagePoint, intent: unsupportedFarmDecision ? 'unknown' : route.intent, running: true }])
    const trace: TraceNode[] = []
    if (route.contextual) trace.push({ id: `context-${id}`, type: 'step', primary: 'Relance rattachée au sujet précédent', secondary: 'Le dernier sujet FieldNova est vérifié avec le même outil et le point courant.', status: 'completed' })
    let currentSeries = series
    let answer: string
    let evidence = ''
    let traceHeading = 'Aucun outil exécuté'
    let usedSources: AISource[] = []
    let evidenceTags: EvidenceTag[] = []
    let soilImport: AssistantSoilImport | undefined
    let observationDraft: AssistantObservationDraft | undefined
    const additionalContexts: Array<{ trace: TraceNode; answer: string; sources: AISource[]; tags: EvidenceTag[] }> = []
    const canReadAdditionalContext = !files.length && !['observations', 'unknown'].includes(route.intent) && !unsupportedFarmDecision
    const addAdditionalContext = (context: { trace: TraceNode; answer: string; sources: AISource[]; tags: EvidenceTag[] }) => additionalContexts.push(context)

    if (canReadAdditionalContext && route.asksLayer && route.intent !== 'climate' && route.intent !== 'map') {
      const label = layerOptions.find(item => item.id === route.asksLayer)?.label ?? 'Couche NASA'
      const source = route.asksLayer === 'soilgrids-clay' ? sources[2] : sources[1]
      addAdditionalContext({ trace: { id: `map-context-${id}`, type: 'step', primary: 'Couche affichée sur la carte', secondary: label, status: 'completed' }, answer: `La carte a été mise à jour avec ${label}.`, sources: [source], tags: [{ label: `${layerOptions.find(item => item.id === route.asksLayer)?.source ?? 'NASA GIBS'} · couche affichée`, kind: 'source' }] })
    }
    if (canReadAdditionalContext && route.asksClimateData && route.intent !== 'climate') {
      let climateSeries = currentSeries
      const seriesAlreadyLoaded = Boolean(climateSeries && climateSeries.point.latitude === location.latitude && climateSeries.point.longitude === location.longitude)
      let failed = false
      try {
        if (!seriesAlreadyLoaded) climateSeries = await fetchPowerMonthly(location, 5)
      } catch {
        const demo = readDemoWorkspace()
        const isDemoPoint = demo
          && location.latitude.toFixed(4) === demo.point.latitude.toFixed(4)
          && location.longitude.toFixed(4) === demo.point.longitude.toFixed(4)
        climateSeries = isDemoPoint ? offlineDemoPowerSeries(location, 5) : null
        failed = !climateSeries
      }
      const record = climateSeries ? latestCompleteRecord(climateSeries.records) : undefined
      const isDemoSnapshot = climateSeries?.deliveryMode === 'demo-fixture'
      const snapshotNote = isDemoSnapshot ? `Extrait NASA POWER hors ligne · capturé le ${climateSeries?.fetchedAt.slice(0, 10)} · dernière période exploitable ${record ? formatPowerMonth(record.date) : 'inconnue'} · aucune requête actuelle.` : ''
      const gridLabel = climateSeries ? `Centre maille MERRA-2 ${coordinate(climateSeries.gridPoint.latitude, 'N', 'S')} · ${coordinate(climateSeries.gridPoint.longitude, 'E', 'O')} · résolution 0,5° × 0,625°` : 'La requête n’a pas abouti'
      const climateTrace = traceNode(`power-context-${id}`, seriesAlreadyLoaded || isDemoSnapshot ? 'read' : 'fetch', isDemoSnapshot ? 'Extrait NASA POWER local · mode démonstration' : seriesAlreadyLoaded ? 'Série NASA POWER chargée · contexte du point' : 'NASA POWER · API mensuelle', failed ? 'NASA POWER indisponible' : isDemoSnapshot ? 'Extrait local consulté · aucune requête réseau' : seriesAlreadyLoaded ? 'Série chargée consultée' : 'Série récupérée', [record ? formatPowerMonth(record.date) : '', gridLabel, snapshotNote].filter(Boolean).join(' · '), failed ? 'failed' : 'completed')
      const answer = makeClimateAnswer(question, climateSeries, requestedLayer, location, measurementSystem)
      const groundedAnswer = snapshotNote ? `${snapshotNote}\n\n${answer}` : answer
      const climateSources: AISource[] = [{ ...sources[0], snippet: snapshotNote || sources[0].snippet }]
      const climateTags: EvidenceTag[] = climateSeries && latestCompleteRecord(climateSeries.records)
        ? [{ label: isDemoSnapshot ? 'NASA POWER · extrait local daté' : 'NASA POWER · donnée mensuelle modélisée', kind: 'source' }, { label: 'Maille régionale · pas un diagnostic parcellaire', kind: 'limit' }]
        : [{ label: 'Donnée NASA indisponible', kind: 'missing' }, { label: 'Aucune valeur de remplacement', kind: 'limit' }]
      addAdditionalContext({
        trace: climateTrace,
        answer: groundedAnswer,
        sources: climateSources,
        tags: climateTags,
      })
    }
    if (canReadAdditionalContext && route.asksSoilProfile && route.intent !== 'soil') {
      const profile = readSoilProfile(location)
      const knownFields = Object.values(profile).filter(value => value !== undefined).length
      addAdditionalContext({
        trace: traceNode(`soil-context-${id}`, 'read', 'Profil de sol local · navigateur', 'Profil local consulté', knownFields ? `${knownFields} champ(s) renseigné(s) pour le point suivi` : 'Aucun champ de sol renseigné', 'completed'),
        answer: formatSoilAnswer(location, measurementSystem),
        sources: [soilProfileSource(location)],
        tags: [{ label: 'Déclaration locale', kind: 'local' }, { label: 'Mesure non vérifiée', kind: 'limit' }],
      })
    }
    if (canReadAdditionalContext && route.asksCalendar && route.intent !== 'calendar') {
      const catalog = readCropCatalog(location)
      const calendar = readCropCalendar(location)
      const workWindows = readFarmWorkWindows(location)
      const declaredCount = catalog.filter(crop => calendar[crop.id]?.sowing || calendar[crop.id]?.harvest).length
      const availabilityCount = Number(Boolean(workWindows.sowing)) + Number(Boolean(workWindows.harvest))
      addAdditionalContext({
        trace: traceNode(`calendar-context-${id}`, 'read', 'Calendriers et disponibilités locales · navigateur', 'Déclarations mensuelles consultées', `${declaredCount} culture(s) avec une fenêtre · ${availabilityCount}/2 disponibilités de ferme renseignées · stockage local par point`, 'completed'),
        answer: formatCropCalendarAnswer(question, location),
        sources: cropCalendarSources(location),
        tags: declaredCount || availabilityCount ? [{ label: 'Déclaration locale', kind: 'local' }, { label: 'Non vérifiée · pas un conseil', kind: 'limit' }] : [{ label: 'Aucune date renseignée', kind: 'missing' }, { label: 'Aucune date déduite', kind: 'limit' }],
      })
    }
    if (canReadAdditionalContext && route.asksRotation && route.intent !== 'rotation') {
      const catalog = readCropCatalog(location)
      const workspace = readRotationWorkspace(location, catalog)
      const constraints = readRotationConstraints(location, catalog)
      const completePlans = workspace.plans.filter(plan => evaluateRotation(plan, catalog).complete).length
      const weights = Object.entries(rotationWeightsFor(workspace)).map(([priority, weight]) => `${priorityLabels[priority as RotationPriority]} ×${weight}`).join(' · ')
      addAdditionalContext({
        trace: traceNode(`rotation-context-${id}`, 'read', 'Scénarios de rotation · navigateur', 'Rotations et contraintes consultées', `${completePlans}/3 scénario(s) complet(s) · critères ${weights} · ${constraints.unavailableCropIds.length} culture(s) indisponible(s) · ${constraints.preferredCropIds.length} préférence(s) déclarée(s)`, 'completed'),
        answer: formatRotationAnswer(location),
        sources: [...rotationReferences, ...localCropReferences(location)],
        tags: [{ label: workspace.isExample ? 'Scénarios fictifs' : 'Données locales', kind: 'local' }, { label: 'Calcul FieldNova', kind: 'calculation' }, { label: 'Indicateur descriptif', kind: 'limit' }],
      })
    }
    if (canReadAdditionalContext && route.asksFarmProfile && route.intent !== 'farm') {
      const profile = readFarmProfile(location)
      const operationProfile = readFarmOperationProfile(location)
      const operationCount = declaredFarmOperationCount(operationProfile)
      const catalog = readCropCatalog(location)
      const workspace = readRotationWorkspace(location, catalog)
      const constraints = readRotationConstraints(location, catalog)
      const weights = Object.entries(rotationWeightsFor(workspace)).map(([priority, weight]) => `${priorityLabels[priority as RotationPriority]} ×${weight}`).join(' · ')
      addAdditionalContext({
        trace: traceNode(`farm-context-${id}`, 'read', 'Profil de ferme et contraintes locales · navigateur', profile ? `Profil de ${profile.name} consulté` : 'Aucun profil de ferme renseigné', `${farmWaterAccessLabels[profile?.waterAccess ?? 'unknown']} · ${operationCount}/7 opérations déclarées · critères de rotation ${weights} · ${constraints.unavailableCropIds.length} culture(s) exclue(s) · ${constraints.preferredCropIds.length} préférence(s) déclarée(s)`, 'completed'),
        answer: formatFarmProfileAnswer(location, question),
        sources: [farmProfileSource(location), farmOperationsSource(location), soilProfileSource(location), rotationWorkspaceSource, ...localCropReferences(location)],
        tags: [{ label: 'Déclarations locales', kind: 'local' }, { label: 'Non vérifié sur le terrain', kind: 'limit' }],
      })
    }
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
    } else if (route.intent === 'map') {
      const selectedLayer = layerOptions.find(item => item.id === (route.asksLayer ?? layer))!
      trace.push({ id: `map-${id}`, type: 'step', primary: 'Couche cartographique affichée', secondary: `${selectedLayer.source} · ${selectedLayer.label}`, status: 'completed' })
      traceHeading = `${selectedLayer.source} affiché sur la carte`
      answer = selectedLayer.id === 'soilgrids-clay'
        ? 'La carte affiche maintenant SoilGrids 2.0, couche moyenne d’argile de surface sur 0–5 cm. C’est une prédiction cartographique ISRIC à 250 m, pas une analyse du sol de votre parcelle; FieldNova n’extrait aucune valeur à la coordonnée sélectionnée et cette couche ne remplace pas le profil local.'
        : `La carte affiche maintenant ${selectedLayer.label}. Le produit est visualisé à son échelle régionale et ne constitue pas une mesure de parcelle.`
      evidence = answer
      usedSources = [selectedLayer.id === 'soilgrids-clay' ? sources[2] : sources[1]]
      evidenceTags = selectedLayer.id === 'soilgrids-clay'
        ? [{ label: 'ISRIC SoilGrids · prédiction cartographique', kind: 'source' }, { label: '250 m · aucune valeur ponctuelle', kind: 'limit' }]
        : [{ label: 'NASA GIBS · couche affichée', kind: 'source' }, { label: 'Pixel régional · pas un diagnostic parcellaire', kind: 'limit' }]
    } else if (route.intent === 'observations') {
      const observations = readFieldObservations(location)
      const category = /\bsemis?\b|\bsemé\b|\bsemer\b/.test(question.toLocaleLowerCase('fr')) ? 'semis' : /\brécoltes?\b|\brécolté\b|\brécolter\b/.test(question.toLocaleLowerCase('fr')) ? 'récolte' : /\birrigations?\b|\birrigué\b|\barrosage\b|\barrosé\b/.test(question.toLocaleLowerCase('fr')) ? 'irrigation' : undefined
      if (asksToRecordObservation(question)) {
        observationDraft = { date: todayForObservation(), kind: observationKindFromRequest(question), crop: '', note: observationTextFromRequest(question), author: '', state: 'ready' }
        trace.push({ id: `observation-draft-${id}`, type: 'step', primary: 'Nouvelle observation préparée', secondary: 'Aucune donnée enregistrée · vérification et confirmation requises', status: 'completed' })
        traceHeading = 'Action locale en attente de confirmation'
        answer = 'J’ai préparé une entrée pour votre journal. Vérifiez ou corrigez les champs ci-dessous; rien ne sera enregistré avant votre confirmation.'
      } else {
        trace.push(traceNode(`observations-${id}`, 'read', 'Journal de terrain local · navigateur', `${observations.length} observation(s) disponible(s)`, category ? `Filtre appliqué · ${category} · point suivi` : 'Entrées déclaratives du point suivi · stockage sur cet appareil'))
        traceHeading = 'Journal local consulté'
        answer = formatFieldObservationsAnswer(location, question)
      }
      evidence = answer
      usedSources = [fieldJournalSource]
      evidenceTags = observationDraft
        ? [{ label: 'Déclaration à confirmer', kind: 'local' }, { label: 'Aucune écriture sans accord', kind: 'limit' }]
        : observations.length
        ? [{ label: 'Déclarations locales', kind: 'local' }, { label: 'Non vérifiées · non NASA', kind: 'limit' }]
        : [{ label: 'Journal vide pour ce point', kind: 'missing' }, { label: 'Aucune donnée déduite', kind: 'limit' }]
    } else if (route.intent === 'soil') {
      const profile = readSoilProfile(location)
      const knownFields = Object.values(profile).filter(value => value !== undefined).length
      trace.push(traceNode(`soil-${id}`, 'read', 'Profil de sol local · navigateur', 'Profil local consulté', knownFields ? `${knownFields} champ(s) renseigné(s) pour le point suivi` : 'Aucun champ de sol renseigné', 'completed'))
      traceHeading = 'Profil de sol local consulté'
      answer = formatSoilAnswer(location, measurementSystem)
      evidence = answer
      usedSources = [soilProfileSource(location)]
      evidenceTags = [{ label: 'Déclaration locale', kind: 'local' }, { label: 'Mesure non vérifiée', kind: 'limit' }]
    } else if (route.intent === 'calendar') {
      const catalog = readCropCatalog(location)
      const calendar = readCropCalendar(location)
      const workWindows = readFarmWorkWindows(location)
      const declaredCount = catalog.filter(crop => calendar[crop.id]?.sowing || calendar[crop.id]?.harvest).length
      const availabilityCount = Number(Boolean(workWindows.sowing)) + Number(Boolean(workWindows.harvest))
      trace.push(traceNode(`calendar-${id}`, 'read', 'Calendriers et disponibilités locales · navigateur', 'Déclarations mensuelles consultées', `${declaredCount} culture(s) avec une fenêtre · ${availabilityCount}/2 disponibilités de ferme renseignées · stockage local par point`, 'completed'))
      traceHeading = 'Calendrier cultural local consulté'
      answer = formatCropCalendarAnswer(question, location)
      evidence = answer
      usedSources = cropCalendarSources(location)
      evidenceTags = declaredCount || availabilityCount
        ? [{ label: 'Déclaration locale', kind: 'local' }, { label: 'Référence facultative', kind: 'source' }, { label: 'Non vérifiée · pas un conseil', kind: 'limit' }]
        : [{ label: 'Aucune date renseignée', kind: 'missing' }, { label: 'Aucune date déduite', kind: 'limit' }]
    } else if (route.intent === 'rotation') {
      const catalog = readCropCatalog(location)
      const workspace = readRotationWorkspace(location, catalog)
      const constraints = readRotationConstraints(location, catalog)
      const completePlans = workspace.plans.filter(plan => evaluateRotation(plan, catalog).complete).length
      const weights = Object.entries(rotationWeightsFor(workspace)).map(([priority, weight]) => `${priorityLabels[priority as RotationPriority]} ×${weight}`).join(' · ')
      trace.push(traceNode(`rotation-${id}`, 'read', 'Scénarios de rotation · navigateur', 'Rotations et contraintes consultées', `${completePlans}/3 scénario(s) complet(s) · critères ${weights} · ${constraints.unavailableCropIds.length} culture(s) indisponible(s) · ${constraints.preferredCropIds.length} préférence(s) de culture déclarée(s)`, 'completed'))
      traceHeading = 'Scénarios de rotation consultés'
      answer = formatRotationAnswer(location)
      evidence = answer
      usedSources = [...rotationReferences, ...localCropReferences(location)]
      evidenceTags = [{ label: 'Données locales', kind: 'local' }, { label: 'Calcul FieldNova', kind: 'calculation' }, { label: 'Indicateur descriptif', kind: 'limit' }]
    } else if (route.intent === 'farm') {
      const profile = readFarmProfile(location)
      const operationProfile = readFarmOperationProfile(location)
      const operationCount = declaredFarmOperationCount(operationProfile)
      const catalog = readCropCatalog(location)
      const workspace = readRotationWorkspace(location, catalog)
      const constraints = readRotationConstraints(location, catalog)
      const weights = Object.entries(rotationWeightsFor(workspace)).map(([priority, weight]) => `${priorityLabels[priority as RotationPriority]} ×${weight}`).join(' · ')
      trace.push(traceNode(`farm-${id}`, 'read', 'Profil de ferme et contraintes locales · navigateur', profile ? `Profil de ${profile.name} consulté` : 'Aucun profil de ferme renseigné', `${farmWaterAccessLabels[profile?.waterAccess ?? 'unknown']} · ${operationCount}/7 opérations déclarées · critères de rotation ${weights} · ${constraints.unavailableCropIds.length} culture(s) exclue(s) · ${constraints.preferredCropIds.length} préférence(s) déclarée(s)`, 'completed'))
      traceHeading = 'Profil et contraintes de ferme consultés'
      answer = formatFarmProfileAnswer(location, question)
      evidence = answer
      usedSources = [farmProfileSource(location), farmOperationsSource(location), soilProfileSource(location), rotationWorkspaceSource, ...localCropReferences(location)]
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
        const selectedLayer = layerOptions.find(item => item.id === route.asksLayer)
        const label = selectedLayer?.label ?? 'Couche cartographique'
        trace.push({ id: `map-${id}`, type: 'step', primary: 'Couche affichée sur la carte', secondary: label, status: 'completed' })
      }
      traceHeading = isDemoSnapshot ? 'Extrait NASA POWER consulté · mode démo' : route.asksLayer ? 'NASA POWER consulté · carte mise à jour' : 'NASA POWER consulté'
      answer = makeClimateAnswer(question, currentSeries, requestedLayer, location, measurementSystem)
      if (demoSnapshotNote) answer = `${demoSnapshotNote}\n\n${answer}`
      evidence = [demoSnapshotNote, answer].filter(Boolean).join('\n\n')
      const layerSource = route.asksLayer === 'soilgrids-clay' ? sources[2] : sources[1]
      usedSources = [{ ...sources[0], snippet: demoSnapshotNote || sources[0].snippet }, ...(route.asksLayer ? [layerSource] : [])]
      evidenceTags = currentSeries && latestCompleteRecord(currentSeries.records)
        ? [{ label: isDemoSnapshot ? 'NASA POWER · extrait local daté' : 'NASA POWER · donnée mensuelle modélisée', kind: 'source' }, ...(route.asksLayer ? [{ label: layerOptions.find(item => item.id === route.asksLayer)?.source ?? 'Couche cartographique', kind: 'source' } as EvidenceTag] : []), { label: route.asksLayer === 'soilgrids-clay' ? 'ISRIC 250 m · aucune valeur ponctuelle extraite' : 'Maille régionale · pas un diagnostic parcellaire', kind: 'limit' }]
        : [{ label: 'Donnée NASA indisponible', kind: 'missing' }, { label: 'Aucune valeur de remplacement', kind: 'limit' }]
    }
    if (additionalContexts.length && evidence) {
      for (const context of additionalContexts) trace.push(context.trace)
      answer = [answer, ...additionalContexts.map(context => context.answer)].join('\n\n')
      evidence = [evidence, ...additionalContexts.map(context => context.answer)].join('\n\n')
      usedSources = [...usedSources, ...additionalContexts.flatMap(context => context.sources)]
      evidenceTags = [...evidenceTags, ...additionalContexts.flatMap(context => context.tags)]
      traceHeading = `${traceHeading} · outils complémentaires consultés`
    }
    if (!files.length && codexStatus === 'ready' && route.intent !== 'unknown' && route.intent !== 'observations' && !unsupportedFarmDecision) {
      try {
        const response = await fetch('/api/codex/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            history: messages.filter(message => message.text && message.intent !== 'observations').slice(-6).map(message => ({ role: message.role, text: message.text })),
            evidence,
          }),
        })
        const result = await response.json()
        if (!response.ok || typeof result.answer !== 'string') throw new Error(result.error ?? 'Codex CLI indisponible.')
        answer = result.answer
        if (route.intent === 'rotation' && /préférence|préférée?/i.test(question)) {
          const catalog = readCropCatalog(location)
          const constraints = readRotationConstraints(location, catalog)
          const workspace = readRotationWorkspace(location, catalog)
          const preferredLabels = constraints.preferredCropIds.map(id => catalog.find(crop => crop.id === id)?.label ?? id)
          const active = Boolean(rotationWeightsFor(workspace).preference)
          answer += `\n\nCultures préférées déclarées : ${preferredLabels.length ? preferredLabels.join(', ') : 'aucune'}. ${active ? 'Le critère « Cultures préférées » est actif dans le tri.' : 'Le critère « Cultures préférées » n’est pas actif dans le tri.'} Ce sont des préférences personnelles, pas des preuves agronomiques.`
        }
        trace.push({ id: `codex-${id}`, type: 'step', primary: 'Réponse formulée par Codex CLI', secondary: 'Contexte FieldNova fourni · session éphémère', status: 'completed' })
        traceHeading = traceHeading === 'Aucun outil exécuté' ? 'Codex CLI · aucune donnée terrain consultée' : 'Outils FieldNova · réponse Codex CLI'
      } catch {
        trace.push({ id: `codex-${id}`, type: 'step', primary: 'Codex CLI indisponible · réponse locale utilisée', secondary: 'Aucune donnée supplémentaire n’a été consultée', status: 'failed' })
        traceHeading = 'Réponse locale FieldNova'
      }
    } else if (!files.length && codexStatus === 'unavailable' && route.intent !== 'unknown' && route.intent !== 'observations' && !unsupportedFarmDecision) {
      trace.push({ id: `codex-${id}`, type: 'step', primary: 'Codex CLI non connecté · réponse locale utilisée', secondary: 'Connectez Codex CLI sur le serveur de démonstration', status: 'failed' })
      traceHeading = 'Réponse locale FieldNova'
    }
    setMessages(current => current.map(message => message.id === id ? { ...message, text: answer, trace, traceHeading, running: false, sources: usedSources.length ? usedSources : undefined, evidenceTags, soilImport, observationDraft } : message))
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
  const saveObservation = (messageId: number, point: GeoPoint, value: Omit<AssistantObservationDraft, 'state' | 'error'>) => {
    try {
      const current = readFieldObservations(point)
      if (current.length >= 200) throw new Error('Le journal contient déjà 200 entrées. Exportez le CSV puis supprimez des entrées avant d’en ajouter une nouvelle.')
      const entry: FieldObservation = { id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`, ...value }
      writeFieldObservations(point, [entry, ...current])
      setMessages(items => items.map(item => item.id === messageId && item.observationDraft
        ? { ...item, text: 'L’observation confirmée a été ajoutée au journal local de ce point.', observationDraft: { ...value, state: 'saved', error: undefined }, evidenceTags: [{ label: 'Déclaration enregistrée localement', kind: 'local' }, { label: 'Non vérifiée · non NASA', kind: 'limit' }] }
        : item))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'L’enregistrement local a échoué.'
      setMessages(items => items.map(item => item.id === messageId && item.observationDraft
        ? { ...item, observationDraft: { ...value, state: 'ready', error: message } }
        : item))
    }
  }
  const dismissObservation = (messageId: number) => setMessages(current => current.map(message => message.id === messageId && message.observationDraft
    ? { ...message, text: 'Action annulée. Le journal n’a pas été modifié.', observationDraft: undefined, evidenceTags: [{ label: 'Aucune donnée enregistrée', kind: 'limit' }] }
    : message))
  const LayerIcon = activeLayer.icon
  const latest = series ? latestCompleteRecord(series.records) : undefined
  const soilValue = latest?.rootZoneWetness
  const imageryDate = recentImageryDate()
  const displayedGibsDate = layer === 'truecolor'
    ? resolveGibsDate(imageryDate, gibsAvailability?.trueColor)
    : layer === 'soilgrids-clay'
      ? null
    : layer === 'ndvi'
      ? resolveGibsDate(imageryDate, gibsAvailability?.ndvi)
      : layer === 'surface'
        ? gibsAvailability?.surfaceSoil.at(-1)?.end ?? null
        : gibsAvailability?.rootSoil.at(-1)?.end ?? null
  const gibsDateLabel = layer === 'soilgrids-clay' ? 'couche statique · sans série temporelle' : displayedGibsDate ? formatGibsDate(displayedGibsDate) : gibsDateError ? 'date source indisponible' : 'date en chargement'
  const displayedGibsProduct = layer === 'soilgrids-clay' ? 'SoilGrids · argile' : layer === 'truecolor' || layer === 'ndvi' ? 'MODIS' : layer === 'surface' ? 'SMAP surface' : 'SMAP racines'
  const requestedDateNote = (layer === 'truecolor' || layer === 'ndvi') && displayedGibsDate && displayedGibsDate !== imageryDate ? ` · cible ${formatGibsDate(imageryDate)}` : ''
  const suggestedQuestions = [
    ...(latest?.precipitationMmPerDay !== undefined ? [{ label: 'Pluie du mois', question: 'Quelle est la pluie mensuelle NASA POWER ?' }] : []),
    ...(latest?.temperatureC !== undefined ? [{ label: 'Température', question: 'Que montrent les températures mensuelles NASA POWER ?' }] : []),
    ...(latest?.rootZoneWetness !== undefined || latest?.surfaceSoilWetness !== undefined ? [{ label: 'Humidité modélisée', question: 'Explique l’humidité du sol observée pour ce point.' }] : []),
    [{ label: layer === 'ndvi' ? 'Limites du NDVI' : 'Voir le NDVI', question: layer === 'ndvi' ? 'Explique les limites du NDVI affiché.' : 'Affiche le NDVI et explique ses limites.' }],
    { label: 'Argile de surface', question: 'Affiche la couche SoilGrids d’argile cartographiée de 0 à 5 cm.' },
    { label: 'Profil de sol', question: 'Lis mon profil de sol pour ce point.' },
    { label: 'Profil de ferme', question: 'Résume mon profil de ferme et mes contraintes d’eau.' },
    { label: 'Calendrier cultural', question: 'Quelles fenêtres de semis et de récolte sont renseignées ?' },
    { label: 'Journal de terrain', question: 'Quelles observations ai-je enregistrées dans mon journal de terrain ?' },
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
                {message.observationDraft && <AssistantObservationCard value={message.observationDraft} onSave={value => saveObservation(message.id, message.point ?? location, value)} onDismiss={() => dismissObservation(message.id)} />}
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
        <header className="assistant-map-header"><div><h2>Carte du point suivi <ChevronDown size={16} /></h2><p>Cliquez sur la carte pour déplacer le point partagé avec les autres vues.</p></div><div className="assistant-map-header-actions"><span className="assistant-demo-chip">{displayedGibsProduct} · {gibsDateLabel}{requestedDateNote}</span><button type="button" className="assistant-expand-map" aria-label="Recentrer la carte" onClick={() => map?.flyTo({ center: [location.longitude, location.latitude], zoom: 5 })}><Maximize2 size={15} /></button></div></header>
        <div className="assistant-map-canvas">
          <FieldMap center={location} selectedPoint={location} baseLayer={baseLayer} showNdvi={layer === 'ndvi'} showSurfaceSoil={layer === 'surface'} showRootSoil={layer === 'root'} showMappedClay={layer === 'soilgrids-clay'} powerGridCell={series?.point.latitude === location.latitude && series.point.longitude === location.longitude ? series.gridCell : null} imageryDate={imageryDate} onPointSelect={selectLocation} onMapReady={setMap} ariaLabel="Carte interactive NASA GIBS, ISRIC SoilGrids et OpenStreetMap" />
          <div className="assistant-map-toolbar"><div className="assistant-zoom-stack"><button type="button" aria-label="Zoom avant" onClick={() => map?.zoomIn({ duration: 250 })}><Plus size={16} /></button><button type="button" aria-label="Zoom arrière" onClick={() => map?.zoomOut({ duration: 250 })}><Minus size={16} /></button></div><button type="button" aria-label="Utiliser ma position" onClick={() => navigator.geolocation?.getCurrentPosition(position => selectLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }))}><LocateFixed size={16} /></button></div>
          <div className="assistant-map-top-overlay"><span><span className="assistant-live-indicator" />Point partagé</span><span>{coordinate(location.latitude, 'N', 'S')}</span><span>{coordinate(location.longitude, 'E', 'O')}</span></div>
          <div className="assistant-map-layer-card"><div className="assistant-map-layer-title"><span><LayerIcon size={15} /></span><div><strong>{activeLayer.label}</strong><small>{activeLayer.source} · {gibsDateLabel}{requestedDateNote}</small></div><button type="button" aria-label="Fond de carte" aria-pressed={baseLayer === 'nasa'} onClick={() => setBaseLayer(value => value === 'nasa' ? 'streets' : 'nasa')}><ChevronDown size={15} /></button></div><div className="assistant-layer-choices">{layerOptions.map(item => { const Icon = item.icon; return <button key={item.id} type="button" aria-pressed={layer === item.id} className={layer === item.id ? 'is-active' : ''} onClick={() => setLayer(item.id)}><Icon size={13} />{item.short}</button> })}</div>{layer === 'soilgrids-clay' && <div className="assistant-soilgrids-legend"><small>Argile · fraction massique en ‰</small><img src="https://maps.isric.org/mapserv/clay?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&LAYER=clay_0-5cm_mean&FORMAT=image%2Fpng" alt="Légende SoilGrids de la fraction massique d’argile, de 0 à 799 pour mille." /></div>}<button type="button" aria-pressed={baseLayer === 'streets'} className="assistant-base-toggle" onClick={() => setBaseLayer(value => value === 'nasa' ? 'streets' : 'nasa')}>{baseLayer === 'nasa' ? 'Passer au plan de rues' : 'Passer au fond NASA'}</button><p><ShieldCheck size={12} /> {layer === 'soilgrids-clay' ? 'Prédiction cartographique · pas une analyse de parcelle' : 'Résolution satellite régionale · pas parcellaire'}</p></div>
          <div className="assistant-map-legend"><span><i className={`legend-gradient legend-${layer}`} />Couche {activeLayer.source === 'ISRIC SoilGrids' ? 'SoilGrids' : 'NASA'} active</span><small>{layer === 'soilgrids-clay' ? 'Pixel prédit ≠ analyse de parcelle' : 'Pixel satellite ≠ contour de parcelle'}</small></div>
          <div className="assistant-scale"><span />Échelle indiquée sur la carte</div>
        </div>
        <footer className="assistant-map-footer"><div className="assistant-footer-title"><Sprout size={16} /><span><strong>Point NASA suivi</strong><small>{series?.point.latitude === location.latitude && series.point.longitude === location.longitude ? `Centre maille POWER · ${coordinate(series.gridPoint.latitude, 'N', 'S')} · ${coordinate(series.gridPoint.longitude, 'E', 'O')} · 0,5° × 0,625°` : 'Coordonnée choisie sur la carte'}</small></span></div><div className="assistant-soil-stat"><span className="soil-stat-icon moisture"><Droplets size={14} /></span><span><small>Humidité racinaire · POWER</small><strong>{soilValue !== undefined ? `${Math.round(soilValue * 100)} %` : 'Non disponible'} <em>{latest ? formatPowerMonth(latest.date) : ''}</em></strong></span></div><div className="assistant-soil-stat"><span className="soil-stat-icon weather"><ThermometerSun size={14} /></span><span><small>Température · POWER</small><strong>{latest?.temperatureC !== undefined ? formatTemperature(latest.temperatureC, measurementSystem) : 'Non disponible'} <em>{latest ? formatPowerMonth(latest.date) : ''}</em></strong></span></div><div className="assistant-soil-stat"><span className="soil-stat-icon organic"><CloudRain size={14} /></span><span><small>Pluie moyenne · POWER</small><strong>{latest?.precipitationMmPerDay !== undefined ? formatPrecipitationRate(latest.precipitationMmPerDay, measurementSystem) : 'Non disponible'} <em>{latest ? formatPowerMonth(latest.date) : ''}</em></strong></span></div><button type="button" className="assistant-map-details" onClick={() => handleSend('Explique les données NASA POWER pour ce point.', [])}>Analyser les données <Send size={13} /></button></footer>
      </div>
    </section>
  )
}
