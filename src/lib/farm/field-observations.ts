import type { GeoPoint } from '../geo/location'

export type ObservationKind = 'semis' | 'recolte' | 'irrigation' | 'note'

export type FieldObservation = {
  id: string
  date: string
  kind: ObservationKind
  crop: string
  note: string
  author: string
  photoId?: string
}

const STORAGE_PREFIX = 'fieldnova:observations:v1:'
export const FIELD_OBSERVATION_LIMIT = 200

export function fieldObservationsStorageKey(point: GeoPoint) {
  return `${STORAGE_PREFIX}${point.latitude.toFixed(5)}:${point.longitude.toFixed(5)}`
}

function isFieldObservation(entry: unknown): entry is FieldObservation {
  if (!entry || typeof entry !== 'object') return false
  const value = entry as Partial<FieldObservation>
  return typeof value.id === 'string' && typeof value.date === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(value.date) && !Number.isNaN(Date.parse(`${value.date}T12:00:00`))
    && ['semis', 'recolte', 'irrigation', 'note'].includes(value.kind ?? '')
    && typeof value.crop === 'string' && typeof value.note === 'string' && typeof value.author === 'string'
    && (value.photoId === undefined || typeof value.photoId === 'string')
}

export function readFieldObservations(point: GeoPoint): FieldObservation[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(fieldObservationsStorageKey(point)) ?? '[]')
    if (!Array.isArray(data)) return []
    return data.filter(isFieldObservation).sort((a, b) => b.date.localeCompare(a.date)).slice(0, FIELD_OBSERVATION_LIMIT)
  } catch {
    return []
  }
}

export function writeFieldObservations(point: GeoPoint, items: FieldObservation[]) {
  localStorage.setItem(fieldObservationsStorageKey(point), JSON.stringify(items.slice(0, FIELD_OBSERVATION_LIMIT)))
}

export function fieldObservationKindLabel(kind: ObservationKind) {
  return ({ semis: 'Semis', recolte: 'Récolte', irrigation: 'Irrigation', note: 'Note' } satisfies Record<ObservationKind, string>)[kind]
}
