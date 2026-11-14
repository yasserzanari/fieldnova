# Mon terrain

- **Route :** `/app/terrain`
- **Carte :** carte interactive partagée avec l’overview et l’Atlas ; fond OpenStreetMap ou MODIS/Terra True Color via GIBS. Les couches NASA SMAP L4 montrent l’humidité analysée de surface ou de la zone racinaire. Ces produits sont modélisés à une grille d’environ 9 km et ne sont pas des mesures à la parcelle.
- **Séries numériques :** NASA POWER mensuel pour le point choisi, avec `GWETTOP` (humidité relative de surface) et `GWETROOT` (humidité relative de la zone racinaire). Ces champs proviennent d’un modèle distinct de la couche SMAP affichée sur la carte.
- **Point :** clic sur la carte, coordonnées partagées entre les écrans, ou géolocalisation du navigateur. POWER retourne le point de grille utilisé pour les séries.
- **Composition du sol :** texture, pH, carbone organique et réserve utile restent « non fournis » tant qu’aucune analyse de sol ou source pédologique exploitable n’est liée à ce point. Aucune parcelle ni aucun échantillon ne sont simulés.
- **Dépendances partagées :** `src/components/maps/FieldMap.tsx`, `src/components/charts/PowerClimateChart.tsx`, `src/lib/nasa/power.ts`.
