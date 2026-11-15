import { Activity, ArrowUpRight, Droplets, Sprout, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import './rotation-evidence-bridge.css'

export type DecisionEvidenceItem = {
  key: 'climate' | 'soil' | 'crops' | 'priorities'
  title: string
  state: 'ready' | 'partial' | 'missing'
  summary: string
  detail: string
  href?: string
  action?: string
}

export function RotationEvidenceBridge({ items, checks, onNavigate }: { items: DecisionEvidenceItem[]; checks: string[]; onNavigate: () => void }) {
  const icons = { climate: Activity, soil: Sprout, crops: Sprout, priorities: UserRound }
  const stateLabels = { ready: 'Donnée disponible', partial: 'Partiel', missing: 'À renseigner' }

  return <section className="rotation-evidence-bridge" aria-labelledby="rotation-evidence-bridge-title">
    <header className="rotation-evidence-bridge-heading">
      <div><h3 id="rotation-evidence-bridge-title">Repères réunis pour examiner cette option</h3><p>Les sources aident à préparer la discussion; elles ne mesurent pas l’adaptation de la rotation.</p></div>
      <span>Sans note d’adaptation</span>
    </header>
    <div className="rotation-evidence-bridge-grid">
      {items.map(item => {
        const Icon = icons[item.key]
        return <article className={`rotation-evidence-bridge-card is-${item.state}`} key={item.key}>
          <div className="rotation-evidence-bridge-card-heading"><span className="rotation-evidence-bridge-icon"><Icon size={15} /></span><h4>{item.title}</h4><span className="rotation-evidence-bridge-state">{stateLabels[item.state]}</span></div>
          <strong>{item.summary}</strong>
          <p>{item.detail}</p>
          {item.href && item.action && <Link to={item.href} onClick={onNavigate}>{item.action}<ArrowUpRight size={12} /></Link>}
        </article>
      })}
    </div>
    <div className="rotation-evidence-bridge-checks">
      <h4><Droplets size={14} /> À vérifier avec l’exploitation ou un conseiller</h4>
      <ul>{checks.map((check, index) => <li key={`${index}-${check}`}>{check}</li>)}</ul>
    </div>
  </section>
}
