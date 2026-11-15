import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, ClipboardList, Plus, Trash2 } from 'lucide-react'
import type { GeoPoint } from '../../lib/geo/location'

type ObservationKind = 'semis' | 'recolte' | 'irrigation' | 'note'

type Observation = {
  id: string
  date: string
  kind: ObservationKind
  crop: string
  note: string
  author: string
}

const STORAGE_PREFIX = 'fieldnova:observations:v1:'
const KIND_LABELS: Record<ObservationKind, string> = { semis: 'Semis', recolte: 'Récolte', irrigation: 'Irrigation', note: 'Note' }

function storageKey(point: GeoPoint) {
  return `${STORAGE_PREFIX}${point.latitude.toFixed(5)}:${point.longitude.toFixed(5)}`
}

function readObservations(key: string): Observation[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    if (!Array.isArray(data)) return []
    return data.filter((entry): entry is Observation => entry && typeof entry === 'object'
      && typeof entry.id === 'string' && typeof entry.date === 'string'
      && ['semis', 'recolte', 'irrigation', 'note'].includes(entry.kind)
      && typeof entry.crop === 'string' && typeof entry.note === 'string' && typeof entry.author === 'string')
  } catch {
    return []
  }
}

function today() {
  const date = new Date()
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

function formatDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`)
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(parsed)
}

export function FieldObservations({ point }: { point: GeoPoint }) {
  const key = useMemo(() => storageKey(point), [point.latitude, point.longitude])
  const [items, setItems] = useState<Observation[]>(() => readObservations(key))
  const [date, setDate] = useState(today)
  const [kind, setKind] = useState<ObservationKind>('note')
  const [crop, setCrop] = useState('')
  const [note, setNote] = useState('')
  const [author, setAuthor] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setItems(readObservations(key))
    const sync = (event: StorageEvent) => { if (event.key === key) setItems(readObservations(key)) }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [key])

  const save = (next: Observation[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(next))
      setItems(next)
      setError('')
    } catch {
      setError('Enregistrement impossible dans le stockage local de ce navigateur.')
    }
  }

  const addObservation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const detail = note.trim()
    if (!detail) { setError('Ajoutez une observation avant de l’enregistrer.'); return }
    if (!date || Number.isNaN(Date.parse(`${date}T12:00:00`))) { setError('Choisissez une date valide.'); return }
    const entry: Observation = {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      date, kind, crop: crop.trim(), note: detail, author: author.trim(),
    }
    save([entry, ...items].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 200))
    setNote('')
  }

  const deleteObservation = (id: string) => save(items.filter(item => item.id !== id))

  return <div className="terrain-observations">
    <div className="terrain-observations-disclaimer"><ClipboardList size={14} /><span>Notes déclarées par vous, enregistrées sur cet appareil. Elles ne sont ni vérifiées ni envoyées à la NASA.</span></div>
    <form className="terrain-observation-form" onSubmit={addObservation}>
      <div className="terrain-observation-fields">
        <label>Type<select value={kind} onChange={event => setKind(event.target.value as ObservationKind)}>{Object.entries(KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Date<input type="date" value={date} onChange={event => setDate(event.target.value)} required /></label>
        <label>Culture <span>(facultatif)</span><input value={crop} onChange={event => setCrop(event.target.value)} maxLength={80} placeholder="Ex. blé d’hiver" /></label>
        <label>Auteur <span>(facultatif)</span><input value={author} onChange={event => setAuthor(event.target.value)} maxLength={80} placeholder="Votre nom" /></label>
      </div>
      <label className="terrain-observation-note-label">Observation<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={1000} rows={3} placeholder="Décrivez ce que vous avez observé ou réalisé…" required /></label>
      {error && <p className="terrain-observation-error" role="alert">{error}</p>}
      <button className="terrain-observation-submit" type="submit"><Plus size={14} />Enregistrer l’observation</button>
    </form>
    <div className="terrain-observation-list-heading"><strong>Historique de ce point</strong><span>{items.length} / 200</span></div>
    {items.length === 0 ? <p className="terrain-observations-empty">Aucune observation enregistrée pour ce point. Vos notes resteront séparées des données NASA.</p> : <ol className="terrain-observation-list">{items.map(item => <li key={item.id}>
      <div className="terrain-observation-meta"><span className={`terrain-observation-kind kind-${item.kind}`}>{KIND_LABELS[item.kind]}</span><span><CalendarDays size={11} />{formatDate(item.date)}</span>{item.author && <span>· {item.author}</span>}<button type="button" aria-label={`Supprimer la note du ${formatDate(item.date)}`} onClick={() => deleteObservation(item.id)}><Trash2 size={13} /></button></div>
      {item.crop && <strong className="terrain-observation-crop">{item.crop}</strong>}
      <p>{item.note}</p>
    </li>)}</ol>}
  </div>
}
