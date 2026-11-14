import { Link } from 'react-router-dom'

export function PublicLanding() {
  return (
    <main className="skeleton-route">
      <p className="skeleton-brand">FIELDNOVA</p>
      <h1>Comprendre le climat de vos parcelles.</h1>
      <p>Structure publique en cours de construction.</p>
      <Link className="button-primary" to="/login">Se connecter</Link>
    </main>
  )
}
