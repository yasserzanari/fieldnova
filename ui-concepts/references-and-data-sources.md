# Sources, citations et limites de FieldNova

Dernière vérification documentaire : 14 novembre 2026. Ce registre distingue les données effectivement demandées par l’application des sources seulement référencées. Les valeurs affichées pour la ferme fictive de démonstration restent explicitement fictives.

## Sources actives

### NASA POWER — climat mensuel

- Service : [Monthly and Annual API](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/) ; route point utilisée : `https://power.larc.nasa.gov/api/temporal/monthly/point`.
- Paramètres demandés : `PRECTOTCORR`, `T2M`, `T2M_MAX`, `T2M_MIN`, `GWETTOP`, `GWETROOT`; communauté `AG`; sortie JSON; coordonnées du point suivi; période glissante de cinq années civiles.
- Les mois calendaires incomplets et les valeurs de remplissage sont écartés. Le client conserve les unités et noms de paramètres renvoyés, la source indiquée dans l’en-tête, le point interrogé et l’heure de récupération.
- Les paramètres météorologiques POWER sont dérivés de MERRA-2. Les valeurs mensuelles sont des agrégats de grille; elles ne sont ni une observation à la ferme, ni une mesure de parcelle, ni une prévision.
- FieldNova dérive le centre et l’empreinte approximative de la cellule MERRA-2 native de plus proche voisin (0,5° latitude × 0,625° longitude). L’API appelée par l’application ne renvoie pas la version du service : le tableau de bord l’indique et ne fabrique pas une valeur de version.
- Pour citer POWER dans une présentation : nommer NASA Langley Research Center et le projet POWER, l’API mensuelle, la date d’accès et la version si elle est fournie. Voir le [guide officiel de référence NASA POWER](https://power.larc.nasa.gov/docs/referencing/).

### NASA EOSDIS GIBS — couches cartographiques

FieldNova demande des tuiles à NASA GIBS pour les couches suivantes :

| Identifiant GIBS | Couche dans FieldNova | Information exposée |
|---|---|---|
| `MODIS_Terra_CorrectedReflectance_TrueColor` | Image MODIS | Date de l’image demandée; composition visuelle, pas une mesure de terrain |
| `MODIS_Terra_NDVI_8Day` | NDVI MODIS | Date demandée et périodicité de huit jours; valeur régionale, sans extraction de pixel-parcelle |
| `SMAP_L4_Analyzed_Surface_Soil_Moisture` | Humidité SMAP de surface | Date effective de la tuile `default` non récupérée par FieldNova |
| `SMAP_L4_Analyzed_Root_Zone_Soil_Moisture` | Humidité SMAP racinaire | Date effective de la tuile `default` non récupérée par FieldNova |

Le [catalogue GIBS](https://nasa-gibs.github.io/gibs-api-docs/available-visualizations/) documente pour chaque visualisation l’identifiant, la période, la résolution, les produits source et les dates disponibles. La [documentation avancée GIBS](https://nasa-gibs.github.io/gibs-api-docs/access-advanced-topics/) décrit les légendes publiées par le service; la carte FieldNova affiche ces échelles pour NDVI et SMAP. La composition True Color n’a pas d’échelle numérique. Une visualisation de tuile n’équivaut pas au téléchargement et à l’analyse du jeu de données scientifique sous-jacent. FieldNova n’en déduit actuellement ni état de culture, ni humidité de la parcelle, ni rendement.

Pour la famille SMAP, voir le [catalogue NSIDC DAAC SPL4SMGP](https://nsidc.org/data/spl4smgp) et son guide de citation. Il décrit un produit L4 global de sol de surface et zone racinaire à 9 km et à pas de trois heures. La version du jeu archivé ne doit pas être attribuée automatiquement à la tuile GIBS `default`.

## Fonds de carte

- Fond de rues : [© OpenStreetMap contributors](https://www.openstreetmap.org/copyright), attribution présente sur la carte.
- Rendu web : MapLibre GL JS; l’application utilise la bibliothèque pour afficher les fonds et couches raster.
- Le fond NASA et les couches MODIS/SMAP portent l’attribution NASA EOSDIS GIBS visible sur la carte.

## Sources référencées, non intégrées

- Sentinel-2 / Copernicus : aucun produit n’est demandé par l’application.
- SoilGrids : aucune valeur de sol n’est demandée par l’application.
- Station météo locale, analyses de sol, carnet et limites réelles de parcelle : aucune donnée n’est fournie dans le dépôt. Les profils du scénario démo sont des données de démonstration fictives.

Ces sources ne doivent pas apparaître comme connectées, ne doivent alimenter aucun indicateur, et ne doivent pas être décrites comme vérifiées pour la ferme sélectionnée.

## Référence du défi

- [NASA Space Apps Challenge — Field Shift: Adapting Farms with NASA Data](https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/).
- [Conditions officielles Space Apps 2026](https://www.spaceappschallenge.org/legal/) — vérifier et documenter les licences des éléments effectivement soumis et citer les sources utilisées.

Le code du projet n’a pas de licence déclarée dans ce registre : cette décision appartient à l’équipe. Les conditions applicables aux produits de données doivent être vérifiées pour chaque produit et ne sont pas remplacées par la licence du code.
