import { useEffect, useState } from 'react'

export const GIBS_PRODUCTS = {
  trueColor: {
    layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    matrixSet: 'GoogleMapsCompatible_Level9',
  },
  ndvi: {
    layer: 'MODIS_Terra_NDVI_8Day',
    matrixSet: 'GoogleMapsCompatible_Level9',
  },
  surfaceSoil: {
    layer: 'SMAP_L4_Analyzed_Surface_Soil_Moisture',
    matrixSet: 'GoogleMapsCompatible_Level6',
  },
  rootSoil: {
    layer: 'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture',
    matrixSet: 'GoogleMapsCompatible_Level6',
  },
} as const

export type GibsProduct = keyof typeof GIBS_PRODUCTS
type DatePeriod = { start: string; end: string; stepDays: number }
export type GibsAvailability = Record<GibsProduct, DatePeriod[]>

export function formatGibsDate(date: string | null) {
  if (!date) return 'date du produit indisponible'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
}

const CACHE_TTL_MS = 15 * 60 * 1000
let cache: { fetchedAt: number; value: GibsAvailability } | null = null
let request: Promise<GibsAvailability> | null = null

function parsePeriods(xml: string, product: GibsProduct): DatePeriod[] {
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  if (document.querySelector('parsererror')) throw new Error('Réponse de disponibilité NASA illisible.')
  const domain = document.getElementsByTagName('Domain')[0]?.textContent?.trim()
  if (!domain) throw new Error('NASA GIBS n’a pas renvoyé les dates du produit.')

  const periods = domain.split(',').flatMap(value => {
    const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})\/(\d{4}-\d{2}-\d{2})\/P(\d+)D$/)
    return match ? [{ start: match[1], end: match[2], stepDays: Number(match[3]) }] : []
  })
  if (!periods.length) throw new Error(`Dates du produit ${product} non reconnues.`)
  return periods
}

async function fetchAvailability(): Promise<GibsAvailability> {
  const entries = await Promise.all(Object.entries(GIBS_PRODUCTS).map(async ([product, descriptor]) => {
    const params = new URLSearchParams({
      Service: 'WMTS', Request: 'DescribeDomains', Version: '1.0.0',
      layer: descriptor.layer, tilematrixset: descriptor.matrixSet,
    })
    const response = await fetch(`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?${params}`)
    if (!response.ok) throw new Error(`NASA GIBS indisponible (${response.status}).`)
    return [product, parsePeriods(await response.text(), product as GibsProduct)] as const
  }))
  return Object.fromEntries(entries) as GibsAvailability
}

function loadAvailability() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return Promise.resolve(cache.value)
  if (!request) {
    request = fetchAvailability().then(value => {
      cache = { fetchedAt: Date.now(), value }
      return value
    }).finally(() => { request = null })
  }
  return request
}

export function resolveGibsDate(requestedDate: string, periods: DatePeriod[] | undefined): string | null {
  if (!periods?.length || !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) return null
  const requested = Date.parse(`${requestedDate}T00:00:00Z`)
  let nearest: { date: string; distance: number } | null = null
  for (const period of periods) {
    const start = Date.parse(`${period.start}T00:00:00Z`)
    const end = Date.parse(`${period.end}T00:00:00Z`)
    if (![start, end].every(Number.isFinite) || end < start || period.stepDays < 1) continue
    const step = period.stepDays * 86_400_000
    const snapped = Math.max(0, Math.min(Math.round((requested - start) / step), Math.floor((end - start) / step)))
    const date = new Date(start + snapped * step).toISOString().slice(0, 10)
    const distance = Math.abs(Date.parse(`${date}T00:00:00Z`) - requested)
    if (!nearest || distance < nearest.distance) nearest = { date, distance }
  }
  return nearest?.date ?? null
}

export function useGibsAvailability() {
  const [availability, setAvailability] = useState<GibsAvailability | null>(cache?.value ?? null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    loadAvailability().then(value => {
      if (active) { setAvailability(value); setError(false) }
    }).catch(() => {
      if (active) setError(true)
    })
    return () => { active = false }
  }, [])

  return { availability, error }
}
