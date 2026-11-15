import { useEffect, useRef, useState } from 'react'
import { Tractor, X } from 'lucide-react'
import { farmOperations, operationAvailabilityLabels, type FarmOperationProfile, type FarmOperationId, type OperationAvailability } from '../../lib/farm/operation-availability'

const availabilityOptions: OperationAvailability[] = ['unknown', 'on-farm', 'contractor', 'unavailable']

export function FarmOperationsEditor({ open, value, onSave, onClose }: { open: boolean; value: FarmOperationProfile; onSave: (value: FarmOperationProfile) => void; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState<FarmOperationProfile>(value)
  const [error, setError] = useState('')

  useEffect(() => { setDraft(value); setError('') }, [value, open])
  useEffect(() => {
    const dialog = dialogRef.current
    if (open && dialog && !dialog.open) dialog.showModal()
    if (!open && dialog?.open) dialog.close()
  }, [open])

  const update = (id: FarmOperationId, changes: Partial<FarmOperationProfile[FarmOperationId]>) => setDraft(current => ({ ...current, [id]: { ...current[id], ...changes } }))
  const save = () => {
    try { onSave(draft); dialogRef.current?.close() } catch { setError('La sauvegarde locale a échoué. Vérifiez l’espace disponible du navigateur.') }
  }

  return <dialog ref={dialogRef} className="rotation-evidence-dialog rotation-calendar-dialog" aria-labelledby="farm-operations-title" onClose={onClose} onClick={event => { if (event.target === dialogRef.current) dialogRef.current?.close() }}>
    <div className="rotation-evidence-content">
      <header><div><span className="rotation-panel-icon goal"><Tractor size={15} /></span><span><h2 id="farm-operations-title">Matériel et opérations</h2><small>Déclarations locales · point suivi</small></span></div><button type="button" aria-label="Fermer les opérations de ferme" onClick={() => dialogRef.current?.close()}><X size={17} /></button></header>
      <p className="rotation-calendar-disclaimer">Indiquez si chaque opération est couverte par votre matériel, un prestataire, ou indisponible. Les données restent sur cet appareil. FieldNova ne déduit pas les besoins d’une culture et ne juge pas une rotation.</p>
      <div className="rotation-calendar-crop-list farm-operation-list">{farmOperations.map(operation => {
        const entry = draft[operation.id]
        return <section className="rotation-calendar-crop farm-operation-row" key={operation.id} aria-label={operation.label}>
          <h3>{operation.label}<small>{operationAvailabilityLabels[entry.availability]}</small></h3>
          <div className="rotation-calendar-source"><label>Disponibilité<select aria-label={`Disponibilité · ${operation.label}`} value={entry.availability} onChange={event => update(operation.id, { availability: event.target.value as OperationAvailability })}>{availabilityOptions.map(option => <option key={option} value={option}>{operationAvailabilityLabels[option]}</option>)}</select></label><label>Matériel ou prestataire<input aria-label={`Matériel ou prestataire · ${operation.label}`} maxLength={80} value={entry.equipment ?? ''} onChange={event => update(operation.id, { equipment: event.target.value })} placeholder="Ex. semoir 3 m, ETA…" /></label></div>
          <label className="farm-operation-note">Précision facultative<input aria-label={`Précision · ${operation.label}`} maxLength={160} value={entry.note ?? ''} onChange={event => update(operation.id, { note: event.target.value })} placeholder="Ex. partagé avec une ferme voisine" /></label>
        </section>
      })}</div>
      {error && <p className="rotation-save-error" role="alert">{error}</p>}
      <footer className="rotation-calendar-actions"><button type="button" onClick={() => dialogRef.current?.close()}>Annuler</button><button type="button" onClick={save}>Enregistrer sur cet appareil</button></footer>
    </div>
  </dialog>
}
