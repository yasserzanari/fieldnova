import { useEffect, useRef, useState } from 'react'
import { Activity, ChevronDown, CircleHelp, CloudRain, Droplets, Layers3, Leaf, LocateFixed, MapPin, Maximize2, Minus, Plus, Send, ShieldCheck, Sparkles, Sprout, ThermometerSun, X } from 'lucide-react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { ThinkingState, type TraceNode } from '../../components/ai-chat/ai-agent-response'
import AISources, { type AISource } from '../../components/ai-chat/ai-sources'
import { MessageActions } from '../../components/ai-chat/message-actions'
import { LiquidMultimodalInput } from '../../components/ai-chat/liquid-multimodal-input'
import { FieldMap, type MapBaseLayer } from '../../components/maps/FieldMap'
import { fetchPowerMonthly, formatPowerMonth, latestCompleteRecord, type PowerMonthlySeries } from '../../lib/nasa/power'
import { readSoilProfile } from '../../lib/farm/soil-profile'
import { useSelectedLocation, type GeoPoint } from '../../lib/geo/location'
import { cropCatalog, evaluateRotation, readRotationWorkspace } from '../scenarios/rotation-model'
import './assistant.css'

type LayerId = 'truecolor' | 'ndvi' | 'surface' | 'root'
type Message = { id: number; role: 'user' | 'assistant'; text: string; trace?: TraceNode[]; traceHeading?: string; running?: boolean; sources?: AISource[] }

const sources: AISource[] = [
  { id: 'power', title: 'NASA POWER · données mensuelles', url: 'https://power.larc.nasa.gov/docs/services/api/temporal/monthly/', snippet: 'Série au point de grille NASA POWER : température, précipitations et humidité du sol modélisée.' },
  { id: 'gibs', title: 'NASA GIBS · imagerie et humidité du sol', url: 'https://nasa-gibs.github.io/gibs-api-docs/access-basics/', snippet: 'Tuiles cartographiques MODIS et SMAP affichées à leur résolution native.' },
]

const layerOptions: Array<{ id: LayerId; label: string; short: string; icon: typeof Activity }> = [
  { id: 'truecolor', label: 'Image MODIS', short: 'Satellite', icon: Layers3 },
  { id: 'ndvi', label: 'NDVI · MODIS', short: 'NDVI', icon: Leaf },
  { id: 'surface', label: 'Humidité de surface · SMAP', short: 'Surface', icon: Droplets },
  { id: 'root', label: 'Humidité racinaire · SMAP', short: 'Racines', icon: Sprout },
]

function recentImageryDate(days = 11) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

function coordinate(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(3).replace('.', ',')}° ${value < 0 ? negative : positive}`
}

function makeClimateAnswer(question: string, series: PowerMonthlySeries | null, layer: LayerId) {
  if (!series) return 'Je n’ai pas pu charger NASA POWER pour le point sélectionné. Vérifiez la connexion puis réessayez ; aucune valeur de démonstration n’est substituée aux données manquantes.'
  const records = series.records
  const record = latestCompleteRecord(records)
  if (!record) return 'NASA POWER n’a renvoyé aucune observation mensuelle exploitable pour ce point. La carte reste disponible, mais je ne peux pas donner de valeur climatique.'

  const lower = question.toLocaleLowerCase('fr')
  const point = `${coordinate(series.point.latitude, 'N', 'S')} · ${coordinate(series.point.longitude, 'E', 'O')}`
  const prefix = `Pour le point ${point}, la dernière période mensuelle exploitable est ${formatPowerMonth(record.date)}.`
  const requestedLayer = layerOptions.find(item => item.id === layer)?.label
  if (lower.includes('ndvi') || lower.includes('vigueur')) {
    return `${prefix} La carte affiche le NDVI MODIS de NASA GIBS à l’échelle du pixel satellite. Cette image peut être nuageuse ou décalée dans le temps et ne permet pas de comparer une sous-zone de parcelle ici. NASA POWER ne fournit pas le NDVI ; je n’en déduis donc pas un état de culture à partir des données météo.`
  }
  if (lower.includes('irrig') || lower.includes('eau') || lower.includes('humid') || lower.includes('sol')) {
    const root = record.rootZoneWetness
    const surface = record.surfaceSoilWetness
    const values = [root !== undefined ? `humidité racinaire modélisée ${Math.round(root * 100)} %` : '', surface !== undefined ? `humidité de surface modélisée ${Math.round(surface * 100)} %` : ''].filter(Boolean).join(' ; ')
    return `${prefix}${values ? ` NASA POWER estime ${values} sur son pixel de grille.` : ' NASA POWER ne fournit pas de valeur d’humidité exploitable pour ce mois.'} La couche SMAP de la carte est une observation satellite agrégée à environ 9 km. Ces valeurs régionales ne suffisent pas à calculer un besoin, une dose ou une date d’irrigation pour une parcelle. Il faut notamment des mesures terrain, la culture, son stade et l’eau disponible.`
  }
  if (lower.includes('pluie') || lower.includes('précip')) {
    const value = record.precipitationMmPerDay
    return `${prefix}${value !== undefined ? ` Les précipitations NASA POWER sont de ${value.toFixed(1).replace('.', ',')} mm/j en moyenne sur le mois (PRECTOTCORR).` : ' Aucune valeur de précipitation exploitable n’est disponible pour ce mois.'} C’est une moyenne mensuelle au point de grille, pas un cumul des sept derniers jours ni une prévision.`
  }
  if (lower.includes('temp') || lower.includes('chaud') || lower.includes('froid')) {
    return `${prefix}${record.temperatureC !== undefined ? ` La température moyenne NASA POWER est de ${record.temperatureC.toFixed(1).replace('.', ',')} °C` : ' La température moyenne n’est pas disponible'}${record.temperatureMinC !== undefined && record.temperatureMaxC !== undefined ? ` (min. ${record.temperatureMinC.toFixed(1).replace('.', ',')} °C ; max. ${record.temperatureMaxC.toFixed(1).replace('.', ',')} °C)` : ''}. Il s’agit d’une moyenne mensuelle modélisée, pas d’une prévision locale.`
  }
  const summary = [
    record.temperatureC !== undefined ? `température moyenne ${record.temperatureC.toFixed(1).replace('.', ',')} °C` : '',
    record.precipitationMmPerDay !== undefined ? `pluie ${record.precipitationMmPerDay.toFixed(1).replace('.', ',')} mm/j en moyenne mensuelle` : '',
    record.rootZoneWetness !== undefined ? `humidité racinaire modélisée ${Math.round(record.rootZoneWetness * 100)} %` : '',
  ].filter(Boolean).join(' · ')
  return `${prefix}${summary ? ` NASA POWER indique ${summary}.` : ' Aucune mesure climatique exploitable n’est disponible pour ce mois.'} La carte montre ${requestedLayer}. Dites-moi si vous voulez examiner la pluie, la température, l’humidité du sol ou le NDVI. Les séries POWER sont mensuelles et ne constituent ni une prévision ni un diagnostic parcellaire.`
}

function classifyQuestion(question: string) {
  const lower = question.toLocaleLowerCase('fr')
  const asksSoilProfile = /profil|texture|\bph\b|matière organique|drainage|profondeur|analyse de sol/.test(lower)
  const asksRotation = /rotation|succession|famille botanique|légumineuse|alternance|cultures?/.test(lower)
  const asksClimate = /pluie|précip|température|\bchaud\b|\bfroid\b|humidité|climat|météo|nasa|ndvi|vigueur|satellite|imagerie/.test(lower)
  const asksLayer: LayerId | undefined = /ndvi|vigueur/.test(lower) ? 'ndvi' : /humidité de surface|smap surface/.test(lower) ? 'surface' : /humidité racinaire|humidité du sol|racine/.test(lower) ? 'root' : undefined
  const intent = asksSoilProfile ? 'soil' : asksRotation ? 'rotation' : asksClimate ? 'climate' : 'unknown'
  return { intent, asksLayer }
}

function formatSoilAnswer(point: GeoPoint) {
  const profile = readSoilProfile(point)
  const entries = [
    profile.texture && profile.texture !== 'unknown' ? `texture ${({ sandy: 'sableuse', loamy: 'limoneuse', clayey: 'argileuse' } as const)[profile.texture]}` : '',
    profile.ph !== undefined ? `pH ${profile.ph.toLocaleString('fr-FR')}` : '',
    profile.organicMatterPercent !== undefined ? `${profile.organicMatterPercent.toLocaleString('fr-FR')} % de matière organique` : '',
    profile.effectiveDepthCm !== undefined ? `${profile.effectiveDepthCm} cm de profondeur utile` : '',
    profile.drainage && profile.drainage !== 'unknown' ? `drainage ${({ poor: 'lent', moderate: 'modéré', good: 'rapide' } as const)[profile.drainage]}` : '',
  ].filter(Boolean)
  if (!entries.length) return 'Aucune caractéristique de sol n’est renseignée pour ce point. Ces champs restent inconnus tant qu’ils ne sont pas saisis; vous pouvez les compléter dans « Mon terrain ». Les données NASA de la carte ne remplacent pas une analyse de sol.'
  const updated = profile.updatedAt ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(profile.updatedAt)) : 'date non précisée'
  return `Pour ce point, le profil local saisi dans FieldNova indique : ${entries.join(' · ')}. Dernière mise à jour : ${updated}. Ce sont des informations déclarées localement, pas des mesures NASA ni un résultat de laboratoire vérifié.`
}

function formatRotationAnswer(point: GeoPoint) {
  const workspace = readRotationWorkspace(point)
  const plans = workspace.plans.map(plan => {
    const metrics = evaluateRotation(plan)
    if (!metrics.complete) return `${plan.title} : succession incomplète.`
    const crops = plan.crops.map(id => cropCatalog.find(crop => crop.id === id)?.label ?? 'culture inconnue').join(' → ')
    return `${plan.title} (${crops}) : ${metrics.distinctFamilies} famille${metrics.distinctFamilies === 1 ? '' : 's'} botanique${metrics.distinctFamilies === 1 ? '' : 's'}, ${metrics.repeatedFamilyTransitions} répétition${metrics.repeatedFamilyTransitions === 1 ? '' : 's'} entre saisons et ${metrics.legumeSeasons} saison${metrics.legumeSeasons === 1 ? '' : 's'} avec légumineuse.`
  })
  return `${workspace.isExample ? 'Les scénarios affichés sont des exemples.' : 'Voici les scénarios enregistrés pour ce point.'} ${plans.join(' ')} Ces indicateurs décrivent seulement la succession et les familles; ils ne prédisent ni rendement ni amélioration du sol. Vous pouvez modifier les cultures dans l’onglet Scénarios.`
}

function traceNode(id: string, toolName: string, label: string, primary: string, secondary: string, status: 'completed' | 'failed' = 'completed'): TraceNode {
  const args = toolName === 'fetch' ? { url: label } : toolName === 'read' ? { path: label } : { label }
  return { id, type: 'tool', toolName, args, primary, secondary, status }
}

export function AssistantPage() {
  const { location, selectLocation } = useSelectedLocation()
  const [layer, setLayer] = useState<LayerId>('truecolor')
  const [series, setSeries] = useState<PowerMonthlySeries | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [dataError, setDataError] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: 'assistant', text: 'Bonjour. Je peux consulter les données climatiques mensuelles NASA POWER et afficher les couches MODIS ou SMAP sur la carte. Cliquez sur la carte pour changer le point suivi, puis demandez-moi la pluie, la température, le NDVI ou l’humidité du sol.' },
  ])
  const [showDetails, setShowDetails] = useState(true)
  const [baseLayer, setBaseLayer] = useState<MapBaseLayer>('nasa')
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const lastId = useRef(1)

  useEffect(() => {
    let active = true
    setLoadingData(true)
    setDataError('')
    fetchPowerMonthly(location, 5).then(result => {
      if (active) setSeries(result)
    }).catch(error => {
      if (active) {
        setSeries(null)
        setDataError(error instanceof Error ? error.message : 'NASA POWER est indisponible.')
      }
    }).finally(() => { if (active) setLoadingData(false) })
    return () => { active = false }
  }, [location])

  useEffect(() => {
    const thread = threadRef.current
    if (thread) thread.scrollTop = thread.scrollHeight
  }, [messages])

  const handleSend = async (prompt: string, files: File[]) => {
    const question = prompt.trim() || (files.length ? `Analyse cette pièce jointe : ${files.map(file => file.name).join(', ')}` : '')
    if (!question) return
    const id = ++lastId.current
    const userId = ++lastId.current
    const route = classifyQuestion(question)
    const requestedLayer = route.asksLayer ?? layer
    if (route.asksLayer) setLayer(route.asksLayer)
    setMessages(current => [...current, { id: userId, role: 'user', text: question }, { id, role: 'assistant', text: '', running: true }])
    const trace: TraceNode[] = []
    let currentSeries = series
    let answer: string
    let traceHeading = 'Aucun outil exécuté'
    let usedSources: AISource[] = []
    if (files.length) {
      answer = 'La pièce jointe est reçue, mais son contenu n’est pas encore analysé. Je peux consulter le climat NASA POWER, le profil local du sol ou les rotations enregistrées pour le point suivi.'
    } else if (route.intent === 'soil') {
      const profile = readSoilProfile(location)
      const knownFields = Object.values(profile).filter(value => value !== undefined).length
      trace.push(traceNode(`soil-${id}`, 'read', 'Profil de sol local · navigateur', 'Profil local consulté', knownFields ? `${knownFields} champ(s) renseigné(s) pour le point suivi` : 'Aucun champ de sol renseigné', 'completed'))
      traceHeading = 'Profil de sol local consulté'
      answer = formatSoilAnswer(location)
    } else if (route.intent === 'rotation') {
      const workspace = readRotationWorkspace(location)
      const completePlans = workspace.plans.filter(plan => evaluateRotation(plan).complete).length
      trace.push(traceNode(`rotation-${id}`, 'read', 'Scénarios de rotation · navigateur', 'Rotations consultées', `${completePlans}/3 scénario(s) complet(s) · priorité ${workspace.priority}`, 'completed'))
      traceHeading = 'Scénarios de rotation consultés'
      answer = formatRotationAnswer(location)
    } else if (route.intent === 'unknown') {
      answer = 'Je peux agir sur les données NASA POWER mensuelles, les couches NASA de la carte, le profil de sol saisi localement et les rotations enregistrées. Posez une question sur la pluie, la température, l’humidité, le NDVI, le sol ou une rotation; aucune donnée n’a été consultée pour cette question.'
    } else {
      let failed = false
      const seriesAlreadyLoaded = Boolean(currentSeries && currentSeries.point.latitude === location.latitude && currentSeries.point.longitude === location.longitude)
      try {
        if (!seriesAlreadyLoaded) {
          currentSeries = await fetchPowerMonthly(location, 5)
          setSeries(currentSeries)
        }
      } catch {
        failed = true
        currentSeries = null
      }
      const record = currentSeries ? latestCompleteRecord(currentSeries.records) : undefined
      const gridLabel = currentSeries ? `Cellule ${coordinate(currentSeries.gridPoint.latitude, 'N', 'S')} · ${coordinate(currentSeries.gridPoint.longitude, 'E', 'O')}` : 'La requête n’a pas abouti'
      trace.push(traceNode(`power-${id}`, seriesAlreadyLoaded ? 'read' : 'fetch', seriesAlreadyLoaded ? 'Série NASA POWER chargée · contexte du point' : 'NASA POWER · API mensuelle', failed ? 'NASA POWER indisponible' : seriesAlreadyLoaded ? 'Série chargée consultée' : 'Série récupérée', record ? `${formatPowerMonth(record.date)} · ${gridLabel}` : gridLabel, failed ? 'failed' : 'completed'))
      if (route.asksLayer) {
        const label = layerOptions.find(item => item.id === route.asksLayer)?.label ?? 'Couche NASA'
        trace.push({ id: `map-${id}`, type: 'step', primary: 'Couche affichée sur la carte', secondary: label, status: 'completed' })
      }
      traceHeading = route.asksLayer ? 'NASA POWER consulté · carte mise à jour' : 'NASA POWER consulté'
      answer = makeClimateAnswer(question, currentSeries, requestedLayer)
      usedSources = [sources[0], ...(route.asksLayer ? [sources[1]] : [])]
    }
    setMessages(current => current.map(message => message.id === id ? { ...message, text: answer, trace, traceHeading, running: false, sources: usedSources.length ? usedSources : undefined } : message))
  }

  const activeLayer = layerOptions.find(item => item.id === layer)!
  const LayerIcon = activeLayer.icon
  const latest = series ? latestCompleteRecord(series.records) : undefined
  const soilValue = latest?.rootZoneWetness
  const imageryDate = recentImageryDate()
  const imageDateLabel = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${imageryDate}T12:00:00Z`))

  return (
    <section className="assistant-workspace" aria-label="Assistant agricole et carte NASA interactive">
      <aside className="assistant-chat-panel">
        <header className="assistant-chat-header">
          <div className="assistant-avatar"><Sparkles size={18} /></div>
          <div className="assistant-chat-heading"><h1>Assistant FieldNova</h1><p>Point actif · {coordinate(location.latitude, 'N', 'S')} · {coordinate(location.longitude, 'E', 'O')}</p></div>
          <button className="assistant-quiet-icon" type="button" title="Informations sur cet assistant" aria-label="À propos de cet assistant" onClick={() => setShowDetails(value => !value)}><CircleHelp size={17} /></button>
        </header>
        <div className="assistant-demo-notice"><span><ShieldCheck size={14} /></span><p><strong>Outils de données actifs · sans LLM externe</strong><small>Réponses fondées sur NASA POWER et les couches NASA affichées. Les pièces jointes ne sont pas analysées.</small></p></div>
        <div className="assistant-chat-context"><span className="assistant-context-pill"><MapPin size={12} /> Coordonnée sélectionnée</span><span>{loadingData ? 'NASA POWER…' : dataError ? 'Données indisponibles' : latest ? `Données · ${formatPowerMonth(latest.date)}` : 'Aucune observation récente'}</span></div>
        <div className="assistant-thread" ref={threadRef} aria-live="polite">
          {showDetails && <div className="assistant-welcome"><span><Sparkles size={14} /></span><p>Posez une question : l’assistant interroge la série mensuelle NASA POWER et met à jour les couches réellement visibles sur la carte. Les données régionales ne remplacent pas des mesures de parcelle.</p><button type="button" aria-label="Masquer les informations" onClick={() => setShowDetails(false)}><X size={13} /></button></div>}
          {messages.map(message => <article key={message.id} className={`assistant-message message-${message.role}`}>
            {message.role === 'assistant' && <div className="assistant-message-mark"><Sparkles size={14} /></div>}
            <div className="assistant-message-body">
              {message.role === 'user' ? <div className="assistant-user-bubble">{message.text}</div> : <>
                {Boolean(message.trace?.length) && <ThinkingState nodes={message.trace!} autoPlay={Boolean(message.running)} defaultExpanded={Boolean(message.running)} workingLabel={message.running ? 'Exécution des outils FieldNova' : message.traceHeading ?? 'Activité de l’assistant'} onSettled={() => setMessages(current => current.map(item => item.id === message.id ? { ...item, running: false } : item))} className="assistant-trace" />}
                {message.text ? <p className="assistant-answer-text">{message.text}</p> : message.running ? <p className="assistant-pending">Consultation des données sélectionnées…</p> : null}
                {message.sources && <AISources className="assistant-sources" label="Sources utilisées" sources={message.sources} />}
                {message.text && <MessageActions text={message.text} actions={['copy', 'feedback']} quiet={false} className="assistant-actions" />}
              </>}
            </div>
          </article>)}
        </div>
        <div className="assistant-suggestions" aria-label="Questions suggérées">
          <span>Essayer</span>
          <button type="button" onClick={() => handleSend('Quelle est la pluie mensuelle NASA POWER ?', [])}>Pluie du mois <ChevronDown size={12} /></button>
          <button type="button" onClick={() => handleSend('Que montre l’humidité racinaire ?', [])}>Humidité du sol <ChevronDown size={12} /></button>
          <button type="button" onClick={() => handleSend('Affiche le NDVI et explique ses limites.', [])}>Voir le NDVI <ChevronDown size={12} /></button>
          <button type="button" onClick={() => handleSend('Lis mon profil de sol pour ce point.', [])}>Mon profil de sol <ChevronDown size={12} /></button>
          <button type="button" onClick={() => handleSend('Compare mes rotations pour ce point.', [])}>Mes rotations <ChevronDown size={12} /></button>
        </div>
        <div className="assistant-composer-wrap">
          <LiquidMultimodalInput className="assistant-composer" defaultModel="fast" placeholder="Demandez à propos des données NASA…" maxHeight={110} onSubmit={handleSend} />
          <div className="assistant-composer-foot"><span><span className="assistant-online-dot" /> NASA POWER {loadingData ? '· chargement' : dataError ? '· indisponible' : '· connecté'}</span><span>Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne</span></div>
        </div>
      </aside>

      <div className="assistant-map-area">
        <header className="assistant-map-header"><div><span className="assistant-map-kicker"><Layers3 size={14} /> EXPLORATION NASA · GIBS</span><h2>Carte du point suivi <ChevronDown size={16} /></h2><p>Cliquez sur la carte pour déplacer le point partagé avec les autres vues.</p></div><div className="assistant-map-header-actions"><span className="assistant-demo-chip">MODIS · {imageDateLabel}</span><button type="button" className="assistant-expand-map" aria-label="Recentrer la carte" onClick={() => map?.flyTo({ center: [location.longitude, location.latitude], zoom: 5 })}><Maximize2 size={15} /></button></div></header>
        <div className="assistant-map-canvas">
          <FieldMap center={location} selectedPoint={location} baseLayer={baseLayer} showNdvi={layer === 'ndvi'} showSurfaceSoil={layer === 'surface'} showRootSoil={layer === 'root'} imageryDate={imageryDate} onPointSelect={selectLocation} onMapReady={setMap} ariaLabel="Carte interactive NASA GIBS et OpenStreetMap" />
          <div className="assistant-map-toolbar"><div className="assistant-zoom-stack"><button type="button" aria-label="Zoom avant" onClick={() => map?.zoomIn({ duration: 250 })}><Plus size={16} /></button><button type="button" aria-label="Zoom arrière" onClick={() => map?.zoomOut({ duration: 250 })}><Minus size={16} /></button></div><button type="button" aria-label="Utiliser ma position" onClick={() => navigator.geolocation?.getCurrentPosition(position => selectLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }))}><LocateFixed size={16} /></button></div>
          <div className="assistant-map-top-overlay"><span><span className="assistant-live-indicator" />Point partagé</span><span>{coordinate(location.latitude, 'N', 'S')}</span><span>{coordinate(location.longitude, 'E', 'O')}</span></div>
          <div className="assistant-map-layer-card"><div className="assistant-map-layer-title"><span><LayerIcon size={15} /></span><div><strong>{activeLayer.label}</strong><small>{layer === 'ndvi' || layer === 'truecolor' ? `GIBS · ${imageDateLabel}` : 'GIBS · SMAP récent'}</small></div><button type="button" aria-label="Fond de carte" onClick={() => setBaseLayer(value => value === 'nasa' ? 'streets' : 'nasa')}><ChevronDown size={15} /></button></div><div className="assistant-layer-choices">{layerOptions.map(item => { const Icon = item.icon; return <button key={item.id} type="button" className={layer === item.id ? 'is-active' : ''} onClick={() => setLayer(item.id)}><Icon size={13} />{item.short}</button> })}</div><button type="button" className="assistant-base-toggle" onClick={() => setBaseLayer(value => value === 'nasa' ? 'streets' : 'nasa')}>{baseLayer === 'nasa' ? 'Passer au plan de rues' : 'Passer au fond NASA'}</button><p><ShieldCheck size={12} /> Résolution satellite régionale · pas parcellaire</p></div>
          <div className="assistant-map-legend"><span><i className={`legend-gradient legend-${layer}`} />Couche NASA active</span><small>Pixel satellite ≠ contour de parcelle</small></div>
          <div className="assistant-scale"><span />Échelle indiquée sur la carte</div>
        </div>
        <footer className="assistant-map-footer"><div className="assistant-footer-title"><Sprout size={16} /><span><strong>Point NASA suivi</strong><small>{series ? `Grille POWER · ${coordinate(series.gridPoint.latitude, 'N', 'S')}` : 'Coordonnée choisie sur la carte'}</small></span></div><div className="assistant-soil-stat"><span className="soil-stat-icon moisture"><Droplets size={14} /></span><span><small>Humidité racinaire · POWER</small><strong>{soilValue !== undefined ? `${Math.round(soilValue * 100)} %` : 'Non disponible'} <em>{latest ? formatPowerMonth(latest.date) : ''}</em></strong></span></div><div className="assistant-soil-stat"><span className="soil-stat-icon weather"><ThermometerSun size={14} /></span><span><small>Température · POWER</small><strong>{latest?.temperatureC !== undefined ? `${latest.temperatureC.toFixed(1).replace('.', ',')} °C` : 'Non disponible'} <em>{latest ? formatPowerMonth(latest.date) : ''}</em></strong></span></div><div className="assistant-soil-stat"><span className="soil-stat-icon organic"><CloudRain size={14} /></span><span><small>Pluie moyenne · POWER</small><strong>{latest?.precipitationMmPerDay !== undefined ? `${latest.precipitationMmPerDay.toFixed(1).replace('.', ',')} mm/j` : 'Non disponible'} <em>{latest ? formatPowerMonth(latest.date) : ''}</em></strong></span></div><button type="button" className="assistant-map-details" onClick={() => handleSend('Explique les données NASA POWER pour ce point.', [])}>Analyser les données <Send size={13} /></button></footer>
      </div>
    </section>
  )
}
