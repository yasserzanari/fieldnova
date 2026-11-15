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
const demoAvailable = Boolean(demoEmail && demoPassword)

export function LoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState(demoEmail)
  const [password, setPassword] = useState(demoPassword)
  const [error, setError] = useState('')

  const enterDemo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!demoAvailable || email !== demoEmail || password !== demoPassword) {
      setError('Ces identifiants ne correspondent pas au compte de démonstration local.')
      return
    }
    setError('')
    navigate('/demo', { replace: true })
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
            <p>{demoAvailable ? 'Accès local au compte de démonstration.' : 'Explorez le prototype sans créer de compte.'}</p>
          </div>

          {demoAvailable ? <form className="login-form" onSubmit={enterDemo}>
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

            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit">Ouvrir la démo balisée <ArrowLeft size={17} className="login-submit-arrow" /></button>
            <p className="login-demo-note">Vérification locale au prototype; aucun compte utilisateur ni fournisseur d’authentification n’est raccordé.</p>
          </form> : <div className="login-no-auth">
            <p>Ce prototype ne gère pas de comptes personnels. La démo fictive s’ouvre sans identifiants et marque séparément les exemples et les données NASA.</p>
            <Link className="login-submit" to="/demo">Explorer la démo fictive <ArrowLeft size={17} className="login-submit-arrow" /></Link>
          </div>}
        </div>
        <footer className="login-legal"><span>© 2026 FieldNova</span><span><Link to="/methode">Méthode & confidentialité</Link></span></footer>
      </section>
    </main>
  )
}
