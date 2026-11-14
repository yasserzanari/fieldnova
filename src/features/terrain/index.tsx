import { Layers3 } from 'lucide-react'
import { FeaturePlaceholder } from '../shared/FeaturePlaceholder'

export function TerrainPage() {
  return <FeaturePlaceholder title="Mon terrain" description="Retrouvez les parcelles, le sol et l’historique cultural." icon={Layers3} concept="/ui-concepts/03-mon-terrain.png" />
}
