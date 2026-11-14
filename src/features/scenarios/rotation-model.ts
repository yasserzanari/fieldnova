import type { GeoPoint } from '../../lib/geo/location'

export type CropId = 'wheat' | 'maize' | 'oats' | 'pea' | 'faba' | 'rapeseed' | 'sunflower' | 'beet'
export type RotationId = 'reference' | 'option-a' | 'option-b'
export type RotationPriority = 'diversity' | 'alternation' | 'legume'

export type CropDefinition = {
  id: CropId
  label: string
  family: string
  familyLabel: string
  isLegume: boolean
}

export type RotationPlan = {
  id: RotationId
  title: string
  crops: Array<CropId | ''>
}

export type RotationWorkspace = {
  plans: RotationPlan[]
  priority: RotationPriority
  isExample: boolean
}

export const cropCatalog: CropDefinition[] = [
  { id: 'wheat', label: 'Blé tendre', family: 'poaceae', familyLabel: 'Poacées', isLegume: false },
  { id: 'maize', label: 'Maïs', family: 'poaceae', familyLabel: 'Poacées', isLegume: false },
  { id: 'oats', label: 'Avoine', family: 'poaceae', familyLabel: 'Poacées', isLegume: false },
  { id: 'pea', label: 'Pois protéagineux', family: 'fabaceae', familyLabel: 'Fabacées', isLegume: true },
  { id: 'faba', label: 'Féverole', family: 'fabaceae', familyLabel: 'Fabacées', isLegume: true },
  { id: 'rapeseed', label: 'Colza', family: 'brassicaceae', familyLabel: 'Brassicacées', isLegume: false },
  { id: 'sunflower', label: 'Tournesol', family: 'asteraceae', familyLabel: 'Astéracées', isLegume: false },
  { id: 'beet', label: 'Betterave sucrière', family: 'amaranthaceae', familyLabel: 'Amaranthacées', isLegume: false },
]

export const priorityLabels: Record<RotationPriority, string> = {
  diversity: 'Diversité des familles',
  alternation: 'Alternance des familles',
  legume: 'Présence de légumineuses',
}

const cropIds = new Set(cropCatalog.map(crop => crop.id))
const storagePrefix = 'fieldnova:rotation-workspace:v1:'

export function exampleRotationWorkspace(): RotationWorkspace {
  return {
    priority: 'diversity',
    isExample: true,
    plans: [
      { id: 'reference', title: 'Référence actuelle', crops: ['wheat', 'maize', 'wheat'] },
      { id: 'option-a', title: 'Option A', crops: ['wheat', 'pea', 'maize'] },
      { id: 'option-b', title: 'Option B', crops: ['rapeseed', 'wheat', 'sunflower'] },
    ],
  }
}

export function readRotationWorkspace(point: GeoPoint): RotationWorkspace {
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
        crops: Array.from({ length: 3 }, (_, index) => isCropId(stored?.crops?.[index]) ? stored.crops[index] : ''),
      }
    })
    const priority = parsed.priority === 'alternation' || parsed.priority === 'legume' ? parsed.priority : 'diversity'
    return { plans, priority, isExample: false }
  } catch {
    return exampleRotationWorkspace()
  }
}

export function writeRotationWorkspace(point: GeoPoint, workspace: RotationWorkspace) {
  const stored: RotationWorkspace = { ...workspace, isExample: false }
  localStorage.setItem(rotationStorageKey(point), JSON.stringify(stored))
  return stored
}

export function evaluateRotation(plan: RotationPlan) {
  const crops = plan.crops.map(id => cropCatalog.find(crop => crop.id === id)).filter((crop): crop is CropDefinition => Boolean(crop))
  const distinctFamilies = new Set(crops.map(crop => crop.family)).size
  const repeatedFamilyTransitions = crops.slice(1).reduce((count, crop, index) => count + Number(crop.family === crops[index].family), 0)
  const legumeSeasons = crops.filter(crop => crop.isLegume).length
  return {
    complete: crops.length === plan.crops.length,
    distinctFamilies,
    repeatedFamilyTransitions,
    legumeSeasons,
  }
}

export function topRotations(plans: RotationPlan[], priority: RotationPriority) {
  const complete = plans.map(plan => ({ plan, metrics: evaluateRotation(plan) })).filter(item => item.metrics.complete)
  if (!complete.length) return []
  const value = (item: typeof complete[number]) => priority === 'diversity'
    ? item.metrics.distinctFamilies
    : priority === 'alternation'
      ? -item.metrics.repeatedFamilyTransitions
      : item.metrics.legumeSeasons
  const best = Math.max(...complete.map(value))
  return complete.filter(item => value(item) === best).map(item => item.plan.id)
}

function rotationStorageKey(point: GeoPoint) {
  return `${storagePrefix}${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`
}

function isCropId(value: unknown): value is CropId {
  return typeof value === 'string' && cropIds.has(value as CropId)
}
