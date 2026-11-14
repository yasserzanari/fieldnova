import { Bell, ChevronDown, ChevronLeft, CircleHelp, CloudRain, Leaf, MapPin, Menu, ThermometerSun, UserRound } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { Suspense, useMemo, useState } from 'react'
import { featureRoutes } from '../navigation'
import { useSelectedLocation } from '../../lib/geo/location'
import { formatPowerMonth, latestCompleteRecord } from '../../lib/nasa/power'
import { usePowerMonthly } from '../../lib/nasa/use-power-monthly'

function coordinate(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(2).replace('.', ',')}° ${value < 0 ? negative : positive}`
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { location } = useSelectedLocation()
  const { series, loading, error } = usePowerMonthly(location)
  const latest = useMemo(() => series ? latestCompleteRecord(series.records) : undefined, [series])
  const unavailable = Boolean(error)

  return (
    <div className="app-frame">
      <aside className={`app-sidebar ${menuOpen ? 'is-open' : ''} ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
        <div className="sidebar-brand-row">
        <NavLink className="brand-lockup" to="/app/overview" aria-label="FieldNova, vue d’ensemble">
          <span className="brand-symbol"><Leaf size={21} strokeWidth={2.3} /></span>
          <span>FieldNova</span>
        </NavLink>
        <button className="sidebar-toggle" type="button" aria-label={sidebarCollapsed ? 'Épingler la navigation ouverte' : 'Réduire la navigation'} aria-pressed={!sidebarCollapsed} title={sidebarCollapsed ? 'Épingler la navigation ouverte' : 'Réduire la navigation'} onClick={() => setSidebarCollapsed(value => !value)}><ChevronLeft size={17} aria-hidden="true" /></button>
        </div>
        <nav className="primary-nav" aria-label="Navigation principale">
          {featureRoutes.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={`/app/${path}`}
              className={({ isActive }) => `primary-nav-link ${isActive ? 'is-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="workspace-avatar"><MapPin size={15} /></span>
          <span className="sidebar-farm"><strong>Point suivi</strong><small>{coordinate(location.latitude, 'N', 'S')} · {coordinate(location.longitude, 'E', 'O')}</small></span>
          <ChevronDown size={16} aria-hidden="true" />
        </div>
      </aside>

      <div className="app-column">
        <header className="app-topbar">
          <button className="icon-button mobile-menu" aria-label="Ouvrir la navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            <Menu size={19} />
          </button>
          <div className="topbar-context">
            <span className="context-control"><MapPin size={17} /> Point suivi · {coordinate(location.latitude, 'N', 'S')} · {coordinate(location.longitude, 'E', 'O')}</span>
            <span className="context-weather" aria-live="polite">
              <ThermometerSun size={16} />
              {loading ? <strong>NASA POWER…</strong> : unavailable ? <strong>Données indisponibles</strong> : latest?.temperatureC !== undefined ? <strong>{latest.temperatureC.toFixed(1).replace('.', ',')} °C · {formatPowerMonth(latest.date)}</strong> : <strong>Température non disponible</strong>}
              <span><CloudRain size={14} />{latest?.precipitationMmPerDay !== undefined ? `${latest.precipitationMmPerDay.toFixed(1).replace('.', ',')} mm/j · moyenne mensuelle` : 'Précipitations non disponibles'}</span>
            </span>
            <span className="context-source">NASA POWER · mensuel</span>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notifications"><Bell size={18} /></button>
            <button className="icon-button" aria-label="Aide"><CircleHelp size={18} /></button>
            <button className="profile-button" aria-label="Profil de l’utilisateur"><UserRound size={18} /></button>
          </div>
        </header>
        <main className="app-main"><Suspense fallback={<div className="route-loading" role="status">Ouverture de la vue…</div>}><Outlet /></Suspense></main>
      </div>
    </div>
  )
}
