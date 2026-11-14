# Atlas

- **Route :** `/app/atlas`
- **Carte :** carte MapLibre partagée avec la vue d’ensemble : fond OpenStreetMap, True Color MODIS/Terra et NDVI MODIS/Terra via NASA GIBS. Les contrôles de fond, de couche et de date changent les tuiles réellement affichées.
- **Point suivi :** clic sur la carte, coordonnées saisies (latitude puis longitude) ou géolocalisation du navigateur. Le point est persisté et partagé avec les autres cartes de l’application.
- **Graphique :** série mensuelle NASA POWER (`PRECTOTCORR`, `T2M`) pour la cellule de grille correspondante. Le sélecteur limite le graphique aux 3, 6 ou 12 derniers mois disponibles.
- **Limites :** aucune parcelle n’est inventée. NASA POWER fournit ici une estimation climatique à la grille, et le NDVI GIBS est un produit satellitaire reprojeté ; ni l’un ni l’autre ne donne une mesure à la parcelle.
