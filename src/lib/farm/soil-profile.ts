import type { GeoPoint } from '../geo/location'

export type SoilTexture = 'sandy' | 'loamy' | 'clayey' | 'unknown'
export type SoilDrainage = 'poor' | 'moderate' | 'good' | 'unknown'
export type SoilSourceType = 'farmer-reported' | 'lab-analysis' | 'other-source'
export type SoilHorizon = {
  topCm: number
  bottomCm: number
  texture?: SoilTexture
  ph?: number
  organicMatterPercent?: number
  sourceType?: SoilSourceType
  sourceName?: string
  sampleDate?: string
}
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
  horizons?: SoilHorizon[]
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
      horizons: readHorizons(parsed.horizons),
      sourceType: isOneOf(parsed.sourceType, ['farmer-reported', 'lab-analysis', 'other-source']) ? parsed.sourceType : undefined,
      sourceName: typeof parsed.sourceName === 'string' ? parsed.sourceName.slice(0, 120) : undefined,
      sampleDate: isIsoDate(parsed.sampleDate) ? parsed.sampleDate : undefined,
      updatedAt: typeof parsed.updatedAt === 'string' && Number.isFinite(Date.parse(parsed.updatedAt)) ? parsed.updatedAt : undefined,
    }
  } catch {
    return {}
  }
}

export function resolveSoilHorizonProvenance(horizon: SoilHorizon, profile: Pick<FarmSoilProfile, 'sourceType' | 'sourceName' | 'sampleDate'>) {
  const profileSourceType = profile.sourceType ?? 'farmer-reported'
  const sourceType = horizon.sourceType ?? profileSourceType
  const inheritsProfileMetadata = horizon.sourceType === undefined || horizon.sourceType === profileSourceType
  return {
    sourceType,
    sourceName: horizon.sourceName ?? (inheritsProfileMetadata ? profile.sourceName : undefined),
    sampleDate: horizon.sampleDate ?? (inheritsProfileMetadata ? profile.sampleDate : undefined),
  }
}

export function writeSoilProfile(point: GeoPoint, profile: FarmSoilProfile) {
  const horizonError = validateSoilHorizons(profile.horizons ?? [])
  if (horizonError) throw new Error(horizonError)
  const clean: FarmSoilProfile = {
    texture: profile.texture,
    ph: profile.ph,
    organicMatterPercent: profile.organicMatterPercent,
    effectiveDepthCm: profile.effectiveDepthCm,
    drainage: profile.drainage,
    horizons: profile.horizons?.length ? profile.horizons : undefined,
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

export function validateSoilHorizons(horizons: SoilHorizon[]) {
  if (horizons.length > 5) return 'Un profil peut contenir au maximum cinq horizons.'
  for (let index = 0; index < horizons.length; index += 1) {
    const horizon = horizons[index]
    if (!Number.isInteger(horizon.topCm) || !Number.isInteger(horizon.bottomCm) || horizon.topCm < 0 || horizon.bottomCm > 400 || horizon.bottomCm <= horizon.topCm) {
      return `Horizon ${index + 1} : la profondeur de fin doit dépasser la profondeur de début et rester sous 400 cm.`
    }
    if (index > 0 && horizon.topCm < horizons[index - 1].bottomCm) {
      return `Horizon ${index + 1} : les profondeurs doivent être dans l’ordre et ne pas se chevaucher.`
    }
    if (horizon.texture !== undefined && !isOneOf(horizon.texture, ['sandy', 'loamy', 'clayey', 'unknown'])) return `Horizon ${index + 1} : texture invalide.`
    if (horizon.ph !== undefined && !isInRange(horizon.ph, 0, 14)) return `Horizon ${index + 1} : pH hors plage (0 à 14).`
    if (horizon.organicMatterPercent !== undefined && !isInRange(horizon.organicMatterPercent, 0, 100)) return `Horizon ${index + 1} : matière organique hors plage (0 à 100 %).`
    if (horizon.sourceType !== undefined && !isOneOf(horizon.sourceType, ['farmer-reported', 'lab-analysis', 'other-source'])) return `Horizon ${index + 1} : origine invalide.`
    if (horizon.sourceName !== undefined && (typeof horizon.sourceName !== 'string' || horizon.sourceName.length > 120)) return `Horizon ${index + 1} : la référence de source ne peut pas dépasser 120 caractères.`
    if (horizon.sampleDate !== undefined && !isIsoDate(horizon.sampleDate)) return `Horizon ${index + 1} : date d’échantillon invalide.`
  }
  return ''
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

function readHorizons(value: unknown): SoilHorizon[] | undefined {
  if (!Array.isArray(value) || value.length > 5) return undefined
  const horizons = value.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const source = item as Partial<SoilHorizon>
    if (!isInRange(source.topCm, 0, 399) || !Number.isInteger(source.topCm) || !isInRange(source.bottomCm, 1, 400) || !Number.isInteger(source.bottomCm)) return []
    return [{
      topCm: source.topCm,
      bottomCm: source.bottomCm,
      texture: isOneOf(source.texture, ['sandy', 'loamy', 'clayey', 'unknown']) ? source.texture : undefined,
      ph: isInRange(source.ph, 0, 14) ? source.ph : undefined,
      organicMatterPercent: isInRange(source.organicMatterPercent, 0, 100) ? source.organicMatterPercent : undefined,
      sourceType: isOneOf(source.sourceType, ['farmer-reported', 'lab-analysis', 'other-source']) ? source.sourceType : undefined,
      sourceName: typeof source.sourceName === 'string' ? source.sourceName.slice(0, 120) : undefined,
      sampleDate: isIsoDate(source.sampleDate) ? source.sampleDate : undefined,
    }]
  })
  return horizons.length && !validateSoilHorizons(horizons) ? horizons : undefined
}
