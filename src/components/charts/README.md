# Primitives de graphique

`chart.tsx` est une copie de travail des primitives Recharts fournies dans l’archive FrontUI `data-visualization/charts/recharts-chart`. Le code de l’archive est conservé ; seul l’import du helper `cn` est adapté au chemin relatif du projet.

La composition du graphique est dans `src/features/overview/ClimateChart.tsx`. Elle garde la structure du graphique de référence (courbe observée, aire dégradée, médiane en pointillés, repère courant et infobulle) et adapte seulement les libellés, unités et lignes de données.
