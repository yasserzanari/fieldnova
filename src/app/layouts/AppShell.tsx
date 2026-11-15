import { Bell, ChevronDown, ChevronLeft, CircleHelp, CloudRain, FlaskConical, Leaf, MapPin, Menu, ThermometerSun, UserRound } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { featureRoutes } from '../navigation'
import { useSelectedLocation } from '../../lib/geo/location'
import { formatPowerMonth, latestCompleteRecord } from '../../lib/nasa/power'
import { usePowerMonthly } from '../../lib/nasa/use-power-monthly'
import { exitDemoWorkspace, readDemoWorkspace, type DemoWorkspace } from '../../lib/demo/demo-workspace'

function coordinate(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(2).replace('.', ',')}° ${value < 0 ? negative : positive}`
}

export function AppShell() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [demoWorkspace, setDemoWorkspace] = useState<DemoWorkspace | null>(() => readDemoWorkspace())
  const [demoError, setDemoError] = useState('')
  const [quitPromptOpen, setQuitPromptOpen] = useState(false)
  const keepDemoButton = useRef<HTMLButtonElement>(null)
  const quitDemoButton = useRef<HTMLButtonElement>(null)
  const { location } = useSelectedLocation()
  const { series, loading, error } = usePowerMonthly(location)
  const latest = useMemo(() => series ? latestCompleteRecord(series.records) : undefined, [series])
  const unavailable = Boolean(error)
  const usingDemoSnapshot = series?.deliveryMode === 'demo-fixture'

  useEffect(() => {
    const refreshDemo = () => setDemoWorkspace(readDemoWorkspace())
    window.addEventListener('fieldnova:demo-mode-change', refreshDemo)
    window.addEventListener('storage', refreshDemo)
    return () => {
      window.removeEventListener('fieldnova:demo-mode-change', refreshDemo)
      window.removeEventListener('storage', refreshDemo)
    }
  }, [])

  const quitDemo = () => {
    try {
      exitDemoWorkspace()
      setDemoWorkspace(null)
      setDemoError('')
      setQuitPromptOpen(false)
      navigate('/app/overview', { replace: true })
    } catch {
      setDemoError('La restauration a échoué. Vos données de démonstration restent disponibles; réessayez.')
    }
  }

  useEffect(() => {
    if (!quitPromptOpen) return
    keepDemoButton.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') dismissQuitPrompt() }
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const buttons = document.querySelectorAll<HTMLButtonElement>('.demo-exit-dialog button')
      const first = buttons.item(0)
      const last = buttons.item(buttons.length - 1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keydown', trapFocus)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keydown', trapFocus)
    }
  }, [quitPromptOpen])

  const dismissQuitPrompt = () => {
    setQuitPromptOpen(false)
    requestAnimationFrame(() => quitDemoButton.current?.focus())
  }

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
            <span className={`context-source ${series?.deliveryMode === 'stale-cache' ? 'is-stale' : ''} ${usingDemoSnapshot ? 'is-snapshot' : ''}`} title={usingDemoSnapshot ? `Extrait NASA POWER de démonstration hors ligne · récupéré le ${series?.fetchedAt.slice(0, 10)} · dernier mois exploitable ${latest?.date ?? 'inconnu'}.` : series?.deliveryMode === 'stale-cache' ? 'Copie locale utilisée après échec de la mise à jour; date de collecte indiquée dans les vues de données.' : series?.deliveryMode === 'fresh-cache' ? 'Copie locale récente; chargée en moins de 15 minutes.' : series ? 'Série reçue lors de cette session depuis NASA POWER.' : 'État de la série NASA POWER mensuelle.'}>
              NASA POWER · {loading ? 'chargement' : unavailable ? 'indisponible' : usingDemoSnapshot ? 'extrait démo hors ligne' : series?.deliveryMode === 'stale-cache' ? 'copie locale ancienne' : series?.deliveryMode === 'fresh-cache' ? 'cache récent' : 'en ligne'}
            </span>
          </div>
          {demoWorkspace && <div className="demo-mode-pill" aria-label="Mode démo : ferme fictive">
            <FlaskConical size={14} /><span role="status"><strong>MODE DÉMO</strong><small>{usingDemoSnapshot ? 'Profil fictif · extrait NASA POWER daté' : 'Profil fictif · NASA POWER réelle'}</small></span>
            <button ref={quitDemoButton} type="button" onClick={() => setQuitPromptOpen(true)} title="Restaurer les données antérieures à la démo">Quitter</button>
            {demoError && <span className="demo-mode-error" role="alert">{demoError}</span>}
          </div>}
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notifications"><Bell size={18} /></button>
            <button className="icon-button" aria-label="Aide"><CircleHelp size={18} /></button>
            <button className="profile-button" aria-label="Profil de l’utilisateur"><UserRound size={18} /></button>
          </div>
        </header>
        <main className="app-main"><Suspense fallback={<div className="route-loading" role="status">Ouverture de la vue…</div>}><Outlet /></Suspense></main>
      </div>
      {quitPromptOpen && <div className="demo-exit-backdrop" onClick={event => { if (event.target === event.currentTarget) dismissQuitPrompt() }}>
        <section className="demo-exit-dialog" role="dialog" aria-modal="true" aria-labelledby="demo-exit-title" aria-describedby="demo-exit-description">
          <FlaskConical size={22} aria-hidden="true" />
          <h2 id="demo-exit-title">Quitter l’exemple fictif ?</h2>
          <p id="demo-exit-description">Les modifications faites dans la ferme d’exemple seront effacées. Les données présentes avant son lancement seront restaurées.</p>
          <div><button type="button" className="demo-exit-cancel" ref={keepDemoButton} onClick={dismissQuitPrompt}>Continuer la démo</button><button type="button" className="demo-exit-confirm" onClick={quitDemo}>Quitter et restaurer</button></div>
        </section>
      </div>}
    </div>
  )
}
