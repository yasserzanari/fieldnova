import type { GeoPoint } from '../geo/location'

const STORAGE_PREFIX = 'fieldnova:rotation-comparisons:v1:'
export const ROTATION_COMPARISON_RECORDED_EVENT = 'fieldnova:rotation-comparison-recorded'

export function rotationComparisonStorageKey(point: GeoPoint) {
  return `${STORAGE_PREFIX}${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`
}

export function readRotationComparisonCount(point: GeoPoint) {
  try {
    const count = Number(localStorage.getItem(rotationComparisonStorageKey(point)) ?? 0)
    return Number.isSafeInteger(count) && count >= 0 ? count : 0
  } catch {
    return 0
  }
}

export function recordRotationComparison(point: GeoPoint) {
  const count = readRotationComparisonCount(point) + 1
  try {
    localStorage.setItem(rotationComparisonStorageKey(point), String(count))
    window.dispatchEvent(new CustomEvent(ROTATION_COMPARISON_RECORDED_EVENT, { detail: { pointKey: rotationComparisonStorageKey(point), count } }))
    return count
  } catch {
    return readRotationComparisonCount(point)
  }
}
