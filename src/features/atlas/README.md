# Atlas

- **Route :** `/app/atlas`
- **Carte :** carte MapLibre partagée avec la vue d’ensemble : fond OpenStreetMap, True Color MODIS/Terra et NDVI MODIS/Terra via NASA GIBS. Les contrôles de fond, de couche et de date changent les tuiles réellement affichées.
- **Point suivi :** clic sur la carte, coordonnées saisies (latitude puis longitude) ou géolocalisation du navigateur. Le point est persisté et partagé avec les autres cartes de l’application.
- **Graphique :** série mensuelle NASA POWER (`PRECTOTCORR`, `T2M`) associée à la maille météo MERRA-2 la plus proche. Le sélecteur limite le graphique aux 3, 6 ou 12 derniers mois disponibles.
- **Empreinte météo :** lorsque la série du point courant est chargée, la carte dessine les limites de sa maille MERRA-2 native (0,5° × 0,625°) et affiche son centre et sa taille approximative. L’empreinte ne représente pas le pixel NDVI ni une parcelle agricole.
- **Limites :** l’API POWER reçoit la coordonnée demandée et ne renvoie pas le centre de la maille; FieldNova dérive le centre de grille natif MERRA-2 de plus proche voisin à partir de la grille documentée. Aucune parcelle n’est inventée. NASA POWER fournit ici une estimation climatique à la grille, et le NDVI GIBS est un produit satellitaire reprojeté ; ni l’un ni l’autre ne donne une mesure à la parcelle.
- **Connexion lente :** la requête mensuelle est annulée au changement de point et expire après 20 secondes. Si NASA POWER ne répond pas, une série locale antérieure de moins de six mois reste consultable avec l’état « copie locale ancienne »; sans cache exploitable, l’erreur et le bouton de nouvel essai apparaissent. Les mois de la série conservent leurs propres dates.
