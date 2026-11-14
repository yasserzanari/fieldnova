import type { GeoPoint } from '../geo/location'

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
const cache = new Map<string, { expiresAt: number; data: PowerMonthlySeries }>()

export async function fetchPowerMonthly(point: GeoPoint, years = 5): Promise<PowerMonthlySeries> {
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
  const response = await fetch(`https://power.larc.nasa.gov/api/temporal/monthly/point?${params}`)
  const body = await response.json() as PowerResponse
  if (!response.ok) throw new Error(body.messages?.join(' ') || `NASA POWER a répondu ${response.status}.`)

  const values = body.properties?.parameter
  if (!values) throw new Error('NASA POWER n’a renvoyé aucune série exploitable pour ce point.')
  const currentMonth = new Date().toISOString().slice(0, 7).replace('-', '')
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
  const coordinates = body.geometry?.coordinates
  const series: PowerMonthlySeries = {
    point,
    gridPoint: coordinates?.length && coordinates.length >= 2 ? { longitude: coordinates[0], latitude: coordinates[1] } : point,
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
