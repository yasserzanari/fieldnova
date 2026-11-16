import type { PowerMonthlySeries } from '../../lib/nasa/power'
import type { CropCalendar } from './crop-calendar'
import type { RotationPlan } from './rotation-model'

export type RotationClimateExposure = {
  index: number
  category: 'lower' | 'middle' | 'higher'
  coverage: number
  cropCount: number
  observedMonths: number
  requestedMonths: number
  temperaturePercentile: number
  dryPrecipitationPercentile: number
  dryRootWetnessPercentile: number
}

type PercentileMetric = 'temperatureC' | 'precipitationMmPerDay' | 'rootZoneWetness'

function percentile(value: number, values: number[]) {
  const below = values.filter(candidate => candidate < value).length
  const equal = values.filter(candidate => candidate === value).length
  return values.length ? (below + equal / 2) / values.length * 100 : undefined
}

function windowMonths(startMonth: number, endMonth: number) {
  const months = new Set<number>()
  for (let month = startMonth; ; month = month % 12 + 1) {
    months.add(month)
    if (month === endMonth) return months
  }
}

/**
 * Estimates how warm/dry the declared crop windows are relative to all observed
 * months in this NASA POWER series. The index is an exposure descriptor, not a
 * crop-response probability, yield estimate, or irrigation requirement.
 */
export function estimateRotationClimateExposure(plan: RotationPlan, calendar: CropCalendar, series: PowerMonthlySeries): RotationClimateExposure | null {
  const reference: Record<PercentileMetric, number[]> = {
    temperatureC: series.records.flatMap(record => record.temperatureC === undefined ? [] : [record.temperatureC]),
    precipitationMmPerDay: series.records.flatMap(record => record.precipitationMmPerDay === undefined ? [] : [record.precipitationMmPerDay]),
    rootZoneWetness: series.records.flatMap(record => record.rootZoneWetness === undefined ? [] : [record.rootZoneWetness]),
  }
  const usableReferenceMonths = series.records.filter(record =>
    record.temperatureC !== undefined || record.precipitationMmPerDay !== undefined || record.rootZoneWetness !== undefined,
  ).length
  if (usableReferenceMonths < 24 || !Object.values(reference).some(values => values.length)) return null

  const cropScores: number[] = []
  let observedMonths = 0
  let requestedMonths = 0
  const usedCropIds = new Set<string>()
  const metricTotals = { temperatureC: 0, dryPrecipitation: 0, dryRootWetness: 0 }
  let scoredRecords = 0

  for (const cropId of plan.crops) {
    if (!cropId || usedCropIds.has(cropId)) continue
    usedCropIds.add(cropId)
    const entry = calendar[cropId]
    const months = new Set<number>()
    for (const window of [entry?.sowing, entry?.harvest]) {
      if (!window) continue
      for (const month of windowMonths(window.startMonth, window.endMonth)) months.add(month)
    }
    if (!months.size) continue

    const requestedForCrop = series.requestedMonths.filter(date => months.has(Number(date.slice(5, 7)))).length
    requestedMonths += requestedForCrop
    const rows = series.records.filter(record => months.has(Number(record.date.slice(5, 7))))
    const cropRecordScores: number[] = []
    for (const record of rows) {
      const scores: Array<{ value: number; weight: number; metric: keyof typeof metricTotals }> = []
      const temperatureRank = record.temperatureC === undefined ? undefined : percentile(record.temperatureC, reference.temperatureC)
      const rainRank = record.precipitationMmPerDay === undefined ? undefined : percentile(record.precipitationMmPerDay, reference.precipitationMmPerDay)
      const wetnessRank = record.rootZoneWetness === undefined ? undefined : percentile(record.rootZoneWetness, reference.rootZoneWetness)
      if (temperatureRank !== undefined) scores.push({ value: temperatureRank, weight: .4, metric: 'temperatureC' })
      if (rainRank !== undefined) scores.push({ value: 100 - rainRank, weight: .3, metric: 'dryPrecipitation' })
      if (wetnessRank !== undefined) scores.push({ value: 100 - wetnessRank, weight: .3, metric: 'dryRootWetness' })
      if (!scores.length) continue
      const weight = scores.reduce((sum, score) => sum + score.weight, 0)
      cropRecordScores.push(scores.reduce((sum, score) => sum + score.value * score.weight, 0) / weight)
      for (const score of scores) metricTotals[score.metric] += score.value
      scoredRecords += 1
    }
    observedMonths += cropRecordScores.length
    if (cropRecordScores.length) cropScores.push(cropRecordScores.reduce((sum, value) => sum + value, 0) / cropRecordScores.length)
  }

  if (!cropScores.length || !requestedMonths || !scoredRecords) return null
  const index = cropScores.reduce((sum, value) => sum + value, 0) / cropScores.length
  return {
    index: Math.round(index),
    category: index < 34 ? 'lower' : index < 67 ? 'middle' : 'higher',
    coverage: Math.round(observedMonths / requestedMonths * 100),
    cropCount: cropScores.length,
    observedMonths,
    requestedMonths,
    temperaturePercentile: metricTotals.temperatureC / scoredRecords,
    dryPrecipitationPercentile: metricTotals.dryPrecipitation / scoredRecords,
    dryRootWetnessPercentile: metricTotals.dryRootWetness / scoredRecords,
  }
}
