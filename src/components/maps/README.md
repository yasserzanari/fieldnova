# Carte partagée

`FieldMap` est la carte utilisée par les vues Atlas, Mon terrain, Scénarios, Assistant et Données & confiance. Le petit panneau « Couches visibles » suit les couches réellement activées par chaque vue et indique les dates, unités et limites disponibles.

- NDVI MODIS et humidité SMAP affichent l’échelle horizontale fournie par NASA GIBS; le code ne redessine pas ces gammes de couleurs.
- True Color est signalé comme composition RGB sans unité ni légende numérique.
- La cellule NASA POWER est distincte du point suivi et d’un contour de parcelle. Une parcelle n’est affichée que lorsqu’une géométrie a été dessinée puis validée ou importée.
- L’explorateur Scénarios peut aussi fournir les sommets temporaires de la limite à `FieldMap`; ils ne sont affichés comme parcelle enregistrée qu’après validation.
- Pour la tuile SMAP demandée avec la date `default`, FieldNova ne récupère pas la date effective de la visualisation; la légende le dit explicitement.

Références : [catalogue des visualisations GIBS](https://nasa-gibs.github.io/gibs-api-docs/available-visualizations/), [légendes GIBS](https://nasa-gibs.github.io/gibs-api-docs/access-advanced-topics/), [NASA POWER monthly API](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/).
