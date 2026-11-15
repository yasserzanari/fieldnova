import { ArrowLeft, ArrowUpRight, BookOpen, Code2, Database, Leaf, MapPinned, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import './technical.css'

const sources = [
  { name: 'NASA POWER · climat mensuel', status: 'Intégré', detail: 'PRECTOTCORR, T2M, T2M_MAX/MIN, GWETTOP et GWETROOT · cellule MERRA-2 0,5° × 0,625°.', href: 'https://power.larc.nasa.gov/docs/services/api/temporal/monthly/' },
  { name: 'NASA POWER · climat quotidien', status: 'Intégré dans l’Atlas', detail: 'PRECTOTCORR, T2M_MAX et T2M_MIN · année sélectionnable · requête en UTC; valeurs manquantes conservées.', href: 'https://power.larc.nasa.gov/docs/services/api/temporal/daily/' },
  { name: 'NASA EOSDIS GIBS · cartes', status: 'Tuiles affichées', detail: 'MODIS Terra True Color, NDVI 8 jours, SMAP surface et zone racinaire. Pas d’extraction statistique par parcelle.', href: 'https://nasa-gibs.github.io/gibs-api-docs/' },
  { name: 'OpenStreetMap · fond de rues', status: 'Fond de carte', detail: 'Les contributeurs sont crédités sur la carte; les conditions OSM restent indépendantes de FieldNova.', href: 'https://www.openstreetmap.org/copyright' },
  { name: 'Sol, contours et carnet de ferme', status: 'Saisie locale', detail: 'Aucune analyse de laboratoire, limite réelle ou observation de ferme n’est fournie avec la démo.', href: '/app/data-trust' },
]

export function TechnicalPage() {
  return <main className="technical-page">
    <header className="technical-topbar"><Link to="/" aria-label="Retour à FieldNova"><Leaf size={20} />FieldNova</Link><Link to="/" className="technical-back"><ArrowLeft size={15} /> Retour à l’accueil</Link></header>
    <div className="technical-content">
      <section className="technical-hero"><span className="technical-kicker"><BookOpen size={14} /> Méthode, données & limites</span><h1>Ce que FieldNova mesure.<br /><em>Et ce qu’elle ne prétend pas savoir.</em></h1><p>Une fiche technique pour comprendre les sources, transformations et limites du prototype avant d’utiliser ou de présenter ses résultats.</p><div className="technical-hero-actions"><Link to="/demo">Ouvrir la démo fictive <ArrowUpRight size={15} /></Link><Link to="/app/data-trust">Voir les sources dans l’app <ArrowUpRight size={15} /></Link></div></section>

      <section className="technical-section" aria-labelledby="technical-sources"><div className="technical-section-heading"><span><Database size={17} /></span><div><h2 id="technical-sources">Sources réellement raccordées</h2><p>Une source référencée n’est pas forcément utilisée.</p></div></div><div className="technical-source-list">{sources.map(source => <article key={source.name}><div><strong>{source.name}</strong><span>{source.status}</span></div><p>{source.detail}</p><a href={source.href} target={source.href.startsWith('http') ? '_blank' : undefined} rel={source.href.startsWith('http') ? 'noreferrer' : undefined}>Documentation <ArrowUpRight size={12} /></a></article>)}</div></section>

      <div className="technical-two-columns">
        <section className="technical-card"><div className="technical-section-heading"><span><Code2 size={17} /></span><div><h2>Traitement des séries</h2><p>Du point sélectionné aux indicateurs affichés.</p></div></div><ol className="technical-steps"><li><strong>Requête NASA POWER</strong><p>Les séries mensuelles couvrent cinq années civiles; l’Atlas demande aussi une année quotidienne à la fois. Les coordonnées sont arrondies à 0,001°.</p></li><li><strong>Filtrage conservateur</strong><p>Le mois en cours, le jour quotidien UTC en cours et les valeurs de remplissage sont exclus; une donnée absente ne devient jamais zéro.</p></li><li><strong>Repère de grille</strong><p>FieldNova dérive le centre MERRA-2 le plus proche et son empreinte. Ce polygone décrit une maille, jamais une parcelle.</p></li><li><strong>Comparaisons descriptives</strong><p>Les rotations sont classées par traits génériques explicités. Climat NASA et profil de sol n’entrent pas dans le score actuel.</p></li></ol></section>
        <section className="technical-card"><div className="technical-section-heading"><span><ShieldCheck size={17} /></span><div><h2>Origine et confidentialité</h2><p>Identifier les données avant d’interpréter un résultat.</p></div></div><ul className="technical-bullets"><li>La ferme, les rotations et certaines valeurs de la démo sont fictives et balisées dans l’interface.</li><li>Le profil local, les contraintes et le cache NASA sont stockés dans le navigateur; l’appel NASA transmet le point sélectionné.</li><li>Les sources manquantes comme SoilGrids, Sentinel-2 et les stations locales sont indiquées comme références ou non configurées.</li><li>Les alertes de cohérence gardent les valeurs NASA originales et ne certifient pas leur validité agronomique.</li></ul><Link className="technical-inline-link" to="/app/data-trust">Traçabilité détaillée <ArrowUpRight size={14} /></Link></section>
      </div>

      <section className="technical-limit"><MapPinned size={19} /><div><strong>Limite d’usage</strong><p>FieldNova est un prototype de comparaison et d’exploration. Il ne fournit pas de diagnostic de parcelle, de conseil agronomique validé, de prévision de rendement ou de décision d’irrigation. Confrontez les observations de grille aux données locales et à un professionnel agricole de votre région.</p></div></section>

      <section className="technical-license"><div><h2>Licence du code</h2><p>Le code FieldNova est publié sous licence MIT. Cette licence ne s’étend pas automatiquement aux données NASA, aux cartes, bibliothèques et autres contenus tiers.</p></div><a href="https://github.com/yasserzanari/fieldnova/blob/main/LICENSE" target="_blank" rel="noreferrer">Lire la licence MIT <ArrowUpRight size={14} /></a></section>
      <section className="technical-launch"><div><h2>Lancer le prototype</h2><p>Application React 19, TypeScript et Vite. Le chat de démonstration requiert une session Codex CLI connectée sur le serveur de développement.</p></div><pre><code>npm install<br />npm run dev<br />npm run build</code></pre><a href="https://github.com/yasserzanari/fieldnova/blob/main/README.md" target="_blank" rel="noreferrer">Instructions et structure complètes <ArrowUpRight size={13} /></a></section>
      <footer className="technical-footer"><span>FieldNova · prototype NASA Space Apps 2026</span><Link to="/">Accueil</Link><a href="https://github.com/yasserzanari/fieldnova" target="_blank" rel="noreferrer">Code source</a></footer>
    </div>
  </main>
}
