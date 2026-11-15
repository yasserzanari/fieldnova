import type { GeoPoint } from '../geo/location'

export const farmOperations = [
  { id: 'soil-preparation', label: 'Préparation du sol' },
  { id: 'sowing', label: 'Semis' },
  { id: 'fertilizing', label: 'Fertilisation' },
  { id: 'crop-protection', label: 'Protection des cultures' },
  { id: 'irrigation', label: 'Irrigation' },
  { id: 'harvesting', label: 'Récolte' },
  { id: 'transport', label: 'Transport et manutention' },
] as const

export type FarmOperationId = typeof farmOperations[number]['id']
export type OperationAvailability = 'on-farm' | 'contractor' | 'unavailable' | 'unknown'
export type FarmOperationEntry = { availability: OperationAvailability; equipment?: string; note?: string }
export type FarmOperationProfile = Record<FarmOperationId, FarmOperationEntry>

export const operationAvailabilityLabels: Record<OperationAvailability, string> = {
  'on-farm': 'Matériel de la ferme',
  contractor: 'Prestataire prévu',
  unavailable: 'Indisponible',
  unknown: 'Inconnue',
}

const storagePrefix = 'fieldnova:farm-operations:v1:'
const choices: OperationAvailability[] = ['on-farm', 'contractor', 'unavailable', 'unknown']
const key = (point: GeoPoint) => `${storagePrefix}${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`

export function emptyFarmOperationProfile(): FarmOperationProfile {
  return Object.fromEntries(farmOperations.map(operation => [operation.id, { availability: 'unknown' }])) as FarmOperationProfile
}

export function readFarmOperationProfile(point: GeoPoint): FarmOperationProfile {
  try {
    const raw = localStorage.getItem(key(point))
    if (!raw) return emptyFarmOperationProfile()
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const profile = emptyFarmOperationProfile()
    for (const operation of farmOperations) {
      const value = parsed[operation.id]
      if (!value || typeof value !== 'object') continue
      const entry = value as Record<string, unknown>
      profile[operation.id] = {
        availability: choices.includes(entry.availability as OperationAvailability) ? entry.availability as OperationAvailability : 'unknown',
        ...(typeof entry.equipment === 'string' && entry.equipment.trim() ? { equipment: entry.equipment.trim().slice(0, 80) } : {}),
        ...(typeof entry.note === 'string' && entry.note.trim() ? { note: entry.note.trim().slice(0, 160) } : {}),
      }
    }
    return profile
  } catch { return emptyFarmOperationProfile() }
}

export function writeFarmOperationProfile(point: GeoPoint, value: FarmOperationProfile) {
  const clean = emptyFarmOperationProfile()
  for (const operation of farmOperations) {
    const entry = value[operation.id]
    if (!entry || !choices.includes(entry.availability)) throw new Error('Vérifiez le statut déclaré pour chaque opération.')
    clean[operation.id] = {
      availability: entry.availability,
      ...(entry.equipment?.trim() ? { equipment: entry.equipment.trim().slice(0, 80) } : {}),
      ...(entry.note?.trim() ? { note: entry.note.trim().slice(0, 160) } : {}),
    }
  }
  localStorage.setItem(key(point), JSON.stringify(clean))
}

export function declaredFarmOperationCount(profile: FarmOperationProfile) {
  return farmOperations.filter(operation => {
    const entry = profile[operation.id]
    return entry?.availability !== 'unknown' || Boolean(entry?.equipment || entry?.note)
  }).length
}
