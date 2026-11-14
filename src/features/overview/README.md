# Vue d’ensemble

- **Route :** `/app/overview`
- **Carte :** MapLibre avec fond OpenStreetMap, imagerie MODIS/Terra True Color et couche NDVI 8 jours servies par NASA GIBS. La carte se déplace, zoome, accepte une sélection de point au clic et permet de saisir des coordonnées ou de demander la position du navigateur.
- **Données climatiques :** séries mensuelles NASA POWER pour le point sélectionné (`PRECTOTCORR`, `T2M`, `T2M_MAX`, `T2M_MIN`, `GWETROOT`). Les valeurs de remplissage NASA sont ignorées. L’API interroge la coordonnée choisie; FieldNova dérive le centre MERRA-2 de plus proche voisin depuis la grille native documentée et en affiche l’empreinte de 0,5° × 0,625° sur la carte.
- **Graphiques :** précipitations moyennes quotidiennes mensuelles, température moyenne et humidité racinaire modélisée ; les tracés proviennent directement des séries NASA reçues. Les infobulles SVG exposent la valeur exacte et la période.
- **Persistance :** le point choisi est mémorisé en local et partagé entre onglets via `useSelectedLocation`.
- **Profil de ferme :** le bouton dans l’en-tête ouvre un parcours de cinq étapes pour confirmer le point, saisir le nom, les cultures actuelles connues, l’accès à l’eau, les restrictions déclarées, les cultures à exclure et la priorité de comparaison. Le profil et les réglages sont enregistrés par point dans le navigateur. Les cultures d’exemple ne sont pas reprises comme historique de l’utilisateur; les champs inconnus restent vides.
- **Sol local :** le parcours indique si des caractéristiques de sol existent déjà pour ce point et ouvre « Mon terrain » pour les consulter ou les saisir. Il ne duplique pas les mesures du profil de sol.
- **Limite métier :** le centre par défaut est une position de départ en France, pas une ferme connue. Un point de carte et une cellule NASA ne sont pas des limites ou une mesure de parcelle. `GWETROOT` est un indicateur modélisé, pas une sonde de terrain.
- **Exemple sans compte :** depuis l’accueil public, `/demo` prépare un cas de ferme fictive pour le parcours de démonstration. Le bandeau global précise que le profil est fictif et que NASA POWER reste réel; quitter la démo restaure les profils locaux présents avant le lancement.
- **Dépendances partagées :** `src/components/maps/FieldMap.tsx`, `src/lib/geo/location.ts`, `src/lib/nasa/power.ts`.
