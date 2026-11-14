import type { GeoPoint } from '../geo/location'

export type SoilTexture = 'sandy' | 'loamy' | 'clayey' | 'unknown'
export type SoilDrainage = 'poor' | 'moderate' | 'good' | 'unknown'

export type FarmSoilProfile = {
  texture?: SoilTexture
  ph?: number
  organicMatterPercent?: number
  effectiveDepthCm?: number
  drainage?: SoilDrainage
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
