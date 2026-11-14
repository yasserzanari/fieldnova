import { useRef, useState, type PointerEvent } from 'react'
import { ArrowDownRight, ArrowUpRight, CloudRain, Droplets, Layers2, LocateFixed, Minus, Plus, Sprout, ThermometerSun } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ClimateChart } from './ClimateChart'
import './overview.css'

type Parcel = { id: string; name: string; crop: string; area: string; moisture: string; risk: 'Bas' | 'Modéré'; soil: { clay: number; silt: number; sand: number; storage: number } }

const parcels: Parcel[] = [
  { id: 'P-03', name: 'La Grande Pièce', crop: 'Maïs', area: '7,4 ha', moisture: '31 %', risk: 'Modéré', soil: { clay: 28, silt: 46, sand: 26, storage: 130 } },
  { id: 'P-04', name: 'Les Chênes', crop: 'Blé', area: '5,8 ha', moisture: '38 %', risk: 'Bas', soil: { clay: 22, silt: 49, sand: 29, storage: 117 } },
  { id: 'P-07', name: 'Le Haut Champ', crop: 'Couvert', area: '4,2 ha', moisture: '35 %', risk: 'Bas', soil: { clay: 31, silt: 42, sand: 27, storage: 145 } },
]

const steps = [
  { id: 'semis', date: '12 avr.', name: 'Semis du maïs', status: 'Terminé' },
  { id: 'suivi', date: '19 mai', name: 'Contrôle de levée', status: 'Terminé' },
  { id: 'irrigation', date: '08 août', name: 'Point irrigation', status: 'À vérifier' },
]

const polygonPoints: Record<string, string> = {
  'P-03': '324,248 493,185 601,228 596,376 449,425 334,375',
  'P-04': '590,146 765,172 806,301 602,365 600,228',
  'P-07': '180,385 332,376 448,428 401,564 215,531 150,455',
}

export function OverviewPage() {
  const [selectedId, setSelectedId] = useState('P-03')
  const [mapMode, setMapMode] = useState<'satellite' | 'water'>('satellite')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [selectedStep, setSelectedStep] = useState('irrigation')
  const dragStart = useRef({ pointerX: 0, pointerY: 0, panX: 0, panY: 0 })
  const selectedParcel = parcels.find(parcel => parcel.id === selectedId) ?? parcels[0]

  const beginPan = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('.overview-panel, .map-control, .map-mode-switch')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStart.current = { pointerX: event.clientX, pointerY: event.clientY, panX: pan.x, panY: pan.y }
    setDragging(true)
  }
  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    setPan({ x: dragStart.current.panX + event.clientX - dragStart.current.pointerX, y: dragStart.current.panY + event.clientY - dragStart.current.pointerY })
  }
  const stopPan = () => setDragging(false)

  return (
    <section className="overview-page" aria-label="Vue d’ensemble de l’exploitation">
      <header className="overview-heading">
        <div>
          <h1>Vue d’ensemble</h1>
          <p>La situation de vos parcelles, du climat à la prochaine intervention.</p>
        </div>
        <div className="overview-context">
          <span className="overview-context-farm">Ferme des Chênes <span>·</span> Saison maïs 2025</span>
        </div>
      </header>

      <div className={`overview-map-stage ${dragging ? 'is-dragging' : ''} ${mapMode === 'water' ? 'map-mode-water' : ''}`} onPointerDown={beginPan} onPointerMove={movePan} onPointerUp={stopPan} onPointerCancel={stopPan}>
        <div className="overview-map-world" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          <img className="overview-map-image" src="/images/landing-fields.png" alt="Vue satellite illustrative des parcelles agricoles" draggable={false} />
          {mapMode === 'water' && <div className="map-water-overlay" aria-hidden="true" />}
          <svg className="overview-parcel-map" viewBox="0 0 1000 700" role="group" aria-label="Parcelles agricoles de démonstration">
            {parcels.map(parcel => (
              <g key={parcel.id} className={`parcel-shape ${selectedId === parcel.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(parcel.id)} tabIndex={0} role="button" aria-label={`Sélectionner ${parcel.id}, ${parcel.name}, ${parcel.area}`} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(parcel.id) } }}>
                <polygon points={polygonPoints[parcel.id]} />
                <text x={parcel.id === 'P-03' ? 455 : parcel.id === 'P-04' ? 690 : 280} y={parcel.id === 'P-03' ? 322 : parcel.id === 'P-04' ? 250 : 476}>{parcel.id}</text>
              </g>
            ))}
          </svg>
        </div>

        <div className="overview-map-topline">
          <span className="map-location"><LocateFixed size={15} /> Ferme des Chênes <span>·</span> France</span>
          <div className="map-mode-switch" role="group" aria-label="Couche de carte">
            <button type="button" className={mapMode === 'satellite' ? 'is-active' : ''} onClick={() => setMapMode('satellite')}><Layers2 size={14} /> Satellite</button>
            <button type="button" className={mapMode === 'water' ? 'is-active' : ''} onClick={() => setMapMode('water')}><Droplets size={14} /> Déficit hydrique</button>
          </div>
        </div>
        <div className="overview-map-controls" role="group" aria-label="Contrôles de la carte">
          <button className="map-control" type="button" aria-label="Zoomer" onClick={() => setZoom(value => Math.min(1.7, +(value + 0.15).toFixed(2)))}><Plus size={17} /></button>
          <button className="map-control" type="button" aria-label="Dézoomer" onClick={() => setZoom(value => Math.max(.85, +(value - 0.15).toFixed(2)))}><Minus size={17} /></button>
          <button className="map-control" type="button" aria-label="Recentrer la carte" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}><LocateFixed size={16} /></button>
        </div>
        <div className="overview-map-scale"><span /><span>100 m</span></div>
        <div className="overview-map-disclaimer">Fond satellite et parcelles illustratifs</div>

        <aside className="overview-panel overview-parcels-panel" aria-label="Parcelles">
          <header className="overview-panel-heading"><div><h2>Mes parcelles</h2><p>42 ha exploitation · 3 parcelles</p></div><span className="panel-icon"><Sprout size={17} /></span></header>
          <div className="parcel-list">
            {parcels.map(parcel => (
              <button key={parcel.id} type="button" className={`parcel-row ${parcel.id === selectedId ? 'is-active' : ''}`} onClick={() => setSelectedId(parcel.id)}>
                <span className="parcel-row-color" />
                <span className="parcel-row-main"><strong>{parcel.name}</strong><small>{parcel.id} · {parcel.crop} · {parcel.area}</small></span>
                <span className={`parcel-risk risk-${parcel.risk.toLowerCase()}`}>{parcel.risk}</span>
              </button>
            ))}
          </div>
          <div className="selected-parcel-summary">
            <div><span>Humidité estimée</span><strong>{selectedParcel.moisture}</strong></div>
            <div><span>Stress hydrique</span><strong>{selectedParcel.risk === 'Bas' ? 'Faible' : 'À surveiller'}</strong></div>
          </div>
          <Link to="/app/atlas" className="overview-panel-link">Ouvrir l’Atlas <ArrowUpRight size={15} /></Link>
        </aside>

        <aside className="overview-panel overview-climate-panel" aria-label="Climat et tendance des pluies">
          <header className="overview-panel-heading"><div><h2>Climat & eau</h2><p>Indicateurs de la saison</p></div><span className="panel-icon climate-icon"><CloudRain size={18} /></span></header>
          <div className="climate-indicators">
            <div className="climate-indicator"><span className="climate-symbol rain-symbol"><CloudRain size={17} /></span><span><small>Pluie · 7 prochains jours</small><strong>12 mm</strong></span><span className="indicator-delta"><ArrowDownRight size={13} /> −22 %</span></div>
            <div className="climate-indicator"><span className="climate-symbol temp-symbol"><ThermometerSun size={17} /></span><span><small>Température moyenne</small><strong>18,6 °C</strong></span><span className="indicator-delta delta-warm"><ArrowUpRight size={13} /> +0,7 °C</span></div>
          </div>
          <div className="overview-rain-title"><span>Pluie mensuelle</span><span>mm</span></div>
          <ClimateChart />
          <button className="overview-risk-action" type="button" onClick={() => setMapMode(value => value === 'water' ? 'satellite' : 'water')}>
            <span className="risk-action-icon"><Droplets size={17} /></span><span><strong>{mapMode === 'water' ? 'Masquer la couche hydrique' : 'Voir le déficit hydrique'}</strong><small>P-03 : réserve à surveiller</small></span><ArrowUpRight size={16} />
          </button>
        </aside>

        <div className="overview-map-center-label" aria-live="polite"><span className="map-pin"><LocateFixed size={16} /></span><span><strong>{selectedParcel.id} · {selectedParcel.name}</strong><small>{selectedParcel.area} · {selectedParcel.crop} 2025</small></span></div>
      </div>

      <div className="overview-bottom-grid">
        <section className="overview-bottom-panel soil-panel" aria-labelledby="soil-title">
          <header className="overview-bottom-heading"><div><span className="bottom-icon soil-icon"><Layers2 size={16} /></span><div><h2 id="soil-title">Composition du sol · {selectedParcel.id}</h2><p>Profil indicatif de la parcelle sélectionnée</p></div></div><span className="data-quality">Profil de démonstration</span></header>
          <div className="soil-content">
            <div className="soil-layer-visual" role="img" aria-label={`Composition illustrative : ${selectedParcel.soil.clay} pour cent argile, ${selectedParcel.soil.silt} pour cent limon, ${selectedParcel.soil.sand} pour cent sable`}><span className="soil-layer-clay" style={{ width: `${selectedParcel.soil.clay}%` }} /><span className="soil-layer-silt" style={{ width: `${selectedParcel.soil.silt}%` }} /><span className="soil-layer-sand" style={{ width: `${selectedParcel.soil.sand}%` }} /></div>
            <div className="soil-composition"><div><i className="soil-clay" /><span>Argile</span><strong>{selectedParcel.soil.clay} %</strong></div><div><i className="soil-silt" /><span>Limon</span><strong>{selectedParcel.soil.silt} %</strong></div><div><i className="soil-sand" /><span>Sable</span><strong>{selectedParcel.soil.sand} %</strong></div></div>
            <div className="soil-note"><Droplets size={16} /><span><small>Réserve utile indicative</small><strong>{selectedParcel.soil.storage} mm</strong></span></div>
          </div>
        </section>

        <section className="overview-bottom-panel calendar-panel" aria-labelledby="calendar-title">
          <header className="overview-bottom-heading"><div><span className="bottom-icon calendar-icon"><Sprout size={16} /></span><div><h2 id="calendar-title">Calendrier cultural · Maïs 2025</h2><p>Les étapes restent modifiables à tout moment.</p></div></div><span className="next-step">Prochaine étape · 08 août</span></header>
          <div className="calendar-steps" role="group" aria-label="Étapes du calendrier cultural">
            {steps.map(step => <button key={step.id} type="button" onClick={() => setSelectedStep(step.id)} className={`calendar-step ${selectedStep === step.id ? 'is-selected' : ''} ${step.status === 'Terminé' ? 'is-complete' : ''}`}><span className="step-date">{step.date}</span><strong>{step.name}</strong><small>{selectedStep === step.id ? 'Étape sélectionnée' : step.status}</small></button>)}
          </div>
        </section>
      </div>
    </section>
  )
}
