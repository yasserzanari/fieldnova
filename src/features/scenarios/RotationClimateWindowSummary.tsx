import type { MeasurementSystem } from '../../lib/units/measurement-units'
import { formatPrecipitationRate, formatTemperature } from '../../lib/units/measurement-units'
import type { PowerMonthlySeries } from '../../lib/nasa/power'
import type { CropCalendar, CropMonthWindow } from './crop-calendar'
import { formatCropMonthWindow } from './crop-calendar'
import type { CropDefinition, RotationPlan } from './rotation-model'

function monthsIn(window: CropMonthWindow) {
  const months = new Set<number>()
  for (let month = window.startMonth; ; month = month % 12 + 1) {
    months.add(month)
    if (month === window.endMonth) return months
  }
}

function WindowClimateSummary({ window, series, loading, error, measurementSystem }: {
  window?: CropMonthWindow
  series: PowerMonthlySeries | null
  loading: boolean
  error: string | null
  measurementSystem: MeasurementSystem
}) {
  if (!window) return <span className="rotation-climate-window-empty">Fenêtre non renseignée</span>
  if (loading && !series) return <span className="rotation-climate-window-empty">Chargement NASA POWER…</span>
  if (!series) return <span className="rotation-climate-window-empty">{error ? 'NASA POWER indisponible' : 'Aucune série exploitable'}</span>

  const months = monthsIn(window)
  const requestedCount = series.requestedMonths.filter(date => months.has(Number(date.slice(-2)))).length
  const selectedRecords = series.records.filter(record => months.has(Number(record.date.slice(-2))))
  const precipitation = selectedRecords.flatMap(record => record.precipitationMmPerDay === undefined ? [] : [record.precipitationMmPerDay])
  const temperatures = selectedRecords.flatMap(record => record.temperatureC === undefined ? [] : [record.temperatureC])
  const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined
  const precipitationAverage = average(precipitation)
  const temperatureAverage = average(temperatures)

  return <span className="rotation-climate-window-values">
    <span><small>Pluie moy.</small><strong>{precipitationAverage === undefined ? '—' : formatPrecipitationRate(precipitationAverage, measurementSystem)}</strong><em>{precipitation.length}/{requestedCount} mois</em></span>
    <span><small>Temp. moy.</small><strong>{temperatureAverage === undefined ? '—' : formatTemperature(temperatureAverage, measurementSystem)}</strong><em>{temperatures.length}/{requestedCount} mois</em></span>
  </span>
}

export function RotationClimateWindowSummary({ plan, catalog, calendar, series, loading, error, measurementSystem }: {
  plan: RotationPlan
  catalog: CropDefinition[]
  calendar: CropCalendar
  series: PowerMonthlySeries | null
  loading: boolean
  error: string | null
  measurementSystem: MeasurementSystem
}) {
  const declaredWindows = plan.crops.reduce((count, id) => {
    const entry = id ? calendar[id] : undefined
    return count + Number(Boolean(entry?.sowing)) + Number(Boolean(entry?.harvest))
  }, 0)
  const period = series?.requestedMonths.length
    ? `${series.requestedMonths[0]} – ${series.requestedMonths.at(-1)}`
    : 'période inconnue'
  const delivery = series?.deliveryMode === 'demo-fixture'
    ? `Extrait NASA POWER archivé · récupéré ${series.fetchedAt.slice(0, 10)}`
    : series?.deliveryMode === 'stale-cache'
      ? `Copie NASA POWER locale ancienne · récupérée ${series.fetchedAt.slice(0, 10)}`
      : series
        ? `NASA POWER · ${series.source.join(' + ')}`
        : loading ? 'Récupération NASA POWER…' : 'NASA POWER indisponible'

  return <section className="rotation-evidence-section rotation-climate-window-section" aria-label="Repères climatiques des fenêtres culturales déclarées">
    <h3>NASA POWER pendant les fenêtres saisies</h3>
    <p>Repères historiques pour les mois de semis et de récolte renseignés localement · {delivery} · période demandée : {period}.</p>
    {declaredWindows ? <div className="rotation-evidence-table-wrap"><table className="rotation-evidence-table rotation-climate-window-table"><thead><tr><th>Année</th><th>Culture</th><th>Fenêtre de semis · NASA</th><th>Fenêtre de récolte · NASA</th></tr></thead><tbody>{plan.crops.map((id, index) => {
      const crop = catalog.find(item => item.id === id)
      const entry = id ? calendar[id] : undefined
      return <tr key={`${id || 'empty'}-${index}`}><td>{index + 1}</td><td>{crop?.label ?? 'Non renseignée'}</td><td><strong className="rotation-climate-window-label">{formatCropMonthWindow(entry?.sowing)}</strong><WindowClimateSummary window={entry?.sowing} series={series} loading={loading} error={error} measurementSystem={measurementSystem} /></td><td><strong className="rotation-climate-window-label">{formatCropMonthWindow(entry?.harvest)}</strong><WindowClimateSummary window={entry?.harvest} series={series} loading={loading} error={error} measurementSystem={measurementSystem} /></td></tr>
    })}</tbody></table></div> : <p className="rotation-climate-window-empty">Aucune fenêtre de semis ou de récolte n’est renseignée pour cette rotation. Vous pouvez les saisir dans « Calendrier cultural local ».</p>}
    <p>{declaredWindows ? 'Chaque moyenne reprend les valeurs mensuelles disponibles pour les mois de la fenêtre, toutes années demandées confondues; n/N indique les mois avec une valeur par rapport aux mois demandés. Les mois absents ne sont pas interpolés. Ces repères de grille ne sont ni des prévisions, ni une réponse de culture, ni une note de faisabilité.' : 'Aucune période n’est déduite; sans fenêtres renseignées, FieldNova n’associe pas le climat à un stade de culture.'}</p>
  </section>
}
