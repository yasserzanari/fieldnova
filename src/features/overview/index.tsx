import { House } from 'lucide-react'
import { FeaturePlaceholder } from '../shared/FeaturePlaceholder'
import { concepts } from '../shared/concepts'

export function OverviewPage() {
  return <FeaturePlaceholder title="Vue d’ensemble" description="La situation climatique et culturale de votre exploitation." icon={House} concept={concepts.overview} />
}
