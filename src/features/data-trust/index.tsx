import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { ArrowUpRight, Check, ChevronRight, CircleHelp, CloudSun, Database, Droplets, ExternalLink, FileInput, Filter, Globe2, Layers3, LocateFixed, MapPin, Minus, Plus, Search, ShieldAlert, ShieldCheck, Sprout, Waves, X } from 'lucide-react'
import './data-trust.css'

type SourceKind = 'Climat' | 'Satellite' | 'Sol' | 'Terrain'
type DataSource = { id: string; name: string; short: string; provider: string; kind: SourceKind; description: string; status: 'Référence' | 'Import requis'; icon: typeof CloudSun; color: string; url: string; variables: string; resolution: string; coverage: string; period: string; license: string }

const sources: DataSource[] = [
  { id: 'power', name: 'NASA POWER', short: 'NASA POWER', provider: 'NASA · POWER', kind: 'Climat', description: 'Référence pour les variables climatiques et météorologiques.', status: 'Référence', icon: CloudSun, color: 'climate', url: 'https://power.larc.nasa.gov/docs/', variables: 'À configurer · pluie, température, rayonnement…', resolution: 'À récupérer auprès du service', coverage: 'Non vérifiée pour cette exploitation', period: 'Aucune période chargée', license: 'Conditions de la source à vérifier' },
  { id: 'earthdata', name: 'NASA Earthdata', short: 'Earthdata', provider: 'NASA · Earthdata', kind: 'Satellite', description: 'Catalogue pour les données de la Terre et les observations satellitaires.', status: 'Référence', icon: Globe2, color: 'satellite', url: 'https://www.earthdata.nasa.gov/', variables: 'Collection et produit non sélectionnés', resolution: 'Dépend du produit retenu', coverage: 'Emprise non vérifiée', period: 'Aucune image chargée', license: 'Conditions du produit à vérifier' },
  { id: 'sentinel', name: 'Sentinel-2', short: 'Sentinel-2', provider: 'Copernicus · ESA', kind: 'Satellite', description: 'Imagerie optique utile pour suivre la végétation, sous réserve de nuages et de disponibilité.', status: 'Référence', icon: Layers3, color: 'satellite', url: 'https://dataspace.copernicus.eu/', variables: 'Bandes / indice à choisir', resolution: 'Dépend de la bande et du produit', coverage: 'Non vérifiée pour P-03', period: 'Aucune acquisition chargée', license: 'Conditions Copernicus à vérifier' },
  { id: 'soilgrids', name: 'SoilGrids', short: 'SoilGrids', provider: 'ISRIC · SoilGrids', kind: 'Sol', description: 'Référence cartographique pour des propriétés de sols à différentes profondeurs.', status: 'Référence', icon: Layers3, color: 'soil', url: 'https://soilgrids.org/', variables: 'Propriété et profondeur non sélectionnées', resolution: 'À confirmer pour la variable demandée', coverage: 'Non vérifiée à l’échelle de la parcelle', period: 'Millésime non chargé', license: 'Conditions de la source à vérifier' },
  { id: 'rain-local', name: 'Pluviométrie locale', short: 'Pluie locale', provider: 'Station météo de la ferme', kind: 'Climat', description: 'Relevés locaux qui restent à connecter ou importer.', status: 'Import requis', icon: Droplets, color: 'climate', url: '', variables: 'Précipitations · non reçues', resolution: 'Station · emplacement à renseigner', coverage: 'Aucun capteur associé', period: 'Aucune mesure disponible', license: 'Droits de la donnée à documenter' },
  { id: 'farm-records', name: 'Carnet de parcelle', short: 'Carnet ferme', provider: 'Données de l’exploitation', kind: 'Terrain', description: 'Mesures de sol, itinéraires, interventions et décisions du producteur.', status: 'Import requis', icon: FileInput, color: 'farm', url: '', variables: 'Aucun fichier versé', resolution: 'Parcelle · coordonnées manquantes', coverage: 'Aucune parcelle importée', period: 'Aucun historique chargé', license: 'Droits d’usage à confirmer avec la ferme' },
]

const themes: Array<'Toutes' | SourceKind> = ['Toutes', 'Climat', 'Satellite', 'Sol', 'Terrain']

export function DataTrustPage() {
  const [selectedId, setSelectedId] = useState('power')
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState<'Toutes' | SourceKind>('Toutes')
  const [statusFilter, setStatusFilter] = useState<'Tous les statuts' | DataSource['status']>('Tous les statuts')
  const [panel, setPanel] = useState<'overview' | 'lineage'>('overview')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [layersOpen, setLayersOpen] = useState(false)
  const [showCoverage, setShowCoverage] = useState(true)
  const [showParcels, setShowParcels] = useState(true)
  const stageRef = useRef<HTMLDivElement>(null)
  const start = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const selected = sources.find(source => source.id === selectedId) ?? sources[0]
  const filteredSources = useMemo(() => sources.filter(source => (theme === 'Toutes' || source.kind === theme) && (statusFilter === 'Tous les statuts' || source.status === statusFilter) && `${source.name} ${source.provider} ${source.description}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))), [query, statusFilter, theme])
  const SourceIcon = selected.icon

  const beginPan = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, input, a, .trust-overlay')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    start.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }
    setDragging(true)
  }
  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging || !stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    const limitX = (rect.width * zoom - rect.width) / 2
    const limitY = (rect.height * zoom - rect.height) / 2
    setPan({ x: Math.max(-limitX, Math.min(limitX, start.current.panX + event.clientX - start.current.x)), y: Math.max(-limitY, Math.min(limitY, start.current.panY + event.clientY - start.current.y)) })
  }

  return <section className="trust-page" aria-label="Catalogue des sources et qualité des données">
    <header className="trust-page-heading"><div><span className="trust-heading-icon"><ShieldCheck size={17} /></span><span><h1>Données & confiance</h1><p>Vérifiez d’où viennent les informations et ce qui manque avant de les utiliser.</p></span></div><span className="trust-status-banner"><ShieldAlert size={14} /> Aucune source n’est connectée dans cette démo</span></header>

    <div className="trust-workspace">
      <aside className="trust-catalog-panel">
        <header className="trust-section-heading"><div><span className="trust-section-icon"><Database size={16} /></span><span><strong>Catalogue des sources</strong><small>Sources candidates pour FieldNova</small></span></div><span className="trust-source-count">{filteredSources.length}</span></header>
        <label className="trust-search"><Search size={14} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher une source…" aria-label="Rechercher une source" />{query && <button type="button" onClick={() => setQuery('')} aria-label="Effacer la recherche"><X size={13} /></button>}</label>
        <div className="trust-filter-row"><label><span>Thématique</span><select value={theme} onChange={event => setTheme(event.target.value as typeof theme)} aria-label="Filtrer par thématique">{themes.map(item => <option key={item}>{item}</option>)}</select></label><label><span>Connexion</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)} aria-label="Filtrer par statut"><option>Tous les statuts</option><option>Référence</option><option>Import requis</option></select></label></div>
        <div className="trust-catalog-list" aria-label="Sources disponibles">
          {filteredSources.map(source => { const Icon = source.icon; return <button key={source.id} type="button" className={`trust-source-item ${selectedId === source.id ? 'is-selected' : ''}`} onClick={() => { setSelectedId(source.id); setPanel('overview') }} aria-pressed={selectedId === source.id}>
            <span className={`trust-source-mark ${source.color}`}><Icon size={17} /></span><span className="trust-source-copy"><span className="trust-source-name">{source.short}</span><small>{source.provider} · {source.kind}</small><span className="trust-source-desc">{source.description}</span></span><span className={`trust-status-pill status-${source.status === 'Référence' ? 'reference' : 'import'}`}>{source.status}</span><ChevronRight className="trust-source-chevron" size={14} />
          </button> })}
          {!filteredSources.length && <div className="trust-empty"><Filter size={18} /><strong>Aucune source ne correspond</strong><span>Essayez un autre filtre ou une recherche.</span><button type="button" onClick={() => { setQuery(''); setTheme('Toutes'); setStatusFilter('Tous les statuts') }}>Réinitialiser les filtres</button></div>}
        </div>
        <footer className="trust-catalog-footer"><span><span className="trust-empty-dot" />{sources.filter(source => source.status === 'Import requis').length} imports à prévoir</span><button type="button" onClick={() => { setTheme('Terrain'); setStatusFilter('Import requis') }}><FileInput size={14} /> Préparer un import</button></footer>
      </aside>

      <div className={`trust-map-stage ${dragging ? 'is-dragging' : ''}`} ref={stageRef} onPointerDown={beginPan} onPointerMove={movePan} onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)}>
        <div className="trust-map-world" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          <img src="/images/landing-fields.png" alt="Carte agricole illustrative, sans coordonnées de parcelle" draggable={false} />
          {showCoverage && <div className={`trust-coverage-wash ${selected.color}`} />}
          {showParcels && <svg className="trust-map-parcels" viewBox="0 0 1000 700" role="img" aria-label="Contours de parcelles illustratifs"><polygon points="598,143 767,172 813,302 609,366 608,228" /><polygon points="175,388 320,378 448,432 404,568 220,531 149,454" /><polygon points="307,264 482,194 615,230 604,384 449,433 324,378" /></svg>}
          <div className="trust-map-anchor"><span><MapPin size={15} /></span><strong>Zone de démonstration</strong><small>Emplacement réel à renseigner</small></div>
          {showCoverage && <div className="trust-coverage-gaps"><span />Couverture non vérifiée</div>}
        </div>
        <div className="trust-map-context"><span className={`trust-source-mark small ${selected.color}`}><SourceIcon size={14} /></span><span><strong>{selected.name}</strong><small>Couverture de P-03 · inconnue</small></span><button type="button" aria-label={showCoverage ? 'Masquer la couche illustrative' : 'Afficher la couche illustrative'} onClick={() => setShowCoverage(value => !value)}>{showCoverage ? <X size={13} /> : <Plus size={13} />}</button></div>
        <div className="trust-map-controls"><div><button type="button" aria-label="Zoom avant" onClick={() => setZoom(value => Math.min(1.7, +(value + .15).toFixed(2)))}><Plus size={15} /></button><button type="button" aria-label="Zoom arrière" onClick={() => setZoom(value => Math.max(.9, +(value - .15).toFixed(2)))}><Minus size={15} /></button></div><button type="button" aria-label="Recentrer" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}><LocateFixed size={15} /></button><button type="button" aria-expanded={layersOpen} aria-label="Afficher les options de couche" onClick={() => setLayersOpen(value => !value)}><Layers3 size={15} /></button></div>
        {layersOpen && <div className="trust-layer-menu"><strong>Affichage de la carte</strong><label><input type="checkbox" checked={showParcels} onChange={event => setShowParcels(event.target.checked)} /> Contours illustratifs des parcelles</label><label><input type="checkbox" checked={showCoverage} onChange={event => setShowCoverage(event.target.checked)} /> Aplât de couverture démo</label><small>Emprises réelles indisponibles tant que la source et les coordonnées ne sont pas raccordées.</small></div>}
        <div className="trust-map-legend"><strong>Lecture de la couverture</strong><span><i className="coverage-unknown" />Couverture inconnue</span><span><i className="coverage-placeholder" />Aperçu illustratif</span><small>La carte de fond n’est ni géoréférencée ni issue du fournisseur sélectionné.</small></div>
        <div className="trust-map-scale"><span />250 m</div>
      </div>

      <aside className="trust-details-panel">
        <header className="trust-detail-header"><div><span className="trust-section-icon detail-icon"><SourceIcon size={17} /></span><span><small>FICHE DE SOURCE</small><strong>{selected.name}</strong></span></div><button type="button" aria-label="Aide sur la provenance"><CircleHelp size={15} /></button></header>
        <div className="trust-provider-line"><span className={`trust-status-dot status-dot-${selected.status === 'Référence' ? 'reference' : 'import'}`} /><span>{selected.provider}</span><span className="trust-status-label">{selected.status === 'Référence' ? 'Référence seulement' : 'À importer'}</span></div>
        <p className="trust-source-description">{selected.description}</p>
        {selected.url && <a className="trust-source-link" href={selected.url} target="_blank" rel="noreferrer">Documentation officielle <ExternalLink size={12} /></a>}
        <div className="trust-detail-tabs" role="tablist" aria-label="Détails de la source"><button type="button" role="tab" aria-selected={panel === 'overview'} className={panel === 'overview' ? 'is-active' : ''} onClick={() => setPanel('overview')}>Métadonnées</button><button type="button" role="tab" aria-selected={panel === 'lineage'} className={panel === 'lineage' ? 'is-active' : ''} onClick={() => setPanel('lineage')}>Traçabilité</button></div>
        {panel === 'overview' ? <div className="trust-metadata">
          <div className="trust-meta-row"><span><Sprout size={13} /> Variables</span><strong>{selected.variables}</strong></div>
          <div className="trust-meta-row"><span><Layers3 size={13} /> Résolution</span><strong>{selected.resolution}</strong></div>
          <div className="trust-meta-row"><span><MapPin size={13} /> Couverture</span><strong>{selected.coverage}</strong></div>
          <div className="trust-meta-row"><span><Waves size={13} /> Période</span><strong>{selected.period}</strong></div>
          <div className="trust-meta-row"><span><ShieldCheck size={13} /> Licence</span><strong>{selected.license}</strong></div>
          <div className="trust-quality-card"><span className="trust-quality-icon"><ShieldAlert size={17} /></span><span><small>Qualité évaluée</small><strong>Non évaluée</strong></span><span className="trust-quality-breakdown"><b>Complétude <em>—</em></b><b>Fraîcheur <em>inconnue</em></b><b>Validation <em>à faire</em></b></span></div>
          <div className="trust-empty-chart"><div><span><Waves size={13} />Aperçu des données</span><small>Disponible après connexion</small></div><div className="trust-chart-placeholder"><span>Pas encore de série à tracer</span><i /><i /><i /><i /><i /><i /><i /><i /></div><footer><span>Début de période <b>—</b></span><span>Dernière donnée <b>—</b></span></footer></div>
        </div> : <div className="trust-lineage">
          <div className="trust-lineage-summary"><span><ShieldAlert size={16} /></span><div><strong>Chaîne non exécutée</strong><small>Cette fiche décrit l’intégration prévue; aucune donnée n’a été transformée.</small></div></div>
          <ol>{[
            { title: 'Source identifiée', desc: 'Documentation publique ou données de ferme à confirmer.', state: 'done' },
            { title: 'Accès & périmètre', desc: 'Compte, zone d’intérêt et produits à sélectionner.', state: 'next' },
            { title: 'Collecte & validation', desc: 'Aucun téléchargement, contrôle ou calcul exécuté.', state: 'next' },
            { title: 'Usage dans FieldNova', desc: 'Indicateurs et recommandations désactivés jusqu’à validation.', state: 'next' },
          ].map((item, index) => <li className={`lineage-${item.state}`} key={item.title}><span className="lineage-marker">{item.state === 'done' ? <Check size={11} /> : index + 1}</span><span><strong>{item.title}</strong><small>{item.desc}</small></span></li>)}</ol>
          <div className="trust-provenance-note"><ShieldCheck size={14} /><p>Chaque future valeur devra conserver son unité, sa date, sa couverture spatiale, sa méthode et son niveau d’incertitude.</p></div>
        </div>}
        <footer className="trust-detail-footer"><span><span className="trust-empty-dot" />Raccordement absent</span><button type="button" onClick={() => { setPanel('lineage'); setLayersOpen(true) }}>Voir les prérequis <ArrowUpRight size={13} /></button></footer>
      </aside>
    </div>
  </section>
}
