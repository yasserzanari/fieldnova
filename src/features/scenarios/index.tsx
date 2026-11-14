import { useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { Check, ChevronRight, Cloud, Droplets, Layers3, Leaf, LocateFixed, Minus, Plus, Shield, Sprout, Wind } from 'lucide-react'
import { Link } from 'react-router-dom'
import './scenarios.css'

type ScenarioId = 'S1' | 'S2' | 'S3'
type Priority = 'soil' | 'economy' | 'emissions' | 'resilience'

const scenarios: Array<{ id: ScenarioId; name: string; detail: string; tone: string; cropPlan: string[]; crops: string[] }> = [
  { id: 'S1', name: 'Référence', detail: 'Rotation actuelle conservée', tone: 'reference', cropPlan: ['Maïs grain', 'Blé d’hiver', 'Colza', 'Maïs grain'], crops: ['🌽', '🌾', '🌼', '🌽'] },
  { id: 'S2', name: 'Sol & Résilience', detail: 'Couverts · légumineuses', tone: 'soil', cropPlan: ['Blé tendre', 'Couvert végétal', 'Pois', 'Maïs grain'], crops: ['🌾', '🌱', '🫛', '🌽'] },
  { id: 'S3', name: 'Performance & Climat', detail: 'Diversification · couvert long', tone: 'climate', cropPlan: ['Tournesol', 'Couvert long', 'Blé tendre', 'Féverole'], crops: ['🌻', '🌱', '🌾', '🪻'] },
]

const priorities: Array<{ id: Priority; label: string; icon: typeof Leaf }> = [
  { id: 'soil', label: 'Fertilité des sols', icon: Leaf },
  { id: 'economy', label: 'Performance économique', icon: Sprout },
  { id: 'emissions', label: 'Réduction des émissions (GES)', icon: Cloud },
  { id: 'resilience', label: 'Résilience aux aléas', icon: Shield },
]

const scores: Record<ScenarioId, { organic: string; yield: string; emissions: string; coverage: string; resilience: number }> = {
  S1: { organic: '—', yield: '—', emissions: '—', coverage: '78 %', resilience: 1 },
  S2: { organic: '+0,4 pt', yield: '+2 %', emissions: '−12 %', coverage: '92 %', resilience: 2 },
  S3: { organic: '+0,5 pt', yield: '+4 %', emissions: '−18 %', coverage: '95 %', resilience: 3 },
}

const priorityChoice: Record<Priority, ScenarioId> = { soil: 'S2', economy: 'S3', emissions: 'S3', resilience: 'S2' }

export function ScenariosPage() {
  const [activeScenarios, setActiveScenarios] = useState<ScenarioId[]>(['S1', 'S2', 'S3'])
  const [priority, setPriority] = useState<Priority>('soil')
  const [refreshed, setRefreshed] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  const toggleScenario = (id: ScenarioId) => {
    setRefreshed(false)
    setActiveScenarios(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])
  }
  const preferred = priorityChoice[priority]
  const recommendation = activeScenarios.includes(preferred) ? preferred : activeScenarios[0]
  const recommendedScenario = scenarios.find(scenario => scenario.id === recommendation)
  const priorityName = priorities.find(item => item.id === priority)?.label.toLocaleLowerCase('fr') ?? 'votre priorité'

  const beginPan = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, input, a, svg, .scenario-panel')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }
    setDragging(true)
  }
  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging || !stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    const limitX = Math.max(0, (rect.width * 1.06 * zoom - rect.width) / 2)
    const limitY = Math.max(0, (rect.height * 1.06 * zoom - rect.height) / 2)
    setPan({ x: Math.max(-limitX, Math.min(limitX, dragStart.current.panX + event.clientX - dragStart.current.x)), y: Math.max(-limitY, Math.min(limitY, dragStart.current.panY + event.clientY - dragStart.current.y)) })
  }

  return (
    <section className="scenarios-page" aria-label="Comparaison de scénarios agricoles">
      <header className="scenarios-heading"><div><h1>Scénarios de rotation</h1><p>Comparer les choix de culture et leurs effets estimés sur la parcelle.</p></div><span className="scenario-demo-tag">Comparaison illustrative</span></header>

      <div ref={stageRef} className={`scenario-map-stage ${dragging ? 'is-dragging' : ''}`} onPointerDown={beginPan} onPointerMove={movePan} onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)}>
        <div className="scenario-map-world" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          <img src="/images/landing-fields.png" alt="Carte agricole illustrative des parcelles" draggable={false} />
          <svg className="scenario-map-parcels" viewBox="0 0 1000 700" aria-label="Parcelles agricoles" role="img"><polygon className="scenario-neighbor" points="598,143 767,172 813,302 609,366 608,228" /><polygon className="scenario-neighbor" points="175,388 320,378 448,432 404,568 220,531 149,454" /><polygon className="scenario-selected-field" points="307,264 482,194 615,230 604,384 449,433 324,378" /></svg>
          <div className="scenario-field-tag"><span><LocateFixed size={14} /></span><strong>P-03 · La Grande Pièce</strong><small>7,4 ha · Maïs 2025</small></div>
          {priority === 'soil' && <div className="scenario-soil-tag"><span><Layers3 size={16} /></span><span><strong>Sol & couverture · P-03</strong><small>Argilo-limoneux · profil exemple</small><small>Matière organique illustrative : 2,3 %</small></span></div>}
          <div className="scenario-map-heat" aria-hidden="true" />
        </div>
        <div className="scenario-map-location"><LocateFixed size={14} /> Ferme des Chênes <span>·</span> P-03</div>
        <div className="scenario-map-controls"><button type="button" aria-label="Zoomer" onClick={() => setZoom(value => Math.min(1.65, +(value + .15).toFixed(2)))}><Plus size={16} /></button><button type="button" aria-label="Dézoomer" onClick={() => setZoom(value => Math.max(.95, +(value - .15).toFixed(2)))}><Minus size={16} /></button><button type="button" aria-label="Recentrer la carte" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}><LocateFixed size={15} /></button></div>
        <div className="scenario-map-scale"><span />250 m</div>

        <aside className="scenario-panel scenario-config-panel" aria-label="Configurer les scénarios">
          <header className="scenario-panel-heading"><div><span className="scenario-icon"><Sprout size={17} /></span><span><h2>Configurer la comparaison</h2><small>Sélectionnez les pistes à étudier</small></span></div><span className="scenario-count">{activeScenarios.length}/3</span></header>
          <div className="scenario-select-list">{scenarios.map(scenario => <label key={scenario.id} className={`scenario-choice ${scenario.tone} ${activeScenarios.includes(scenario.id) ? 'is-selected' : ''}`}><input type="checkbox" checked={activeScenarios.includes(scenario.id)} onChange={() => toggleScenario(scenario.id)} /><span className="scenario-choice-icon">{scenario.id === 'S1' ? '🌿' : scenario.id === 'S2' ? '🌱' : '🌾'}</span><span><strong>{scenario.id} · {scenario.name}</strong><small>{scenario.detail}</small></span></label>)}</div>
          <div className="scenario-priority-heading"><strong>Priorité de l’exploitation</strong><span>Le meilleur compromis suit ce choix.</span></div>
          <div className="scenario-priority-list" role="radiogroup" aria-label="Priorité de l’exploitation">{priorities.map(item => { const Icon = item.icon; return <label key={item.id} className={`scenario-priority ${priority === item.id ? 'is-active' : ''}`}><input type="radio" name="scenario-priority" checked={priority === item.id} onChange={() => { setPriority(item.id); setRefreshed(false) }} /><Icon size={15} /><span>{item.label}</span>{priority === item.id && <Check size={13} />}</label> })}</div>
          <button className="scenario-refresh" type="button" disabled={!activeScenarios.length} onClick={() => setRefreshed(true)}><Sprout size={15} /> Actualiser la comparaison</button>
          {refreshed && <p className="scenario-refresh-message" role="status">Comparaison recalculée selon « {priorityName} ».</p>}
        </aside>

        <aside className="scenario-panel scenario-results-panel" aria-label="Résultats comparés">
          <header className="scenario-panel-heading results-heading"><div><span className="scenario-icon results-icon"><Wind size={17} /></span><span><h2>Comparaison des scénarios</h2><small>Effets estimés · P-03 · 2025–2028</small></span></div></header>
          {activeScenarios.length ? <div className="scenario-results-table" style={{ '--scenario-count': activeScenarios.length } as CSSProperties} role="table" aria-label="Écarts estimés des rotations">
            <div className="scenario-table-row table-header" role="row"><span role="columnheader">Indicateur · Δ vs S1</span>{activeScenarios.map(id => <span key={id} className={`scenario-cell-${id.toLowerCase()}`} role="columnheader">{id}<small>{id === 'S1' ? 'Réf.' : id === 'S2' ? 'Sol & Rés.' : 'Perf. & Clim.'}</small></span>)}</div>
            <MetricRow icon={<Leaf size={15} />} label="Matière organique" metric="organic" activeScenarios={activeScenarios} />
            <MetricRow icon={<Sprout size={15} />} label="Rendement total" metric="yield" activeScenarios={activeScenarios} />
            <MetricRow icon={<Cloud size={15} />} label="Émissions GES" metric="emissions" activeScenarios={activeScenarios} />
            <MetricRow icon={<Droplets size={15} />} label="Couverture du sol" metric="coverage" activeScenarios={activeScenarios} />
            <div className="scenario-table-row resilience-row" role="row"><span role="rowheader"><Shield size={15} />Résilience aux aléas</span>{activeScenarios.map(id => <span key={id} className={`scenario-cell-${id.toLowerCase()}`} role="cell">{Array.from({ length: 3 }, (_, index) => <i key={index} className={index < scores[id].resilience ? `resilience-on resilience-${id.toLowerCase()}` : ''} />)}</span>)}</div>
          </div> : <div className="scenario-empty-state"><Sprout size={22} /><strong>Choisissez un scénario</strong><span>Activez au moins une rotation à comparer.</span></div>}

          {recommendedScenario && <div className={`scenario-recommendation recommendation-${recommendedScenario.id.toLowerCase()}`}><span className="recommendation-mark"><Leaf size={18} /></span><div><small>Meilleur compromis · priorité {priorityName}</small><strong>{recommendedScenario.id} · {recommendedScenario.name}</strong><p>{recommendation === 'S2' ? 'Favorise la fertilité et la couverture du sol, avec un rendement maintenu dans cette simulation.' : 'Améliore le rendement et réduit les émissions dans cette simulation de rotation.'}</p></div></div>}
          <div className="scenario-proof-card"><span className="proof-icon"><Check size={15} /></span><div><strong>Hypothèses visibles</strong><p>Valeurs d’exemple, à valider avec des mesures de ferme avant toute décision.</p></div><Link to="/app/data-trust" aria-label="Comprendre les sources et hypothèses"><ChevronRight size={15} /></Link></div>
        </aside>

        <div className="scenario-map-legend"><span><i className="scenario-outline" />Parcelle sélectionnée</span><span><i className="scenario-heat-legend" />Indice illustratif de couverture</span></div>
      </div>

      <section className="scenario-rotation-panel" aria-label="Rotations simulées de la parcelle P-03">
        <header><div><Leaf size={16} /><span><strong>Rotations de la parcelle P-03</strong><small>Hypothèses de culture · 4 saisons</small></span></div><div className="scenario-proof-legend"><span><i className="proof-hypothesis" />Hypothèse de démo</span><span><i className="proof-missing" />Observation réelle non raccordée</span></div><Link to="/app/data-trust">Sources & hypothèses <ChevronRight size={13} /></Link></header>
        <div className="scenario-timeline"><div className="scenario-timeline-label"><span />Scénario / Rotation</div>{[2025, 2026, 2027, 2028].map(year => <div className="scenario-year" key={year}>{year}<small>Print. · Été · Aut.</small></div>)}
          {scenarios.filter(scenario => activeScenarios.includes(scenario.id)).map(scenario => <div className={`scenario-plan-row plan-${scenario.id.toLowerCase()}`} key={scenario.id}><div className="scenario-plan-name"><span>{scenario.id}</span><strong>{scenario.name}</strong><small>{scenario.detail}</small></div>{scenario.cropPlan.map((crop, index) => <div className={`scenario-crop crop-${scenario.id.toLowerCase()}`} key={`${scenario.id}-${index}`}><span>{scenario.crops[index]}</span><strong>{crop}</strong></div>)}</div>)}
          {!activeScenarios.length && <div className="scenario-timeline-empty">Activez une piste pour afficher les rotations proposées.</div>}
        </div>
      </section>
    </section>
  )
}

function MetricRow({ icon, label, metric, activeScenarios }: { icon: React.ReactNode; label: string; metric: 'organic' | 'yield' | 'emissions' | 'coverage'; activeScenarios: ScenarioId[] }) {
  return <div className="scenario-table-row metric-row" role="row"><span role="rowheader">{icon}{label}</span>{activeScenarios.map(id => <span key={id} className={`scenario-cell-${id.toLowerCase()}`} role="cell">{scores[id][metric]}</span>)}</div>
}
