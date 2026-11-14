import type { GeoPoint } from '../geo/location'

export type SoilTexture = 'sandy' | 'loamy' | 'clayey' | 'unknown'
export type SoilDrainage = 'poor' | 'moderate' | 'good' | 'unknown'
export type SoilSourceType = 'farmer-reported' | 'lab-analysis' | 'other-source'
export const soilSourceLabels: Record<SoilSourceType, string> = {
  'farmer-reported': 'déclaration de l’exploitation',
  'lab-analysis': 'analyse de laboratoire déclarée',
  'other-source': 'autre source déclarée',
}

export type FarmSoilProfile = {
  texture?: SoilTexture
  ph?: number
  organicMatterPercent?: number
  effectiveDepthCm?: number
  drainage?: SoilDrainage
  sourceType?: SoilSourceType
  sourceName?: string
  sampleDate?: string
  updatedAt?: string
}

const PROFILE_PREFIX = 'fieldnova:soil-profile:v1:'

export function soilProfileStorageKey(point: GeoPoint) {
  return `${PROFILE_PREFIX}${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`
}

export function readSoilProfile(point: GeoPoint): FarmSoilProfile {
  try {
    const value = localStorage.getItem(soilProfileStorageKey(point))
    if (!value) return {}
    const parsed = JSON.parse(value) as FarmSoilProfile
    return {
      texture: isOneOf(parsed.texture, ['sandy', 'loamy', 'clayey', 'unknown']) ? parsed.texture : undefined,
      ph: isInRange(parsed.ph, 0, 14) ? parsed.ph : undefined,
      organicMatterPercent: isInRange(parsed.organicMatterPercent, 0, 100) ? parsed.organicMatterPercent : undefined,
      effectiveDepthCm: isInRange(parsed.effectiveDepthCm, 0, 400) ? parsed.effectiveDepthCm : undefined,
      drainage: isOneOf(parsed.drainage, ['poor', 'moderate', 'good', 'unknown']) ? parsed.drainage : undefined,
      sourceType: isOneOf(parsed.sourceType, ['farmer-reported', 'lab-analysis', 'other-source']) ? parsed.sourceType : undefined,
      sourceName: typeof parsed.sourceName === 'string' ? parsed.sourceName.slice(0, 120) : undefined,
      sampleDate: isIsoDate(parsed.sampleDate) ? parsed.sampleDate : undefined,
      updatedAt: typeof parsed.updatedAt === 'string' && Number.isFinite(Date.parse(parsed.updatedAt)) ? parsed.updatedAt : undefined,
    }
  } catch {
    return {}
  }
}

export function writeSoilProfile(point: GeoPoint, profile: FarmSoilProfile) {
  const clean: FarmSoilProfile = {
    texture: profile.texture,
    ph: profile.ph,
    organicMatterPercent: profile.organicMatterPercent,
    effectiveDepthCm: profile.effectiveDepthCm,
    drainage: profile.drainage,
    sourceType: profile.sourceType ?? 'farmer-reported',
    sourceName: typeof profile.sourceName === 'string' ? profile.sourceName.trim().slice(0, 120) || undefined : undefined,
    sampleDate: isIsoDate(profile.sampleDate) ? profile.sampleDate : undefined,
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(soilProfileStorageKey(point), JSON.stringify(clean))
  return clean
}

export function clearSoilProfile(point: GeoPoint) {
  localStorage.removeItem(soilProfileStorageKey(point))
}

function isInRange(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
}

function isOneOf<Value extends string>(value: unknown, choices: readonly Value[]): value is Value {
  return typeof value === 'string' && choices.includes(value as Value)
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const timestamp = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
}
