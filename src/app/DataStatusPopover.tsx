import { useEffect, useRef, type KeyboardEvent } from 'react'
import { Activity, Database, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { PowerMonthlySeries } from '../lib/nasa/power'
import './data-status-popover.css'

function deliveryLabel(series: PowerMonthlySeries | null) {
  if (!series) return 'Aucune série chargée'
  return ({
    network: 'Reçue pendant cette session',
    'fresh-cache': 'Copie locale récente · moins de 15 min',
    'stale-cache': 'Copie locale ancienne · mise à jour non confirmée',
    'demo-fixture': 'Extrait NASA POWER de démonstration hors ligne',
  } satisfies Record<PowerMonthlySeries['deliveryMode'], string>)[series.deliveryMode]
}

export function DataStatusPopover({ series, latestDate, loading, error }: {
  series: PowerMonthlySeries | null
  latestDate?: string
  loading: boolean
  error: string | null
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const triggerRef = useRef<HTMLElement>(null)
  const status = loading ? 'Chargement' : !series ? error ? 'Indisponible' : 'En attente' : series.deliveryMode === 'demo-fixture' ? 'Extrait démo' : series.deliveryMode === 'stale-cache' ? 'Copie ancienne' : series.deliveryMode === 'fresh-cache' ? 'Cache récent' : 'En ligne'
  const tone = !series && error ? 'is-error' : series?.deliveryMode === 'demo-fixture' ? 'is-demo' : series?.deliveryMode === 'stale-cache' ? 'is-stale' : loading ? 'is-loading' : 'is-ready'
  const fetchedAt = series ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(series.fetchedAt)) : undefined
  const period = series?.requestedMonths.length ? `${series.requestedMonths[0]} – ${series.requestedMonths.at(-1)}` : undefined

  useEffect(() => {
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !detailsRef.current?.contains(event.target)) {
        if (detailsRef.current) detailsRef.current.open = false
      }
    }
    window.addEventListener('pointerdown', dismissOutside)
    return () => window.removeEventListener('pointerdown', dismissOutside)
  }, [])

  const close = () => { if (detailsRef.current) detailsRef.current.open = false }
  const onKeyDown = (event: KeyboardEvent<HTMLDetailsElement>) => {
    if (event.key === 'Escape' && detailsRef.current?.open) {
      event.preventDefault()
      close()
      triggerRef.current?.focus()
    }
  }

  return <details ref={detailsRef} className="data-status-details" onKeyDown={onKeyDown}>
    <summary ref={triggerRef} className="icon-button data-status-trigger" aria-label={`État des données NASA : ${status}`} title={`État des données NASA : ${status}`}>
      <Database size={18} aria-hidden="true" /><span className={`data-status-dot ${tone}`} aria-hidden="true" />
    </summary>
    <section className="data-status-popover" aria-label="État et provenance de la série NASA POWER">
      <header><span><Activity size={15} /> État des données</span><strong className={`data-status-label ${tone}`}>{status}</strong></header>
      <p className="data-status-product">NASA POWER · série mensuelle</p>
      <dl>
        <div><dt>Dernier mois exploitable</dt><dd>{latestDate ?? 'Aucune valeur complète'}</dd></div>
        {period && <div><dt>Période demandée</dt><dd>{period}</dd></div>}
        {series && <div><dt>Récupérée</dt><dd>{fetchedAt} UTC</dd></div>}
        {series && <div><dt>Maille MERRA-2</dt><dd>{series.gridPoint.latitude.toFixed(3)}, {series.gridPoint.longitude.toFixed(3)} · {series.gridCell.properties.widthKm.toFixed(0)} × {series.gridCell.properties.heightKm.toFixed(0)} km env.</dd></div>}
        {series && <div><dt>Source déclarée par le service</dt><dd>{series.source.join(' + ') || 'Non précisée'}</dd></div>}
      </dl>
      <p className="data-status-delivery">{deliveryLabel(series)}. La maille météo est distincte du point cliqué et d’une parcelle.</p>
      {error && <p className="data-status-error" role="status">Actualisation : {error}</p>}
      <nav aria-label="Détails des données">
        <Link to="/app/atlas" onClick={close}>Ouvrir les séries NASA <ExternalLink size={13} /></Link>
        <Link to="/app/data-trust" onClick={close}>Sources et limites <ExternalLink size={13} /></Link>
      </nav>
    </section>
  </details>
}
