import type { GeoPoint } from '../../lib/geo/location'
import type { CropId } from './rotation-model'

export type CropMonthWindow = { startMonth: number; endMonth: number }
export type CropCalendarEntry = {
  sowing?: CropMonthWindow
  harvest?: CropMonthWindow
  sourceName?: string
  sourceUrl?: string
}
export type CropCalendar = Record<CropId, CropCalendarEntry>

const monthNames = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const storageKey = (point: GeoPoint) => `fieldnova:crop-calendar:v1:${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`
const isHttpUrl = (value: string) => {
  try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:' } catch { return false }
}

export function readCropCalendar(point: GeoPoint): CropCalendar {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(point)) ?? '{}') as Record<string, unknown>
    return Object.fromEntries(Object.entries(parsed).flatMap(([id, value]) => {
      if (!value || typeof value !== 'object') return []
      const item = value as Record<string, unknown>
      const window = (candidate: unknown): CropMonthWindow | undefined => {
        if (!candidate || typeof candidate !== 'object') return undefined
        const { startMonth, endMonth } = candidate as Record<string, unknown>
        return Number.isInteger(startMonth) && Number(startMonth) >= 1 && Number(startMonth) <= 12 && Number.isInteger(endMonth) && Number(endMonth) >= 1 && Number(endMonth) <= 12
          ? { startMonth: Number(startMonth), endMonth: Number(endMonth) } : undefined
      }
      const sourceName = typeof item.sourceName === 'string' ? item.sourceName.trim().slice(0, 120) : ''
      const sourceUrl = typeof item.sourceUrl === 'string' && isHttpUrl(item.sourceUrl) ? item.sourceUrl.slice(0, 500) : ''
      const entry: CropCalendarEntry = { sowing: window(item.sowing), harvest: window(item.harvest), ...(sourceName ? { sourceName } : {}), ...(sourceUrl ? { sourceUrl } : {}) }
      return [[id, entry] as const]
    }))
  } catch { return {} }
}

export function writeCropCalendar(point: GeoPoint, value: CropCalendar) {
  localStorage.setItem(storageKey(point), JSON.stringify(value))
}

export function formatCropMonthWindow(window: CropMonthWindow | undefined) {
  if (!window) return 'Non renseignée'
  return `${monthNames[window.startMonth - 1]} → ${monthNames[window.endMonth - 1]}${window.startMonth > window.endMonth ? ' · année suivante' : ''}`
}

export function hasCropCalendarData(entry: CropCalendarEntry | undefined) {
  return Boolean(entry?.sowing || entry?.harvest || entry?.sourceName || entry?.sourceUrl)
}
