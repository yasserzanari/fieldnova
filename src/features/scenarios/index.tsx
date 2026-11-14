import { BarChart3 } from 'lucide-react'
import { FeaturePlaceholder } from '../shared/FeaturePlaceholder'
import { concepts } from '../shared/concepts'

export function ScenariosPage() {
  return <FeaturePlaceholder title="Scénarios" description="Comparez des rotations et leurs effets sur votre ferme." icon={BarChart3} concept={concepts.scenarios} />
}
