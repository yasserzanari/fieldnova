# Mon terrain

- **Route :** `/app/terrain`
- **Carte :** carte interactive partagée avec l’overview et l’Atlas ; fond OpenStreetMap ou MODIS/Terra True Color via GIBS. Les couches NASA SMAP L4 montrent l’humidité analysée de surface ou de la zone racinaire. Ces produits sont modélisés à une grille d’environ 9 km et ne sont pas des mesures à la parcelle.
- **Séries numériques :** NASA POWER mensuel pour le point choisi, avec `GWETTOP` (humidité relative de surface) et `GWETROOT` (humidité relative de la zone racinaire). Ces champs proviennent d’un modèle distinct de la couche SMAP affichée sur la carte.
- **Point :** clic sur la carte, coordonnées partagées entre les écrans, ou géolocalisation du navigateur. POWER retourne le point de grille utilisé pour les séries.
- **Profil de sol local :** texture, pH, matière organique, profondeur utile et drainage peuvent être saisis et modifiés par l’utilisateur. L’origine déclarée (exploitation, laboratoire ou autre source), la référence et la date d’échantillon sont conservées avec le profil. FieldNova ne vérifie pas cette origine; les données restent locales et isolées par coordonnées suivies.
- **Composition du sol :** les champs non renseignés restent inconnus; aucune parcelle ni aucun échantillon ne sont simulés.
- **Dépendances partagées :** `src/components/maps/FieldMap.tsx`, `src/components/charts/PowerClimateChart.tsx`, `src/lib/nasa/power.ts`.
