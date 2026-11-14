# Vue d’ensemble

- **Route :** `/app/overview`
- **Carte :** MapLibre avec fond OpenStreetMap, imagerie MODIS/Terra True Color et couche NDVI 8 jours servies par NASA GIBS. La carte se déplace, zoome, accepte une sélection de point au clic et permet de saisir des coordonnées ou de demander la position du navigateur.
- **Données climatiques :** séries mensuelles NASA POWER pour le point sélectionné (`PRECTOTCORR`, `T2M`, `T2M_MAX`, `T2M_MIN`, `GWETROOT`). Les valeurs de remplissage NASA sont ignorées. Le point est rapproché de la cellule de grille renvoyée par l’API.
- **Graphiques :** précipitations moyennes quotidiennes mensuelles, température moyenne et humidité racinaire modélisée ; les tracés proviennent directement des séries NASA reçues. Les infobulles SVG exposent la valeur exacte et la période.
- **Persistance :** le point choisi est mémorisé en local et partagé entre onglets via `useSelectedLocation`.
- **Limite métier :** le centre par défaut est une position de départ en France, pas une ferme connue. Un point de carte et une cellule NASA ne sont pas des limites ou une mesure de parcelle. `GWETROOT` est un indicateur modélisé, pas une sonde de terrain.
- **Dépendances partagées :** `src/components/maps/FieldMap.tsx`, `src/lib/geo/location.ts`, `src/lib/nasa/power.ts`.
