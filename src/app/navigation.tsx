import { BarChart3, Bot, Database, Globe2, House, Layers3, Leaf } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { lazy, type ComponentType } from 'react'

const OverviewPage = lazy(() => import('../features/overview').then(module => ({ default: module.OverviewPage })))
const AtlasPage = lazy(() => import('../features/atlas').then(module => ({ default: module.AtlasPage })))
const TerrainPage = lazy(() => import('../features/terrain').then(module => ({ default: module.TerrainPage })))
const ScenariosPage = lazy(() => import('../features/scenarios').then(module => ({ default: module.ScenariosPage })))
const AssistantPage = lazy(() => import('../features/assistant').then(module => ({ default: module.AssistantPage })))
const DataTrustPage = lazy(() => import('../features/data-trust').then(module => ({ default: module.DataTrustPage })))

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
