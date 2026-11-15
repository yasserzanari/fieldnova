import type { GeoPoint } from '../geo/location'

export type PowerDailyRecord = {
  date: string
  precipitationMmPerDay?: number
  temperatureMaxC?: number
  temperatureMinC?: number
}

export type PowerDailySeries = {
  point: GeoPoint
  year: number
  requestedDays: string[]
  records: PowerDailyRecord[]
  source: string[]
  timeStandard: string
  fetchedAt: string
  deliveryMode: 'network' | 'fresh-cache' | 'stale-cache'
  parameters: Record<string, { units: string; longname: string }>
}

type PowerDailyResponse = {
  header?: { sources?: string[]; time_standard?: string; fill_value?: number; end?: string }
  parameters?: Record<string, { units?: string; longname?: string }>
  properties?: { parameter?: Record<string, Record<string, number>> }
  messages?: string[]
}

type StoredDailyCache = { savedAt: number; data: PowerDailySeries }

const STORAGE_PREFIX = 'fieldnova:nasa-power-daily:v1:'
const CACHE_TTL = 15 * 60 * 1000
const MAX_STALE_AGE = 180 * 24 * 60 * 60 * 1000
const memoryCache = new Map<string, StoredDailyCache>()

export function latestClosedPowerYear() {
  return new Date().getUTCFullYear() - 1
}

export function powerDailyYearOptions() {
  const lastYear = new Date().getUTCFullYear()
  return Array.from({ length: lastYear - 1981 + 1 }, (_, index) => lastYear - index)
}

export async function fetchPowerDaily(point: GeoPoint, year: number, signal?: AbortSignal): Promise<PowerDailySeries> {
  if (!Number.isInteger(year) || year < 1981 || year > new Date().getUTCFullYear()) {
    throw new Error('Choisissez une année comprise dans la période disponible de NASA POWER.')
  }
  const latitude = Number(point.latitude.toFixed(3))
  const longitude = Number(point.longitude.toFixed(3))
  const key = `${latitude},${longitude}:${year}`
  const now = Date.now()
  const cached = memoryCache.get(key) ?? readStoredCache(key)
  if (cached && now - cached.savedAt <= CACHE_TTL) {
    memoryCache.set(key, cached)
    return { ...cached.data, deliveryMode: 'fresh-cache' }
  }
  const stale = cached && now - cached.savedAt <= MAX_STALE_AGE ? cached.data : undefined
  const start = `${year}0101`
  const today = new Date()
  const currentYear = today.getUTCFullYear()
  const lastRequestedDate = year < currentYear ? new Date(Date.UTC(year + 1, 0, 0)) : new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1))
  const end = lastRequestedDate.toISOString().slice(0, 10).replaceAll('-', '')
  if (end < start) throw new Error('Aucune journée terminée n’est encore disponible pour cette année.')

  const params = new URLSearchParams({
    parameters: 'PRECTOTCORR,T2M_MAX,T2M_MIN',
    community: 'AG',
    longitude: String(longitude),
    latitude: String(latitude),
    start,
    end,
    format: 'JSON',
    'time-standard': 'UTC',
  })
  try {
    const response = await fetch(`https://power.larc.nasa.gov/api/temporal/daily/point?${params}`, { signal })
    const body = await response.json() as PowerDailyResponse
    if (!response.ok) throw new Error(body.messages?.join(' ') || `NASA POWER a répondu ${response.status}.`)
    const values = body.properties?.parameter
    if (!values) throw new Error('NASA POWER n’a renvoyé aucune série quotidienne exploitable pour ce point.')
    const fill = body.header?.fill_value ?? -999
    const valueAt = (parameter: string, date: string) => {
      const value = values[parameter]?.[date]
      return value === undefined || value === fill || !Number.isFinite(value) ? undefined : value
    }
    const requestedDays: string[] = []
    for (let date = new Date(Date.UTC(year, 0, 1)); date <= lastRequestedDate; date.setUTCDate(date.getUTCDate() + 1)) {
      requestedDays.push(date.toISOString().slice(0, 10))
    }
    const records = requestedDays.map(date => {
      const keyDate = date.replaceAll('-', '')
      return {
        date,
        precipitationMmPerDay: valueAt('PRECTOTCORR', keyDate),
        temperatureMaxC: valueAt('T2M_MAX', keyDate),
        temperatureMinC: valueAt('T2M_MIN', keyDate),
      }
    })
    if (!records.some(record => Object.values(record).some(value => typeof value === 'number'))) {
      throw new Error('NASA POWER n’a renvoyé aucune journée valide pour cette année et ce point.')
    }
    const series: PowerDailySeries = {
      point: { latitude, longitude },
      year,
      requestedDays,
      records,
      source: body.header?.sources ?? ['NASA POWER'],
      timeStandard: body.header?.time_standard ?? 'UTC',
      fetchedAt: new Date().toISOString(),
      deliveryMode: 'network',
      parameters: Object.fromEntries(Object.entries(body.parameters ?? {}).map(([name, value]) => [name, { units: value.units ?? '', longname: value.longname ?? name }])),
    }
    const entry = { savedAt: Date.now(), data: series }
    memoryCache.set(key, entry)
    try { localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry)) } catch { /* optional browser cache */ }
    return series
  } catch (error) {
    if (stale) return { ...stale, deliveryMode: 'stale-cache' }
    throw error
  }
}

function readStoredCache(key: string): StoredDailyCache | undefined {
  try {
    const parsed = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${key}`) ?? 'null') as Partial<StoredDailyCache> | null
    if (!parsed || typeof parsed.savedAt !== 'number' || !isPowerDailySeries(parsed.data)) return undefined
    return parsed as StoredDailyCache
  } catch {
    return undefined
  }
}

function isPowerDailySeries(value: unknown): value is PowerDailySeries {
  if (!value || typeof value !== 'object') return false
  const series = value as Partial<PowerDailySeries>
  return Number.isInteger(series.year)
    && typeof series.fetchedAt === 'string'
    && Array.isArray(series.requestedDays)
    && Array.isArray(series.records)
    && Array.isArray(series.source)
    && typeof series.timeStandard === 'string'
}

export function downloadPowerDailyCsv(series: PowerDailySeries) {
  const point = `${series.point.latitude.toFixed(3)},${series.point.longitude.toFixed(3)}`
  const metadata = [
    ['source', 'NASA POWER Daily API'],
    ['parameters', 'PRECTOTCORR,T2M_MAX,T2M_MIN'],
    ['requested_point_rounded_0.001_deg', point],
    ['time_standard', series.timeStandard],
    ['source_products', series.source.join(' + ')],
    ['retrieved_at_utc', series.fetchedAt],
    ['delivery_mode', series.deliveryMode],
    ['note', 'Grid-based daily estimates; not farm or parcel measurements. Missing values remain blank.'],
  ]
  const rows = [
    ...metadata.map(row => row.map(csvCell).join(',')),
    '',
    ['date_utc', 'PRECTOTCORR_mm_per_day', 'T2M_MAX_C', 'T2M_MIN_C'].map(csvCell).join(','),
    ...series.records.map(record => [record.date, record.precipitationMmPerDay, record.temperatureMaxC, record.temperatureMinC].map(value => csvCell(value ?? '')).join(',')),
  ]
  const blob = new Blob([`\uFEFF${rows.join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `fieldnova-nasa-power-daily-${series.year}-${point.replace(',', '_').replaceAll('.', 'p')}.csv`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function csvCell(value: string | number) {
  const text = String(value)
  return `"${text.replaceAll('"', '""')}"`
}
