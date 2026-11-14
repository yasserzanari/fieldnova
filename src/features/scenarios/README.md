# Scénarios et rotations

- **Route :** `/app/scenarios`
- **Explorateur de rotations :** compare une rotation de référence et deux options modifiables sur trois saisons. Le petit catalogue français est un exemple de prototype; les familles botaniques et les calculs de répétition/diversité sont descriptifs, sans score de rendement ni effet de sol inféré.
- **Persistance locale :** les rotations et la priorité choisie sont sauvegardées dans le navigateur pour le point sélectionné. Le profil de sol utilisateur reste distinct et provient de `src/lib/farm/soil-profile.ts`.
- **Fiche de comparaison :** le bouton « Exporter la fiche » télécharge un Markdown local avec les trois rotations, le critère, les valeurs POWER disponibles, le profil de sol déclaré, la méthode et les limites. Aucune donnée n’est envoyée par cet export.
- **Parcelle :** un GeoJSON WGS84 avec géométrie Polygon ou MultiPolygon peut être importé, visualisé et supprimé. Le contour et la superficie géodésique approximative sont stockés localement. L’application ne calcule pas de statistiques NASA à l’intérieur du polygone.
- **Contexte NASA :** NASA POWER affiche la dernière période mensuelle complète pour le point suivi et la cellule NASA renvoyée par le service. Ces valeurs ne changent pas les métriques de rotation; elles apportent un contexte climatique historique, pas une prévision à la parcelle.
- **Repère saisonnier :** pluie, température et humidité racinaire du dernier mois sont accompagnées de la moyenne et de la plage des valeurs observées pour le même mois des années précédentes. Le nombre d’années comparées est affiché; ce repère décrit la variabilité passée sans prédire la saison suivante.
- **Carte :** carte MapLibre partagée avec le fond OpenStreetMap et les couches NASA GIBS; changer le point met à jour le contexte NASA et l’espace de rotations lié aux coordonnées.
- **Limites du catalogue :** la bibliothèque de cultures est illustrative, adaptée à une démonstration France métropolitaine et non validée pour d’autres régions. Aucun conseil agronomique, rendement, besoin en eau, effet sur le carbone ou fixation d’azote n’est calculé.
### Climat historique

- **Carte :** MapLibre partagé, couches NASA GIBS MODIS, choix de fond et de date, clic pour déplacer le point suivi.
- **Comparaisons :** les trois cas sont calculés depuis NASA POWER mensuel au point choisi : 12 dernières valeurs disponibles, fenêtre consécutive de 3 mois la plus sèche, fenêtre consécutive de 3 mois la plus chaude.
- **Indicateurs :** moyenne mensuelle des précipitations quotidiennes (`PRECTOTCORR`, mm/j), température moyenne (`T2M`, °C) et humidité racinaire modélisée (`GWETROOT`, fraction convertie en %).
- **Limite :** il s’agit de résumés de périodes historiques observées dans le service. Aucun rendement, effet de rotation, scénario futur ou conseil d’irrigation n’est prédit.
