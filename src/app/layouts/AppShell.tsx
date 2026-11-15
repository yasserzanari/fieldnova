import { ChevronDown, ChevronLeft, CircleHelp, CloudRain, FlaskConical, Leaf, MapPin, Menu, ThermometerSun, UserRound } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { featureRoutes } from '../navigation'
import { HelpDialog } from '../HelpDialog'
import { DataStatusPopover } from '../DataStatusPopover'
import { isValidGeoPoint, useSelectedLocation } from '../../lib/geo/location'
import { formatPowerMonth, latestCompleteRecord } from '../../lib/nasa/power'
import { usePowerMonthly } from '../../lib/nasa/use-power-monthly'
import { exitDemoWorkspace, readDemoWorkspace, type DemoWorkspace } from '../../lib/demo/demo-workspace'
import { formatPrecipitationRate, formatTemperature, setMeasurementSystem, useMeasurementSystem } from '../../lib/units/measurement-units'
import './point-coordinate-editor.css'

function coordinate(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(2).replace('.', ',')}° ${value < 0 ? negative : positive}`
}

const SIDEBAR_PREFERENCES_KEY = 'fieldnova:sidebar-preferences:v1'
const SIDEBAR_MIN_WIDTH = 180
const SIDEBAR_MAX_WIDTH = 360
const SIDEBAR_COLLAPSE_THRESHOLD = 116

function readSidebarPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(SIDEBAR_PREFERENCES_KEY) ?? 'null') as { width?: unknown; collapsed?: unknown } | null
    return {
      width: typeof saved?.width === 'number' ? Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, saved.width)) : 244,
      collapsed: saved?.collapsed === true,
    }
  } catch {
    return { width: 244, collapsed: false }
  }
}

export function AppShell() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(() => readSidebarPreferences().width)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readSidebarPreferences().collapsed)
  const [sidebarResizing, setSidebarResizing] = useState(false)
  const sidebarDrag = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null)
  const helpButtonRef = useRef<HTMLButtonElement>(null)
  const [demoWorkspace, setDemoWorkspace] = useState<DemoWorkspace | null>(() => readDemoWorkspace())
  const [demoError, setDemoError] = useState('')
  const [quitPromptOpen, setQuitPromptOpen] = useState(false)
  const keepDemoButton = useRef<HTMLButtonElement>(null)
  const quitDemoButton = useRef<HTMLButtonElement>(null)
  const pointEditorRef = useRef<HTMLDivElement>(null)
  const pointTriggerRef = useRef<HTMLButtonElement>(null)
  const latitudeInputRef = useRef<HTMLInputElement>(null)
  const { location, selectLocation } = useSelectedLocation()
  const [pointEditorOpen, setPointEditorOpen] = useState(false)
  const [latitudeDraft, setLatitudeDraft] = useState('')
  const [longitudeDraft, setLongitudeDraft] = useState('')
  const [pointError, setPointError] = useState('')
  const measurementSystem = useMeasurementSystem()
  const { series, loading, error } = usePowerMonthly(location)
  const latest = useMemo(() => series ? latestCompleteRecord(series.records) : undefined, [series])
  const unavailable = Boolean(error)
  const usingDemoSnapshot = series?.deliveryMode === 'demo-fixture'

  const closePointEditor = (restoreFocus = true) => {
    setPointEditorOpen(false)
    setPointError('')
    if (restoreFocus) requestAnimationFrame(() => pointTriggerRef.current?.focus())
  }

  const closeHelp = () => {
    setHelpOpen(false)
    requestAnimationFrame(() => helpButtonRef.current?.focus())
  }

  const openPointEditor = () => {
    setLatitudeDraft(location.latitude.toFixed(5))
    setLongitudeDraft(location.longitude.toFixed(5))
    setPointError('')
    setPointEditorOpen(true)
  }

  const savePoint = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const latitude = Number(latitudeDraft.trim().replace(',', '.'))
    const longitude = Number(longitudeDraft.trim().replace(',', '.'))
    if (!latitudeDraft.trim() || !longitudeDraft.trim() || !isValidGeoPoint({ latitude, longitude })) {
      setPointError('Latitude : −90 à 90°. Longitude : −180 à 180°. Saisissez des degrés décimaux.')
      return
    }
    try {
      selectLocation({ latitude, longitude })
      closePointEditor()
    } catch {
      setPointError('Le navigateur n’a pas pu enregistrer ce point sur cet appareil.')
    }
  }

  useEffect(() => {
    if (!pointEditorOpen) return
    latitudeInputRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') closePointEditor() }
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !pointEditorRef.current?.contains(event.target) && !pointTriggerRef.current?.contains(event.target)) closePointEditor(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [pointEditorOpen])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try { localStorage.setItem(SIDEBAR_PREFERENCES_KEY, JSON.stringify({ width: sidebarWidth, collapsed: sidebarCollapsed })) } catch { /* preferences may be unavailable */ }
    }, 180)
    return () => window.clearTimeout(timeout)
  }, [sidebarCollapsed, sidebarWidth])

  const beginSidebarResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || window.matchMedia('(max-width: 820px)').matches) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    sidebarDrag.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: sidebarCollapsed ? 72 : sidebarWidth }
    setSidebarResizing(true)
  }

  const moveSidebarResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = sidebarDrag.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const requestedWidth = drag.startWidth + event.clientX - drag.startX
    if (requestedWidth <= SIDEBAR_COLLAPSE_THRESHOLD) {
      setSidebarCollapsed(true)
      return
    }
    setSidebarCollapsed(false)
    setSidebarWidth(Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, requestedWidth)))
  }

  const endSidebarResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!sidebarDrag.current || sidebarDrag.current.pointerId !== event.pointerId) return
    sidebarDrag.current = null
    setSidebarResizing(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const resizeSidebarByKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Home' || (event.key === 'ArrowLeft' && sidebarCollapsed)) {
      setSidebarCollapsed(true)
      return
    }
    if (event.key === 'End') {
      setSidebarCollapsed(false)
      setSidebarWidth(SIDEBAR_MAX_WIDTH)
      return
    }
    if (event.key === 'ArrowLeft') {
      if (sidebarWidth <= SIDEBAR_MIN_WIDTH) setSidebarCollapsed(true)
      else setSidebarWidth(width => Math.max(SIDEBAR_MIN_WIDTH, width - 16))
      return
    }
    if (sidebarCollapsed) {
      setSidebarCollapsed(false)
      setSidebarWidth(width => Math.max(244, width))
    } else setSidebarWidth(width => Math.min(SIDEBAR_MAX_WIDTH, width + 16))
  }

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
    <div className={`app-frame ${sidebarResizing ? 'is-resizing' : ''}`}>
      <a className="skip-to-content" href="#main-content">Passer au contenu principal</a>
      <aside className={`app-sidebar ${menuOpen ? 'is-open' : ''} ${sidebarCollapsed ? 'is-collapsed' : ''} ${sidebarResizing ? 'is-resizing' : ''}`} style={{ '--sidebar-width': `${sidebarWidth}px` } as CSSProperties}>
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
        <div className="sidebar-resizer" role="separator" aria-label="Redimensionner la barre latérale" aria-orientation="vertical" aria-valuemin={72} aria-valuemax={SIDEBAR_MAX_WIDTH} aria-valuenow={sidebarCollapsed ? 72 : sidebarWidth} aria-valuetext={sidebarCollapsed ? 'Navigation réduite à 72 pixels' : `Navigation large de ${sidebarWidth} pixels`} tabIndex={0} title="Glisser pour redimensionner · flèches gauche/droite au clavier" onPointerDown={beginSidebarResize} onPointerMove={moveSidebarResize} onPointerUp={endSidebarResize} onPointerCancel={endSidebarResize} onLostPointerCapture={() => { sidebarDrag.current = null; setSidebarResizing(false) }} onKeyDown={resizeSidebarByKeyboard} />
      </aside>

      <div className="app-column">
        <header className="app-topbar">
          <button className="icon-button mobile-menu" aria-label="Ouvrir la navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            <Menu size={19} />
          </button>
          <div className="topbar-context">
            <div className="context-point-control">
              <button ref={pointTriggerRef} type="button" className="context-control" aria-label={`Modifier le point suivi, actuellement ${coordinate(location.latitude, 'N', 'S')} et ${coordinate(location.longitude, 'E', 'O')}`} aria-haspopup="dialog" aria-expanded={pointEditorOpen} onClick={() => pointEditorOpen ? closePointEditor() : openPointEditor()}><MapPin size={17} aria-hidden="true" />Point suivi · {coordinate(location.latitude, 'N', 'S')} · {coordinate(location.longitude, 'E', 'O')}</button>
              {pointEditorOpen && <div ref={pointEditorRef} id="point-coordinate-editor" className="point-coordinate-editor" role="dialog" aria-label="Modifier le point suivi">
                <h2>Choisir un point</h2>
                <p>Coordonnées WGS84 en degrés décimaux. Latitude : −90 à 90°; longitude : −180 à 180°.</p>
                <form onSubmit={savePoint}>
                  <label>Latitude<input ref={latitudeInputRef} aria-label="Latitude en degrés décimaux" type="text" inputMode="decimal" autoComplete="off" value={latitudeDraft} onChange={event => setLatitudeDraft(event.target.value)} /></label>
                  <label>Longitude<input aria-label="Longitude en degrés décimaux" type="text" inputMode="decimal" autoComplete="off" value={longitudeDraft} onChange={event => setLongitudeDraft(event.target.value)} /></label>
                  {pointError && <p className="point-coordinate-error" role="alert">{pointError}</p>}
                  <div><button type="button" className="point-coordinate-cancel" onClick={() => closePointEditor()}>Annuler</button><button type="submit" className="point-coordinate-save">Appliquer</button></div>
                </form>
              </div>}
            </div>
            <span className="context-weather" aria-live="polite">
              <ThermometerSun size={16} />
              {loading ? <strong>NASA POWER…</strong> : unavailable ? <strong>Données indisponibles</strong> : latest?.temperatureC !== undefined ? <strong>{formatTemperature(latest.temperatureC, measurementSystem)} · {formatPowerMonth(latest.date)}</strong> : <strong>Température non disponible</strong>}
              <span><CloudRain size={14} />{latest?.precipitationMmPerDay !== undefined ? `${formatPrecipitationRate(latest.precipitationMmPerDay, measurementSystem, 1)} · moyenne mensuelle` : 'Précipitations non disponibles'}</span>
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
            <DataStatusPopover series={series} latestDate={latest ? formatPowerMonth(latest.date) : undefined} loading={loading} error={error} />
            <button ref={helpButtonRef} className="icon-button" type="button" aria-label="Ouvrir le guide FieldNova" onClick={() => setHelpOpen(true)}><CircleHelp size={18} /></button>
            <details className="profile-preferences"><summary className="profile-button" aria-label="Préférences de l’utilisateur" title="Préférences"><UserRound size={18} /></summary><div className="unit-preference-popover"><label htmlFor="measurement-system">Unités</label><select id="measurement-system" aria-label="Unités de mesure" value={measurementSystem} onChange={event => setMeasurementSystem(event.target.value === 'us-customary' ? 'us-customary' : 'metric')}><option value="metric">Métriques · °C, mm, km</option><option value="us-customary">États-Unis · °F, in, mi</option></select><small>Les exports NASA gardent leurs unités d’origine.</small></div></details>
          </div>
        </header>
        <main className="app-main" id="main-content" tabIndex={-1}><Suspense fallback={<div className="route-loading" role="status">Ouverture de la vue…</div>}><Outlet /></Suspense></main>
      </div>
      {quitPromptOpen && <div className="demo-exit-backdrop" onClick={event => { if (event.target === event.currentTarget) dismissQuitPrompt() }}>
        <section className="demo-exit-dialog" role="dialog" aria-modal="true" aria-labelledby="demo-exit-title" aria-describedby="demo-exit-description">
          <FlaskConical size={22} aria-hidden="true" />
          <h2 id="demo-exit-title">Quitter l’exemple fictif ?</h2>
          <p id="demo-exit-description">Les modifications faites dans la ferme d’exemple seront effacées. Les données présentes avant son lancement seront restaurées.</p>
          <div><button type="button" className="demo-exit-cancel" ref={keepDemoButton} onClick={dismissQuitPrompt}>Continuer la démo</button><button type="button" className="demo-exit-confirm" onClick={quitDemo}>Quitter et restaurer</button></div>
        </section>
      </div>}
      <HelpDialog open={helpOpen} onClose={closeHelp} />
    </div>
  )
}
