# Vue d’ensemble

- **Route :** `/app/overview`
- **Entrée :** `index.tsx`
- **Objectif :** afficher la carte des parcelles, le contexte de la saison, les principaux signaux eau/climat, le profil de sol et le calendrier au même endroit sans défilement vertical du document.
- **Interactions :** sélectionner une parcelle sur la carte ou dans la liste, déplacer/zoomer/recentrer la carte, basculer la couche satellite/risque hydrique et choisir une étape du calendrier.
- **Données :** toutes les valeurs et limites de parcelles sont des données illustratives de démonstration. Elles ne sont pas des observations NASA ni des mesures de ferme.
- **Graphique :** `ClimateChart.tsx` adapte étroitement la composition Recharts archivée dans FrontUI à la pluie mensuelle observée et à une médiane de comparaison illustrative. L’archive `recharts-chart` fournit le conteneur et l’infobulle ; `recharts` fournit le rendu et le redimensionnement.
- **Source cartographique :** l’image `public/images/landing-fields.png` est un fond visuel de démonstration. La carte n’est pas géoréférencée et n’effectue aucun appel réseau.
- **Bookmarks évalués :** `Circular Split Roll` est une galerie orbitale épinglée au défilement ; `Market Heatmap` organise des valeurs boursières en treemap. Leur sémantique ne correspond pas aux parcelles agricoles ou à un panneau météo.
- **À raccorder :** polygones cadastraux, couches d’observation satellite, météo et références de sol avec provenance, période et niveau de confiance.
