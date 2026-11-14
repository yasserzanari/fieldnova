import { useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, ChevronRight, CloudRain, Droplets, Layers2, LocateFixed, Minus, Plus, Search, Sprout, ThermometerSun } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AtlasChart } from './AtlasChart'
import './atlas.css'

type Layer = { id: string; label: string; group: string; icon: typeof Sprout; color: string }
type Acquisition = { id: string; date: string; short: string; value: number; valid: boolean }
type Parcel = { id: string; name: string; crop: string; area: string }

const layers: Layer[] = [
  { id: 'rain', label: 'Pluie cumulée · 7 j', group: 'Climat', icon: CloudRain, color: '#4083bb' },
  { id: 'temperature', label: 'Température de surface', group: 'Climat', icon: ThermometerSun, color: '#dd8151' },
  { id: 'moisture', label: 'Humidité du sol', group: 'Eau', icon: Droplets, color: '#3d9b9c' },
  { id: 'stress', label: 'Stress hydrique', group: 'Eau', icon: Droplets, color: '#dd8950' },
  { id: 'ndvi', label: 'Vigueur de la végétation · NDVI', group: 'Végétation', icon: Sprout, color: '#4c9b50' },
  { id: 'evi', label: 'Indice EVI', group: 'Végétation', icon: Sprout, color: '#84ab48' },
  { id: 'soil', label: 'Texture du sol', group: 'Sol', icon: Layers2, color: '#a7835d' },
]

const acquisitions: Acquisition[] = [
  { id: 'dec20', date: '20 déc. 2024', short: '20 déc.', value: 0.49, valid: true },
  { id: 'jan05', date: '05 janv. 2025', short: '05 janv.', value: 0.53, valid: true },
  { id: 'jan20', date: '20 janv. 2025', short: '20 janv.', value: 0.57, valid: true },
  { id: 'jan30', date: '30 janv. 2025', short: '30 janv.', value: 0.58, valid: false },
  { id: 'feb05', date: '05 févr. 2025', short: '05 févr.', value: 0.59, valid: true },
  { id: 'feb10', date: '10 févr. 2025', short: '10 févr.', value: 0.58, valid: false },
  { id: 'feb20', date: '20 févr. 2025', short: '20 févr.', value: 0.60, valid: true },
  { id: 'mar01', date: '01 mars 2025', short: '01 mars', value: 0.61, valid: true },
  { id: 'mar10', date: '10 mars 2025', short: '10 mars', value: 0.61, valid: true },
  { id: 'mar20', date: '20 mars 2025', short: '20 mars', value: 0.62, valid: true },
  { id: 'mar25', date: '25 mars 2025', short: '25 mars', value: 0.63, valid: true },
  { id: 'apr05', date: '05 avr. 2025', short: '05 avr.', value: 0.64, valid: true },
]

const parcels: Parcel[] = [
  { id: 'P-03', name: 'La Grande Pièce', crop: 'Maïs', area: '7,4 ha' },
  { id: 'P-04', name: 'Les Chênes', crop: 'Blé tendre', area: '5,8 ha' },
  { id: 'P-07', name: 'Le Haut Champ', crop: 'Couvert', area: '4,2 ha' },
]

const parcelPolygons: Record<string, string> = {
  'P-03': '345,245 507,185 618,226 610,370 465,422 352,373',
  'P-04': '608,144 771,171 815,298 619,363 616,225',
  'P-07': '202,383 351,374 464,425 420,564 236,531 170,454',
}

const rangeCount: Record<string, number> = { '3 mois': 6, '6 mois': 9, '1 an': 12 }

export function AtlasPage() {
  const [selectedParcelId, setSelectedParcelId] = useState('P-03')
  const [activeLayers, setActiveLayers] = useState<string[]>(['ndvi'])
  const [expandedGroups, setExpandedGroups] = useState(['Végétation'])
  const [layerTab, setLayerTab] = useState<'layers' | 'legend'>('layers')
  const [mapBase, setMapBase] = useState<'satellite' | 'relief'>('satellite')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [selectedDateId, setSelectedDateId] = useState('mar20')
  const [range, setRange] = useState('3 mois')
  const [query, setQuery] = useState('')
  const [searchMessage, setSearchMessage] = useState('')
  const mapStageRef = useRef<HTMLDivElement>(null)
  const selectedParcel = parcels.find(parcel => parcel.id === selectedParcelId) ?? parcels[0]
  const selectedDate = acquisitions.find(date => date.id === selectedDateId) ?? acquisitions[9]
  const visibleDates = useMemo(() => acquisitions.slice(-rangeCount[range]), [range])
  const groups = ['Climat', 'Eau', 'Végétation', 'Sol']
  const parcelNdviOffset = selectedParcelId === 'P-04' ? .06 : selectedParcelId === 'P-07' ? -.04 : 0
  const selectedValue = Math.max(.1, Math.min(.9, selectedDate.value + parcelNdviOffset))
  const dragStart = useRef({ pointerX: 0, pointerY: 0, panX: 0, panY: 0 })
  const activeLayer = activeLayers.length ? layers.find(layer => layer.id === activeLayers[activeLayers.length - 1]) : undefined

  const beginPan = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, input, a, svg, .atlas-float-panel, .atlas-map-controls, .atlas-map-toolbar')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStart.current = { pointerX: event.clientX, pointerY: event.clientY, panX: pan.x, panY: pan.y }
    setDragging(true)
  }
  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    const bounds = mapStageRef.current?.getBoundingClientRect()
    if (!bounds) return
    const maxX = Math.max(0, (bounds.width * 1.06 * zoom - bounds.width) / 2)
    const maxY = Math.max(0, (bounds.height * 1.06 * zoom - bounds.height) / 2)
    setPan({
      x: Math.max(-maxX, Math.min(maxX, dragStart.current.panX + event.clientX - dragStart.current.pointerX)),
      y: Math.max(-maxY, Math.min(maxY, dragStart.current.panY + event.clientY - dragStart.current.pointerY)),
    })
  }
  const selectParcel = (id: string) => { setSelectedParcelId(id); setQuery(id); setSearchMessage('') }

  const toggleLayer = (id: string) => setActiveLayers(current => current.includes(id) ? current.filter(layer => layer !== id) : [...current, id])
  const toggleGroup = (group: string) => setExpandedGroups(current => current.includes(group) ? current.filter(value => value !== group) : [...current, group])
  const moveDate = (direction: -1 | 1) => {
    const dates = visibleDates
    const index = dates.findIndex(date => date.id === selectedDateId)
    const next = Math.min(dates.length - 1, Math.max(0, index + direction))
    setSelectedDateId(dates[next].id)
  }
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = query.trim().toLocaleLowerCase('fr')
    if (!normalized) { setSearchMessage('Saisissez un identifiant ou un nom de parcelle.'); return }
    const parcel = parcels.find(item => item.id.toLocaleLowerCase('fr') === normalized || item.name.toLocaleLowerCase('fr').includes(normalized))
    if (parcel) {
      selectParcel(parcel.id)
    } else {
      setSearchMessage('Aucune parcelle de démonstration ne correspond à cette recherche.')
    }
  }

  return (
    <section className="atlas-page" aria-label="Atlas des parcelles">
      <header className="atlas-heading">
        <div className="atlas-title"><h1>Atlas</h1><span className="atlas-title-divider" /><p>Cartographie, imagerie et indicateurs de vos parcelles</p></div>
        <form className="atlas-search" onSubmit={submitSearch} role="search">
          <Search size={17} aria-hidden="true" /><input aria-label="Rechercher une parcelle" value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher une parcelle" />
          {query && <button type="button" aria-label="Effacer la recherche" onClick={() => { setQuery(''); setSearchMessage('') }}>×</button>}
        </form>
      </header>

      <div ref={mapStageRef} className={`atlas-map-stage ${mapBase === 'relief' ? 'atlas-relief' : ''} ${dragging ? 'is-dragging' : ''}`} onPointerDown={beginPan} onPointerMove={movePan} onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)}>
        <div className="atlas-map-world" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          <img src="/images/landing-fields.png" alt="Image satellite de démonstration pour le fond de carte" draggable={false} />
          {activeLayers.map(layerId => <div key={layerId} className={`atlas-layer-overlay overlay-${layerId}`} aria-hidden="true" />)}
          <svg className="atlas-parcel-shapes" viewBox="0 0 1000 700" role="group" aria-label="Parcelles de démonstration">
            {parcels.map(parcel => <g key={parcel.id} onClick={() => selectParcel(parcel.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectParcel(parcel.id) } }} tabIndex={0} role="button" aria-label={`Sélectionner la parcelle ${parcel.id}, ${parcel.area}`} className={`atlas-parcel-shape ${parcel.id === selectedParcelId ? 'is-selected' : ''}`}><polygon points={parcelPolygons[parcel.id]} /><text x={parcel.id === 'P-03' ? 485 : parcel.id === 'P-04' ? 700 : 286} y={parcel.id === 'P-03' ? 327 : parcel.id === 'P-04' ? 250 : 479}>{parcel.id}<tspan x={parcel.id === 'P-03' ? 485 : parcel.id === 'P-04' ? 700 : 286} dy="16">{parcel.area}</tspan></text></g>)}
          </svg>
        </div>

        <div className="atlas-map-toolbar">
          <div className="atlas-base-switch" role="group" aria-label="Fond de carte">
            <button type="button" className={mapBase === 'satellite' ? 'is-active' : ''} onClick={() => setMapBase('satellite')}>Satellite</button>
            <button type="button" className={mapBase === 'relief' ? 'is-active' : ''} onClick={() => setMapBase('relief')}>Relief</button>
          </div>
          <span className="atlas-global-label"><LocateFixed size={15} /> Vue locale</span>
        </div>
        <div className="atlas-map-controls"><button type="button" aria-label="Agrandir la carte" onClick={() => setZoom(value => Math.min(1.7, +(value + .15).toFixed(2)))}><Plus size={16} /></button><button type="button" aria-label="Réduire la carte" onClick={() => setZoom(value => Math.max(.95, +(value - .15).toFixed(2)))}><Minus size={16} /></button><button type="button" aria-label="Recentrer la carte" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}><LocateFixed size={15} /></button></div>
        <div className="atlas-map-scale"><span />500 m</div>
        <div className="atlas-map-footnote">Fond visuel non géoréférencé · couches illustratives</div>

        <aside className="atlas-float-panel atlas-layers-panel" aria-label="Couches de l’Atlas">
          <header className="atlas-panel-header"><div><Layers2 size={19} /><div><h2>Couches</h2><p>Choisissez ce que vous souhaitez explorer</p></div></div><span className="atlas-layer-count">{activeLayers.length}</span></header>
          <div className="atlas-panel-tabs" role="tablist" aria-label="Vue des couches"><button type="button" role="tab" aria-selected={layerTab === 'layers'} className={layerTab === 'layers' ? 'is-active' : ''} onClick={() => setLayerTab('layers')}>Couches</button><button type="button" role="tab" aria-selected={layerTab === 'legend'} className={layerTab === 'legend' ? 'is-active' : ''} onClick={() => setLayerTab('legend')}>Légende</button></div>
          {layerTab === 'layers' ? <div className="atlas-layer-groups">{groups.map(group => {
            const groupLayers = layers.filter(layer => layer.group === group)
            const GroupIcon = groupLayers[0].icon
            const expanded = expandedGroups.includes(group)
            return <section className="atlas-layer-group" key={group}><button type="button" className="atlas-group-toggle" aria-expanded={expanded} onClick={() => toggleGroup(group)}><GroupIcon size={16} /><strong>{group}</strong><ChevronDown size={14} className={expanded ? '' : 'is-collapsed'} /></button>{expanded && <div className="atlas-layer-options">{groupLayers.map(layer => <label key={layer.id} className={`atlas-layer-option ${activeLayers.includes(layer.id) ? 'is-active' : ''}`}><input type="checkbox" checked={activeLayers.includes(layer.id)} onChange={() => toggleLayer(layer.id)} /><span className="atlas-layer-swatch" style={{ '--layer-color': layer.color } as CSSProperties} /><span>{layer.label}</span></label>)}</div>}</section>
          })}</div> : <div className="atlas-legend-view"><strong>{activeLayers.length ? layers.filter(layer => activeLayers.includes(layer.id)).map(layer => layer.label).join(' · ') : 'Aucune couche active'}</strong><span>Intensité faible</span><div className={`atlas-legend-ramp ${activeLayers.length ? `legend-${activeLayers[activeLayers.length - 1]}` : ''}`} /><div className="atlas-legend-values"><span>Bas</span><span>Modéré</span><span>Élevé</span></div><p>Échelle indicative des valeurs de démonstration.</p></div>}
          <div className="atlas-panel-source"><span className="source-mini-mark">FN</span><span><strong>Jeu de données exemple</strong><small>Aucune source satellite connectée</small></span></div>
        </aside>

        <aside className="atlas-float-panel atlas-selection-panel" aria-label="Informations de la parcelle sélectionnée">
          <header className="atlas-selection-heading"><div><span className="atlas-polygon-icon" /><div><h2>Parcelle sélectionnée</h2><p>{selectedParcel.id} · {selectedParcel.area} · {selectedParcel.crop}</p></div></div><button type="button" aria-label="Parcelle précédente" onClick={() => selectParcel(parcels[(parcels.findIndex(parcel => parcel.id === selectedParcelId) + parcels.length - 1) % parcels.length].id)}><ArrowLeft size={15} /></button><button type="button" aria-label="Parcelle suivante" onClick={() => selectParcel(parcels[(parcels.findIndex(parcel => parcel.id === selectedParcelId) + 1) % parcels.length].id)}><ArrowRight size={15} /></button></header>
          <div className="atlas-acquisition-row"><span className="atlas-small-icon"><CalendarDays size={16} /></span><span><small>Date de l’image</small><strong>{selectedDate.date}</strong></span><div className="atlas-date-arrows"><button type="button" aria-label="Acquisition précédente" onClick={() => moveDate(-1)}><ArrowLeft size={14} /></button><button type="button" aria-label="Acquisition suivante" onClick={() => moveDate(1)}><ArrowRight size={14} /></button></div></div>
          {searchMessage && <p className="atlas-search-message" role="status">{searchMessage}</p>}
          <div className="atlas-source-row"><span className="atlas-source-logo"><Layers2 size={17} /></span><span><small>Provenance de cette vue</small><strong>Données de démonstration locales</strong><small>Les produits NASA ne sont pas raccordés.</small></span></div>
          <div className="atlas-stats-row"><div><small>NDVI illustratif</small><strong>{selectedDate.value.toFixed(2).replace('.', ',')}</strong></div><span className="atlas-ndvi-state"><Check size={12} /> Couche active</span></div>
          <div className="atlas-chart-heading"><strong>Évolution du NDVI</strong><span>3 derniers mois · exemple</span></div>
          <AtlasChart selectedDate={selectedDate.date} selectedValue={selectedValue} parcelId={selectedParcelId} />
          <Link to="/app/data-trust" className="atlas-provenance-link">Comprendre la provenance <ChevronRight size={14} /></Link>
        </aside>

        <div className="atlas-map-selected-label"><span><LocateFixed size={15} /></span><strong>{selectedParcel.id}</strong><small>{selectedParcel.area}</small></div>
        {activeLayer && <div className={`atlas-map-legend-mini legend-${activeLayer.id}`}><strong>{activeLayer.label}</strong><span>Bas</span><i /><span>Élevé</span></div>}
      </div>

      <section className="atlas-timeline" aria-label="Chronologie des acquisitions">
        <div className="atlas-timeline-heading"><div><span className="timeline-icon"><CalendarDays size={17} /></span><span><strong>Chronologie des acquisitions</strong><small>Images de démonstration · parcelle {selectedParcel.id}</small></span></div><div className="timeline-ranges" role="group" aria-label="Période à afficher">{Object.keys(rangeCount).map(option => <button key={option} type="button" className={range === option ? 'is-active' : ''} onClick={() => { setRange(option); if (!acquisitions.slice(-rangeCount[option]).some(date => date.id === selectedDateId)) setSelectedDateId(acquisitions.slice(-rangeCount[option])[rangeCount[option] - 1].id) }}>{option}</button>)}</div><div className="timeline-legend"><span><i className="timeline-valid" /> Image exemple</span><span><i className="timeline-missing" /> Date sans image</span></div></div>
        <div className="timeline-scroll"><div className="timeline-track">{visibleDates.map((date, index) => <button type="button" key={date.id} className={`timeline-date ${date.id === selectedDateId ? 'is-selected' : ''} ${date.valid ? 'is-valid' : 'is-missing'}`} onClick={() => setSelectedDateId(date.id)} aria-current={date.id === selectedDateId ? 'date' : undefined}><span className="timeline-dot" /><span className="timeline-date-label">{date.short}</span><span className="timeline-date-value">NDVI {Math.max(.1, Math.min(.9, date.value + parcelNdviOffset)).toFixed(2).replace('.', ',')}</span>{index < visibleDates.length - 1 && <i className={`timeline-connector ${!date.valid ? 'has-gap' : ''}`} />}</button>)}</div></div>
      </section>
    </section>
  )
}
