# FieldNova · fiche de réponses au jury

> À utiliser comme aide-mémoire, pas comme texte à réciter. Les réponses décrivent l’état actuel du dépôt; ajouter les noms et rôles réels de l’équipe séparément.

## Pitch de 30 secondes

FieldNova aide à relier les séries climatiques NASA au contexte d’une exploitation pour comparer des options de rotation. La carte montre les produits NASA disponibles, l’assistant interroge les données raccordées et les scénarios expliquent leurs critères, leur provenance et leurs limites. Le climat est un contexte historique à l’échelle d’une grille régionale : le prototype ne diagnostique pas une parcelle et ne prédit pas les rendements.

## Questions probables

### Quel besoin du défi adressez-vous ?

Le défi demande d’aider les agriculteurs à adapter leurs décisions avec des données NASA. FieldNova rend des séries mensuelles et des couches satellites explorables depuis un point choisi, puis les met en regard d’informations agricoles locales déclarées et d’options de rotation. Les profils agricoles de la démo sont fictifs; aucun pilote réel n’est présenté comme acquis.

### Quelles données NASA l’application utilise-t-elle vraiment ?

NASA POWER fournit les paramètres mensuels `PRECTOTCORR`, `T2M`, `T2M_MAX`, `T2M_MIN`, `GWETTOP` et `GWETROOT` au point interrogé. NASA GIBS sert les tuiles MODIS True Color/NDVI et SMAP affichées sur la carte. Le détail des appels et produits est dans [`references-and-data-sources.md`](references-and-data-sources.md) et dans l’onglet Données & confiance.

### Ces données décrivent-elles la parcelle ?

Non. POWER est associé à une grille climatique MERRA-2 de 0,5° × 0,625°; FieldNova en dérive le centre et dessine son empreinte. GIBS affiche des tuiles régionales. L’application ne calcule pas de moyenne sur le polygone agricole et n’invente pas de frontière de parcelle.

### Quelles transformations effectuez-vous ?

Nous arrondissons le point de requête à 0,001°, excluons les mois incomplets et les valeurs de remplissage NASA, et gardons inconnus les champs absents. Les fractions d’humidité racinaire sont converties en pourcentage uniquement dans les indicateurs qui l’affichent ainsi. La traçabilité expose ces étapes et les alertes de cohérence conservent la valeur source.

### Comment le classement des rotations est-il calculé ?

Il utilise les traits affichés du catalogue (diversité des familles, répétitions, légumineuses et transitions de types racinaires documentés), les critères et poids choisis, puis des départages explicites. Le climat NASA et le profil de sol ne participent pas à la note actuelle. Les rotations ne prédisent ni rendement, ni bénéfice pour le sol.

### Pourquoi utiliser un LLM ?

Le routeur FieldNova choisit d’abord les outils de données effectivement implémentés et lit leurs résultats. En mode démo, Codex CLI formule une réponse conversationnelle à partir de ces résultats; il n’exécute pas lui-même les recherches NASA. Si Codex CLI est indisponible, une réponse locale fondée sur les règles reste disponible. L’assistant ne déduit pas de dose ou de date d’irrigation.

### Comment évitez-vous les réponses inventées ?

Les valeurs viennent des outils explicites; les champs absents restent inconnus, les réponses exposent leurs sources, et les actions d’interface sont distinguées des consultations de données. Les données fictives sont signalées dans la démo. Les affirmations agronomiques non calculées sont exclues des réponses.

### Quel impact avez-vous mesuré ?

Aucun gain de rendement, d’économie d’eau ou d’adoption n’a été mesuré. Le compteur de FieldNova enregistre des comparaisons lancées dans le navigateur; il ne signifie pas qu’une décision a été adoptée. La prochaine étape est un pilote et des entretiens avec des agriculteurs.

### Qu’est-ce qui est validé par un agronome ou un laboratoire ?

Le dépôt ne revendique pas de validation indépendante des règles de succession, des traits du catalogue, des profils fictifs ou des données de sol. Les sources de référence et la provenance sont indiquées pour permettre une vérification locale. Une analyse de sol réelle doit être fournie par l’exploitation.

### Que se passe-t-il hors ligne ?

Les séries NASA déjà enregistrées peuvent rester visibles dans le navigateur jusqu’à 180 jours, avec un libellé ancien; après cela, la récupération échoue explicitement. La carte GIBS nécessite le réseau. La démo ne remplace pas silencieusement une mesure NASA manquante par un chiffre fictif.

### Où vont les données de l’exploitation ?

Les profils de ferme, sols, rotations et contraintes sont stockés dans le navigateur. Une requête POWER transmet la coordonnée arrondie à NASA. Le chat de démo transmet au serveur de développement Codex CLI la question et jusqu’à six messages récents; les pièces jointes ne sont pas analysées. Ne pas saisir de données sensibles dans une démo publique.

### Quelle licence autorise la réutilisation ?

Le code FieldNova est sous licence MIT ([`LICENSE`](../LICENSE)). Cette licence ne remplace ni les conditions d’usage ni les attributions des jeux de données, fonds cartographiques, bibliothèques et contenus tiers; leur registre est séparé.

### Qu’est-ce qui distingue le projet ?

La démonstration relie carte, série historique, profil local et comparaison explicable de rotations dans un même parcours, avec les sources et limites visibles. Nous ne prétendons pas être les seuls à utiliser ces données; la différence revendiquée porte sur cette intégration et sa traçabilité dans le prototype.

## Preuves à ouvrir pendant la présentation

1. `/app/atlas` — sélectionner un point, lire la période NASA et télécharger le CSV; rappeler que les coordonnées du fichier sont arrondies.
2. `/app/data-trust` — afficher la source, les mois manquants, la maille et le contrôle de cohérence.
3. `/app/scenarios` — comparer les périodes historiques; puis ouvrir la fiche détaillée d’une rotation pour voir critères et écarts.
4. `/app/assistant` — demander les précipitations ou les rotations et montrer les outils/source affichés dans la réponse.
5. `/methode` — montrer licences, traitement, confidentialité et limites; le profil fictif est toujours balisé dans `/demo`.

## À ne pas affirmer sans nouvelle preuve

- « Nous avons augmenté le rendement », « économisé de l’eau » ou « validé les recommandations ».
- « La NASA mesure cette parcelle » ou « l’image satellite diagnostique la culture ».
- « Le classement utilise le climat et le sol » ou « prédit la meilleure culture ».
- « Le profil de démonstration vient d’un agriculteur pilote ».
- « Toutes les sources listées sont connectées » : Sentinel-2, SoilGrids et les données de station restent des références ou des entrées à configurer.

## Références de préparation

- [Défi NASA Space Apps 2026 — Field Shift](https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/)
- [NASA POWER · API mensuelle](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/)
- [NASA GIBS · documentation d’accès](https://nasa-gibs.github.io/gibs-api-docs/access-basics/)
- [`README.md`](../README.md) et [`references-and-data-sources.md`](references-and-data-sources.md)
