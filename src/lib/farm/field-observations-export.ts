import { fieldObservationKindLabel, type FieldObservation } from './field-observations'

function csvCell(value: string) {
  // Keep user-entered text from being interpreted as a spreadsheet formula.
  const safeValue = /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value
  return `"${safeValue.replaceAll('"', '""')}"`
}

export function fieldObservationsCsv(items: FieldObservation[]) {
  const rows = [
    ['Date', 'Type', 'Culture', 'Observation', 'Auteur', 'Photo jointe'],
    ...items.map(item => [item.date, fieldObservationKindLabel(item.kind), item.crop, item.note, item.author, item.photoId ? 'Oui · conservée sur cet appareil' : 'Non']),
  ]
  return `\uFEFF${rows.map(row => row.map(csvCell).join(';')).join('\r\n')}\r\n`
}

export function downloadFieldObservationsCsv(items: FieldObservation[]) {
  const blob = new Blob([fieldObservationsCsv(items)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'fieldnova-journal-observations.csv'
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
