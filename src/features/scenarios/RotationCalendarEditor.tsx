import { useEffect, useRef, useState } from 'react'
import { CalendarDays, X } from 'lucide-react'
import type { CropDefinition } from './rotation-model'
import { formatCropMonthWindow, hasCropCalendarData, type CropCalendar, type CropCalendarEntry, type CropMonthWindow } from './crop-calendar'

const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function WindowFields({ crop, kind, value, onChange }: { crop: CropDefinition; kind: 'sowing' | 'harvest'; value?: CropMonthWindow; onChange: (value: CropMonthWindow | undefined) => void }) {
  const label = kind === 'sowing' ? 'Semis' : 'Récolte'
  const [startMonth, setStartMonth] = useState(value?.startMonth ? String(value.startMonth) : '')
  const [endMonth, setEndMonth] = useState(value?.endMonth ? String(value.endMonth) : '')
  useEffect(() => { setStartMonth(value?.startMonth ? String(value.startMonth) : ''); setEndMonth(value?.endMonth ? String(value.endMonth) : '') }, [value?.startMonth, value?.endMonth])
  const select = (edge: 'startMonth' | 'endMonth', edgeLabel: string) => <label>{edgeLabel}<select aria-label={`${label} ${edgeLabel.toLocaleLowerCase()} · ${crop.label}`} value={edge === 'startMonth' ? startMonth : endMonth} onChange={event => {
    const start = edge === 'startMonth' ? event.target.value : startMonth
    const end = edge === 'endMonth' ? event.target.value : endMonth
    if (edge === 'startMonth') setStartMonth(start)
    else setEndMonth(end)
    onChange(start && end ? { startMonth: Number(start), endMonth: Number(end) } : undefined)
  }}><option value="">—</option>{months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label>
  return <div className="rotation-calendar-window"><strong>{label}</strong>{select('startMonth', 'Début')}{select('endMonth', 'Fin')}</div>
}

export function RotationCalendarEditor({ open, crops, value, onSave, onClose }: { open: boolean; crops: CropDefinition[]; value: CropCalendar; onSave: (value: CropCalendar) => void; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState<CropCalendar>(value)
  const [error, setError] = useState('')

  useEffect(() => { setDraft(value); setError('') }, [value, open])
  useEffect(() => {
    const dialog = dialogRef.current
    if (open && dialog && !dialog.open) dialog.showModal()
    if (!open && dialog?.open) dialog.close()
  }, [open])

  const update = (id: string, changes: Partial<CropCalendarEntry>) => setDraft(current => ({ ...current, [id]: { ...current[id], ...changes } }))
  const save = () => {
    const invalidUrl = Object.values(draft).some(entry => {
      if (!entry.sourceUrl) return false
      try { const url = new URL(entry.sourceUrl); return url.protocol !== 'http:' && url.protocol !== 'https:' } catch { return true }
    })
    if (invalidUrl) { setError('Le lien source doit commencer par http:// ou https://.'); return }
    try { onSave(draft); dialogRef.current?.close() } catch { setError('La sauvegarde locale a échoué. Vérifiez l’espace disponible du navigateur.') }
  }

  return <dialog ref={dialogRef} className="rotation-evidence-dialog rotation-calendar-dialog" aria-labelledby="rotation-calendar-title" onClose={onClose} onClick={event => { if (event.target === dialogRef.current) dialogRef.current?.close() }}>
    <div className="rotation-evidence-content">
      <header><div><span className="rotation-panel-icon climate"><CalendarDays size={15} /></span><span><h2 id="rotation-calendar-title">Calendrier cultural local</h2><small>Point suivi · données saisies sur cet appareil</small></span></div><button type="button" aria-label="Fermer le calendrier" onClick={() => dialogRef.current?.close()}><X size={17} /></button></header>
      <p className="rotation-calendar-disclaimer">Renseignez des fenêtres issues de votre pratique ou d’une référence locale. Aucune date n’est préremplie; ces informations ne vérifient pas la faisabilité et ne modifient pas le classement.</p>
      <div className="rotation-calendar-crop-list">{crops.map(crop => {
        const entry = draft[crop.id] ?? {}
        return <section className="rotation-calendar-crop" key={crop.id} aria-label={`Calendrier de ${crop.label}`}>
          <h3>{crop.label}<small>{hasCropCalendarData(entry) ? 'Fenêtres renseignées' : 'Calendrier inconnu'}</small></h3>
          <div className="rotation-calendar-windows"><WindowFields crop={crop} kind="sowing" value={entry.sowing} onChange={sowing => update(crop.id, { sowing })} /><WindowFields crop={crop} kind="harvest" value={entry.harvest} onChange={harvest => update(crop.id, { harvest })} /></div>
          <div className="rotation-calendar-source"><label>Source / variété<input maxLength={120} aria-label={`Source ou variété · ${crop.label}`} value={entry.sourceName ?? ''} onChange={event => update(crop.id, { sourceName: event.target.value })} placeholder="Ex. calendrier de la coopérative" /></label><label>Lien source<input type="url" maxLength={500} aria-label={`Lien source · ${crop.label}`} value={entry.sourceUrl ?? ''} onChange={event => update(crop.id, { sourceUrl: event.target.value })} placeholder="https://…" /></label></div>
          <small className="rotation-calendar-summary">Semis : {formatCropMonthWindow(entry.sowing)} · Récolte : {formatCropMonthWindow(entry.harvest)}</small>
        </section>
      })}</div>
      {error && <p className="rotation-save-error" role="alert">{error}</p>}
      <footer className="rotation-calendar-actions"><button type="button" onClick={() => dialogRef.current?.close()}>Annuler</button><button type="button" onClick={save}>Enregistrer sur cet appareil</button></footer>
    </div>
  </dialog>
}
