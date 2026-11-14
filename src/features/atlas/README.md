# Atlas

- **Route :** `/app/atlas`
- **Entrée :** `index.tsx`
- **Objectif :** explorer le fond de carte, les parcelles, les couches thématiques et les dates d’acquisition dans un seul espace.
- **Interactions :** recherche de parcelle, sélection par carte/panneau, déplacement et zoom, fond satellite/relief, activation des couches, légende, navigation temporelle et période d’historique.
- **Données :** parcelles, frontières, NDVI, valeurs de couche et dates sont des exemples locaux. L’interface dit explicitement que les produits NASA ne sont pas raccordés ; elle ne revendique aucune mesure, couverture ni fraîcheur satellitaire réelle.
- **Graphique :** `AtlasChart.tsx` reprend la composition du graphique Recharts archivée dans FrontUI et réutilise les primitives de `src/components/charts/chart.tsx`.
- **Carte :** le fond image est décoratif et n’est pas géoréférencé. Les commandes de déplacement/zoom servent à la démo visuelle ; elles ne calculent pas de coordonnées.
- **À raccorder :** catalogue de tuiles et acquisitions NASA, reprojection, date/qualité de scène, limites cadastrales et légendes physiques validées.
