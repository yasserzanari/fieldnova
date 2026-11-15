import type { GeoPoint } from '../../lib/geo/location'
import { readCropCatalog, type CropDefinition, type CropId } from './rotation-model'

export type RotationConstraints = {
  unavailableCropIds: CropId[]
}

const storagePrefix = 'fieldnova:rotation-constraints:v1:'
export function emptyRotationConstraints(): RotationConstraints {
  return { unavailableCropIds: [] }
}

export function readRotationConstraints(point: GeoPoint, catalog: CropDefinition[] = readCropCatalog(point)): RotationConstraints {
  try {
    const value = localStorage.getItem(storageKey(point))
    if (!value) return emptyRotationConstraints()
    const parsed = JSON.parse(value) as { unavailableCropIds?: unknown }
    const unavailableCropIds = Array.isArray(parsed.unavailableCropIds)
      ? [...new Set(parsed.unavailableCropIds.filter((id): id is CropId => typeof id === 'string' && catalog.some(crop => crop.id === id)))]
      : []
    return { unavailableCropIds }
  } catch {
    return emptyRotationConstraints()
  }
}

export function writeRotationConstraints(point: GeoPoint, constraints: RotationConstraints, catalog: CropDefinition[] = readCropCatalog(point)) {
  const stored = { unavailableCropIds: [...new Set(constraints.unavailableCropIds.filter(id => catalog.some(crop => crop.id === id)))] }
  localStorage.setItem(storageKey(point), JSON.stringify(stored))
  return stored
}

function storageKey(point: GeoPoint) {
  return `${storagePrefix}${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`
}
