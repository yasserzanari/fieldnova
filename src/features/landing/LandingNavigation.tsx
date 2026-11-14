import { useState } from 'react'
import { ArrowRight, BarChart3, Bot, Database, Globe2, Layers3, Menu, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DropdownNavigation } from '../../components/21st/dorpdown-navigation'
import { GlassReveal21st } from '../../components/21st/liquid-glass-logo-reveal'

const navItems = [
  { id: 1, label: 'Plateforme', link: '#fonctionnalites' },
  {
    id: 2,
    label: 'Modules',
    subMenus: [
      {
        title: 'Comprendre',
        items: [
          { label: 'Vue d’ensemble', description: 'Lire la situation de la ferme', icon: BarChart3, href: '#fonctionnalites' },
          { label: 'Atlas', description: 'Explorer les observations', icon: Globe2, href: '#modules' },
          { label: 'Mon terrain', description: 'Relier sol et parcelles', icon: Layers3, href: '#modules' },
        ],
      },
      {
        title: 'Décider',
        items: [
          { label: 'Scénarios', description: 'Comparer des rotations', icon: BarChart3, href: '#modules' },
          { label: 'Assistant', description: 'Interroger vos données', icon: Bot, href: '#modules' },
          { label: 'Données & confiance', description: 'Voir sources et limites', icon: Database, href: '#chiffres' },
        ],
      },
    ],
  },
  { id: 3, label: 'Notre approche', link: '#chiffres' },
]

export function LandingNavigation() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="landing-header">
      <Link to="/" className="landing-brand" aria-label="FieldNova, accueil">
        <GlassReveal21st
          className="fieldnova-mark-reveal"
          label="FieldNova"
          logo="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='#174b2b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M11 20A7 7 0 0 1 4 13c0-6 8-10 16-9 1 8-3 16-9 16'/><path d='M8 16c2.5-2.5 4.5-4.5 8-8'/></svg>"
          background="#fbfaf6"
          logoColor="#174b2b"
          tileSize={72}
          logoScale={0.82}
          finalScale={0.86}
          loop={false}
          hold={1}
        />
        <span className="landing-brand-name">FieldNova</span>
      </Link>
      <div className="landing-nav-center"><DropdownNavigation navItems={navItems} /></div>
      <div className="landing-nav-actions">
        <Link to="/login" className="landing-login">Se connecter</Link>
        <Link to="/login" className="landing-access">Ouvrir FieldNova <ArrowRight size={16} /></Link>
      </div>
      <button className="landing-mobile-toggle" type="button" aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      {mobileOpen && <nav className="landing-mobile-menu" aria-label="Navigation mobile">
        <a href="#fonctionnalites" onClick={() => setMobileOpen(false)}>La plateforme</a>
        <a href="#modules" onClick={() => setMobileOpen(false)}>Modules</a>
        <a href="#chiffres" onClick={() => setMobileOpen(false)}>Notre approche</a>
        <Link to="/login" onClick={() => setMobileOpen(false)}>Se connecter</Link>
      </nav>}
    </header>
  )
}
