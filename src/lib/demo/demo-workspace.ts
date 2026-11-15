import { DEFAULT_GEO_POINT, type GeoPoint } from '../geo/location'
import { writeFarmProfile } from '../farm/farm-profile'
import { exampleRotationWorkspace } from '../../features/scenarios/rotation-model'
import { writeRotationConstraints } from '../../features/scenarios/rotation-constraints'

const DEMO_MODE_KEY = 'fieldnova:demo-workspace:v1'
const LOCATION_KEY = 'fieldnova:selected-coordinate:v1'
const PARCEL_KEY = 'fieldnova:parcel-boundary:v1'

type SnapshotEntry = { key: string; value: string | null }
export type DemoWorkspace = { point: GeoPoint; startedAt: string; backup: SnapshotEntry[] }

function pointKey(point: GeoPoint) {
  return `${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`
}

function localKeys(point: GeoPoint): string[] {
  const key = pointKey(point)
  return [
    `fieldnova:farm-profile:v1:${key}`,
    `fieldnova:rotation-workspace:v1:${key}`,
    `fieldnova:rotation-constraints:v1:${key}`,
    `fieldnova:soil-profile:v1:${key}`,
    PARCEL_KEY,
    LOCATION_KEY,
  ]
}

export function readDemoWorkspace(): DemoWorkspace | null {
  try {
    const value = localStorage.getItem(DEMO_MODE_KEY)
    if (!value) return null
    const parsed = JSON.parse(value) as Partial<DemoWorkspace>
    if (!parsed.point || !Number.isFinite(parsed.point.latitude) || !Number.isFinite(parsed.point.longitude) || !Array.isArray(parsed.backup)) return null
    return {
      point: { latitude: parsed.point.latitude!, longitude: parsed.point.longitude! },
      startedAt: typeof parsed.startedAt === 'string' ? parsed.startedAt : '',
      backup: parsed.backup.filter((item): item is SnapshotEntry => Boolean(item && typeof item.key === 'string' && (typeof item.value === 'string' || item.value === null))),
    }
  } catch {
    return null
  }
}

export function startDemoWorkspace(): DemoWorkspace {
  const active = readDemoWorkspace()
  if (active) return active
  if (localStorage.getItem(DEMO_MODE_KEY)) throw new Error('La session de démonstration locale est invalide.')

  const point = DEFAULT_GEO_POINT
  const keys = localKeys(point)
  const backup = keys.map(key => ({ key, value: localStorage.getItem(key) }))
  const demo: DemoWorkspace = { point, startedAt: new Date().toISOString(), backup }

  try {
    localStorage.setItem(DEMO_MODE_KEY, JSON.stringify(demo))
    writeFarmProfile(point, {
      name: 'Ferme des Chênes — exemple fictif',
      waterAccess: 'mixed',
      waterConstraint: 'seasonal',
      waterNotes: 'Cas de démonstration fictif. Aucun volume ni quota réel renseigné.',
      isExample: true,
    })
    localStorage.setItem(`fieldnova:rotation-workspace:v1:${pointKey(point)}`, JSON.stringify(exampleRotationWorkspace()))
    writeRotationConstraints(point, { unavailableCropIds: ['beet'], preferredCropIds: [] })
    localStorage.removeItem(`fieldnova:soil-profile:v1:${pointKey(point)}`)
    localStorage.removeItem(PARCEL_KEY)
    window.dispatchEvent(new CustomEvent('fieldnova:demo-mode-change'))
    return demo
  } catch (error) {
    restoreSnapshot(backup)
    localStorage.removeItem(DEMO_MODE_KEY)
    throw error
  }
}

export function exitDemoWorkspace() {
  const active = readDemoWorkspace()
  if (!active) return false
  restoreSnapshot(active.backup)
  localStorage.removeItem(DEMO_MODE_KEY)
  window.dispatchEvent(new CustomEvent('fieldnova:demo-mode-change'))
  window.dispatchEvent(new CustomEvent('fieldnova:location-change'))
  return true
}

function restoreSnapshot(snapshot: SnapshotEntry[]) {
  for (const item of snapshot) {
    if (item.value === null) localStorage.removeItem(item.key)
    else localStorage.setItem(item.key, item.value)
  }
}
