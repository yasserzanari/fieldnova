import type { PowerMonthlyRecord, PowerMonthlySeries } from './power'

const fields: Array<{ key: keyof PowerMonthlyRecord; parameter: string; fallbackUnit: string }> = [
  { key: 'precipitationMmPerDay', parameter: 'PRECTOTCORR', fallbackUnit: 'mm/day' },
  { key: 'temperatureC', parameter: 'T2M', fallbackUnit: '°C' },
  { key: 'temperatureMaxC', parameter: 'T2M_MAX', fallbackUnit: '°C' },
  { key: 'temperatureMinC', parameter: 'T2M_MIN', fallbackUnit: '°C' },
  { key: 'surfaceSoilWetness', parameter: 'GWETTOP', fallbackUnit: 'fraction' },
  { key: 'rootZoneWetness', parameter: 'GWETROOT', fallbackUnit: 'fraction' },
]

function cell(value: string | number) {
  let text = String(value)
  if (typeof value === 'string' && /^[=+@\t\r-]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

export function powerMonthlyCsv(series: PowerMonthlySeries) {
  const records = new Map(series.records.map(record => [record.date, record]))
  const headers = [
    'month_utc',
    ...fields.map(field => `${field.parameter} (${series.parameters[field.parameter]?.units || field.fallbackUnit})`),
    'requested_latitude_rounded_0.001_deg',
    'requested_longitude_rounded_0.001_deg',
    'merra2_grid_center_latitude',
    'merra2_grid_center_longitude',
    'merra2_grid_resolution_degrees',
    'source',
    'retrieved_at_utc',
    'delivery_mode',
    'data_context',
  ]
  const rows = series.requestedMonths.map(month => {
    const record = records.get(month)
    return [
      month,
      ...fields.map(field => typeof record?.[field.key] === 'number' ? record[field.key] as number : ''),
      series.point.latitude.toFixed(3),
      series.point.longitude.toFixed(3),
      series.gridPoint.latitude.toFixed(3),
      series.gridPoint.longitude.toFixed(3),
      '0.5 x 0.625',
      series.source.join(', '),
      series.fetchedAt,
      series.deliveryMode,
      series.deliveryMode === 'demo-fixture' ? 'Archived NASA POWER demo snapshot; not current live data' : 'NASA POWER monthly series',
    ]
  })
  return `\uFEFF${[headers, ...rows].map(row => row.map(cell).join(';')).join('\r\n')}\r\n`
}

export function downloadPowerMonthlyCsv(series: PowerMonthlySeries) {
  const blob = new Blob([powerMonthlyCsv(series)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `fieldnova-nasa-power-${series.point.latitude.toFixed(3)}-${series.point.longitude.toFixed(3)}.csv`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
