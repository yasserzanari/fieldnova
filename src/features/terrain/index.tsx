import { Layers3 } from 'lucide-react'
import { FeaturePlaceholder } from '../shared/FeaturePlaceholder'
import { concepts } from '../shared/concepts'

export function TerrainPage() {
  return <FeaturePlaceholder title="Mon terrain" description="Retrouvez les parcelles, le sol et l’historique cultural." icon={Layers3} concept={concepts.terrain} />
}
