import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, Layers3, Leaf, LocateFixed, MapPinned, Minus, Plus, Search, Sprout } from 'lucide-react'
import { Link } from 'react-router-dom'
import './terrain.css'

type Parcel = { id: string; name: string; crop: string; area: string; clay: number; silt: number; sand: number; storage: number; ph: string; organic: string }

const parcels: Parcel[] = [
  { id: 'P-03', name: 'La Grande Pièce', crop: 'Maïs', area: '7,4 ha', clay: 28, silt: 46, sand: 26, storage: 130, ph: '6,4', organic: '2,3 %' },
  { id: 'P-04', name: 'Les Chênes', crop: 'Blé tendre', area: '5,8 ha', clay: 22, silt: 49, sand: 29, storage: 117, ph: '6,8', organic: '1,9 %' },
  { id: 'P-07', name: 'Le Haut Champ', crop: 'Couvert', area: '4,2 ha', clay: 31, silt: 42, sand: 27, storage: 145, ph: '6,1', organic: '2,6 %' },
]

const rotationByParcel: Record<string, Array<{ year: number; crop: string; icon: string }>> = {
  'P-03': [{ year: 2021, crop: 'Blé d’hiver', icon: '🌾' }, { year: 2022, crop: 'Colza', icon: '🌼' }, { year: 2023, crop: 'Tournesol', icon: '🌻' }, { year: 2024, crop: 'Couvert', icon: '🌱' }, { year: 2025, crop: 'Maïs grain', icon: '🌽' }],
  'P-04': [{ year: 2021, crop: 'Maïs grain', icon: '🌽' }, { year: 2022, crop: 'Blé d’hiver', icon: '🌾' }, { year: 2023, crop: 'Couvert', icon: '🌱' }, { year: 2024, crop: 'Colza', icon: '🌼' }, { year: 2025, crop: 'Blé tendre', icon: '🌾' }],
  'P-07': [{ year: 2021, crop: 'Blé d’hiver', icon: '🌾' }, { year: 2022, crop: 'Tournesol', icon: '🌻' }, { year: 2023, crop: 'Maïs grain', icon: '🌽' }, { year: 2024, crop: 'Blé d’hiver', icon: '🌾' }, { year: 2025, crop: 'Couvert', icon: '🌱' }],
}

const parcelShapes: Record<string, string> = {
  'P-03': '300,267 477,199 610,235 602,383 448,432 321,378',
  'P-04': '594,152 764,173 814,298 606,371 610,236',
  'P-07': '176,390 320,380 449,434 401,568 221,533 151,459',
}
const plannedOptions = ['Maïs grain', 'Couvert végétal', 'Blé tendre', 'Tournesol', 'Colza']

export function TerrainPage() {
  const [parcelId, setParcelId] = useState('P-03')
  const [sample, setSample] = useState(1)
  const [search, setSearch] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [showHistory, setShowHistory] = useState(true)
  const [plannedCrop, setPlannedCrop] = useState('Couvert végétal')
  const [showCropSelect, setShowCropSelect] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const selectedParcel = parcels.find(parcel => parcel.id === parcelId) ?? parcels[0]
  const sampleSoil = {
    clay: selectedParcel.clay + (sample === 2 ? 2 : 0),
    silt: selectedParcel.silt,
    sand: selectedParcel.sand - (sample === 2 ? 2 : 0),
    storage: selectedParcel.storage + (sample === 2 ? 6 : 0),
    ph: (Number(selectedParcel.ph.replace(',', '.')) + (sample === 2 ? .2 : 0)).toFixed(1).replace('.', ','),
    organic: (Number(selectedParcel.organic.replace(' %', '').replace(',', '.')) + (sample === 2 ? .2 : 0)).toFixed(1).replace('.', ',') + ' %',
  }
  const rotation = rotationByParcel[parcelId]
  const filteredParcels = useMemo(() => {
    const value = search.trim().toLocaleLowerCase('fr')
    return parcels.filter(parcel => !value || `${parcel.id} ${parcel.name} ${parcel.crop}`.toLocaleLowerCase('fr').includes(value))
  }, [search])

  const selectParcel = (id: string) => { setParcelId(id); setSample(1) }
  const beginPan = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, a, select, [role="button"], .terrain-panel')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }
    setDragging(true)
  }
  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging || !mapRef.current) return
    const bounds = mapRef.current.getBoundingClientRect()
    const limitX = Math.max(0, (bounds.width * 1.06 * zoom - bounds.width) / 2)
    const limitY = Math.max(0, (bounds.height * 1.06 * zoom - bounds.height) / 2)
    setPan({ x: Math.max(-limitX, Math.min(limitX, dragStart.current.panX + event.clientX - dragStart.current.x)), y: Math.max(-limitY, Math.min(limitY, dragStart.current.panY + event.clientY - dragStart.current.y)) })
  }
  const moveSample = (direction: -1 | 1) => setSample(value => value === 1 ? (direction > 0 ? 2 : 2) : 1)

  return (
    <section className="terrain-page" aria-label="Parcelles, sols et rotation culturale">
      <header className="terrain-heading"><div><h1>Mon terrain</h1><p>Parcelles, profils de sol et historique cultural.</p></div><span className="terrain-farm-context"><Sprout size={16} /> Ferme des Chênes <ChevronRight size={14} /> 42 ha</span></header>

      <div ref={mapRef} className={`terrain-map-stage ${dragging ? 'is-dragging' : ''}`} onPointerDown={beginPan} onPointerMove={movePan} onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)}>
        <div className="terrain-map-world" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          <img src="/images/landing-fields.png" alt="Fond de carte agricole de démonstration" draggable={false} />
          <svg className="terrain-parcel-shapes" viewBox="0 0 1000 700" role="group" aria-label="Parcelles de la ferme">
            {parcels.map(parcel => <g key={parcel.id} className={`terrain-parcel ${parcel.id === parcelId ? 'is-active' : ''}`} role="button" tabIndex={0} aria-label={`Sélectionner ${parcel.id} · ${parcel.name} · ${parcel.area}`} onClick={() => selectParcel(parcel.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectParcel(parcel.id) } }}><polygon points={parcelShapes[parcel.id]} />{parcel.id !== parcelId && <text x={parcel.id === 'P-04' ? 701 : 280} y={parcel.id === 'P-04' ? 250 : 488}>{parcel.id}</text>}</g>)}
          </svg>
          <span className="terrain-sample-marker marker-one" role="button" tabIndex={0} aria-label="Sélectionner l’échantillon S1" onClick={() => setSample(1)} onKeyDown={event => { if (event.key === 'Enter') setSample(1) }}><i /><strong>S1</strong></span>
          <span className="terrain-sample-marker marker-two" role="button" tabIndex={0} aria-label="Sélectionner l’échantillon S2" onClick={() => setSample(2)} onKeyDown={event => { if (event.key === 'Enter') setSample(2) }}><i /><strong>S2</strong></span>
        </div>
        <div className="terrain-map-caption"><MapPinned size={15} /> Ferme des Chênes <span>·</span> {selectedParcel.id} · {selectedParcel.area}</div>
        <div className="terrain-map-controls"><button type="button" aria-label="Zoomer" onClick={() => setZoom(value => Math.min(1.65, +(value + .15).toFixed(2)))}><Plus size={16} /></button><button type="button" aria-label="Dézoomer" onClick={() => setZoom(value => Math.max(.95, +(value - .15).toFixed(2)))}><Minus size={16} /></button><button type="button" aria-label="Recentrer la carte" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}><LocateFixed size={15} /></button></div>
        <div className="terrain-scale"><span />200 m</div>

        <aside className="terrain-panel terrain-parcels-panel" aria-label="Liste de parcelles et historique de rotation">
          <header className="terrain-panel-heading"><div><span className="terrain-heading-icon"><Sprout size={18} /></span><span><h2>Ferme des Chênes</h2><small>42 ha · 3 parcelles</small></span></div><span className="terrain-data-tag">Exemple</span></header>
          <label className="terrain-search"><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher une parcelle" aria-label="Rechercher une parcelle" />{search && <button type="button" aria-label="Effacer la recherche" onClick={() => setSearch('')}>×</button>}</label>
          <div className="terrain-parcel-list" role="listbox" aria-label="Parcelles de l’exploitation">{filteredParcels.length ? filteredParcels.map(parcel => <button type="button" role="option" aria-selected={parcel.id === parcelId} key={parcel.id} className={`terrain-parcel-row ${parcel.id === parcelId ? 'is-active' : ''}`} onClick={() => selectParcel(parcel.id)}><span className="terrain-parcel-marker" /><span><strong>{parcel.id} · {parcel.name}</strong><small>{parcel.crop}</small></span><b>{parcel.area}</b></button>) : <p className="terrain-empty-search">Aucune parcelle trouvée.</p>}</div>
          <div className="terrain-rotation-heading"><button type="button" aria-expanded={showHistory} onClick={() => setShowHistory(value => !value)}><Layers3 size={16} /><strong>Historique de rotation</strong><ChevronRight size={15} className={showHistory ? 'is-open' : ''} /></button><span>{selectedParcel.id}</span></div>
          {showHistory && <div className="terrain-history-list">{rotation.slice().reverse().map(item => <div key={item.year} className={`terrain-history-row ${item.year === 2025 ? 'is-current' : ''}`}><strong>{item.year}</strong><span>{item.icon}</span><span>{item.crop}</span>{item.year === 2025 && <Check size={13} />}</div>)}</div>}
          <Link to="/app/atlas" className="terrain-atlas-link">Voir les couches dans l’Atlas <ChevronRight size={14} /></Link>
        </aside>

        <aside className="terrain-panel terrain-soil-panel" aria-label="Profil du sol sélectionné">
          <header className="terrain-soil-heading"><div><span className="soil-header-icon"><Layers3 size={18} /></span><span><h2>Profil de sol · {selectedParcel.id}</h2><small>Échantillon S{sample} · {sample === 1 ? '12 mars' : '18 mars'} 2025</small></span></div><div className="sample-switch"><button type="button" aria-label="Échantillon précédent" onClick={() => moveSample(-1)}><ArrowLeft size={14} /></button><button type="button" aria-label="Échantillon suivant" onClick={() => moveSample(1)}><ArrowRight size={14} /></button></div></header>
          <div className="terrain-profile-body">
            <div className="terrain-depth-axis"><span>Profondeur<br />(cm)</span>{[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(depth => <div key={depth} className={`depth-tick tick-${depth}`}><i /><b>{depth}</b></div>)}</div>
            <div className="soil-core" role="img" aria-label="Coupe verticale illustrative du sol, de la surface à 100 centimètres"><div className="soil-grass"><Leaf size={16} /><Leaf size={13} /><Leaf size={17} /></div><div className="soil-horizon horizon-top"><svg viewBox="0 0 120 105" aria-hidden="true"><path d="M38 0C38 17 27 27 21 40M51 0C53 17 58 24 50 45M68 0C66 20 78 29 85 51M83 0C90 12 93 22 103 37M28 26L13 35M50 26L38 38M61 27L69 39M86 27L98 36" /></svg></div><div className="soil-horizon horizon-mid" /><div className="soil-horizon horizon-deep" /><div className="soil-depth-mark mark-30" /><div className="soil-depth-mark mark-70" /></div>
            <div className="terrain-depth-labels"><div className="depth-label depth-label-top"><span><strong>Ap · 0–30 cm</strong><em className="source-measured">Mesure exemple</em></span><p>Horizon de surface · texture limono-argileuse.</p></div><div className="depth-label depth-label-mid"><span><strong>Bw · 30–70 cm</strong><em className="source-mapped">Estimation</em></span><p>Propriétés estimées par cartographie.</p></div><div className="depth-label depth-label-deep"><span><strong>70–100 cm</strong><em className="source-unknown">Inconnu</em></span><p>Pas d’information dans cet exemple.</p></div></div>
          </div>

          <div className="terrain-soil-values"><div className="soil-value-heading"><strong>Propriétés du sol</strong><small>Par profondeur</small></div><div className="soil-value-row"><span><i className="value-texture" />Texture · Argile / limon / sable</span><strong>{sampleSoil.clay} / {sampleSoil.silt} / {sampleSoil.sand} %</strong><small>0–30 cm</small></div><div className="soil-value-row"><span><i className="value-ph" />pH (eau)</span><strong>{sampleSoil.ph}</strong><small>0–30 cm</small></div><div className="soil-value-row"><span><i className="value-carbon" />Matière organique</span><strong>{sampleSoil.organic}</strong><small>0–30 cm</small></div><div className="soil-value-row"><span><i className="value-water" />Réserve utile estimée</span><strong>{sampleSoil.storage} mm</strong><small>0–100 cm</small></div></div>
          <div className="terrain-source-card"><header><Layers3 size={15} /><strong>Provenance & qualité</strong><Link to="/app/data-trust">Détails <ChevronRight size={13} /></Link></header><div><span className="source-measured">Mesure exemple</span><p>Valeurs de profil de démonstration · {selectedParcel.id} · S{sample}</p></div><div><span className="source-mapped">Estimation</span><p>Propriétés cartographiques simulées, non validées.</p></div><div><span className="source-unknown">Inconnu</span><p>Aucune donnée fournie sous 70 cm.</p></div></div>
        </aside>

        <div className="terrain-map-selected"><MapPinned size={15} /><span><strong>{selectedParcel.id} · {selectedParcel.name}</strong><small>{selectedParcel.area} · {selectedParcel.crop} 2025</small></span></div>
        <div className="terrain-map-legend"><span><i className="legend-measured" />Échantillon exemple</span><span><i className="legend-mapped" />Parcelle</span><span><i className="legend-unknown" />Non décrit</span></div>
      </div>

      <section className="terrain-rotation-panel" aria-label={`Rotation culturale de la parcelle ${selectedParcel.id}`}>
        <header><div><Sprout size={17} /><span><strong>Rotation culturale · {selectedParcel.id} ({selectedParcel.name})</strong><small>Historique de culture et prochaine planification</small></span></div><div className="terrain-plan-control">{showCropSelect ? <select aria-label="Choisir la prochaine culture" value={plannedCrop} onChange={event => setPlannedCrop(event.target.value)} onBlur={() => setShowCropSelect(false)} autoFocus>{plannedOptions.map(crop => <option key={crop}>{crop}</option>)}</select> : <button type="button" onClick={() => setShowCropSelect(true)}>Modifier la prochaine culture <ChevronRight size={13} /></button>}</div></header>
        <div className="terrain-rotation-track">{rotation.map(item => <div key={item.year} className={`rotation-year ${item.year === 2025 ? 'is-current' : ''}`}><span>{item.icon}</span><div><strong>{item.year}</strong><small>{item.crop}</small></div><ChevronRight size={15} /></div>)}<div className="rotation-planned"><span><CalendarDays size={18} /></span><div><small>Prochaine culture · planifiée</small><strong>2026 · {plannedCrop}</strong></div></div></div>
      </section>
    </section>
  )
}
