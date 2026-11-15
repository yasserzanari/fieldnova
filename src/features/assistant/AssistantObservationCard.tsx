import { useState, type FormEvent } from 'react'
import { Check, ClipboardList, Save, X } from 'lucide-react'
import type { ObservationKind } from '../../lib/farm/field-observations'

export type AssistantObservationDraft = {
  date: string
  kind: ObservationKind
  crop: string
  note: string
  author: string
  state: 'ready' | 'saved'
  error?: string
}

type Props = {
  value: AssistantObservationDraft
  onSave: (value: Omit<AssistantObservationDraft, 'state' | 'error'>) => void
  onDismiss: () => void
}

const kindLabels: Record<ObservationKind, string> = { semis: 'Semis', recolte: 'Récolte', irrigation: 'Irrigation', note: 'Note' }

export function AssistantObservationCard({ value, onSave, onDismiss }: Props) {
  const [draft, setDraft] = useState(value)
  const update = (patch: Partial<AssistantObservationDraft>) => setDraft(current => ({ ...current, ...patch }))
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSave({ date: draft.date, kind: draft.kind, crop: draft.crop.trim(), note: draft.note.trim(), author: draft.author.trim() })
  }

  return <section className={`assistant-observation-card ${value.state === 'saved' ? 'is-saved' : ''}`} aria-label="Confirmation d’une observation de terrain">
    <header><span><ClipboardList size={15} /><strong>{value.state === 'saved' ? 'Ajoutée au journal local' : 'Vérifier avant d’ajouter'}</strong></span>{value.state === 'saved' && <Check size={15} aria-label="Enregistrée" />}</header>
    {value.state === 'saved' ? <p className="assistant-observation-status">Observation enregistrée sur cet appareil pour le point utilisé par cette réponse.</p> : <form onSubmit={submit}>
      <div className="assistant-observation-fields">
        <label>Type<select value={draft.kind} onChange={event => update({ kind: event.target.value as ObservationKind })}>{(['semis', 'recolte', 'irrigation', 'note'] as const).map(kind => <option key={kind} value={kind}>{kindLabels[kind]}</option>)}</select></label>
        <label>Date<input type="date" value={draft.date} onChange={event => update({ date: event.target.value })} required /></label>
        <label>Culture <span>(facultatif)</span><input value={draft.crop} onChange={event => update({ crop: event.target.value })} maxLength={80} /></label>
        <label>Auteur <span>(facultatif)</span><input value={draft.author} onChange={event => update({ author: event.target.value })} maxLength={80} /></label>
      </div>
      <label className="assistant-observation-note">Observation<textarea value={draft.note} onChange={event => update({ note: event.target.value })} maxLength={1000} rows={3} required /></label>
      <p className="assistant-observation-privacy">Aucune entrée ne sera ajoutée avant votre confirmation. Le journal reste sur cet appareil.</p>
      {value.error && <p className="assistant-observation-error" role="alert">{value.error}</p>}
      <footer><button className="assistant-observation-dismiss" type="button" onClick={onDismiss}><X size={13} />Annuler</button><button className="assistant-observation-save" type="submit"><Save size={13} />Ajouter au journal</button></footer>
    </form>}
  </section>
}
