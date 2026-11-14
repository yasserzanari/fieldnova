import { useCallback, useEffect, useState } from 'react'

export type GeoPoint = {
  latitude: number
  longitude: number
}

export const DEFAULT_GEO_POINT: GeoPoint = { latitude: 46.2276, longitude: 2.2137 }

const LOCATION_KEY = 'fieldnova:selected-coordinate:v1'
const LOCATION_EVENT = 'fieldnova:location-change'

function readLocation(): GeoPoint {
  try {
    const raw = localStorage.getItem(LOCATION_KEY)
    if (raw) {
      const point = JSON.parse(raw) as GeoPoint
      if (isValidGeoPoint(point)) return point
    }
  } catch {
    // The default center is used when local storage is unavailable.
  }
  return DEFAULT_GEO_POINT
}

export function isValidGeoPoint(point: GeoPoint) {
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180
}

export function useSelectedLocation() {
  const [location, setLocation] = useState<GeoPoint>(readLocation)

  useEffect(() => {
    const update = () => setLocation(readLocation())
    window.addEventListener(LOCATION_EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(LOCATION_EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [])

  const selectLocation = useCallback((point: GeoPoint) => {
    if (!isValidGeoPoint(point)) return
    localStorage.setItem(LOCATION_KEY, JSON.stringify(point))
    setLocation(point)
    window.dispatchEvent(new CustomEvent(LOCATION_EVENT))
  }, [])

  return { location, selectLocation }
}
