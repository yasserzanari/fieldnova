import { ArrowUpRight, Leaf, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

type Props = {
  title: string
  description: string
  icon: LucideIcon
  concept?: string
}

export function FeaturePlaceholder({ title, description, icon: Icon, concept }: Props) {
  return (
    <section className="feature-placeholder">
      <header className="feature-heading">
        <div className="feature-heading-icon"><Icon size={20} /></div>
        <div><h1>{title}</h1><p>{description}</p></div>
      </header>
      <div className="placeholder-card">
        <div className="placeholder-orbit"><Leaf size={34} /></div>
        <h2>Votre espace {title.toLocaleLowerCase('fr')} prend forme</h2>
        <p>Cette vue sera construite à partir du concept UI FieldNova et des interactions prévues pour ce module.</p>
        <Link to="/app/overview" className="text-link">Retour à la vue d’ensemble <ArrowUpRight size={16} /></Link>
        {concept && <img src={concept} alt={`Concept de l’onglet ${title}`} />}
      </div>
    </section>
  )
}
