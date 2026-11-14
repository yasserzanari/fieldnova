import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Activity, ChevronDown, CircleHelp, CloudRain, Droplets, Layers3, Leaf, LocateFixed, MapPin, Maximize2, Minus, Plus, Send, ShieldCheck, Sparkles, Sprout, ThermometerSun, X } from 'lucide-react'
import { ThinkingState, type TraceNode } from '../../components/ai-chat/ai-agent-response'
import AISources, { type AISource } from '../../components/ai-chat/ai-sources'
import { MessageActions } from '../../components/ai-chat/message-actions'
import { LiquidMultimodalInput } from '../../components/ai-chat/liquid-multimodal-input'
import './assistant.css'

type LayerId = 'stress' | 'ndvi' | 'rain'
type Message = { id: number; role: 'user' | 'assistant'; text: string; trace?: TraceNode[]; running?: boolean; sources?: AISource[] }

const referenceSources: AISource[] = [
  { id: 'power-docs', title: 'NASA POWER · documentation', url: 'https://power.larc.nasa.gov/docs/', snippet: 'Documentation du service. Aucune donnée live n’est interrogée dans cette démo.' },
  { id: 'earthdata', title: 'NASA Earthdata · agriculture', url: 'https://www.earthdata.nasa.gov/topics/human-dimensions/agriculture', snippet: 'Catalogue de référence; non connecté à cette session de démonstration.' },
]

const demoTrace: TraceNode[] = [
  { id: 'ctx', type: 'tool', toolName: 'mcp', args: { label: 'Contexte de la parcelle P-03' }, primary: 'Parcelle · P-03', secondary: 'Ferme des Chênes · 7,4 ha', status: 'completed', durationSeconds: 0.3 },
  { id: 'layer', type: 'tool', toolName: 'mcp', args: { label: 'Couche de stress hydrique (illustration)' }, primary: 'Couche cartographique', secondary: 'Indice illustratif · pas une observation', status: 'completed', durationSeconds: 0.4 },
  { id: 'limits', type: 'reasoning', primary: 'Vérification des limites', secondary: 'Météo et humidité terrain non connectées', status: 'completed', durationSeconds: 0.2 },
]

const firstReply = 'Sur la carte, le voile coloré est une illustration du stress hydrique sur P-03, pas une mesure satellite. Je peux comparer les zones et expliquer quels signaux NASA seraient utiles, mais je ne peux pas recommander une date d’irrigation fiable sans météo observée et humidité du sol mesurée.'

const layers: Array<{ id: LayerId; label: string; short: string; icon: typeof Activity }> = [
  { id: 'stress', label: 'Stress hydrique', short: 'Stress', icon: Droplets },
  { id: 'ndvi', label: 'Vigueur végétale', short: 'NDVI', icon: Leaf },
  { id: 'rain', label: 'Pluie récente', short: 'Pluie', icon: CloudRain },
]

export function AssistantPage() {
  const [layer, setLayer] = useState<LayerId>('stress')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: 'user', text: 'Quelle zone de P-03 risque le plus le stress hydrique ?' },
    { id: 2, role: 'assistant', text: firstReply, trace: demoTrace, sources: referenceSources },
  ])
  const [selectedParcel, setSelectedParcel] = useState('P-03')
  const [showDetails, setShowDetails] = useState(true)
  const threadRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const lastId = useRef(2)

  useEffect(() => {
    const thread = threadRef.current
    if (thread) thread.scrollTop = thread.scrollHeight
  }, [messages])

  const handleSend = (prompt: string, files: File[]) => {
    const question = prompt.trim() || (files.length ? `Analyse cette pièce jointe : ${files.map(file => file.name).join(', ')}` : '')
    if (!question) return
    const userId = ++lastId.current
    const id = ++lastId.current
    const trace = buildTrace(question)
    setMessages(current => [...current, { id: userId, role: 'user', text: question }, { id, role: 'assistant', text: '', running: true, trace }])
    const layerMatch = question.toLocaleLowerCase('fr')
    if (layerMatch.includes('ndvi') || layerMatch.includes('vigueur')) setLayer('ndvi')
    else if (layerMatch.includes('pluie') || layerMatch.includes('précip')) setLayer('rain')
    else setLayer('stress')
    window.setTimeout(() => {
      setMessages(current => current.map(message => message.id === id ? { ...message, text: buildReply(question, files), running: false, sources: referenceSources } : message))
    }, 6500)
  }

  const startPan = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, a, .assistant-map-overlay, .assistant-map-toolbar')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }
    setDragging(true)
  }
  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging || !mapRef.current) return
    const rect = mapRef.current.getBoundingClientRect()
    const boundX = (rect.width * zoom - rect.width) / 2
    const boundY = (rect.height * zoom - rect.height) / 2
    setPan({ x: Math.max(-boundX, Math.min(boundX, dragStart.current.panX + event.clientX - dragStart.current.x)), y: Math.max(-boundY, Math.min(boundY, dragStart.current.panY + event.clientY - dragStart.current.y)) })
  }

  const activeLayer = layers.find(item => item.id === layer)!
  const LayerIcon = activeLayer.icon

  return (
    <section className="assistant-workspace" aria-label="Assistant agricole et carte de la parcelle">
      <aside className="assistant-chat-panel">
        <header className="assistant-chat-header">
          <div className="assistant-avatar"><Sparkles size={18} /></div>
          <div className="assistant-chat-heading"><h1>Assistant FieldNova</h1><p>Contexte : Ferme des Chênes · {selectedParcel}</p></div>
          <button className="assistant-quiet-icon" type="button" title="Informations sur le prototype" aria-label="À propos de cet assistant" onClick={() => setShowDetails(value => !value)}><CircleHelp size={17} /></button>
        </header>
        <div className="assistant-demo-notice"><span><ShieldCheck size={14} /></span><p><strong>Mode démonstration</strong><small>Réponses locales illustratives · aucun modèle ni flux NASA connecté.</small></p></div>
        <div className="assistant-chat-context"><span className="assistant-context-pill"><MapPin size={12} /> Parcelle P-03</span><span>7,4 ha</span><span className="assistant-context-dot" /><span>Maïs · 2025</span></div>
        <div className="assistant-thread" ref={threadRef} aria-live="polite">
          {showDetails && <div className="assistant-welcome"><span><Sparkles size={14} /></span><p>Posez une question sur la carte, le sol, la météo ou une rotation. L’assistant affiche les outils consultés et les limites de chaque réponse.</p><button type="button" aria-label="Masquer les informations" onClick={() => setShowDetails(false)}><X size={13} /></button></div>}
          {messages.map(message => <article key={message.id} className={`assistant-message message-${message.role}`}>
            {message.role === 'assistant' && <div className="assistant-message-mark"><Sparkles size={14} /></div>}
            <div className="assistant-message-body">
              {message.role === 'user' ? <div className="assistant-user-bubble">{message.text}</div> : <>
                {message.trace && <ThinkingState nodes={message.trace} autoPlay={Boolean(message.running)} defaultExpanded={Boolean(message.running)} workingLabel={message.running ? 'Consultation des outils de démonstration' : 'Outils de démonstration consultés'} onSettled={() => setMessages(current => current.map(item => item.id === message.id ? { ...item, running: false } : item))} className="assistant-trace" />}
                {message.text ? <p className="assistant-answer-text">{message.text}</p> : message.running ? <p className="assistant-pending">Lecture du contexte de démo…</p> : null}
                {message.sources && <AISources className="assistant-sources" label="Références de service · non interrogées" sources={message.sources} />}
                <MessageActions text={message.text} actions={['copy', 'feedback']} quiet={false} className="assistant-actions" />
              </>}
            </div>
          </article>)}
        </div>
        <div className="assistant-suggestions" aria-label="Questions suggérées">
          <span>Essayer</span>
          <button type="button" onClick={() => handleSend('Affiche la couche NDVI et explique ses limites.', [])}>Voir le NDVI <ChevronDown size={12} /></button>
          <button type="button" onClick={() => handleSend('Quelles données me manquent pour planifier l’irrigation ?', [])}>Données manquantes <ChevronDown size={12} /></button>
        </div>
        <div className="assistant-composer-wrap">
          <LiquidMultimodalInput className="assistant-composer" defaultModel="fast" placeholder="Demandez à propos de votre parcelle…" maxHeight={110} onSubmit={handleSend} />
          <div className="assistant-composer-foot"><span><span className="assistant-online-dot" /> Assistant parcellaire · démo</span><span>Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne</span></div>
        </div>
      </aside>

        <div className="assistant-map-area">
        <header className="assistant-map-header"><div><span className="assistant-map-kicker"><Layers3 size={14} /> EXPLORATION DE PARCELLE</span><h2>Ferme des Chênes <ChevronDown size={16} /></h2><p>La carte reste liée à la conversation et au contexte sélectionné.</p></div><div className="assistant-map-header-actions"><span className="assistant-demo-chip">Carte illustrative</span><button type="button" className="assistant-expand-map" aria-label="Agrandir la carte"><Maximize2 size={15} /></button></div></header>
        <div className={`assistant-map-canvas ${dragging ? 'is-dragging' : ''}`} ref={mapRef} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)}>
          <div className="assistant-map-world" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
            <img src="/images/landing-fields.png" alt="Carte agricole illustrative, non géoréférencée" draggable={false} />
            <div className={`assistant-heat-overlay layer-${layer}`} aria-hidden="true" />
            <svg className="assistant-parcel-lines" viewBox="0 0 1000 700" role="img" aria-label="Contour illustratif de la parcelle P-03">
              <polygon className="assistant-neighbor-field" points="599,136 780,160 826,307 625,357 607,218" />
              <polygon className="assistant-neighbor-field" points="151,396 328,374 448,434 401,568 213,533 131,465" />
              <polygon className="assistant-main-field" points="306,264 482,194 615,230 604,384 449,433 324,378" />
            </svg>
            <button type="button" className="assistant-field-label" onClick={() => setSelectedParcel('P-03')}><MapPin size={14} /><span><strong>{selectedParcel} · La Grande Pièce</strong><small>7,4 ha · Maïs 2025</small></span></button>
            <button type="button" className="assistant-map-pin pin-soil" onClick={() => setLayer('ndvi')} aria-label="Afficher le profil de sol illustratif"><span><Layers3 size={14} /></span></button>
            <button type="button" className="assistant-map-pin pin-weather" onClick={() => setLayer('rain')} aria-label="Afficher la couche de pluie illustrative"><span><CloudRain size={14} /></span></button>
          </div>
          <div className="assistant-map-toolbar"><div className="assistant-zoom-stack"><button type="button" aria-label="Zoom avant" onClick={() => setZoom(value => Math.min(1.75, +(value + .15).toFixed(2)))}><Plus size={16} /></button><button type="button" aria-label="Zoom arrière" onClick={() => setZoom(value => Math.max(.9, +(value - .15).toFixed(2)))}><Minus size={16} /></button></div><button type="button" aria-label="Recentrer la carte" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}><LocateFixed size={16} /></button></div>
          <div className="assistant-map-top-overlay"><span><span className="assistant-live-indicator" />P-03 sélectionnée</span><span>7,4 ha</span><span>Maïs · saison 2025</span></div>
          <div className="assistant-map-layer-card"><div className="assistant-map-layer-title"><span><LayerIcon size={15} /></span><div><strong>{activeLayer.label}</strong><small>Visualisation de démonstration</small></div><button type="button" aria-label="Choisir une autre couche"><ChevronDown size={15} /></button></div><div className="assistant-layer-choices">{layers.map(item => { const Icon = item.icon; return <button key={item.id} type="button" className={layer === item.id ? 'is-active' : ''} onClick={() => setLayer(item.id)}><Icon size={13} />{item.short}</button> })}</div><p><ShieldCheck size={12} /> Aucune observation satellite en direct</p></div>
          <div className="assistant-map-legend"><span><i className={`legend-gradient legend-${layer}`} />Faible <b /> élevé</span><small>Intensité indicative · pas un diagnostic</small></div>
          <div className="assistant-scale"><span />250 m</div>
        </div>
        <footer className="assistant-map-footer"><div className="assistant-footer-title"><Sprout size={16} /><span><strong>Repères du sol</strong><small>Valeurs d’exemple · mesure terrain absente</small></span></div><div className="assistant-soil-stat"><span className="soil-stat-icon"><Layers3 size={14} /></span><span><small>Texture</small><strong>Limono-argileuse</strong></span></div><div className="assistant-soil-stat"><span className="soil-stat-icon moisture"><Droplets size={14} /></span><span><small>Réserve utile</small><strong>≈ 130 mm <em>estimée</em></strong></span></div><div className="assistant-soil-stat"><span className="soil-stat-icon organic"><Leaf size={14} /></span><span><small>Matière organique</small><strong>2,3 % <em>exemple</em></strong></span></div><div className="assistant-soil-stat weather-stat"><span className="soil-stat-icon weather"><ThermometerSun size={14} /></span><span><small>Météo raccordée</small><strong>Indisponible</strong></span></div><button type="button" className="assistant-map-details" onClick={() => handleSend('Explique le profil de sol et ce qui reste à mesurer.', [])}>Demander une analyse <Send size={13} /></button></footer>
      </div>
    </section>
  )
}

function buildTrace(question: string): TraceNode[] {
  const lower = question.toLocaleLowerCase('fr')
  const target = lower.includes('ndvi') || lower.includes('vigueur') ? 'Vigueur végétale · couche démo' : lower.includes('pluie') || lower.includes('précip') ? 'Pluie récente · couche démo' : 'Stress hydrique · couche démo'
  return [
    { id: `context-${Date.now()}`, type: 'tool', toolName: 'mcp', args: { label: 'Contexte local de la parcelle' }, primary: 'Parcelle · P-03', secondary: 'Registre de démonstration', status: 'completed', durationSeconds: 0.3 },
    { id: `map-${Date.now()}`, type: 'tool', toolName: 'mcp', args: { label: target }, primary: 'Mise à jour de la carte', secondary: 'Couche indicative · sans observation réelle', status: 'completed', durationSeconds: 0.4 },
    { id: `check-${Date.now()}`, type: 'reasoning', primary: 'Contrôle des données disponibles', secondary: 'Aucune API météo ou NASA interrogée', status: 'completed', durationSeconds: 0.2 },
  ]
}

function buildReply(question: string, files: File[]) {
  if (files.length) return `J’ai reçu ${files.length} fichier${files.length > 1 ? 's' : ''} (${files.map(file => file.name).join(', ')}), mais le prototype ne lit pas encore leur contenu. Je peux tout de même consulter le contexte illustratif de P-03. Pour une analyse réelle, il faudra connecter un lecteur de documents et les données de parcelle.`
  const lower = question.toLocaleLowerCase('fr')
  if (lower.includes('irrig') || lower.includes('eau')) return 'Pour planifier l’irrigation, il manque ici une mesure d’humidité du sol récente, le volume d’eau disponible et une prévision locale vérifiée. La réserve utile affichée (≈ 130 mm) est une valeur d’exemple; elle ne suffit pas pour calculer une dose ou une date fiable.'
  if (lower.includes('ndvi') || lower.includes('vigueur')) return 'La couche NDVI affichée est une illustration d’interface : aucune image Sentinel ou NASA n’a été chargée. Dans une version connectée, je comparerais les observations sans nuages aux dates précédentes et signalerais les pixels manquants avant d’interpréter une baisse de vigueur.'
  if (lower.includes('pluie') || lower.includes('précip')) return 'La couche de pluie est illustrative et ne correspond pas à un relevé ou à une prévision locale. Pour estimer un déficit, il faudrait raccorder les précipitations observées, l’évapotranspiration et l’humidité du sol sur une période explicite.'
  if (lower.includes('sol') || lower.includes('profil') || lower.includes('mesur')) return 'Le profil visible indique une texture limono-argileuse et une réserve utile estimée, toutes deux présentées comme exemples. Il manque une analyse de sol datée, les profondeurs d’échantillonnage et des mesures d’humidité pour conclure sur la parcelle.'
  return 'J’ai consulté le contexte de démonstration de P-03 et mis à jour la couche de carte la plus pertinente. Les valeurs visibles sont illustratives : aucune API, image satellite ou station météo n’a été interrogée. Précisez une période ou un indicateur (sol, NDVI, pluie, irrigation) pour orienter l’analyse.'
}
