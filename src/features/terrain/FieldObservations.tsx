import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CalendarDays, ClipboardList, Download, ImagePlus, Plus, Trash2, X } from 'lucide-react'
import type { GeoPoint } from '../../lib/geo/location'
import { FIELD_OBSERVATION_LIMIT, fieldObservationKindLabel, fieldObservationsStorageKey, readFieldObservations, writeFieldObservations, type FieldObservation, type ObservationKind } from '../../lib/farm/field-observations'
import { deleteFieldObservationPhoto, readFieldObservationPhotos, saveFieldObservationPhoto } from '../../lib/farm/field-observation-photos'
import { downloadFieldObservationsCsv } from '../../lib/farm/field-observations-export'

function today() {
  const date = new Date()
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

function formatDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`)
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(parsed)
}

export function FieldObservations({ point }: { point: GeoPoint }) {
  const key = useMemo(() => fieldObservationsStorageKey(point), [point.latitude, point.longitude])
  const [items, setItems] = useState<FieldObservation[]>(() => readFieldObservations(point))
  const [date, setDate] = useState(today)
  const [kind, setKind] = useState<ObservationKind>('note')
  const [crop, setCrop] = useState('')
  const [note, setNote] = useState('')
  const [author, setAuthor] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const confirmDeleteRef = useRef<HTMLButtonElement>(null)
  const deleteTriggerRefs = useRef(new Map<string, HTMLButtonElement>())
  const listHeadingRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setItems(readFieldObservations(point))
    const sync = (event: StorageEvent) => { if (event.key === key) setItems(readFieldObservations(point)) }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [key, point])

  useEffect(() => {
    if (!photo) { setPhotoPreview(''); return }
    const url = URL.createObjectURL(photo)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  useEffect(() => {
    let cancelled = false
    const urls: Record<string, string> = {}
    readFieldObservationPhotos(items.flatMap(item => item.photoId ? [item.photoId] : []))
      .then(photos => {
        if (cancelled) return
        for (const item of items) {
          const blob = item.photoId ? photos.get(item.photoId) : undefined
          if (blob) urls[item.id] = URL.createObjectURL(blob)
        }
        setPhotoUrls(urls)
      })
      .catch(() => { if (!cancelled) setPhotoUrls({}) })
    return () => {
      cancelled = true
      Object.values(urls).forEach(URL.revokeObjectURL)
    }
  }, [items])

  useEffect(() => {
    if (pendingDeleteId) confirmDeleteRef.current?.focus()
  }, [pendingDeleteId])

  const save = (next: FieldObservation[]) => {
    try {
      writeFieldObservations(point, next)
      setItems(next)
      setError('')
      return true
    } catch {
      setError('Enregistrement impossible dans le stockage local de ce navigateur.')
      return false
    }
  }

  const addObservation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    if (items.length >= FIELD_OBSERVATION_LIMIT) { setError('Le journal a atteint sa limite. Exportez le CSV puis supprimez des entrées avant d’en ajouter une nouvelle.'); return }
    const detail = note.trim()
    if (!detail) { setError('Ajoutez une observation avant de l’enregistrer.'); return }
    if (!date || Number.isNaN(Date.parse(`${date}T12:00:00`))) { setError('Choisissez une date valide.'); return }
    setSaving(true)
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
    try {
      if (photo) await saveFieldObservationPhoto(id, photo)
      const entry: FieldObservation = { id, date, kind, crop: crop.trim(), note: detail, author: author.trim(), ...(photo ? { photoId: id } : {}) }
      const nextItems = [entry, ...items].sort((a, b) => b.date.localeCompare(a.date)).slice(0, FIELD_OBSERVATION_LIMIT)
      if (!save(nextItems)) {
        if (photo) await deleteFieldObservationPhoto(id).catch(() => undefined)
        return
      }
      const retainedPhotoIds = new Set(nextItems.flatMap(item => item.photoId ? [item.photoId] : []))
      void Promise.all(items.filter(item => item.photoId && !retainedPhotoIds.has(item.photoId)).map(item => deleteFieldObservationPhoto(item.photoId!)))
        .catch(() => setError('La note a été ajoutée, mais une ancienne photo n’a pas pu être retirée du stockage local.'))
      setNote('')
      setPhoto(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La photo n’a pas pu être enregistrée localement.')
    } finally {
      setSaving(false)
    }
  }

  const deleteObservation = (id: string) => {
    const item = items.find(entry => entry.id === id)
    if (!save(items.filter(entry => entry.id !== id))) return
    if (item?.photoId) void deleteFieldObservationPhoto(item.photoId).catch(() => setError('La note est supprimée, mais la photo locale n’a pas pu être retirée du stockage.'))
    setPendingDeleteId(null)
    window.requestAnimationFrame(() => {
      const nextDeleteButton = document.querySelector<HTMLButtonElement>('.terrain-observation-list li button[aria-label^="Supprimer"]')
      if (nextDeleteButton) nextDeleteButton.focus()
      else listHeadingRef.current?.focus()
    })
  }

  const cancelDelete = () => {
    const cancelledId = pendingDeleteId
    setPendingDeleteId(null)
    window.requestAnimationFrame(() => {
      if (cancelledId) deleteTriggerRefs.current.get(cancelledId)?.focus()
    })
  }

  return <div className="terrain-observations">
    <div className="terrain-observations-disclaimer"><ClipboardList size={14} /><span>Notes et photos déclarées par vous, enregistrées sur cet appareil. Les photos sont redimensionnées; rien n’est envoyé à la NASA ni au serveur.</span></div>
    <form className="terrain-observation-form" onSubmit={addObservation}>
      <div className="terrain-observation-fields">
        <label>Type<select value={kind} onChange={event => setKind(event.target.value as ObservationKind)}>{(['semis', 'recolte', 'irrigation', 'note'] as const).map(value => <option key={value} value={value}>{fieldObservationKindLabel(value)}</option>)}</select></label>
        <label>Date<input type="date" value={date} onChange={event => setDate(event.target.value)} required /></label>
        <label>Culture <span>(facultatif)</span><input value={crop} onChange={event => setCrop(event.target.value)} maxLength={80} placeholder="Ex. blé d’hiver" /></label>
        <label>Auteur <span>(facultatif)</span><input value={author} onChange={event => setAuthor(event.target.value)} maxLength={80} placeholder="Votre nom" /></label>
      </div>
      <label className="terrain-observation-note-label">Observation<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={1000} rows={3} placeholder="Décrivez ce que vous avez observé ou réalisé…" required /></label>
      <div className="terrain-observation-photo-control">
        <label className="terrain-observation-photo-button"><ImagePlus size={13} />{photo ? 'Changer la photo' : 'Ajouter une photo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { setPhoto(event.target.files?.[0] ?? null); event.currentTarget.value = '' }} /></label>
        <span>JPEG, PNG ou WebP · 12 Mo max.</span>
        {photoPreview && <div className="terrain-observation-photo-preview"><img src={photoPreview} alt="Aperçu de la photo de terrain à joindre" /><button type="button" aria-label="Retirer la photo" onClick={() => setPhoto(null)}><X size={13} /></button></div>}
      </div>
      {error && <p className="terrain-observation-error" role="alert">{error}</p>}
      <button className="terrain-observation-submit" type="submit" disabled={items.length >= FIELD_OBSERVATION_LIMIT || saving}><Plus size={14} />{saving ? 'Enregistrement…' : 'Enregistrer l’observation'}</button>
    </form>
    <div ref={listHeadingRef} className="terrain-observation-list-heading" tabIndex={-1}><strong>Historique de ce point</strong><span>{items.length} / {FIELD_OBSERVATION_LIMIT}</span><button type="button" onClick={() => downloadFieldObservationsCsv(items)} disabled={!items.length}><Download size={12} />Exporter CSV</button></div>
    {items.length === 0 ? <p className="terrain-observations-empty">Aucune observation enregistrée pour ce point. Vos notes resteront séparées des données NASA.</p> : <ol className="terrain-observation-list">{items.map(item => <li key={item.id}>
      <div className="terrain-observation-meta"><span className={`terrain-observation-kind kind-${item.kind}`}>{fieldObservationKindLabel(item.kind)}</span><span><CalendarDays size={11} />{formatDate(item.date)}</span>{item.author && <span>· {item.author}</span>}
        {pendingDeleteId === item.id
          ? <span className="terrain-observation-delete-confirm" role="group" aria-label={`Confirmer la suppression de la note du ${formatDate(item.date)}`}><span>Supprimer ?</span><button ref={confirmDeleteRef} type="button" onClick={() => deleteObservation(item.id)}>Confirmer</button><button type="button" onClick={cancelDelete}>Annuler</button></span>
          : <button ref={node => { if (node) deleteTriggerRefs.current.set(item.id, node); else deleteTriggerRefs.current.delete(item.id) }} type="button" aria-label={`Supprimer la note du ${formatDate(item.date)}`} onClick={() => setPendingDeleteId(item.id)}><Trash2 size={13} /></button>}
      </div>
      {item.crop && <strong className="terrain-observation-crop">{item.crop}</strong>}
      {item.photoId && photoUrls[item.id] && <img className="terrain-observation-photo" src={photoUrls[item.id]} alt={`Photo jointe à l’observation du ${formatDate(item.date)}`} loading="lazy" />}
      <p>{item.note}</p>
    </li>)}</ol>}
  </div>
}
