import type { GeoPoint } from '../geo/location'

export type FarmWaterAccess = 'rainfed' | 'irrigated' | 'mixed' | 'unknown'
export type FarmWaterConstraint = 'none' | 'seasonal' | 'limited' | 'unknown'

export type FarmProfile = {
  name: string
  waterAccess: FarmWaterAccess
  waterConstraint: FarmWaterConstraint
  waterNotes?: string
  updatedAt: string
}

export const farmWaterAccessLabels: Record<FarmWaterAccess, string> = {
  rainfed: 'Cultures en pluvial',
  irrigated: 'Irrigation disponible',
  mixed: 'Situation mixte selon les parcelles',
  unknown: 'Accès à l’eau inconnu',
}

export const farmWaterConstraintLabels: Record<FarmWaterConstraint, string> = {
  none: 'Aucune restriction déclarée',
  seasonal: 'Restrictions saisonnières déclarées',
  limited: 'Volume limité déclaré',
  unknown: 'Restrictions inconnues',
}

const storagePrefix = 'fieldnova:farm-profile:v1:'

export function readFarmProfile(point: GeoPoint): FarmProfile | null {
  try {
    const raw = localStorage.getItem(storageKey(point))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<FarmProfile>
    if (typeof parsed.name !== 'string' || !parsed.name.trim()) return null
    if (!isOneOf(parsed.waterAccess, ['rainfed', 'irrigated', 'mixed', 'unknown'])) return null
    if (!isOneOf(parsed.waterConstraint, ['none', 'seasonal', 'limited', 'unknown'])) return null
    return {
      name: parsed.name.trim().slice(0, 80),
      waterAccess: parsed.waterAccess,
      waterConstraint: parsed.waterConstraint,
      waterNotes: typeof parsed.waterNotes === 'string' ? parsed.waterNotes.trim().slice(0, 240) || undefined : undefined,
      updatedAt: typeof parsed.updatedAt === 'string' && Number.isFinite(Date.parse(parsed.updatedAt)) ? parsed.updatedAt : '',
    }
  } catch {
    return null
  }
}

export function writeFarmProfile(point: GeoPoint, profile: Omit<FarmProfile, 'updatedAt'>) {
  const name = profile.name.trim()
  if (!name || name.length > 80) throw new Error('Saisissez un nom de ferme de 1 à 80 caractères.')
  if (!isOneOf(profile.waterAccess, ['rainfed', 'irrigated', 'mixed', 'unknown'])) throw new Error('Choisissez la situation d’accès à l’eau.')
  if (!isOneOf(profile.waterConstraint, ['none', 'seasonal', 'limited', 'unknown'])) throw new Error('Choisissez l’état des restrictions d’eau.')
  if (profile.waterNotes && profile.waterNotes.length > 240) throw new Error('Les précisions sur l’eau ne peuvent pas dépasser 240 caractères.')

  const stored: FarmProfile = {
    name,
    waterAccess: profile.waterAccess,
    waterConstraint: profile.waterConstraint,
    waterNotes: profile.waterNotes?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(storageKey(point), JSON.stringify(stored))
  return stored
}

function storageKey(point: GeoPoint) {
  return `${storagePrefix}${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`
}

function isOneOf<Value extends string>(value: unknown, choices: readonly Value[]): value is Value {
  return typeof value === 'string' && choices.includes(value as Value)
}
