import { useState, type FormEvent } from 'react'
import { ArrowLeft, Eye, EyeOff, Leaf, LockKeyhole, Mail } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { MeshDriftBackground } from './MeshDriftBackground'
import './auth.css'

const demoEmail = import.meta.env.DEV
  ? import.meta.env.VITE_DEMO_ADMIN_EMAIL || 'demo@fieldnova.local'
  : ''
const demoPassword = import.meta.env.DEV
  ? import.meta.env.VITE_DEMO_ADMIN_PASSWORD || 'DemoChamp2026!'
  : ''

export function LoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState(demoEmail)
  const [password, setPassword] = useState(demoPassword)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')

  const enterDemo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (email !== demoEmail || password !== demoPassword || !demoEmail || !demoPassword) {
      setError('Ces identifiants ne correspondent pas à l’accès de démonstration local.')
      return
    }
    setError('')
    navigate('/app/overview')
  }

  return (
    <main className="login-page">
      <section className="login-visual" aria-label="FieldNova, comprendre son terrain">
        <MeshDriftBackground />
        <Link className="login-back" to="/" aria-label="Retour à l’accueil">
          <ArrowLeft size={19} />
        </Link>
        <Link className="login-brand" to="/" aria-label="FieldNova, accueil">
          <span className="login-brand-mark"><Leaf size={22} strokeWidth={2.2} /></span>
          <span>FieldNova</span>
        </Link>
        <div className="login-visual-copy">
          <h1>Chaque décision commence par le terrain.</h1>
          <p>Reliez les observations, les données du climat et la réalité de vos parcelles.</p>
        </div>
        <div className="login-visual-foot">
          <span>01</span><span className="login-foot-line" /><span>Observer · comprendre · agir</span>
        </div>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-form-wrap">
          <Link className="login-mobile-brand" to="/" aria-label="FieldNova, accueil">
            <span className="login-brand-mark"><Leaf size={20} /></span><span>FieldNova</span>
          </Link>
          <div className="login-heading">
            <h2 id="login-title">Bienvenue sur FieldNova</h2>
            <p>Connectez-vous à votre espace agricole.</p>
          </div>

          <form className="login-form" onSubmit={enterDemo}>
            <label className="login-field" htmlFor="email">
              <span>Adresse e-mail</span>
              <span className="login-input-wrap">
                <Mail size={18} aria-hidden="true" />
                <input id="email" name="email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} placeholder="vous@exploitation.fr" required />
              </span>
            </label>
            <label className="login-field" htmlFor="password">
              <span>Mot de passe</span>
              <span className="login-input-wrap">
                <LockKeyhole size={18} aria-hidden="true" />
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Votre mot de passe" required />
                <button className="login-reveal" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            <div className="login-options">
              <label className="login-remember"><input type="checkbox" checked={rememberMe} onChange={event => setRememberMe(event.target.checked)} /><span>Rester connecté</span></label>
              <button type="button" onClick={() => setError('La récupération par e-mail sera disponible après le raccordement du service de connexion.')}>Besoin d’aide ?</button>
            </div>

            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit">Accéder à mon espace <ArrowLeft size={17} className="login-submit-arrow" /></button>
          </form>

          <div className="login-divider"><span>ou</span></div>
          <button className="login-google" type="button" disabled aria-disabled="true">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continuer avec Google
            <span>Bientôt disponible</span>
          </button>

          <p className="login-signup">Vous découvrez FieldNova ? <Link to="/">Explorer la plateforme</Link></p>
        </div>
        <footer className="login-legal"><span>© 2026 FieldNova</span><span><Link to="/">Confidentialité</Link><Link to="/">Conditions</Link></span></footer>
      </section>
    </main>
  )
}
