import { Bot } from 'lucide-react'
import { FeaturePlaceholder } from '../shared/FeaturePlaceholder'
import { concepts } from '../shared/concepts'

export function AssistantPage() {
  return <FeaturePlaceholder title="Assistant" description="Discutez avec un assistant relié au contexte de vos parcelles." icon={Bot} concept={concepts.assistant} />
}
