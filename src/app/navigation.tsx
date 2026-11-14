import { BarChart3, Bot, Database, Globe2, House, Layers3, Leaf } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import { OverviewPage } from '../features/overview'
import { AtlasPage } from '../features/atlas'
import { TerrainPage } from '../features/terrain'
import { ScenariosPage } from '../features/scenarios'
import { AssistantPage } from '../features/assistant'
import { DataTrustPage } from '../features/data-trust'

export type FeatureRoute = {
  path: string
  label: string
  icon: LucideIcon
  Component: ComponentType
}

export const featureRoutes: FeatureRoute[] = [
  { path: 'overview', label: 'Vue d’ensemble', icon: House, Component: OverviewPage },
  { path: 'atlas', label: 'Atlas', icon: Globe2, Component: AtlasPage },
  { path: 'terrain', label: 'Mon terrain', icon: Layers3, Component: TerrainPage },
  { path: 'scenarios', label: 'Scénarios', icon: BarChart3, Component: ScenariosPage },
  { path: 'assistant', label: 'Assistant', icon: Bot, Component: AssistantPage },
  { path: 'data-trust', label: 'Données & confiance', icon: Database, Component: DataTrustPage },
]

export const crops = [
  { label: 'Maïs', icon: Leaf },
]
