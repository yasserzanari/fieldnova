import { Check, FileSpreadsheet, LockKeyhole, Save, X } from 'lucide-react'
import type { GeoPoint } from '../../lib/geo/location'
import type { SoilAnalysisCsvImport } from '../../lib/farm/soil-analysis-csv'
import type { SoilTexture } from '../../lib/farm/soil-profile'

export type AssistantSoilImport = SoilAnalysisCsvImport & {
  fileName: string
  point: GeoPoint
  state: 'ready' | 'saved'
  archived?: boolean
  error?: string
}

type Props = {
  value: AssistantSoilImport
  onApply: () => void
  onDismiss: () => void
}

const textureLabels: Record<SoilTexture, string> = {
  sandy: 'Sableux',
  loamy: 'Limoneux',
  clayey: 'Argileux',
  unknown: 'Inconnu',
}

function number(value: number | undefined, suffix = '') {
  return value === undefined ? '—' : `${value.toLocaleString('fr-FR')}${suffix}`
}

export function AssistantSoilImportCard({ value, onApply, onDismiss }: Props) {
  const dateLabel = value.sampleDate
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value.sampleDate}T12:00:00Z`))
    : 'Date non indiquée'

  return (
    <section className="assistant-soil-import" aria-label="Aperçu de l’analyse de sol CSV">
      <header className="assistant-soil-import-head">
        <span className="assistant-soil-import-icon"><FileSpreadsheet size={16} /></span>
        <span><strong>{value.state === 'saved' ? 'Analyse ajoutée au profil' : 'Aperçu · analyse de sol'}</strong><small>{value.fileName} · {value.rowCount} horizon(s)</small></span>
        {value.state === 'saved' && <Check className="assistant-soil-import-success" size={16} aria-label="Enregistré" />}
      </header>
      <div className="assistant-soil-import-meta"><span>{value.laboratory || 'Laboratoire non indiqué'}</span><span>{dateLabel}</span>{value.samplingMethod && <span>{value.samplingMethod}</span>}</div>
      <div className="assistant-soil-import-table-wrap">
        <table className="assistant-soil-import-table">
          <thead><tr><th>Profondeur</th><th>Texture</th><th>pH</th><th>Matière org.</th></tr></thead>
          <tbody>{value.horizons.map((horizon, index) => <tr key={`${horizon.topCm}-${horizon.bottomCm}-${index}`}>
            <td>{horizon.topCm}–{horizon.bottomCm} cm</td>
            <td>{horizon.texture ? textureLabels[horizon.texture] : '—'}</td>
            <td>{number(horizon.ph)}</td>
            <td>{number(horizon.organicMatterPercent, ' %')}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className="assistant-soil-import-note"><LockKeyhole size={12} /> Aperçu local · rien n’est transmis. Confirmer remplacera les horizons du point suivi et conservera les caractéristiques générales.</p>
      {value.error && <p className="assistant-soil-import-error" role="alert">{value.error}</p>}
      {value.state === 'saved'
        ? <p className="assistant-soil-import-saved">{value.archived ? 'Échantillon archivé dans l’historique local.' : 'Horizons enregistrés localement. La date ou la méthode manque pour archiver l’échantillon.'}</p>
        : <footer className="assistant-soil-import-actions"><button type="button" className="assistant-soil-import-dismiss" onClick={onDismiss}><X size={13} /> Ignorer</button><button type="button" className="assistant-soil-import-apply" onClick={onApply}><Save size={13} /> Ajouter au profil</button></footer>}
    </section>
  )
}
