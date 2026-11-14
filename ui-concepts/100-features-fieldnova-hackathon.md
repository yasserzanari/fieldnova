# 100 idées de fonctionnalités pour faire briller FieldNova au NASA Space Apps

> **But :** transformer FieldNova en démonstration claire, crédible et mémorable du défi *Field Shift: Adapting Farms with NASA Data*. Cette liste est un portefeuille d’idées, pas une promesse que les 100 fonctions seront développées pendant le hackathon.

## La cible du projet

Le défi demande un outil d’aide à la décision qui combine les observations de la NASA avec le sol local, les caractéristiques des cultures et les priorités des agriculteurs, afin d’explorer des rotations susceptibles d’améliorer la santé du sol et l’adaptation aux conditions changeantes. La carte et les données climatiques sont une bonne base, mais la démonstration doit rendre la **rotation culturale** visible comme résultat central. [Énoncé officiel du défi](https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/)

Le projet sera jugé sur son impact, sa créativité, sa validité scientifique et technique, sa pertinence pour le défi et la qualité de sa présentation. [Critères Space Apps 2026 publiés par un événement local](https://www.spaceappschallenge.org/2026/local-events/ajmer/) · [Guide de jugement Space Apps](https://spaceapps-v2-staging.s3.amazonaws.com/media/documents/Final_Space_Apps_2025_Judging_Guidelines_for_web.pdf)

FieldNova dispose déjà d’une base utile : carte interactive, couches NASA GIBS, séries climatiques NASA POWER, comparaison de périodes et assistant contextualisé. NASA POWER fournit plusieurs paramètres météorologiques et hydrologiques, avec une résolution et une période propres à chaque produit. SMAP L4 est notamment une donnée modélisée à environ 9 km; elle ne doit pas être présentée comme une mesure de la parcelle. [NASA POWER, API mensuelle](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/) · [Paramètres hydrologiques NASA POWER](https://power.larc.nasa.gov/docs/methodology/data/sources_hydrology/) · [NASA POWER, sources et résolutions](https://power.larc.nasa.gov/docs/methodology/)

### État de réalisation du dépôt

Cette liste reste un portefeuille de 100 idées, pas un engagement à toutes les livrer. Au 14 novembre 2026, les modules suivants ont été intégrés dans `main` :

- **Rotation au centre du MVP :** rotation actuelle et deux options éditables sur cinq années; priorité modifiable; métriques sur familles, répétitions, légumineuses et alternance de systèmes racinaires documentés.
- **Options de rotation exploratoires :** génération locale de deux séquences depuis le catalogue, avec cultures déclarées indisponibles exclues et règles de classement visibles. Les options restent éditables; le climat, le sol et le calendrier ne sont pas utilisés comme prédicteurs.
- **Contexte de décision :** séries NASA POWER mensuelles avec coordonnées de grille et valeurs comparées aux mêmes mois des années précédentes; profil de sol local avec origine, date et référence déclarées; coupe par horizons saisie localement, avec intervalles manquants visibles comme inconnus.
- **Parcelle et preuves :** import GeoJSON WGS84, contour synchronisé sur les cartes, superficie géodésique approximative et export d’une fiche Markdown contenant sources, calculs, valeurs manquantes et limites.
- **Assistant outillé :** chat à gauche et carte à droite; lectures de NASA POWER, du profil local et des rotations; changements de couche réels; questions hors périmètre sans appel NASA automatique.
- **Réponses conversationnelles démo :** Codex CLI rédige les réponses à partir des résultats retournés par les outils locaux FieldNova; la connexion est limitée au serveur Vite de développement.
- **Traits agronomiques sourcés :** la comparaison affiche familles, légumineuses et architectures racinaires à partir de références INRAE et DRAAF; les valeurs inconnues restent exclues du calcul.
- **Démo :** [script de 90 secondes et plans vidéo](demo-script-90s-fieldnova.md).
- **Profil guidé :** cinq étapes locales pour le point confirmé, la rotation actuelle, l’accès à l’eau, les cultures indisponibles et la priorité; l’état du sol existant est consultable dans « Mon terrain ».

Le prototype n’analyse pas les pièces jointes et ne calcule pas de statistiques NASA à l’intérieur d’une limite de parcelle. Le catalogue et les rotations restent illustratifs, et les références racinaires générales ne sont pas validées localement; aucun rendement, besoin en eau, amélioration de sol ou prévision n’est calculé.

## Les 12 fonctions à privilégier pour la démonstration

Ces fonctions forment le parcours conseillé pour une démonstration courte. Elles relient le problème de l’agriculteur aux données, à une comparaison de rotations et à une décision compréhensible.

1. **Profil de ferme guidé** : localisation, cultures actuelles, type de sol connu ou inconnu, accès à l’eau et priorité de l’agriculteur.
2. **Parcelle sélectionnable sur la carte** : dessiner ou importer sa limite, puis distinguer la géométrie de la parcelle de la grille des données NASA.
3. **Résumé climatique sourcé** : pluie et températures historiques au point suivi, période affichée, dernière période complète, cellule NASA et limites de résolution.
4. **Fiche sol avec niveaux de confiance** : données saisies par l’agriculteur, analyse de laboratoire importée, données cartographiques et champs inconnus clairement différenciés.
5. **Bibliothèque courte de cultures** : besoins et caractéristiques accompagnés d’une source agronomique locale pour chaque valeur utilisée.
6. **Rotation actuelle comme scénario témoin** : l’agriculteur peut comparer une alternative à sa pratique actuelle.
7. **[PARTIELLEMENT LIVRÉ] Générateur de deux rotations candidates** : explorer les combinaisons du catalogue, exclure les cultures déclarées indisponibles et classer selon les traits visibles; le calendrier et les règles agronomiques locales ne sont pas modélisés.
8. **Comparaison côte à côte** : montrer les compromis selon l’eau, la diversité des familles, la couverture du sol, le calendrier et les priorités choisies.
9. **[PARTIELLEMENT LIVRÉ] Justification de chaque résultat** : fiche par rotation avec critère, écarts à la référence, traits et sources, données NASA/sol chargées, contraintes appliquées, limites et éléments manquants à vérifier. Les métriques actuelles sont descriptives; elles ne mesurent pas les bénéfices agronomiques.
10. **Stress-test sur des années historiques** : comparer comment les options se comportent durant des périodes observées plus sèches ou plus chaudes, sans prétendre prédire l’avenir.
11. **Assistant qui répond à partir des éléments affichés** : il peut retrouver les sources et expliquer les compromis, mais ne fabrique pas une recommandation agronomique.
12. **Résumé de décision exportable** : scénario choisi, raisons, données consultées, inconnues à vérifier et prochaine étape proposée.

### Séquence de démonstration suggérée

**« Je choisis une ferme » → « voici ce que la NASA observe autour de ce point » → « voici ce que nous savons réellement du sol » → « je compare trois rotations selon ma priorité » → « je vois pourquoi l’option diffère, ce qui reste incertain et ce que je dois vérifier sur le terrain ».**

---

## 100 fonctionnalités et améliorations

Les priorités indiquent l’ordre d’exploration, pas un engagement de livraison : **P0** = effet direct sur la démonstration, **P1** = valeur forte après le noyau, **P2** = extension à valider. Une fonction marquée P0 ne doit entrer dans la démo que si elle est réellement opérationnelle et ses données sont identifiables.

### A. Comprendre la ferme et la décision — 1 à 10

1. **[LIVRÉ] Assistant de démarrage en cinq étapes** : confirmer le point, saisir jusqu’à cinq années de cultures actuelles, déclarer l’accès et les restrictions d’eau, exclure des cultures et choisir la priorité; champs vides conservés comme inconnus, données locales par point.
2. **[LIVRÉ] Profil de ferme sauvegardé localement** : conserver le nom, l’accès et les restrictions d’eau déclarés entre deux visites; profil modifiable et séparé par point suivi.
3. **[LIVRÉ] Priorité explicite de l’agriculteur** : choisir parmi les indicateurs descriptifs disponibles pour classer les rotations, sans les transformer en rendement ou bénéfice prédit.
4. **[LIVRÉ] Choix du mode d’exploitation** : pluvial, irrigué, mixte ou inconnu, sans déduire ce choix des seules données satellites.
5. **[P1] Disponibilité des équipements** : indiquer les opérations faisables avec le matériel réel de l’exploitation.
6. **[P1] Fenêtre de travail habituelle** : saisir les périodes où semis, récolte et travail du sol sont possibles.
7. **[P1] Préférences et exclusions de cultures** : cultures appréciées, impossibles ou soumises à un contrat local.
8. **[P1] Tolérance au risque** : faible, moyenne ou élevée, avec explication de l’effet sur le classement des scénarios.
9. **[P2] Plusieurs profils de fermes** : gérer différentes exploitations sans mélanger leurs données.
10. **[P2] Parcours de prise en main** : faire découvrir carte, profil de sol, scénarios et provenance à un nouvel utilisateur.

### B. Carte et observations NASA — 11 à 20

11. **[LIVRÉ] Limite de parcelle dessinable ou importable** : dessiner depuis le point suivi, voir le contour temporaire, annuler ou retirer un sommet, enregistrer seulement un polygone valide, ou importer un GeoJSON WGS84. La superficie géodésique approximative s’affiche; aucune statistique NASA zonale n’est calculée.
12. **[P0 · LIVRÉ] Empreinte de la maille météo NASA sur la carte** : afficher le centre, les limites MERRA-2 (0,5° × 0,625°) et la taille approximative, séparément du point cliqué, des couches GIBS/SMAP et du polygone agricole. Le centre est dérivé de la grille native, car la géométrie de réponse POWER reprend la coordonnée demandée.
13. **[LIVRÉ · PARTIEL] Fiche de provenance au clic** : l’onglet Données & confiance expose la source POWER renvoyée, la date de récupération, la grille, les produits GIBS sélectionnés et leurs liens de citation. Les tuiles GIBS SMAP ne fournissent pas encore leur date de produit à l’interface.
14. **[LIVRÉ · PARTIEL] Légende persistante des couches** : la carte partagée présente les couches visibles, les unités ou échelles publiées par GIBS, les dates connues et les limites de grille/parcelle. Les détails spécifiques de chaque couche continuent d’être améliorés.
15. **[P1] Chronologie des observations** : faire défiler la série historique sans confondre date d’observation et date de téléchargement.
16. **[P1] Historique NDVI par point** : afficher un signal de végétation avec la date et la cadence réelle du produit GIBS sélectionné.
17. **[P1] Humidité de surface et racinaire SMAP** : distinguer clairement le produit cartographique SMAP des variables NASA POWER.
18. **[P1] Incertitude ou qualité de couverture** : signaler nuages, trous temporels, valeurs manquantes ou couverture insuffisante lorsqu’une métadonnée existe.
19. **[P2] Carte de comparaison de deux périodes** : afficher les différences saisonnières avec des plages temporelles comparables.
20. **[P2] Télécharger les séries de la zone** : exporter un CSV avec coordonnées, unités, dates, source et valeurs manquantes conservées.

### C. Sol et santé des sols — 21 à 30

21. **[P0] Profil de sol avec inconnues explicites** : texture, profondeur utile, drainage, matière organique et pH ne sont jamais remplis par défaut.
22. **[Livrée — CSV] Import d’une analyse de sol** : lire localement un CSV UTF-8 avec intervalles en centimètres, aperçu révocable, validation des plages et métadonnées de laboratoire/date conservées au niveau des horizons. L’origine des caractéristiques générales déjà saisies n’est pas remplacée. Le profil n’est modifié qu’après application de l’aperçu et enregistrement explicite. Les PDF et images ne sont pas encore analysés.
23. **[P0] Étiquette de fiabilité par champ** : « mesuré », « déclaré », « produit satellite/modèle », « estimé » ou « inconnu ».
24. **[Livrée] Vue des horizons du sol** : saisir jusqu’à cinq couches de 0 à 400 cm, leurs textures/pH/matière organique connus, et distinguer les intervalles manquants ainsi que la profondeur sous la dernière couche comme non documentés. Provenance déclarée partagée avec le profil local.
25. **[P1] Indicateurs de santé du sol définis** : expliquer chaque indicateur, sa méthode et les données requises avant de le calculer.
26. **[P1] Historique des analyses** : comparer deux prélèvements comparables et avertir si les profondeurs ou méthodes diffèrent.
27. **[P1] Fiche de prélèvement** : aider à noter lieu, profondeur, date et méthode pour de futures mesures de terrain.
28. **[P2] Photos de terrain annotées** : lier des observations visuelles à une parcelle sans les traiter comme une mesure scientifique.
29. **[P2] Import d’une carte pédologique locale** : afficher l’organisme, l’échelle cartographique et la légende d’origine.
30. **[P2] Plan d’acquisition de données manquantes** : indiquer quelles mesures de sol réduiraient le plus l’incertitude du scénario.

### D. Cultures et rotations — 31 à 40

31. **[P0] Catalogue local de cultures** : inclure seulement les cultures pertinentes à la région pilote et documenter chaque source.
32. **[P0] Carte d’une rotation sur plusieurs saisons** : lire l’enchaînement année par année sans ambiguïté.
33. **[P0] Rotation actuelle comme référence** : rendre les alternatives comparables à une pratique saisie par l’utilisateur.
34. **[P0] Vérification des successions incompatibles** : afficher la règle agronomique, sa source et le degré de confiance.
35. **[P1] Familles botaniques** : visualiser leur diversité et limiter certaines répétitions selon des règles documentées.
36. **[P1] Cultures de couverture** : ajouter une option dédiée, avec ses coûts opérationnels et ses limites locales.
37. **[P1] Intercultures et mélanges** : représenter deux cultures simultanées et éviter de les traiter comme une rotation simple.
38. **[P1] Calendrier cultural local** : semis, croissance et récolte selon région, variété et saison, avec source et plage de dates.
39. **[P2] Variétés et durées de cycle** : différencier les caractéristiques variétales des valeurs génériques de l’espèce.
40. **[P2] Rotation éditable manuellement** : laisser l’agriculteur imposer une culture ou un ordre, puis recalculer les contraintes.

### E. Scénarios et comparaison — 41 à 50

41. **[P0] Trois scénarios comparables** : rotation actuelle, option favorisant la priorité choisie et option alternative.
42. **[P0] Classement compréhensible** : révéler les critères qui font gagner ou perdre chaque scénario, plutôt qu’un score opaque.
43. **[P0] Pondération par priorité** : le classement change quand l’agriculteur change ses préférences, avec pondérations visibles.
44. **[P0] Panneau des compromis** : montrer explicitement les gains possibles et les coûts ou contraintes associés.
45. **[P1] Simulation de météo historique** : tester un scénario sur des années observées, sans le présenter comme prévision.
46. **[P1] Scénario de disponibilité en eau** : comparer des hypothèses définies par l’utilisateur et montrer quelles données sont absentes.
47. **[P1] Sensibilité des résultats** : indiquer si une petite variation d’entrée change le scénario classé premier.
48. **[P1] Avertissement « données insuffisantes »** : ne pas classer une rotation quand les variables minimales manquent.
49. **[P2] Comparaison multi-parcelles** : repérer les rotations communes et les contraintes qui diffèrent selon les parcelles.
50. **[P2] Historique des versions de scénarios** : retrouver les hypothèses utilisées à chaque comparaison.

### F. Assistant agricole explicable — 51 à 60

51. **[P0] Réponse liée au scénario et à la parcelle sélectionnés** : le chat ne perd pas son contexte lorsque la carte change.
52. **[P0] Réponse avec citations internes** : relier chaque chiffre ou affirmation à une source consultable dans l’application.
53. **[P0] Trace d’outils réelle** : montrer les requêtes exécutées et leur statut, et non une animation prétendant avoir interrogé un outil.
54. **[P0] Questions de suivi suggérées** : proposer des questions adaptées aux données réellement chargées.
55. **[P1] Réponses séparant fait, calcul et hypothèse** : utiliser des étiquettes visuelles différentes.
56. **[P1] Réponse courte pour le terrain** : produire une synthèse en langage simple, avec un lien vers les détails.
57. **[P1] « Pourquoi ce scénario ? »** : expliquer chaque règle et permettre de la désactiver ou la modifier.
58. **[P1] Questions auxquelles l’assistant refuse de répondre** : expliquer quand les données ne permettent pas une dose d’irrigation ou une prédiction de rendement.
59. **[P2] Dictée vocale** : capturer une question en extérieur et la relire avant envoi.
60. **[P2] Mode bilingue/localisé** : traduire interface et unités sans transformer le sens des recommandations.

### G. Expérience utilisateur et travail au champ — 61 à 70

61. **[LIVRÉ] Parcours de démo sans compte ni configuration** : le bouton de la landing démarre une ferme fictive préremplie; le profil, les rotations et les contraintes d’exemple sont séparés des réponses NASA consultées en direct.
62. **[LIVRÉ] Indicateur « exemple » persistant** : le bandeau global reste visible dans toutes les vues et permet de quitter le cas fictif; le profil sauvegardé avant le lancement est restauré.
63. **[P1] Mode mobile utilisable au champ** : boutons larges, panneaux courts et carte accessible sur petit écran.
64. **[P1] Connexion lente tolérante** : garder les informations déjà récupérées et signaler clairement les données indisponibles.
65. **[P1] Unités préférées** : choisir unités métriques et formats locaux, tout en conservant l’unité d’origine en provenance.
66. **[P1] Contraste de carte et daltonisme** : ne jamais faire dépendre une alerte d’une seule couleur.
67. **[P1] Navigation au clavier** : parcourir panneaux, formulaire, graphique et contrôles de la carte sans souris.
68. **[P2] Notifications configurables** : choisir les alertes et leur fréquence au lieu de notifier automatiquement tout utilisateur.
69. **[P2] Journal d’observations de terrain** : consigner semis, récolte, irrigation et notes avec date et auteur.
70. **[P2] Partage par lien ou PDF** : exporter un scénario sans exposer les coordonnées privées par défaut.

### H. Validité, confiance et qualité des données — 71 à 80

71. **[LIVRÉ · PARTIEL] Registre des sources et méthode** : registre suivi avec produits, paramètres, périodes, résolutions, liens et limites pour les sources actuelles; chaque vue ne référence pas encore tous les détails propres à chaque requête.
72. **[P0] Fiche de méthode du classement** : formule ou règles visibles, unités et exemples reproductibles.
73. **[P0] Séparation entre observation, modèle et saisie utilisateur** : aucune mesure satellite ne se fait passer pour une analyse de sol.
74. **[P0] Dates et valeurs manquantes auditables** : l’application précise les mois complets et les périodes exclues.
75. **[P1] Limites spatiales affichées sur la carte** : résolution régionale ou maille NASA visible près de toute valeur importante.
76. **[P1] Journal de transformation** : conserver les étapes de conversion, agrégation, filtre et calcul dérivé.
77. **[P1] Contrôle d’unité et de plage** : détecter les données impossibles sans écraser silencieusement la valeur brute.
78. **[P1] Validation indépendante des règles agronomiques** : documenter la source ou l’avis expert, la région et la date de révision.
79. **[P2] Comparaison avec une station de terrain** : évaluer un produit NASA contre une observation indépendante lorsque les données existent.
80. **[P2] Téléchargement de la fiche de preuves** : générer la méthodologie et les sources pour un scénario donné.

### I. Impact, adaptation et communauté — 81 à 90

81. **[P0] Histoire d’une ferme pilote** : définir le lieu, le problème, les priorités et les décisions que la démo veut éclairer.
82. **[P0] Indicateur d’impact mesurable** : compter les décisions explorées ou les données réunies, sans convertir cela en rendement gagné.
83. **[P1] Mesure des besoins des agriculteurs** : conduire quelques entretiens et faire apparaître ce qui a changé dans le produit.
84. **[P1] Scénarios adaptés aux petites exploitations** : prendre en compte coût, main-d’œuvre et matériel, pas seulement la météo.
85. **[P1] Scénarios de stress hydrique et thermique historiques** : mettre les événements passés en contexte local.
86. **[P1] Partage de modèles de rotation locaux** : publier les règles avec région, source et licence.
87. **[P2] Comparaison de régions** : expliquer quelles différences proviennent du climat, du sol ou des cultures possibles.
88. **[P2] Contribution volontaire d’observations** : laisser un agriculteur contribuer sans rendre publiques ses données par défaut.
89. **[P2] Tableau de couverture des données agricoles** : montrer où les sources sont disponibles ou insuffisantes.
90. **[P2] Indicateurs de résilience communautaire** : comparer des options à l’échelle d’une communauté seulement avec des données et autorisations adaptées.

### J. Démonstration, documentation et préparation au jugement — 91 à 100

91. **[P0] Démo chronométrée de 90 secondes** : un problème, un clic de carte, trois rotations, une décision éclairée.
92. **[LIVRÉ] Scénario de démonstration reproductible** : route `/demo`, profil et rotations marqués fictifs, point connu, observations NASA POWER rechargées, état antérieur sauvegardé puis restaurable.
93. **[P0] Écran d’accueil expliquant le problème** : qui est l’utilisateur, ce qu’il décide et comment FieldNova l’aide.
94. **[P0] Vidéo avec données lisibles** : montrer sources et limites à l’écran, pas seulement des animations de carte.
95. **[P0] Phrase de distinction** : expliquer en une phrase ce que la plateforme relie et ce que l’agriculteur peut comparer.
96. **[P1] Page technique publique** : architecture, données, licences, calculs, limites et instructions de lancement.
97. **[P1] État de service visible** : distinguer données en direct, en cache, d’exemple ou indisponibles.
98. **[P1] Mode de secours hors réseau** : fournir une démo locale balisée si une API NASA est momentanément inaccessible.
99. **[P1] Captures et script de présentation** : préparer un parcours de secours si la connexion ou la carte échoue.
100. **[P1] Réponses aux questions des juges** : préparer preuves de validité, originalité, impact, sources et limites du prototype.

## Garde-fous : ce qu’il faut prouver avant de le montrer

- Une **carte satellite régionale** ne fournit pas automatiquement une observation exacte de la parcelle.
- Une **humidité du sol modélisée** n’est pas un prélèvement, une sonde ni une propriété permanente du sol.
- Une **moyenne climatique historique** ne constitue pas une prévision météo ou climatique.
- Un **score de rotation** n’est utile que si ses règles sont visibles, contextualisées et adossées à des références agronomiques adaptées.
- Ne pas annoncer une hausse de rendement, une économie d’eau ou une amélioration de matière organique sans mesure, modèle validé et hypothèses explicites.
- Si le type de sol, la culture, la région ou les priorités ne sont pas renseignés, afficher l’inconnue et éviter une conclusion qui dépend de cette information.
- Employer au moins une source NASA figurant dans l’onglet **Resources** du défi et montrer concrètement sa contribution à la solution. Vérifier la liste officielle des ressources avant la soumission; la page du défi est la référence.

## Plan de réalisation proposé

### Étape 1 — Noyau démontrable

Livrer les fonctions P0 des sections A, B, C, D, E, H et J qui peuvent être réellement implémentées avec les données disponibles. Le parcours doit permettre de retrouver les sources et de comprendre pourquoi le scénario varie avec la priorité choisie.

### Étape 2 — Validation avec le terrain

Choisir une seule zone pilote. Faire valider le calendrier cultural, les règles de succession et les contraintes par une personne connaissant l’agronomie locale. Si aucune validation locale n’est possible, afficher le catalogue comme hypothèse de prototype et éviter de l’appeler conseil agricole.

### Étape 3 — Extensions après le hackathon

Prioriser l’import de données locales, la validation indépendante, les profils multi-parcelles, la contribution volontaire d’observations et la localisation linguistique. Ajouter un nouveau jeu NASA seulement après avoir documenté sa résolution, sa cadence, son accès et son rôle dans une décision.

## Sources consultées

- [Défi officiel 2026 — Field Shift: Adapting Farms with NASA Data](https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/)
- [Présentation officielle du NASA Space Apps Challenge 2026](https://www.spaceappschallenge.org/2026/)
- [NASA POWER — API mensuelle](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/)
- [NASA POWER — paramètres hydrologiques](https://power.larc.nasa.gov/docs/methodology/data/sources_hydrology/)
- [NASA POWER — méthodologie et résolution des sources](https://power.larc.nasa.gov/docs/methodology/)
- [NASA POWER — paramètres disponibles et dictionnaire](https://power.larc.nasa.gov/docs/tutorials/parameters/)
- [DRAAF Hauts-de-France — rotations, familles culturales et architectures racinaires](https://draaf.hauts-de-france.agriculture.gouv.fr/grandes-cultures-les-systemes-cerealiers-au-coeur-des-assolements-des-hauts-de-a4927.html)
- [INRAE — diversité végétale, rotations et légumineuses](https://www.inrae.fr/actualites/augmenter-diversite-vegetale-espaces-agricoles-proteger-cultures)
- [NASA Space Apps 2026 — critères de jugement relayés par l’événement d’Ajmer](https://www.spaceappschallenge.org/2026/local-events/ajmer/)
- [Guide de jugement Space Apps](https://spaceapps-v2-staging.s3.amazonaws.com/media/documents/Final_Space_Apps_2025_Judging_Guidelines_for_web.pdf)

