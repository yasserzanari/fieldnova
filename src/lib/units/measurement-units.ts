import { useSyncExternalStore } from 'react'

export type MeasurementSystem = 'metric' | 'us-customary'

const storageKey = 'fieldnova:measurement-system:v1'
const changeEvent = 'fieldnova:measurement-system-change'

export function readMeasurementSystem(): MeasurementSystem {
  try {
    return localStorage.getItem(storageKey) === 'us-customary' ? 'us-customary' : 'metric'
  } catch {
    return 'metric'
  }
}

export function setMeasurementSystem(system: MeasurementSystem) {
  try { localStorage.setItem(storageKey, system) } catch { /* preference remains session-only */ }
  window.dispatchEvent(new Event(changeEvent))
}

function subscribe(callback: () => void) {
  window.addEventListener(changeEvent, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(changeEvent, callback)
    window.removeEventListener('storage', callback)
  }
}

export function useMeasurementSystem() {
  return useSyncExternalStore<MeasurementSystem>(subscribe, readMeasurementSystem, () => 'metric')
}

function format(value: number, maximumFractionDigits = 1) {
  return value.toLocaleString('fr-FR', { maximumFractionDigits })
}

export function formatTemperature(celsius: number, system: MeasurementSystem, precision = 1) {
  return `${format(system === 'us-customary' ? celsius * 9 / 5 + 32 : celsius, precision)} °${system === 'us-customary' ? 'F' : 'C'}`
}

export function formatPrecipitationRate(mmPerDay: number, system: MeasurementSystem, precision = 2) {
  return `${format(system === 'us-customary' ? mmPerDay / 25.4 : mmPerDay, precision)} ${system === 'us-customary' ? 'in/j' : 'mm/j'}`
}

export function formatPrecipitationTotal(mm: number, system: MeasurementSystem, precision = 0) {
  return `${format(system === 'us-customary' ? mm / 25.4 : mm, precision)} ${system === 'us-customary' ? 'in' : 'mm'}`
}

export function formatLength(cm: number, system: MeasurementSystem, precision = 1) {
  return `${format(lengthInDisplayUnits(cm, system), precision)} ${lengthUnit(system)}`
}

export function lengthInDisplayUnits(cm: number, system: MeasurementSystem) {
  return system === 'us-customary' ? cm / 2.54 : cm
}

export function lengthFromDisplayUnits(value: number, system: MeasurementSystem) {
  return system === 'us-customary' ? value * 2.54 : value
}

export function lengthUnit(system: MeasurementSystem) {
  return system === 'us-customary' ? 'in' : 'cm'
}

export function formatDistance(km: number, system: MeasurementSystem, precision = 0) {
  return `${format(system === 'us-customary' ? km * 0.621371 : km, precision)} ${system === 'us-customary' ? 'mi' : 'km'}`
}

export function formatArea(hectares: number, system: MeasurementSystem, precision = 2) {
  return `${format(system === 'us-customary' ? hectares * 2.47105381 : hectares, precision)} ${system === 'us-customary' ? 'ac' : 'ha'}`
}

export function climateTemperatureUnit(system: MeasurementSystem) {
  return system === 'us-customary' ? '°F' : '°C'
}

export function climatePrecipitationRateUnit(system: MeasurementSystem) {
  return system === 'us-customary' ? 'in/j' : 'mm/j'
}
