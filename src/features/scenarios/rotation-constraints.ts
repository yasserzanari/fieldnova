import type { GeoPoint } from '../../lib/geo/location'
import { cropCatalog, type CropId } from './rotation-model'

export type RotationConstraints = {
  unavailableCropIds: CropId[]
}

const storagePrefix = 'fieldnova:rotation-constraints:v1:'
const cropIds = new Set(cropCatalog.map(crop => crop.id))

export function emptyRotationConstraints(): RotationConstraints {
  return { unavailableCropIds: [] }
}

export function readRotationConstraints(point: GeoPoint): RotationConstraints {
  try {
    const value = localStorage.getItem(storageKey(point))
    if (!value) return emptyRotationConstraints()
    const parsed = JSON.parse(value) as { unavailableCropIds?: unknown }
    const unavailableCropIds = Array.isArray(parsed.unavailableCropIds)
      ? [...new Set(parsed.unavailableCropIds.filter((id): id is CropId => typeof id === 'string' && cropIds.has(id as CropId)))]
      : []
    return { unavailableCropIds }
  } catch {
    return emptyRotationConstraints()
  }
}

export function writeRotationConstraints(point: GeoPoint, constraints: RotationConstraints) {
  const stored = { unavailableCropIds: [...new Set(constraints.unavailableCropIds.filter(id => cropIds.has(id)))] }
  localStorage.setItem(storageKey(point), JSON.stringify(stored))
  return stored
}

function storageKey(point: GeoPoint) {
  return `${storagePrefix}${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`
}
