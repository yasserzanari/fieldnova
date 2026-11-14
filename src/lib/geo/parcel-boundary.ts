import { useEffect, useState } from 'react'
import type { Feature, MultiPolygon, Polygon } from 'geojson'

type Position = number[]
type PolygonCoordinates = Position[][]
type MultiPolygonCoordinates = PolygonCoordinates[]

export type ParcelGeometry = Polygon | MultiPolygon
export type ParcelFeature = Feature<ParcelGeometry, { name?: string }>
export type ParcelBounds = [[number, number], [number, number]]
export type ParsedParcel = { feature: ParcelFeature; areaHectares: number; bounds: ParcelBounds }

const STORAGE_KEY = 'fieldnova:parcel-boundary:v1'
const PARCEL_EVENT = 'fieldnova:parcel-boundary-change'
const MAX_FILE_BYTES = 2 * 1024 * 1024
const EARTH_RADIUS_METERS = 6_371_008.8

export function parseParcelGeoJSON(text: string, fallbackName = 'Parcelle importée'): ParsedParcel {
  if (new TextEncoder().encode(text).byteLength > MAX_FILE_BYTES) throw new Error('Le fichier doit faire moins de 2 Mo.')
  let input: unknown
  try {
    input = JSON.parse(text)
  } catch {
    throw new Error('Le fichier ne contient pas de JSON valide.')
  }
  const geometries = readPolygonGeometries(input)
  if (!geometries.length) throw new Error('Le fichier doit contenir au moins une géométrie Polygon ou MultiPolygon.')
  const polygons = geometries.flatMap(geometry => geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates)
  if (polygons.some(polygon => !Array.isArray(polygon) || !polygon.length || polygon.some(ring => !Array.isArray(ring) || ring.some(position => !Array.isArray(position) || position.length < 2)))) {
    throw new Error('La géométrie contient des anneaux ou des coordonnées mal formés.')
  }
  const positions = polygons.flat(2)
  let minLongitude = Infinity
  let minLatitude = Infinity
  let maxLongitude = -Infinity
  let maxLatitude = -Infinity
  for (const [longitude, latitude] of positions) {
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      throw new Error('Les coordonnées doivent être en longitude/latitude WGS84 (EPSG:4326).')
    }
    minLongitude = Math.min(minLongitude, longitude)
    minLatitude = Math.min(minLatitude, latitude)
    maxLongitude = Math.max(maxLongitude, longitude)
    maxLatitude = Math.max(maxLatitude, latitude)
  }
  const coordinates = polygons as MultiPolygonCoordinates
  const areaSquareMeters = polygons.reduce((sum, polygon) => {
    if (!polygon.length || polygon.some(ring => !isValidRing(ring))) throw new Error('Chaque anneau GeoJSON doit contenir au moins 4 points et être fermé.')
    const outerArea = ringArea(polygon[0])
    const holeArea = polygon.slice(1).reduce((area, ring) => area + ringArea(ring), 0)
    return sum + Math.max(0, outerArea - holeArea)
  }, 0)
  if (areaSquareMeters <= 0) throw new Error('La superficie de la parcelle doit être supérieure à zéro.')
  const properties = readProperties(input)
  const name = typeof properties?.name === 'string' && properties.name.trim() ? properties.name.trim().slice(0, 100) : fallbackName.slice(0, 100)
  const feature: ParcelFeature = {
    type: 'Feature',
    properties: { name },
    geometry: { type: 'MultiPolygon', coordinates },
  }
  return {
    feature,
    areaHectares: areaSquareMeters / 10_000,
    bounds: [[minLongitude, minLatitude], [maxLongitude, maxLatitude]],
  }
}

export function readSavedParcelBoundary(): ParsedParcel | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as { feature?: unknown }
    return value.feature ? parseParcelGeoJSON(JSON.stringify(value.feature)) : null
  } catch {
    return null
  }
}

export function useParcelBoundary() {
  const [parcel, setParcel] = useState<ParsedParcel | null>(readSavedParcelBoundary)
  useEffect(() => {
    const update = () => setParcel(readSavedParcelBoundary())
    window.addEventListener(PARCEL_EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(PARCEL_EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [])
  return parcel
}

export function saveParcelBoundary(parcel: ParsedParcel) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ feature: parcel.feature }))
  window.dispatchEvent(new CustomEvent(PARCEL_EVENT))
}

export function clearSavedParcelBoundary() {
  localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new CustomEvent(PARCEL_EVENT))
}

function readPolygonGeometries(input: unknown): Array<Polygon | MultiPolygon> {
  if (!input || typeof input !== 'object') return []
  const value = input as { type?: string; geometry?: unknown; features?: unknown[] }
  if (value.type === 'FeatureCollection' && Array.isArray(value.features)) return value.features.flatMap(readPolygonGeometries)
  if (value.type === 'Feature') return value.geometry ? readPolygonGeometries(value.geometry) : []
  if (value.type === 'Polygon' && Array.isArray((input as Polygon).coordinates)) return [input as Polygon]
  if (value.type === 'MultiPolygon' && Array.isArray((input as MultiPolygon).coordinates)) return [input as MultiPolygon]
  return []
}

function readProperties(input: unknown): Record<string, unknown> | undefined {
  if (!input || typeof input !== 'object') return undefined
  const value = input as { type?: string; properties?: unknown; features?: unknown[] }
  if (value.type === 'Feature' && value.properties && typeof value.properties === 'object') return value.properties as Record<string, unknown>
  if (value.type === 'FeatureCollection' && Array.isArray(value.features)) {
    const first: unknown = value.features.find(feature => readProperties(feature)?.name)
    return first ? readProperties(first) : undefined
  }
  return undefined
}

function isValidRing(ring: Position[]) {
  if (ring.length < 4) return false
  const [firstLongitude, firstLatitude] = ring[0]
  const [lastLongitude, lastLatitude] = ring[ring.length - 1]
  return firstLongitude === lastLongitude && firstLatitude === lastLatitude
}

function ringArea(ring: Position[]) {
  let total = 0
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [longitudeA, latitudeA] = ring[index]
    const [longitudeB, latitudeB] = ring[index + 1]
    const longitudeDelta = (longitudeB - longitudeA) * Math.PI / 180
    total += longitudeDelta * (2 + Math.sin(latitudeA * Math.PI / 180) + Math.sin(latitudeB * Math.PI / 180))
  }
  return Math.abs(total * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS / 2)
}
