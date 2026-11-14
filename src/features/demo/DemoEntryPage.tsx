import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelectedLocation } from '../../lib/geo/location'
import { startDemoWorkspace } from '../../lib/demo/demo-workspace'
import './demo.css'

export function DemoEntryPage() {
  const navigate = useNavigate()
  const { selectLocation } = useSelectedLocation()
  const [error, setError] = useState('')

  const enter = () => {
    try {
      const demo = startDemoWorkspace()
      selectLocation(demo.point)
      navigate('/app/overview', { replace: true })
    } catch {
      setError('Le navigateur n’a pas pu préparer l’exemple. Vérifiez l’espace de stockage local puis réessayez.')
    }
  }

  useEffect(enter, [])

  return <main className="demo-entry-page" aria-live="polite">
    <div className="demo-entry-card">
      <span className="demo-entry-mark" aria-hidden="true">F</span>
      <p className="demo-entry-eyebrow">FieldNova · exemple fictif</p>
      <h1>{error ? 'Impossible de lancer l’exemple' : 'Préparation de la ferme de démonstration…'}</h1>
      <p>{error || 'Les cultures de l’exemple sont illustratives. Les observations NASA resteront identifiées comme données réelles, régionales et mensuelles.'}</p>
      {error && <button type="button" onClick={enter}>Réessayer</button>}
    </div>
  </main>
}
