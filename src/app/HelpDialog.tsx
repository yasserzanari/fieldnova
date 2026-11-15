import { useEffect, useRef } from 'react'
import { ArrowRight, Bot, CircleHelp, Database, Globe2, Layers3, MapPinned, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import './help-dialog.css'

const destinations = [
  { to: '/app/overview', title: '1. Choisir le point et la ferme', detail: 'Sélectionnez l’emplacement, puis déclarez les priorités et contraintes de votre ferme.', icon: MapPinned },
  { to: '/app/atlas', title: '2. Explorer les observations NASA', detail: 'Parcourez les images GIBS et les séries historiques POWER pour le point choisi.', icon: Globe2 },
  { to: '/app/terrain', title: '3. Renseigner le sol local', detail: 'Ajoutez les données connues, les analyses et les notes de terrain; laissez le reste inconnu.', icon: Layers3 },
  { to: '/app/scenarios', title: '4. Comparer les rotations', detail: 'Modifiez la rotation de référence et les options, puis examinez les critères réellement utilisés.', icon: ArrowRight },
  { to: '/app/assistant', title: '5. Poser une question', detail: 'L’assistant consulte le contexte disponible et affiche les sources ou les inconnues.', icon: Bot },
  { to: '/app/data-trust', title: 'Vérifier les sources', detail: 'Retrouvez les produits, périodes, résolutions, provenance et limites des données.', icon: Database },
]

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      closeButtonRef.current?.focus()
    } else if (!open && dialog.open) dialog.close()
  }, [open])

  return <dialog ref={dialogRef} className="help-dialog" aria-labelledby="help-dialog-title" aria-describedby="help-dialog-intro" onClose={onClose}>
    <header className="help-dialog-header">
      <span className="help-dialog-icon"><CircleHelp size={19} /></span>
      <div><p>GUIDE FIELDNOVA</p><h2 id="help-dialog-title">Commencer avec les bonnes données</h2></div>
      <button ref={closeButtonRef} type="button" className="help-dialog-close" aria-label="Fermer le guide" onClick={() => dialogRef.current?.close()}><X size={18} /></button>
    </header>
    <div className="help-dialog-content">
      <p id="help-dialog-intro" className="help-dialog-intro">Partez d’un point, ajoutez ce que vous savez de la ferme, puis comparez des rotations en gardant visibles les preuves et les inconnues.</p>
      <nav className="help-dialog-destinations" aria-label="Étapes de découverte">
        {destinations.map(({ to, title, detail, icon: Icon }) => <Link key={to} to={to} onClick={onClose}>
          <span><Icon size={16} /></span><span><strong>{title}</strong><small>{detail}</small></span><ArrowRight size={14} />
        </Link>)}
      </nav>
      <aside className="help-dialog-note"><strong>À garder en tête</strong><p>Les séries NASA décrivent une maille ou une image régionale, pas une mesure de votre parcelle. Le sol, les cultures et les contraintes que vous saisissez restent des déclarations locales. Les classements affichés sont descriptifs; ils ne prédisent ni rendement ni bénéfice agronomique.</p></aside>
      <Link className="help-dialog-method-link" to="/methode" onClick={onClose}>Lire la méthode et les limites <ArrowRight size={14} /></Link>
    </div>
  </dialog>
}
