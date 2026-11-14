import { Bell, ChevronDown, CircleHelp, Leaf, Menu, UserRound } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { Suspense, useState } from 'react'
import { featureRoutes } from '../navigation'

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="app-frame">
      <aside className={`app-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <NavLink className="brand-lockup" to="/app/overview" aria-label="FieldNova, vue d’ensemble">
          <span className="brand-symbol"><Leaf size={21} strokeWidth={2.3} /></span>
          <span>FieldNova</span>
        </NavLink>
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
          <span className="workspace-avatar">FC</span>
          <span className="sidebar-farm"><strong>Ferme des Chênes</strong><small>Exploitation active</small></span>
          <ChevronDown size={16} aria-hidden="true" />
        </div>
      </aside>

      <div className="app-column">
        <header className="app-topbar">
          <button className="icon-button mobile-menu" aria-label="Ouvrir la navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            <Menu size={19} />
          </button>
          <div className="topbar-context">
            <span className="context-control"><Leaf size={18} /> Maïs · Saison 2025 <ChevronDown size={15} /></span>
            <span className="context-weather">☀️ <strong>18 °C</strong><span>Précipitations 7 j : 12 mm</span></span>
            <span className="context-demo">Données de démonstration</span>
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
