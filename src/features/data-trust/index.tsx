import { Database } from 'lucide-react'
import { FeaturePlaceholder } from '../shared/FeaturePlaceholder'
import { concepts } from '../shared/concepts'

export function DataTrustPage() {
  return <FeaturePlaceholder title="Données & confiance" description="Comprenez les sources, la couverture et les limites des données." icon={Database} concept={concepts.dataTrust} />
}
