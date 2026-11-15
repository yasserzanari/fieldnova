import { useEffect, useState } from 'react'
import type { GeoPoint } from '../geo/location'
import { fetchPowerMonthly, type PowerMonthlySeries } from './power'

const REQUEST_TIMEOUT_MS = 20_000

type PowerMonthlyState = {
  requestKey: string
  series: PowerMonthlySeries | null
  loading: boolean
  error: string
}

/** Keeps a series visible only while it belongs to the currently selected point. */
export function usePowerMonthly(point: GeoPoint, years = 5) {
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${point.latitude},${point.longitude}:${years}:${attempt}`
  const [state, setState] = useState<PowerMonthlyState>({ requestKey: '', series: null, loading: true, error: '' })

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      controller.abort(new DOMException('NASA POWER n’a pas répondu dans le délai prévu.', 'TimeoutError'))
    }, REQUEST_TIMEOUT_MS)
    setState({ requestKey, series: null, loading: true, error: '' })
    fetchPowerMonthly(point, years, controller.signal).then(series => {
      if (active) setState({ requestKey, series, loading: false, error: '' })
    }).catch(reason => {
      if (!active) return
      setState({
        requestKey,
        series: null,
        loading: false,
        error: reason instanceof DOMException && reason.name === 'TimeoutError'
          ? 'NASA POWER n’a pas répondu après 20 secondes. Vérifiez la connexion puis réessayez.'
          : reason instanceof Error ? reason.message : 'NASA POWER est indisponible.',
      })
    })
    return () => {
      active = false
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [point.latitude, point.longitude, years, attempt, requestKey])

  const current = state.requestKey === requestKey
    ? state
    : { requestKey, series: null, loading: true, error: '' }

  return {
    series: current.series,
    loading: current.loading,
    error: current.error,
    retry: () => setAttempt(value => value + 1),
  }
}
