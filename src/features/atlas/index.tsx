import { Globe2 } from 'lucide-react'
import { FeaturePlaceholder } from '../shared/FeaturePlaceholder'
import { concepts } from '../shared/concepts'

export function AtlasPage() {
  return <FeaturePlaceholder title="Atlas" description="Explorez les couches et les observations de vos parcelles." icon={Globe2} concept={concepts.atlas} />
}
