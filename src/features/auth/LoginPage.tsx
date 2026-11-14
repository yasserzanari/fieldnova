import { Link } from 'react-router-dom'

export function LoginPage() {
  return (
    <main className="skeleton-route">
      <p className="skeleton-brand">FIELDNOVA</p>
      <h1>Connexion</h1>
      <p>L’écran de connexion sera ajouté après la landing page.</p>
      <Link className="text-link" to="/">Retour à l’accueil</Link>
    </main>
  )
}
