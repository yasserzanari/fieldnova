import type { GeoPoint } from '../geo/location'
import type { Feature, MultiPolygon, Polygon } from 'geojson'

export type PowerGridCellProperties = {
  center: GeoPoint
  latitudeResolutionDegrees: number
  longitudeResolutionDegrees: number
  widthKm: number
  heightKm: number
}
export type PowerGridCell = Feature<Polygon | MultiPolygon, PowerGridCellProperties>

export type PowerMonthlyRecord = {
  date: string
  precipitationMmPerDay?: number
  temperatureC?: number
  temperatureMaxC?: number
  temperatureMinC?: number
  surfaceSoilWetness?: number
  rootZoneWetness?: number
}

export type PowerMonthlySeries = {
  point: GeoPoint
  gridPoint: GeoPoint
  gridCell: PowerGridCell
  requestedMonths: string[]
  source: string[]
  timeStandard: string
  fetchedAt: string
  parameters: Record<string, { units: string; longname: string }>
  records: PowerMonthlyRecord[]
}

type PowerResponse = {
  header?: { sources?: string[]; time_standard?: string; fill_value?: number }
  geometry?: { coordinates?: number[] }
  parameters?: Record<string, { units?: string; longname?: string }>
  properties?: { parameter?: Record<string, Record<string, number>> }
  messages?: string[]
}

const CACHE_TTL = 15 * 60 * 1000
const MERRA2_LATITUDE_STEP = 0.5
const MERRA2_LONGITUDE_STEP = 0.625
const cache = new Map<string, { expiresAt: number; data: PowerMonthlySeries }>()

export function merra2GridCellAt(point: GeoPoint): PowerGridCell {
  const latitudeIndex = Math.min(360, Math.max(0, Math.round((point.latitude + 90) / MERRA2_LATITUDE_STEP)))
  const latitude = -90 + latitudeIndex * MERRA2_LATITUDE_STEP
  const normalizedLongitude = ((point.longitude + 180) % 360 + 360) % 360 - 180
  const longitudeIndex = Math.round((normalizedLongitude + 180) / MERRA2_LONGITUDE_STEP) % 576
  const longitude = -180 + longitudeIndex * MERRA2_LONGITUDE_STEP
  const south = Math.max(-90, latitude - MERRA2_LATITUDE_STEP / 2)
  const north = Math.min(90, latitude + MERRA2_LATITUDE_STEP / 2)
  const west = longitude - MERRA2_LONGITUDE_STEP / 2
  const east = longitude + MERRA2_LONGITUDE_STEP / 2
  const latitudeKm = (north - south) * 111.32
  const longitudeKm = MERRA2_LONGITUDE_STEP * 111.32 * Math.cos(latitude * Math.PI / 180)
  const ring = (left: number, right: number) => [[left, south], [right, south], [right, north], [left, north], [left, south]] as [number, number][]
  const geometry: Polygon | MultiPolygon = west < -180
    ? { type: 'MultiPolygon', coordinates: [[ring(west + 360, 180)], [ring(-180, east)]] }
    : east > 180
      ? { type: 'MultiPolygon', coordinates: [[ring(west, 180)], [ring(-180, east - 360)]] }
      : { type: 'Polygon', coordinates: [ring(west, east)] }
  return {
    type: 'Feature',
    properties: {
      center: { latitude, longitude },
      latitudeResolutionDegrees: MERRA2_LATITUDE_STEP,
      longitudeResolutionDegrees: MERRA2_LONGITUDE_STEP,
      widthKm: Math.max(0, longitudeKm),
      heightKm: latitudeKm,
    },
    geometry,
  }
}

export async function fetchPowerMonthly(point: GeoPoint, years = 5, signal?: AbortSignal): Promise<PowerMonthlySeries> {
  const lat = Number(point.latitude.toFixed(3))
  const lon = Number(point.longitude.toFixed(3))
  const startYear = new Date().getUTCFullYear() - years + 1
  const endYear = new Date().getUTCFullYear()
  const key = `${lat},${lon}:${startYear}-${endYear}`
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.data

  const params = new URLSearchParams({
    parameters: 'PRECTOTCORR,T2M,T2M_MAX,T2M_MIN,GWETTOP,GWETROOT',
    community: 'AG',
    longitude: String(lon),
    latitude: String(lat),
    start: String(startYear),
    end: String(endYear),
    format: 'JSON',
    'time-standard': 'UTC',
  })
  const response = await fetch(`https://power.larc.nasa.gov/api/temporal/monthly/point?${params}`, { signal })
  const body = await response.json() as PowerResponse
  if (!response.ok) throw new Error(body.messages?.join(' ') || `NASA POWER a répondu ${response.status}.`)

  const values = body.properties?.parameter
  if (!values) throw new Error('NASA POWER n’a renvoyé aucune série exploitable pour ce point.')
  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7).replace('-', '')
  const currentMonthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  const requestedMonths: string[] = []
  for (let time = Date.UTC(startYear, 0, 1); time < currentMonthStart;) {
    const date = new Date(time)
    requestedMonths.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`)
    date.setUTCMonth(date.getUTCMonth() + 1)
    time = date.getTime()
  }
  // The monthly endpoint may already return the in-progress month. Keep only closed
  // calendar months so every consumer can call its latest record "complete" safely.
  const keys = Object.keys(values.PRECTOTCORR ?? values.T2M ?? {}).filter(date => date < currentMonth).sort()
  const fill = body.header?.fill_value ?? -999
  const valueAt = (parameter: string, date: string) => {
    const value = values[parameter]?.[date]
    return value === undefined || value === fill || !Number.isFinite(value) ? undefined : value
  }
  const records = keys.map(date => ({
    date: `${date.slice(0, 4)}-${date.slice(4, 6)}`,
    precipitationMmPerDay: valueAt('PRECTOTCORR', date),
    temperatureC: valueAt('T2M', date),
    temperatureMaxC: valueAt('T2M_MAX', date),
    temperatureMinC: valueAt('T2M_MIN', date),
    surfaceSoilWetness: valueAt('GWETTOP', date),
    rootZoneWetness: valueAt('GWETROOT', date),
  })).filter(record => Object.values(record).some(value => typeof value === 'number'))

  if (!records.length) throw new Error('NASA POWER n’a pas encore de mois achevé exploitable pour ce point.')
  const gridCell = merra2GridCellAt(point)
  const series: PowerMonthlySeries = {
    point,
    gridPoint: gridCell.properties.center,
    gridCell,
    requestedMonths,
    source: body.header?.sources ?? ['NASA POWER'],
    timeStandard: body.header?.time_standard ?? 'UTC',
    fetchedAt: new Date().toISOString(),
    parameters: Object.fromEntries(Object.entries(body.parameters ?? {}).map(([name, value]) => [name, { units: value.units ?? '', longname: value.longname ?? name }])),
    records,
  }
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL, data: series })
  return series
}

export function latestCompleteRecord(records: PowerMonthlyRecord[]) {
  return [...records].reverse().find(record => record.temperatureC !== undefined || record.precipitationMmPerDay !== undefined || record.surfaceSoilWetness !== undefined || record.rootZoneWetness !== undefined)
}

export function formatPowerMonth(isoMonth: string) {
  const [year, month] = isoMonth.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)))
}
