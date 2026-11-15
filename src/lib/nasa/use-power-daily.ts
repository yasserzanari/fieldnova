import { useEffect, useState } from 'react'
import type { GeoPoint } from '../geo/location'
import { fetchPowerDaily, type PowerDailySeries } from './power-daily'

const REQUEST_TIMEOUT_MS = 20_000

export function usePowerDaily(point: GeoPoint, year: number, enabled: boolean) {
  const [attempt, setAttempt] = useState(0)
  const requestKey = `${point.latitude},${point.longitude}:${year}:${enabled}:${attempt}`
  const [state, setState] = useState<{ key: string; series: PowerDailySeries | null; loading: boolean; error: string }>({ key: '', series: null, loading: false, error: '' })

  useEffect(() => {
    if (!enabled) {
      setState({ key: requestKey, series: null, loading: false, error: '' })
      return
    }
    let active = true
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(new DOMException('NASA POWER n’a pas répondu dans le délai prévu.', 'TimeoutError')), REQUEST_TIMEOUT_MS)
    setState({ key: requestKey, series: null, loading: true, error: '' })
    fetchPowerDaily(point, year, controller.signal).then(series => {
      if (active) setState({ key: requestKey, series, loading: false, error: '' })
    }).catch(reason => {
      if (!active) return
      setState({
        key: requestKey,
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
  }, [enabled, point.latitude, point.longitude, requestKey, year])

  const current = state.key === requestKey ? state : { key: requestKey, series: null, loading: enabled, error: '' }
  return { ...current, retry: () => setAttempt(value => value + 1) }
}
