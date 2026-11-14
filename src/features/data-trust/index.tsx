import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Check, ChevronRight, CloudSun, Database, Droplets, ExternalLink, FileInput, Filter, Globe2, Layers3, MapPin, Search, ShieldAlert, ShieldCheck, Sprout, Waves, X } from 'lucide-react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { FieldMap, type MapBaseLayer } from '../../components/maps/FieldMap'
import { PowerClimateChart } from '../../components/charts/PowerClimateChart'
import { fetchPowerMonthly, formatPowerMonth, latestCompleteRecord, type PowerMonthlySeries } from '../../lib/nasa/power'
import { useSelectedLocation } from '../../lib/geo/location'
import './data-trust.css'

type SourceKind = 'Climat' | 'Satellite' | 'Sol' | 'Terrain'
type SourceStatus = 'Connecté' | 'Référence' | 'À configurer'
type DataSource = { id: string; name: string; short: string; provider: string; kind: SourceKind; description: string; status: SourceStatus; icon: typeof CloudSun; color: string; url: string; variables: string; resolution: string; coverage: string; period: string; license: string }

const sources: DataSource[] = [
  { id: 'power', name: 'NASA POWER', short: 'NASA POWER', provider: 'NASA · POWER / MERRA-2', kind: 'Climat', description: 'Série mensuelle interrogée pour le point suivi.', status: 'Connecté', icon: CloudSun, color: 'climate', url: 'https://power.larc.nasa.gov/docs/services/api/temporal/monthly/', variables: 'Température, précipitations corrigées, humidité du sol modélisée', resolution: 'Maille météorologique MERRA-2 native · 0,5° × 0,625°', coverage: 'Coordonnée sélectionnée · couverture globale du service', period: 'Série mensuelle sur 5 ans; dernier mois exploitable affiché', license: 'Données NASA POWER · consulter les conditions officielles' },
  { id: 'gibs', name: 'NASA GIBS', short: 'NASA GIBS', provider: 'NASA EOSDIS · GIBS', kind: 'Satellite', description: 'Tuiles cartographiques MODIS et SMAP affichées sur la carte interactive.', status: 'Connecté', icon: Globe2, color: 'satellite', url: 'https://nasa-gibs.github.io/gibs-api-docs/access-basics/', variables: 'MODIS Terra true color et NDVI; SMAP humidité surface et racines', resolution: 'Résolution du produit; SMAP L4 environ 9 km', coverage: 'Vue de la carte au point suivi · aucun contour de ferme fourni', period: 'MODIS daté sur la carte; SMAP au dernier produit disponible', license: 'NASA EOSDIS GIBS · consulter les conditions du produit' },
  { id: 'sentinel', name: 'Sentinel-2', short: 'Sentinel-2', provider: 'Copernicus · ESA', kind: 'Satellite', description: 'Source potentielle d’imagerie, pas encore interrogée par FieldNova.', status: 'Référence', icon: Layers3, color: 'satellite', url: 'https://dataspace.copernicus.eu/', variables: 'Bandes et indice à sélectionner', resolution: 'Selon le produit et la bande', coverage: 'Non chargée pour ce point', period: 'Aucune acquisition demandée', license: 'Conditions Copernicus à vérifier avant intégration' },
  { id: 'soilgrids', name: 'SoilGrids', short: 'SoilGrids', provider: 'ISRIC · SoilGrids', kind: 'Sol', description: 'Propriétés de sol cartographiques; API non utilisée dans cette version.', status: 'Référence', icon: Layers3, color: 'soil', url: 'https://soilgrids.org/', variables: 'Texture, carbone organique, pH selon les produits', resolution: 'Selon la propriété et la profondeur', coverage: 'Non vérifiée pour le point suivi', period: 'Millésime non chargé', license: 'Conditions ISRIC à vérifier avant intégration' },
  { id: 'rain-local', name: 'Pluviométrie locale', short: 'Pluie locale', provider: 'Station météo de l’exploitation', kind: 'Climat', description: 'Mesures locales à importer; elles ne sont pas présentes dans le projet.', status: 'À configurer', icon: Droplets, color: 'climate', url: '', variables: 'Précipitations · aucune mesure reçue', resolution: 'Station à renseigner', coverage: 'Aucun capteur associé', period: 'Aucune mesure disponible', license: 'Droits de la donnée à documenter' },
  { id: 'farm-records', name: 'Carnet de parcelle', short: 'Carnet ferme', provider: 'Données de l’exploitation', kind: 'Terrain', description: 'Analyses, interventions et contours de parcelles à fournir par la ferme.', status: 'À configurer', icon: FileInput, color: 'farm', url: '', variables: 'Aucun carnet ou contour importé', resolution: 'Parcelle à délimiter', coverage: 'Aucune géométrie de ferme enregistrée', period: 'Aucun historique chargé', license: 'Droits d’usage à confirmer avec la ferme' },
]

const themes: Array<'Toutes' | SourceKind> = ['Toutes', 'Climat', 'Satellite', 'Sol', 'Terrain']
const statusFilters: Array<'Tous les statuts' | SourceStatus> = ['Tous les statuts', 'Connecté', 'Référence', 'À configurer']

function coordinate(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(3).replace('.', ',')}° ${value < 0 ? negative : positive}`
}

function statusClass(status: SourceStatus) {
  return status === 'Connecté' ? 'connect' : status === 'Référence' ? 'reference' : 'import'
}

export function DataTrustPage() {
  const { location, selectLocation } = useSelectedLocation()
  const [selectedId, setSelectedId] = useState('power')
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState<'Toutes' | SourceKind>('Toutes')
  const [statusFilter, setStatusFilter] = useState<'Tous les statuts' | SourceStatus>('Tous les statuts')
  const [panel, setPanel] = useState<'overview' | 'lineage'>('overview')
  const [layer, setLayer] = useState<'truecolor' | 'ndvi' | 'surface' | 'root'>('truecolor')
  const [baseLayer, setBaseLayer] = useState<MapBaseLayer>('nasa')
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const [series, setSeries] = useState<PowerMonthlySeries | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const selected = sources.find(source => source.id === selectedId) ?? sources[0]
  const SourceIcon = selected.icon
  const latest = series ? latestCompleteRecord(series.records) : undefined
  const filteredSources = useMemo(() => sources.filter(source => (theme === 'Toutes' || source.kind === theme) && (statusFilter === 'Tous les statuts' || source.status === statusFilter) && `${source.name} ${source.provider} ${source.description}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))), [query, statusFilter, theme])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    fetchPowerMonthly(location, 5).then(result => {
      if (active) setSeries(result)
    }).catch(reason => {
      if (active) {
        setSeries(null)
        setError(reason instanceof Error ? reason.message : 'NASA POWER indisponible.')
      }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [location])

  const imageryDate = (() => {
    const date = new Date()
    date.setUTCDate(date.getUTCDate() - 11)
    return date.toISOString().slice(0, 10)
  })()
  const connectedCount = error ? 1 : 2

  return <section className="trust-page" aria-label="Sources de données et traçabilité">
    <header className="trust-page-heading"><div><span className="trust-heading-icon"><ShieldCheck size={17} /></span><span><h1>Données & confiance</h1><p>Sources réellement raccordées, coordonnées utilisées et limites de chaque produit.</p></span></div><span className="trust-status-banner"><ShieldCheck size={14} /> {connectedCount} sources NASA raccordées · {loading ? 'POWER en chargement' : error ? 'POWER indisponible' : latest ? `POWER · ${formatPowerMonth(latest.date)}` : 'POWER · aucune valeur'}</span></header>

    <div className="trust-workspace">
      <aside className="trust-catalog-panel">
        <header className="trust-section-heading"><div><span className="trust-section-icon"><Database size={16} /></span><span><strong>Catalogue des sources</strong><small>État d’intégration dans cette version</small></span></div><span className="trust-source-count">{filteredSources.length}</span></header>
        <label className="trust-search"><Search size={14} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher une source…" aria-label="Rechercher une source" />{query && <button type="button" onClick={() => setQuery('')} aria-label="Effacer la recherche"><X size={13} /></button>}</label>
        <div className="trust-filter-row"><label><span>Thématique</span><select value={theme} onChange={event => setTheme(event.target.value as typeof theme)} aria-label="Filtrer par thématique">{themes.map(item => <option key={item}>{item}</option>)}</select></label><label><span>Connexion</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)} aria-label="Filtrer par statut">{statusFilters.map(item => <option key={item}>{item}</option>)}</select></label></div>
        <div className="trust-catalog-list" aria-label="Sources disponibles">
          {filteredSources.map(source => { const Icon = source.icon; const status = source.id === 'power' && error ? 'Indisponible' : source.status; const cls = status === 'Indisponible' ? 'import' : statusClass(source.status); return <button key={source.id} type="button" className={`trust-source-item ${selectedId === source.id ? 'is-selected' : ''}`} onClick={() => { setSelectedId(source.id); setPanel('overview'); if (source.id === 'gibs') { setBaseLayer('nasa'); setLayer('truecolor') } }} aria-pressed={selectedId === source.id}>
            <span className={`trust-source-mark ${source.color}`}><Icon size={17} /></span><span className="trust-source-copy"><span className="trust-source-name">{source.short}</span><small>{source.provider} · {source.kind}</small><span className="trust-source-desc">{source.description}</span></span><span className={`trust-status-pill status-${cls}`}>{status}</span><ChevronRight className="trust-source-chevron" size={14} />
          </button> })}
          {!filteredSources.length && <div className="trust-empty"><Filter size={18} /><strong>Aucune source ne correspond</strong><span>Essayez un autre filtre ou une recherche.</span><button type="button" onClick={() => { setQuery(''); setTheme('Toutes'); setStatusFilter('Tous les statuts') }}>Réinitialiser les filtres</button></div>}
        </div>
        <footer className="trust-catalog-footer"><span><span className="trust-empty-dot" />{sources.filter(source => source.status === 'À configurer').length} sources à configurer</span><button type="button" onClick={() => { setTheme('Terrain'); setStatusFilter('À configurer') }}><FileInput size={14} /> Voir les manquantes</button></footer>
      </aside>

      <div className="trust-map-stage" aria-label="Carte des sources au point sélectionné">
        <FieldMap center={location} selectedPoint={location} baseLayer={baseLayer} showNdvi={layer === 'ndvi'} showSurfaceSoil={layer === 'surface'} showRootSoil={layer === 'root'} powerGridCell={series?.point.latitude === location.latitude && series.point.longitude === location.longitude ? series.gridCell : null} imageryDate={imageryDate} onPointSelect={selectLocation} onMapReady={setMap} ariaLabel="Carte interactive des sources NASA et OpenStreetMap" />
        <div className="trust-map-context"><span className={`trust-source-mark small ${selected.color}`}><SourceIcon size={14} /></span><span><strong>{selected.name}</strong><small>{coordinate(location.latitude, 'N', 'S')} · {coordinate(location.longitude, 'E', 'O')}</small></span><span className={`trust-status-pill status-${statusClass(selected.status)}`}>{selected.status}</span></div>
        <div className="trust-map-controls"><div><button type="button" aria-label="Zoom avant" onClick={() => map?.zoomIn({ duration: 250 })}><span>+</span></button><button type="button" aria-label="Zoom arrière" onClick={() => map?.zoomOut({ duration: 250 })}><span>−</span></button></div><button type="button" aria-label="Recentrer" onClick={() => map?.flyTo({ center: [location.longitude, location.latitude], zoom: 5 })}><MapPin size={15} /></button><button type="button" aria-label="Basculer entre carte NASA et plan" onClick={() => setBaseLayer(value => value === 'nasa' ? 'streets' : 'nasa')}><Layers3 size={15} /></button></div>
        <div className="trust-layer-menu"><strong>Couches NASA</strong><div className="trust-map-layer-choices">{[
          { id: 'truecolor', label: 'MODIS' }, { id: 'ndvi', label: 'NDVI' }, { id: 'surface', label: 'SMAP surface' }, { id: 'root', label: 'SMAP racines' },
        ].map(item => <button key={item.id} type="button" className={layer === item.id ? 'is-active' : ''} onClick={() => { setLayer(item.id as typeof layer); setBaseLayer('nasa') }}>{item.label}</button>)}</div><button type="button" className="trust-map-base-toggle" onClick={() => setBaseLayer(value => value === 'nasa' ? 'streets' : 'nasa')}>{baseLayer === 'nasa' ? 'Fond NASA actif · passer au plan' : 'Plan actif · passer au fond NASA'}</button></div>
        <div className="trust-map-legend"><strong>Point de grille · pas une parcelle</strong><span>{coordinate(location.latitude, 'N', 'S')} · {coordinate(location.longitude, 'E', 'O')}</span><small>La carte permet d’inspecter la couche, sans contour de ferme importé.</small></div>
      </div>

      <aside className="trust-details-panel">
        <header className="trust-detail-header"><div><span className={`trust-section-icon detail-icon ${selected.color}`}><SourceIcon size={17} /></span><span><small>FICHE DE SOURCE</small><strong>{selected.name}</strong></span></div><span className={`trust-status-label status-${statusClass(selected.status)}`}>{selected.id === 'power' && error ? 'Indisponible' : selected.status}</span></header>
        <div className="trust-provider-line"><span className={`trust-status-dot status-dot-${statusClass(selected.status)}`} /><span>{selected.provider}</span><span>{selected.id === 'power' ? 'point actif' : selected.id === 'gibs' ? 'couches carte' : 'non utilisé'}</span></div>
        <p className="trust-source-description">{selected.description}</p>
        {selected.url && <a className="trust-source-link" href={selected.url} target="_blank" rel="noreferrer">Documentation officielle <ExternalLink size={12} /></a>}
        <div className="trust-detail-tabs" role="tablist" aria-label="Détails de la source"><button type="button" role="tab" aria-selected={panel === 'overview'} className={panel === 'overview' ? 'is-active' : ''} onClick={() => setPanel('overview')}>Métadonnées</button><button type="button" role="tab" aria-selected={panel === 'lineage'} className={panel === 'lineage' ? 'is-active' : ''} onClick={() => setPanel('lineage')}>Traçabilité</button></div>
        {panel === 'overview' ? <div className="trust-metadata">
          <div className="trust-meta-row"><span><Sprout size={13} /> Variables</span><strong>{selected.id === 'power' ? 'PRECTOTCORR, T2M, T2M_MAX/MIN, GWETTOP, GWETROOT' : selected.variables}</strong></div>
            <div className="trust-meta-row"><span><Layers3 size={13} /> Résolution</span><strong>{selected.id === 'power' && series ? `MERRA-2 · 0,5° × 0,625° · centre ${coordinate(series.gridPoint.latitude, 'N', 'S')} · ${coordinate(series.gridPoint.longitude, 'E', 'O')}` : selected.resolution}</strong></div>
          <div className="trust-meta-row"><span><MapPin size={13} /> Couverture</span><strong>{selected.id === 'power' ? 'Point actif; valeur interpolée/agrégée au point de grille POWER' : selected.coverage}</strong></div>
          <div className="trust-meta-row"><span><Waves size={13} /> Période</span><strong>{selected.id === 'power' ? latest ? `Mensuel · dernière période exploitable ${formatPowerMonth(latest.date)}` : loading ? 'Chargement de la série mensuelle…' : 'Aucune période exploitable' : selected.period}</strong></div>
          <div className="trust-meta-row"><span><ShieldCheck size={13} /> Limite</span><strong>{selected.id === 'power' ? 'Climatologie mensuelle; pas de prévision ni de mesure parcellaire' : selected.license}</strong></div>
          {selected.id === 'power' && error && <div className="trust-data-error" role="alert"><ShieldAlert size={14} />{error}</div>}
          {selected.id === 'power' && series && <div className="trust-live-chart"><PowerClimateChart records={series.records} source="NASA POWER" title="Série mensuelle au point suivi" months={24} /></div>}
          {selected.id === 'gibs' && <div className="trust-quality-card"><span className="trust-quality-icon"><ShieldCheck size={17} /></span><span><small>Lecture de la couche</small><strong>Pixel satellite</strong></span><span className="trust-quality-breakdown"><b>MODIS <em>image datée</em></b><b>SMAP <em>~9 km</em></b><b>Parcelle <em>non fournie</em></b></span></div>}
          {selected.id !== 'power' && selected.id !== 'gibs' && <div className="trust-provenance-note"><ShieldAlert size={14} /><p>Cette source est une référence ou une intégration manquante. Aucune valeur de cette source n’alimente les cartes, graphiques ou réponses de FieldNova.</p></div>}
        </div> : <div className="trust-lineage">
          <div className="trust-lineage-summary"><span><ShieldCheck size={16} /></span><div><strong>{selected.status === 'Connecté' ? 'Flux intégré dans l’interface' : 'Flux non exécuté'}</strong><small>{selected.status === 'Connecté' ? 'La fiche décrit les données utilisées dans les vues FieldNova.' : 'Référence conservée au catalogue; aucune donnée n’est collectée.'}</small></div></div>
          <ol>{(selected.id === 'power' ? [
            { title: 'Coordonnée active', desc: `${coordinate(location.latitude, 'N', 'S')} · ${coordinate(location.longitude, 'E', 'O')}`, done: true },
            { title: 'Requête NASA POWER', desc: latest ? `Série reçue · ${formatPowerMonth(latest.date)}` : loading ? 'Requête en cours' : 'Requête indisponible', done: Boolean(series) },
            { title: 'Contrôle des valeurs', desc: 'Valeurs manquantes écartées; unités et date conservées.', done: Boolean(series) },
            { title: 'Utilisation dans FieldNova', desc: 'Graphiques, indicateurs, empreinte de maille sur la carte et réponses de l’assistant.', done: Boolean(series) },
          ] : selected.id === 'gibs' ? [
            { title: 'Produit NASA GIBS', desc: 'MODIS true color/NDVI et SMAP surface/racines.', done: true },
            { title: 'Tuiles de carte', desc: 'Rendu raster sur le fond OpenStreetMap.', done: true },
            { title: 'Échelle spatiale', desc: 'Résolution native; pixel régional, sans contour parcellaire.', done: true },
            { title: 'Interprétation agricole', desc: 'Aucun diagnostic ou conseil de rendement déduit.', done: true },
          ] : [
            { title: 'Source identifiée', desc: 'Documentation publique repérée.', done: true },
            { title: 'Accès & périmètre', desc: 'Produit, compte ou données de ferme à sélectionner.', done: false },
            { title: 'Collecte & validation', desc: 'Aucune requête, validation ou transformation exécutée.', done: false },
            { title: 'Usage dans FieldNova', desc: 'Aucune valeur de cette source n’est affichée comme donnée réelle.', done: false },
          ]).map((item, index) => <li className={item.done ? 'lineage-done' : 'lineage-next'} key={item.title}><span className="lineage-marker">{item.done ? <Check size={11} /> : index + 1}</span><span><strong>{item.title}</strong><small>{item.desc}</small></span></li>)}</ol>
          <div className="trust-provenance-note"><ShieldCheck size={14} /><p>Les valeurs affichées gardent leur source, leur unité, leur date et leur couverture spatiale. Les données de grille ne décrivent pas une parcelle individuelle.</p></div>
        </div>}
        <footer className="trust-detail-footer"><span><span className={`trust-empty-dot ${selected.status === 'Connecté' && !error ? 'is-connected' : ''}`} />{selected.id === 'power' && error ? 'Récupération en échec' : selected.status === 'Connecté' ? 'Source intégrée' : selected.status}</span><button type="button" onClick={() => setPanel('lineage')}>Voir la traçabilité <ArrowUpRight size={13} /></button></footer>
      </aside>
    </div>
  </section>
}
