import type { GeoPoint } from '../../lib/geo/location'

export type CropId = string
export type RotationId = 'reference' | 'option-a' | 'option-b'
export type RotationPriority = 'diversity' | 'alternation' | 'legume' | 'root' | 'preference'
export type RotationPriorityWeights = Partial<Record<RotationPriority, 1 | 2 | 3>>

export type CropDefinition = {
  id: CropId
  label: string
  shortLabel: string
  family: string
  familyLabel: string
  isLegume: boolean
  rootArchitecture: 'fibrous' | 'taproot' | 'unknown'
  origin?: 'reference-catalog' | 'local-declaration'
  sourceName?: string
  sourceUrl?: string
}

export type RotationPlan = {
  id: RotationId
  title: string
  crops: Array<CropId | ''>
}

export type RotationWorkspace = {
  plans: RotationPlan[]
  priority: RotationPriority
  priorityWeights?: RotationPriorityWeights
  isExample: boolean
}

export const rotationSources = {
  botanicalFamilies: {
    label: 'INPN · référentiel TAXREF des familles',
    url: 'https://inpn.mnhn.fr/telechargement/referentielEspece/referentielTaxo',
  },
  rootArchitecture: {
    label: 'DRAAF Hauts-de-France · systèmes racinaires et successions',
    url: 'https://draaf.hauts-de-france.agriculture.gouv.fr/grandes-cultures-les-systemes-cerealiers-au-coeur-des-assolements-des-hauts-de-a4927.html',
  },
  legumes: {
    label: 'INRAE · diversité végétale et rotations',
    url: 'https://www.inrae.fr/actualites/augmenter-diversite-vegetale-espaces-agricoles-proteger-cultures',
  },
} as const

export const cropCatalog: CropDefinition[] = [
  { id: 'wheat', label: 'Blé tendre', shortLabel: 'Blé', family: 'poaceae', familyLabel: 'Poacées', isLegume: false, rootArchitecture: 'fibrous' },
  { id: 'maize', label: 'Maïs', shortLabel: 'Maïs', family: 'poaceae', familyLabel: 'Poacées', isLegume: false, rootArchitecture: 'unknown' },
  { id: 'oats', label: 'Avoine', shortLabel: 'Avoine', family: 'poaceae', familyLabel: 'Poacées', isLegume: false, rootArchitecture: 'fibrous' },
  { id: 'pea', label: 'Pois protéagineux', shortLabel: 'Pois', family: 'fabaceae', familyLabel: 'Fabacées', isLegume: true, rootArchitecture: 'taproot' },
  { id: 'faba', label: 'Féverole', shortLabel: 'Féverole', family: 'fabaceae', familyLabel: 'Fabacées', isLegume: true, rootArchitecture: 'taproot' },
  { id: 'rapeseed', label: 'Colza', shortLabel: 'Colza', family: 'brassicaceae', familyLabel: 'Brassicacées', isLegume: false, rootArchitecture: 'taproot' },
  { id: 'sunflower', label: 'Tournesol', shortLabel: 'Tournesol', family: 'asteraceae', familyLabel: 'Astéracées', isLegume: false, rootArchitecture: 'unknown' },
  { id: 'beet', label: 'Betterave sucrière', shortLabel: 'Betterave', family: 'amaranthaceae', familyLabel: 'Amaranthacées', isLegume: false, rootArchitecture: 'unknown' },
]

export const priorityLabels: Record<RotationPriority, string> = {
  diversity: 'Diversité des familles',
  alternation: 'Alternance des familles',
  legume: 'Présence de légumineuses',
  root: 'Alternance des racines connues',
  preference: 'Cultures préférées',
}

const customCropStoragePrefix = 'fieldnova:custom-crops:v1:'
const storagePrefix = 'fieldnova:rotation-workspace:v1:'

export function readCropCatalog(point: GeoPoint): CropDefinition[] {
  const standard = cropCatalog.map(crop => ({ ...crop, origin: 'reference-catalog' as const }))
  try {
    const raw = localStorage.getItem(customCropStorageKey(point))
    if (!raw) return standard
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return standard
    const custom = parsed.flatMap((entry): CropDefinition[] => {
      if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' || !entry.id.startsWith('local-')
        || typeof entry.label !== 'string' || !entry.label.trim() || typeof entry.family !== 'string' || !entry.family.trim()
        || typeof entry.familyLabel !== 'string' || !entry.familyLabel.trim() || typeof entry.isLegume !== 'boolean'
        || !['fibrous', 'taproot', 'unknown'].includes(entry.rootArchitecture)) return []
      const label = entry.label.trim().slice(0, 60)
      return [{
        id: entry.id.slice(0, 80), label, shortLabel: label.slice(0, 24), family: entry.family.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'custom',
        familyLabel: entry.familyLabel.trim().slice(0, 60), isLegume: entry.isLegume, rootArchitecture: entry.rootArchitecture,
        origin: 'local-declaration',
        sourceName: typeof entry.sourceName === 'string' ? entry.sourceName.trim().slice(0, 120) || undefined : undefined,
        sourceUrl: typeof entry.sourceUrl === 'string' && isHttpUrl(entry.sourceUrl) ? entry.sourceUrl : undefined,
      }]
    })
    const ids = new Set(standard.map(crop => crop.id))
    return [...standard, ...custom.filter(crop => !ids.has(crop.id) && (ids.add(crop.id), true))]
  } catch {
    return standard
  }
}

export function addCustomCrop(point: GeoPoint, input: Omit<CropDefinition, 'id' | 'shortLabel' | 'origin'>) {
  const label = input.label.trim()
  const familyLabel = input.familyLabel.trim()
  const family = input.family.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
  if (!label || label.length > 60 || !familyLabel || familyLabel.length > 60 || !family || family.length > 40) throw new Error('Renseignez le nom et la famille (60 caractères maximum).')
  if (input.sourceName && input.sourceName.length > 120) throw new Error('La référence ne peut pas dépasser 120 caractères.')
  if (input.sourceUrl && !isHttpUrl(input.sourceUrl)) throw new Error('La référence doit être une URL HTTP ou HTTPS valide.')
  const catalog = readCropCatalog(point)
  if (catalog.some(crop => crop.label.localeCompare(label, 'fr', { sensitivity: 'base' }) === 0)) throw new Error('Cette culture existe déjà dans le catalogue de ce point.')
  const id = `local-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`}`
  const crop: CropDefinition = { ...input, id, label, shortLabel: label.slice(0, 24), family, familyLabel, origin: 'local-declaration' }
  const custom = catalog.filter(entry => entry.origin === 'local-declaration')
  localStorage.setItem(customCropStorageKey(point), JSON.stringify([...custom, crop]))
  return crop
}

export function removeCustomCrop(point: GeoPoint, cropId: CropId) {
  const custom = readCropCatalog(point).filter(crop => crop.origin === 'local-declaration' && crop.id !== cropId)
  localStorage.setItem(customCropStorageKey(point), JSON.stringify(custom))
}

export function exampleRotationWorkspace(): RotationWorkspace {
  return {
    priority: 'diversity',
    priorityWeights: { diversity: 2 },
    isExample: true,
    plans: [
      { id: 'reference', title: 'Référence actuelle', crops: ['wheat', 'maize', 'wheat', 'maize', 'wheat'] },
      { id: 'option-a', title: 'Option A', crops: ['wheat', 'pea', 'maize', 'rapeseed', 'wheat'] },
      { id: 'option-b', title: 'Option B', crops: ['rapeseed', 'wheat', 'sunflower', 'oats', 'faba'] },
    ],
  }
}

export function readRotationWorkspace(point: GeoPoint, catalog = readCropCatalog(point)): RotationWorkspace {
  try {
    const raw = localStorage.getItem(rotationStorageKey(point))
    if (!raw) return exampleRotationWorkspace()
    const parsed = JSON.parse(raw) as Partial<RotationWorkspace>
    const source = Array.isArray(parsed.plans) ? parsed.plans : []
    const plans = (['reference', 'option-a', 'option-b'] as const).map(id => {
      const stored = source.find(plan => plan?.id === id)
      return {
        id,
        title: id === 'reference' ? 'Référence actuelle' : id === 'option-a' ? 'Option A' : 'Option B',
        crops: Array.from({ length: 5 }, (_, index) => {
          const cropId = stored?.crops?.[index]
          return isCropId(cropId, catalog) ? cropId : ''
        }),
      }
    })
    const priority = parsed.priority === 'alternation' || parsed.priority === 'legume' || parsed.priority === 'root' || parsed.priority === 'preference' ? parsed.priority : 'diversity'
    const rawWeights = parsed.priorityWeights && typeof parsed.priorityWeights === 'object' ? parsed.priorityWeights : null
    const priorityWeights = rawWeights ? cleanPriorityWeights(rawWeights) : { [priority]: 2 }
    return { plans, priority, priorityWeights, isExample: parsed.isExample === true }
  } catch {
    return exampleRotationWorkspace()
  }
}

export function writeRotationWorkspace(point: GeoPoint, workspace: RotationWorkspace) {
  const stored: RotationWorkspace = { ...workspace, isExample: workspace.isExample === true }
  localStorage.setItem(rotationStorageKey(point), JSON.stringify(stored))
  return stored
}

export function evaluateRotation(plan: RotationPlan, catalog = cropCatalog, preferredCropIds: CropId[] = []) {
  const crops = plan.crops.map(id => catalog.find(crop => crop.id === id)).filter((crop): crop is CropDefinition => Boolean(crop))
  const distinctFamilies = new Set(crops.map(crop => crop.family)).size
  const repeatedFamilyTransitions = crops.slice(1).reduce((count, crop, index) => count + Number(crop.family === crops[index].family), 0)
  const legumeSeasons = crops.filter(crop => crop.isLegume).length
  const knownRootTransitions = crops.slice(1).reduce((count, crop, index) => {
    const previous = crops[index]
    return count + Number(previous.rootArchitecture !== 'unknown' && crop.rootArchitecture !== 'unknown' && previous.rootArchitecture !== crop.rootArchitecture)
  }, 0)
  return {
    complete: crops.length === plan.crops.length,
    distinctFamilies,
    repeatedFamilyTransitions,
    legumeSeasons,
    knownRootTransitions,
    preferredCropSeasons: crops.filter(crop => preferredCropIds.includes(crop.id)).length,
  }
}

export function cleanPriorityWeights(value: Partial<Record<RotationPriority, unknown>>): RotationPriorityWeights {
  const valid = (entry: unknown): entry is 1 | 2 | 3 => entry === 1 || entry === 2 || entry === 3
  return Object.fromEntries((Object.keys(priorityLabels) as RotationPriority[]).flatMap(priority => valid(value[priority]) ? [[priority, value[priority]]] : [])) as RotationPriorityWeights
}

export function rotationWeightsFor(workspace: Pick<RotationWorkspace, 'priority' | 'priorityWeights'>): RotationPriorityWeights {
  const weights = cleanPriorityWeights(workspace.priorityWeights ?? {})
  return Object.keys(weights).length ? weights : { [workspace.priority]: 2 }
}

export function rotationCombinedScore(metrics: ReturnType<typeof evaluateRotation>, weights: RotationPriorityWeights) {
  const active = Object.entries(weights) as Array<[RotationPriority, 1 | 2 | 3]>
  if (!active.length) return 0
  const normalized: Record<RotationPriority, number> = {
    diversity: metrics.distinctFamilies / 5,
    alternation: (4 - metrics.repeatedFamilyTransitions) / 4,
    legume: metrics.legumeSeasons / 5,
    root: metrics.knownRootTransitions / 4,
    preference: metrics.preferredCropSeasons / 5,
  }
  const totalWeight = active.reduce((sum, [, weight]) => sum + weight, 0)
  return active.reduce((sum, [priority, weight]) => sum + normalized[priority] * weight, 0) / totalWeight
}

export function topRotations(plans: RotationPlan[], priority: RotationPriority | RotationPriorityWeights, unavailableCropIds: CropId[] = [], catalog = cropCatalog, preferredCropIds: CropId[] = []) {
  const weights = typeof priority === 'string' ? { [priority]: 2 } : cleanPriorityWeights(priority)
  const complete = plans.map(plan => ({ plan, metrics: evaluateRotation(plan, catalog, preferredCropIds) })).filter(item => item.metrics.complete && !item.plan.crops.some(id => id && unavailableCropIds.includes(id)))
  if (!complete.length) return []
  const best = Math.max(...complete.map(item => rotationCombinedScore(item.metrics, weights)))
  return complete.filter(item => Math.abs(rotationCombinedScore(item.metrics, weights) - best) < 1e-9).map(item => item.plan.id)
}

export function rotationWeightSensitivity(plans: RotationPlan[], weights: RotationPriorityWeights, unavailableCropIds: CropId[] = [], catalog = cropCatalog, preferredCropIds: CropId[] = []) {
  const completeCount = plans.filter(plan => {
    const metrics = evaluateRotation(plan, catalog, preferredCropIds)
    return metrics.complete && !plan.crops.some(id => id && unavailableCropIds.includes(id))
  }).length
  if (completeCount < 2) return null

  const baselineWinners = topRotations(plans, weights, unavailableCropIds, catalog, preferredCropIds).sort()
  const changedCriteria = new Set<RotationPriority>()
  let testedVariants = 0
  for (const [priority, weight] of Object.entries(weights) as Array<[RotationPriority, 1 | 2 | 3]>) {
    for (const delta of [-1, 1]) {
      const nextWeight = weight + delta
      if (nextWeight < 1 || nextWeight > 3) continue
      const winners = topRotations(plans, { ...weights, [priority]: nextWeight as 1 | 2 | 3 }, unavailableCropIds, catalog, preferredCropIds).sort()
      testedVariants += 1
      if (winners.join('|') !== baselineWinners.join('|')) changedCriteria.add(priority)
    }
  }
  return { completeCount, testedVariants, changedCriteria: [...changedCriteria] }
}

export function generateRotationOptions(reference: RotationPlan, priority: RotationPriority | RotationPriorityWeights, unavailableCropIds: CropId[], catalog = cropCatalog, preferredCropIds: CropId[] = []): [RotationPlan, RotationPlan] | null {
  const weights = typeof priority === 'string' ? { [priority]: 2 } : cleanPriorityWeights(priority)
  const available = catalog.filter(crop => !unavailableCropIds.includes(crop.id))
  if (available.length < 2) return null

  const referenceKey = reference.crops.join('|')
  const candidates: Array<{ crops: CropId[]; metrics: ReturnType<typeof evaluateRotation>; score: number; key: string }> = []
  const visit = (crops: CropId[]) => {
    if (crops.length === 5) {
      const key = crops.join('|')
      if (key === referenceKey) return
      const metrics = evaluateRotation({ id: 'option-a', title: 'Option A', crops }, catalog, preferredCropIds)
      candidates.push({ crops: [...crops], metrics, score: rotationCombinedScore(metrics, weights), key })
      return
    }
    for (const crop of available) visit([...crops, crop.id])
  }
  visit([])
  if (candidates.length < 2) return null

  const byPriority = [...candidates].sort((left, right) => right.score - left.score
    || ((weights.preference ?? 0) > 0 ? right.metrics.preferredCropSeasons - left.metrics.preferredCropSeasons : 0)
    || right.metrics.distinctFamilies - left.metrics.distinctFamilies
    || right.metrics.legumeSeasons - left.metrics.legumeSeasons
    || right.metrics.knownRootTransitions - left.metrics.knownRootTransitions
    || left.metrics.repeatedFamilyTransitions - right.metrics.repeatedFamilyTransitions
    || compareCatalogOrder(left.crops, right.crops, catalog))
  const first = byPriority[0]
  const second = byPriority[1]
  if (!second) return null

  return [
    { id: 'option-a', title: 'Option A', crops: first.crops },
    { id: 'option-b', title: 'Option B', crops: second.crops },
  ]
}

function rotationStorageKey(point: GeoPoint) {
  return `${storagePrefix}${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`
}

function compareCatalogOrder(left: CropId[], right: CropId[], catalog: CropDefinition[]) {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const difference = catalog.findIndex(crop => crop.id === left[index]) - catalog.findIndex(crop => crop.id === right[index])
    if (difference) return difference
  }
  return left.length - right.length
}

function isCropId(value: unknown, catalog: CropDefinition[]): value is CropId {
  return typeof value === 'string' && catalog.some(crop => crop.id === value)
}

function customCropStorageKey(point: GeoPoint) {
  return `${customCropStoragePrefix}${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}
