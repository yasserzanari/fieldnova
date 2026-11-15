# 100 idées de fonctionnalités pour faire briller FieldNova au NASA Space Apps

> **But :** transformer FieldNova en démonstration claire, crédible et mémorable du défi *Field Shift: Adapting Farms with NASA Data*. Cette liste est un portefeuille d’idées, pas une promesse que les 100 fonctions seront développées pendant le hackathon.

## La cible du projet

Le défi demande un outil d’aide à la décision qui combine les observations de la NASA avec le sol local, les caractéristiques des cultures et les priorités des agriculteurs, afin d’explorer des rotations susceptibles d’améliorer la santé du sol et l’adaptation aux conditions changeantes. La carte et les données climatiques sont une bonne base, mais la démonstration doit rendre la **rotation culturale** visible comme résultat central. [Énoncé officiel du défi](https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/)

Le projet sera jugé sur son impact, sa créativité, sa validité scientifique et technique, sa pertinence pour le défi et la qualité de sa présentation. [Critères Space Apps 2026 publiés par un événement local](https://www.spaceappschallenge.org/2026/local-events/ajmer/) · [Guide de jugement Space Apps](https://spaceapps-v2-staging.s3.amazonaws.com/media/documents/Final_Space_Apps_2025_Judging_Guidelines_for_web.pdf)

FieldNova dispose déjà d’une base utile : carte interactive, couches NASA GIBS, séries climatiques NASA POWER, comparaison de périodes et assistant contextualisé. NASA POWER fournit plusieurs paramètres météorologiques et hydrologiques, avec une résolution et une période propres à chaque produit. SMAP L4 est notamment une donnée modélisée à environ 9 km; elle ne doit pas être présentée comme une mesure de la parcelle. [NASA POWER, API mensuelle](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/) · [Paramètres hydrologiques NASA POWER](https://power.larc.nasa.gov/docs/methodology/data/sources_hydrology/) · [NASA POWER, sources et résolutions](https://power.larc.nasa.gov/docs/methodology/)

### État de réalisation du dépôt

Cette liste reste un portefeuille de 100 idées, pas un engagement à toutes les livrer. Au 15 novembre 2026, les modules suivants ont été intégrés dans `main` :

- **Rotation au centre du MVP :** rotation actuelle et deux options éditables sur cinq années; priorité modifiable; métriques sur familles, répétitions, légumineuses et alternance de systèmes racinaires documentés.
- **Options de rotation exploratoires :** génération locale de deux séquences depuis le catalogue, avec cultures déclarées indisponibles exclues et règles de classement visibles. Les options restent éditables; les séquences incomplètes ne reçoivent ni note ni classement. Le climat, le sol et le calendrier ne sont pas utilisés comme prédicteurs.
- **Contexte de décision :** séries NASA POWER mensuelles avec coordonnées de grille et valeurs comparées aux mêmes mois des années précédentes; profil de sol local avec origine, date et référence déclarées; coupe par horizons saisie localement, avec intervalles manquants visibles comme inconnus.
- **Parcelle et preuves :** import GeoJSON WGS84, contour synchronisé sur les cartes, superficie géodésique approximative et export d’une fiche Markdown contenant sources, calculs, valeurs manquantes et limites.
- **Assistant outillé :** chat à gauche et carte à droite; lectures de NASA POWER, du profil local et des rotations; changements de couche réels; questions hors périmètre sans appel NASA automatique.
- **Réponses conversationnelles démo :** Codex CLI rédige les réponses à partir des résultats retournés par les outils locaux FieldNova; la connexion est limitée au serveur Vite de développement.
- **Traits agronomiques sourcés :** la fiche « Pourquoi ? » relie par culture la taxonomie et le statut de légumineuse à INPN TAXREF et l’architecture racinaire connue à la publication DRAAF Hauts-de-France; les racines inconnues n’entrent pas dans le calcul. La référence DRAAF est régionale et ne constitue pas un conseil local.
- **Import local dans l’assistant :** un CSV de sol reçoit un aperçu révocable et n’est enregistré qu’après confirmation; aucun fichier n’est transmis à Codex CLI.
- **Démo :** [script de 90 secondes et plans vidéo](demo-script-90s-fieldnova.md).
- **Profil guidé :** cinq étapes locales pour le point confirmé, la rotation actuelle, l’accès à l’eau, les cultures indisponibles et la priorité; l’état du sol existant est consultable dans « Mon terrain ».

L’assistant lit localement les CSV d’analyse de sol après sélection; les PDF et images ne sont pas pris en charge. FieldNova ne calcule pas de statistiques NASA à l’intérieur d’une limite de parcelle. Le catalogue et les rotations restent illustratifs, et les références racinaires générales ne sont pas validées localement; aucun rendement, besoin en eau, amélioration de sol ou prévision n’est calculé.

## Les 12 fonctions à privilégier pour la démonstration

Ces fonctions forment le parcours conseillé pour une démonstration courte. Elles relient le problème de l’agriculteur aux données, à une comparaison de rotations et à une décision compréhensible.

1. **Profil de ferme guidé** : localisation, cultures actuelles, type de sol connu ou inconnu, accès à l’eau et priorité de l’agriculteur.
2. **Parcelle sélectionnable sur la carte** : dessiner ou importer sa limite, puis distinguer la géométrie de la parcelle de la grille des données NASA.
3. **Résumé climatique sourcé** : pluie et températures historiques au point suivi, période affichée, dernière période complète, cellule NASA et limites de résolution.
4. **Fiche sol avec niveaux de confiance** : données saisies par l’agriculteur, analyse de laboratoire importée, données cartographiques et champs inconnus clairement différenciés.
5. **Bibliothèque courte de cultures** : besoins et caractéristiques accompagnés d’une source agronomique locale pour chaque valeur utilisée.
6. **Rotation actuelle comme scénario témoin** : l’agriculteur peut comparer une alternative à sa pratique actuelle.
7. **[PARTIELLEMENT LIVRÉ] Générateur de deux rotations candidates** : explorer les combinaisons du catalogue, exclure les cultures déclarées indisponibles et classer selon les traits visibles; le calendrier et les règles agronomiques locales ne sont pas modélisés.
8. **[PARTIELLEMENT LIVRÉ] Comparaison côte à côte** : les trois rotations affichent les mêmes métriques descriptives et la priorité choisie; le climat et le sol apparaissent en contexte, sans évaluation des besoins culturaux, de la couverture ou du calendrier.
9. **[LIVRÉ · SYNTHÈSE DES QUATRE ENTRÉES] Justification de chaque résultat** : la fiche réunit priorité de la ferme, caractéristiques des cultures, contexte NASA et données de sol disponibles; elle signale les inconnues et propose des vérifications adaptées. Les scores restent limités aux métriques descriptives et ne mesurent pas les bénéfices agronomiques.
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
6. **[P1 · PARTIEL] Fenêtre de travail habituelle** : l’utilisateur peut déclarer les mois où semis et récolte sont habituellement possibles. La fiche rotation compare le chevauchement mensuel avec les fenêtres culturales saisies. Le travail du sol, les équipements et la faisabilité restent à modéliser; ces déclarations ne changent pas le classement.
7. **[P1] Préférences et exclusions de cultures** : cultures appréciées, impossibles ou soumises à un contrat local.
8. **[P1] Tolérance au risque** : faible, moyenne ou élevée, avec explication de l’effet sur le classement des scénarios.
9. **[P2] Plusieurs profils de fermes** : gérer différentes exploitations sans mélanger leurs données.
10. **[P2] Parcours de prise en main** : faire découvrir carte, profil de sol, scénarios et provenance à un nouvel utilisateur.

### B. Carte et observations NASA — 11 à 20

11. **[LIVRÉ] Limite de parcelle dessinable ou importable** : dessiner depuis le point suivi, voir le contour temporaire, annuler ou retirer un sommet, enregistrer seulement un polygone valide, ou importer un GeoJSON WGS84. La superficie géodésique approximative s’affiche; aucune statistique NASA zonale n’est calculée.
12. **[P0 · LIVRÉ] Empreinte de la maille météo NASA sur la carte** : afficher le centre, les limites MERRA-2 (0,5° × 0,625°) et la taille approximative, séparément du point cliqué, des couches GIBS/SMAP et du polygone agricole. Le centre est dérivé de la grille native, car la géométrie de réponse POWER reprend la coordonnée demandée.
13. **[LIVRÉ · PARTIEL] Fiche de provenance au clic** : l’onglet Données & confiance expose la source POWER renvoyée, la date de récupération, la grille, les produits GIBS sélectionnés, leurs dates de produit interrogées au service WMTS et leurs liens de citation. La disponibilité temporelle du service est indiquée comme indisponible si la requête échoue; l’interface ne déduit pas une date de l’horloge locale.
14. **[LIVRÉ · PARTIEL] Légende persistante des couches** : la carte partagée présente les couches visibles, les unités ou échelles publiées par GIBS, les dates de produit réellement disponibles et les limites de grille/parcelle. Les détails spécifiques de chaque couche continuent d’être améliorés.
15. **[P1 · PARTIELLEMENT LIVRÉ] Chronologie des observations** : l’Atlas permet de comparer 3, 6, 12, 36 ou 60 derniers mois de séries NASA POWER mensuelles, en gardant la période distincte de la date de récupération. Les mois demandés restent positionnés sur l’axe même sans valeur et les courbes sont interrompues sur ces lacunes; la consultation d’une chronologie plus détaillée reste à développer.
16. **[P1] Historique NDVI par point** : afficher un signal de végétation avec la date et la cadence réelle du produit GIBS sélectionné.
17. **[P1] Humidité de surface et racinaire SMAP** : distinguer clairement le produit cartographique SMAP des variables NASA POWER.
18. **[P1 · PARTIELLEMENT LIVRÉ] Qualité de couverture POWER** : l’Atlas compte les mois avec valeur pour les six paramètres sur les douze mois demandés et nomme les mois absents. Cela ne mesure ni la couverture nuageuse, ni la qualité d’une estimation; aucune interpolation n’est appliquée.
19. **[P2] Carte de comparaison de deux périodes** : afficher les différences saisonnières avec des plages temporelles comparables.
20. **[P2 · LIVRÉ · EXPORT AU POINT] Télécharger les séries NASA POWER** : l’Atlas exporte la fenêtre mensuelle demandée avec les six paramètres, unités, mois absents conservés vides, source, date de récupération et mode réseau/cache. Le point est arrondi à 0,001° pour la confidentialité; ce CSV ne contient pas de statistiques zonales de parcelle.

### C. Sol et santé des sols — 21 à 30

21. **[P0 · LIVRÉ] Profil de sol avec inconnues explicites** : texture, profondeur utile, drainage, matière organique et pH ne sont jamais remplis par défaut.
22. **[Livrée — CSV Mon terrain + Assistant] Import d’une analyse de sol** : lire localement un CSV UTF-8 avec intervalles en centimètres, aperçu révocable, validation des plages et métadonnées de laboratoire/date conservées au niveau des horizons. L’origine des caractéristiques générales déjà saisies n’est pas remplacée. Dans l’assistant, le profil du point utilisé au dépôt n’est modifié qu’après confirmation; PDF et images ne sont pas analysés et aucun fichier n’est transmis à Codex CLI.
23. **[P0 · LIVRÉ · ORIGINE DÉCLARÉE PAR CARACTÉRISTIQUE] État et provenance par champ** : Mon terrain affiche l’état et l’origine de chaque caractéristique générale. Chaque champ peut hériter de la source générale ou préciser son propre type de source, sa référence, sa date et sa méthode; les horizons gardent leur provenance séparée. L’assistant et l’export de décision reprennent ces distinctions. Les déclarations ne sont pas vérifiées et aucun niveau de fiabilité n’est calculé.
24. **[Livrée] Vue des horizons du sol** : saisir jusqu’à cinq couches de 0 à 400 cm, leurs textures/pH/matière organique connus, et distinguer les intervalles manquants ainsi que la profondeur sous la dernière couche comme non documentés. Provenance déclarée partagée avec le profil local.
25. **[P1] Indicateurs de santé du sol définis** : expliquer chaque indicateur, sa méthode et les données requises avant de le calculer.
26. **[P1 · LIVRÉ] Historique des analyses** : archiver localement jusqu’à 20 analyses déclarées; afficher les valeurs et ne calculer un écart qu’à profondeur et méthode identiques.
27. **[P1 · LIVRÉ · SAISIE LOCALE] Fiche de prélèvement** : Mon terrain associe une note de prélèvement au point suivi et enregistre la date, la méthode déclarée, le laboratoire/la référence et les profondeurs décrites; l’import CSV de laboratoire conserve aussi ces métadonnées par horizon. Elles peuvent être notées même si les propriétés mesurées restent inconnues. Rien n’est envoyé au serveur et FieldNova ne valide pas le protocole.
28. **[P2] Photos de terrain annotées** : lier des observations visuelles à une parcelle sans les traiter comme une mesure scientifique.
29. **[P2] Import d’une carte pédologique locale** : afficher l’organisme, l’échelle cartographique et la légende d’origine.
30. **[P2 · PARTIELLEMENT LIVRÉ] Plan d’acquisition de données manquantes** : Mon terrain liste les propriétés du sol manquantes ou déclarées et ouvre le formulaire local pour les saisir. La liste ne prétend pas classer les analyses par valeur d’information; le sol n’entre pas dans le classement descriptif actuel des rotations.

### D. Cultures et rotations — 31 à 40

31. **[P0 · PARTIEL] Catalogue local de cultures** : l’utilisateur peut ajouter, pour chaque point suivi, une culture avec famille, statut de légumineuse, architecture racinaire et référence facultative. Ces déclarations locales entrent dans les métriques descriptives et sont reprises dans la justification, l’assistant de démarrage et l’export. Le catalogue initial reste illustratif; les entrées personnalisées ne sont pas vérifiées, et le catalogue n’est pas validé pour une région pilote.
32. **[P0 · LIVRÉ] Carte d’une rotation sur plusieurs saisons** : trois séquences éditables montrent distinctement les cultures de chaque année.
33. **[P0 · LIVRÉ] Rotation actuelle comme référence** : la séquence de référence est modifiable et sert de base aux écarts affichés.
34. **[P0 · À VALIDER LOCALEMENT] Vérification des successions incompatibles** : aucune règle d’incompatibilité n’est appliquée sans source agronomique et validation adaptées à la région pilote.
35. **[P1 · PARTIEL] Familles botaniques** : les cartes affichent désormais les familles année par année; le détail ouvre TAXREF/INPN, et les cartes comptent aussi les familles distinctes et répétitions consécutives. Aucune répétition n’est bloquée sans règle et validation locales.
36. **[P1] Cultures de couverture** : ajouter une option dédiée, avec ses coûts opérationnels et ses limites locales.
37. **[P1] Intercultures et mélanges** : représenter deux cultures simultanées et éviter de les traiter comme une rotation simple.
38. **[P1 · PARTIEL] Calendrier cultural local** : fenêtres de semis et de récolte saisies par l’utilisateur et liées au point suivi, avec source/variété facultative. Aucune date n’est préremplie; les fenêtres sont visibles dans la justification de la rotation, consultables dans l’Assistant et incluses dans l’export Markdown avec leur provenance. La justification compare aussi leur chevauchement aux disponibilités habituelles déclarées. Aucune de ces données ne modifie le classement. Les durées de croissance, références régionales et validations agronomiques restent à intégrer.
39. **[P2] Variétés et durées de cycle** : différencier les caractéristiques variétales des valeurs génériques de l’espèce.
40. **[P2] Rotation éditable manuellement** : laisser l’agriculteur imposer une culture ou un ordre, puis recalculer les contraintes.

### E. Scénarios et comparaison — 41 à 50

41. **[P0 · LIVRÉ] Trois scénarios comparables** : rotation de référence, option principale et option alternative générées.
42. **[P0 · LIVRÉ] Classement compréhensible** : les métriques, règles de départage et raisons de sélection sont consultables; aucun score opaque n’est utilisé.
43. **[P0 · LIVRÉ] Priorités de comparaison pondérées** : sélectionner plusieurs critères et leur attribuer un poids explicite de ×1 à ×3; les indicateurs bruts, normalisations et départages sont affichés. La note est un outil descriptif de tri, pas un score agronomique validé.
44. **[P0 · PARTIEL] Panneau des compromis** : compare le critère choisi à la référence, rend visibles les autres écarts descriptifs, rappelle les déclarations locales d’accès/restriction d’eau dans la fiche « Pourquoi ? » et l’export, et précise qu’elles ne participent pas au classement faute de besoins en eau validés par culture. Rendements, coûts, matériel et calendrier local ne sont pas évalués; une comparaison fiable de ces contraintes nécessite des données locales validées.
45. **[P1 · PARTIEL] Simulation de météo historique** : comparer une année civile complète choisie par l’utilisateur avec les 12 derniers mois et les fenêtres NASA POWER les plus sèches/chaudes. Une année n’est proposée que si les douze mois sont présents; les moyennes utilisent les valeurs disponibles sans interpolation. Cela ne simule pas la réponse d’une culture ou le rendement d’une rotation; un modèle agronomique local validé reste nécessaire.
46. **[P1] Scénario de disponibilité en eau** : comparer des hypothèses définies par l’utilisateur et montrer quelles données sont absentes.
47. **[P1 · LIVRÉ] Sensibilité des résultats** : sur les trois rotations affichées, tester les variations d’un niveau (±1) de chaque poids actif et signaler si le scénario en tête change; l’analyse n’implique aucun rendement ou impact agricole.
48. **[P1 · LIVRÉ] Avertissement « données insuffisantes »** : une séquence qui ne renseigne pas ses cinq années n’obtient ni note ni place de tête; la fiche indique combien d’années compléter et le classement ne retient que les rotations complètes compatibles.
49. **[P2] Comparaison multi-parcelles** : repérer les rotations communes et les contraintes qui diffèrent selon les parcelles.
50. **[P2] Historique des versions de scénarios** : retrouver les hypothèses utilisées à chaque comparaison.

### F. Assistant agricole explicable — 51 à 60

51. **[P0 · LIVRÉ] Réponse liée au point sélectionné** : chaque réponse conserve et affiche la coordonnée utilisée, même lorsque l’utilisateur déplace ensuite le point suivi sur la carte; les sources indiquent séparément la maille ou résolution de leur produit.
52. **[P0 · LIVRÉ] Réponse avec sources consultables** : chaque réponse fondée sur un outil affiche les sources associées à ses données — NASA POWER/GIBS, profil local FieldNova ou références agronomiques — avec distinction explicite entre déclaration locale et source externe.
53. **[P0 · LIVRÉ] Trace d’outils réelle** : le chat affiche les lectures locales, requêtes NASA POWER, actions de couche et statuts réellement exécutés.
54. **[P0 · LIVRÉ] Questions de suivi suggérées** : proposer pluie, température et humidité seulement lorsque la variable correspondante existe dans la dernière période NASA exploitable; adapter aussi la question NDVI à la couche affichée et conserver les actions vers les profils locaux et rotations.
55. **[P1 · LIVRÉ] Réponses séparant source, calcul, déclaration et limite** : des badges distincts qualifient NASA POWER/GIBS, les calculs descriptifs FieldNova, les déclarations locales, les valeurs manquantes et les limites. Aucune hypothèse non calculée n’est présentée comme un fait.
56. **[P1 · LIVRÉ] Réponse courte pour le terrain** : les réponses longues s’ouvrent sur leur première phrase utile, nettoyée du balisage Markdown; la réponse complète, ses sources et les actions restent accessibles dans un panneau dépliable. Le résumé est extrait du texte de réponse et n’ajoute aucun fait.
57. **[P1 · LIVRÉ] « Pourquoi ce scénario ? »** : chaque carte ouvre une justification avec métriques, critères pondérés, écarts à la référence, traits par année, sources et limites; les critères peuvent être activés/désactivés et leurs poids modifiés dans le panneau Scénarios.
58. **[P1 · LIVRÉ] Refus des questions hors périmètre et des conseils non calculables** : une question non prise en charge n’appelle ni Codex ni un outil; une demande de dose/date d’irrigation ou de prédiction de rendement reçoit une explication des données manquantes et des limites, sans conseil inventé.
59. **[P2] Dictée vocale** : capturer une question en extérieur et la relire avant envoi.
60. **[P2] Mode bilingue/localisé** : traduire interface et unités sans transformer le sens des recommandations.

### G. Expérience utilisateur et travail au champ — 61 à 70

61. **[LIVRÉ] Parcours de démo sans compte ni configuration** : le bouton de la landing démarre une ferme fictive préremplie; le profil, les rotations et les contraintes d’exemple sont séparés des réponses NASA consultées en direct.
62. **[LIVRÉ] Indicateur « exemple » persistant** : le bandeau global reste visible dans toutes les vues et permet de quitter le cas fictif; le profil sauvegardé avant le lancement est restauré.
63. **[P1 · PARTIELLEMENT LIVRÉ] Mode mobile utilisable au champ** : navigation en tiroir, cartes responsives, contrôles cartographiques de 44 px et panneaux alternables sur l’explorateur de rotations; l’Assistant dispose aussi d’un sélecteur accessible Chat/Carte, ouvre le chat par défaut et garde son champ de saisie dans la hauteur visible. La densité des autres vues et l’usage réel au champ restent à évaluer.
64. **[P1 · PARTIEL] Connexion lente tolérante** : les requêtes NASA POWER ont un délai maximal de 20 secondes, sont annulées si le point change et exposent un bouton de nouvel essai en cas d’échec. Une copie locale récente ou âgée de moins de six mois sert de repli hors ligne et son statut est visible; aucune série périmée n’est montrée sans ce libellé.
65. **[P1] Unités préférées** : choisir unités métriques et formats locaux, tout en conservant l’unité d’origine en provenance.
66. **[P1] Contraste de carte et daltonisme** : ne jamais faire dépendre une alerte d’une seule couleur.
67. **[P1 · PARTIELLEMENT LIVRÉ] Navigation au clavier** : le shell permet de passer directement au contenu principal et affiche un focus visible sur commandes, champs, sélecteurs et résumés repliables; le redimensionnement de la barre répond aussi aux flèches. Un audit complet des formulaires, panneaux, graphiques et interactions de carte reste à faire.
68. **[P2] Notifications configurables** : choisir les alertes et leur fréquence au lieu de notifier automatiquement tout utilisateur.
69. **[P2] Journal d’observations de terrain** : consigner semis, récolte, irrigation et notes avec date et auteur.
70. **[P2 · PARTIEL] Partage privé de la fiche** : l’export Markdown propose par défaut d’omettre les coordonnées précises et un choix distinct pour les inclure; le centre approximatif de la maille NASA reste dans les deux versions. Lien partageable et PDF restent à faire.

### H. Validité, confiance et qualité des données — 71 à 80

71. **[LIVRÉ · PARTIEL] Registre des sources et méthode** : registre suivi avec produits, paramètres, périodes, résolutions, liens et limites pour les sources actuelles; chaque vue ne référence pas encore tous les détails propres à chaque requête.
72. **[P0 · LIVRÉ] Fiche de méthode du classement** : formule des critères pondérés normalisés, unités, filtres, départages et sélection de l’option alternative consultables depuis le panneau Scénarios; le rôle du climat et du sol est explicité.
73. **[P0 · LIVRÉ] Séparation entre observation, modèle et saisie utilisateur** : NASA POWER/MERRA-2 et GIBS/SMAP sont nommés comme données ou produits modélisés; le profil de sol et le profil de ferme gardent leur provenance déclarée; les valeurs inconnues restent vides.
74. **[P0 · LIVRÉ] Dates et valeurs manquantes auditables** : NASA POWER exclut le mois en cours; la traçabilité expose la fenêtre de mois clos et, variable par variable, le nombre de valeurs exploitables et la liste des mois manquants.
75. **[P1 · LIVRÉ] Limites spatiales affichées sur la carte** : les vues affichent le centre et la résolution de la maille NASA POWER MERRA-2 quand elle est chargée; Terrain affiche aussi la résolution SMAP et les panneaux rappellent que les données de grille ne sont pas des mesures de parcelle. La résolution précise de chaque tuile MODIS n’est pas exposée par FieldNova.
76. **[P1 · PARTIEL] Journal de transformation** : l’onglet Traçabilité détaille pour la série NASA POWER le point arrondi transmis, les paramètres/période, l’exclusion du mois en cours et des valeurs de remplissage, la maille MERRA-2 dérivée et la conversion des humidités en pourcentage. Les étapes de rendu et de date des tuiles GIBS ne sont pas interrogées par l’API de la carte.
77. **[P1 · LIVRÉ · COHÉRENCE PHYSIQUE PARTIELLE] Contrôle d’unité et de plage** : la traçabilité signale pluie négative, humidité de sol hors fraction 0–1 et maximum inférieur au minimum; les valeurs brutes restent inchangées. Pas de seuil statistique ni de validation agronomique.
78. **[P1] Validation indépendante des règles agronomiques** : documenter la source ou l’avis expert, la région et la date de révision.
79. **[P2] Comparaison avec une station de terrain** : évaluer un produit NASA contre une observation indépendante lorsque les données existent.
80. **[P2 · LIVRÉ · MARKDOWN LOCAL] Téléchargement de la fiche de preuves** : « Exporter la fiche » génère une comparaison partageable avec rotations, scores et méthode, contexte NASA POWER sourcé et limites, profil de sol avec provenance déclarée, calendriers culturaux saisis et sources facultatives; les coordonnées précises sont omises par défaut et peuvent être incluses explicitement. Aucun envoi serveur ni PDF n’est prévu dans cet export.

### I. Impact, adaptation et communauté — 81 à 90

81. **[P0 · PARTIEL] Histoire d’une ferme pilote** : le script utilise une ferme explicitement fictive et un problème de comparaison générique; il manque un lieu et des priorités validés avec une exploitation réelle.
82. **[P0 · PARTIEL] Indicateur mesurable de couverture et d’activité** : la vue d’ensemble compte les domaines de données utilisables au point suivi (les exemples fictifs sont exclus) et le nombre de générations de comparaison réussies pour ce point, stocké sur l’appareil. Ce compteur mesure une exploration lancée, pas une décision adoptée ni un impact agricole.
83. **[P1] Mesure des besoins des agriculteurs** : conduire quelques entretiens et faire apparaître ce qui a changé dans le produit.
84. **[P1] Scénarios adaptés aux petites exploitations** : prendre en compte coût, main-d’œuvre et matériel, pas seulement la météo.
85. **[P1 · LIVRÉ · INDICATEURS HISTORIQUES] Scénarios de stress hydrique et thermique** : compare les 12 dernières valeurs mensuelles disponibles à la fenêtre consécutive de 3 mois la plus sèche et à celle la plus chaude au point sélectionné; le classement montre pluie, température et humidité racinaire. Ces moyennes de grille ne détectent pas un événement agronomique validé et ne prédisent ni rendement ni impact futur.
86. **[P1] Partage de modèles de rotation locaux** : publier les règles avec région, source et licence.
87. **[P2] Comparaison de régions** : expliquer quelles différences proviennent du climat, du sol ou des cultures possibles.
88. **[P2] Contribution volontaire d’observations** : laisser un agriculteur contribuer sans rendre publiques ses données par défaut.
89. **[P2] Tableau de couverture des données agricoles** : montrer où les sources sont disponibles ou insuffisantes.
90. **[P2] Indicateurs de résilience communautaire** : comparer des options à l’échelle d’une communauté seulement avec des données et autorisations adaptées.

### J. Démonstration, documentation et préparation au jugement — 91 à 100

91. **[P0 · LIVRÉ] Démo chronométrée de 90 secondes** : un script fournit les actions, la narration, les plans vidéo et le repli en cas d’indisponibilité.
92. **[LIVRÉ] Scénario de démonstration reproductible** : route `/demo`, profil et rotations marqués fictifs, point connu, observations NASA POWER rechargées, état antérieur sauvegardé puis restaurable.
93. **[P0 · LIVRÉ] Écran d’accueil expliquant le problème** : l’accueil décrit le lien entre séries NASA, contexte local et rotations; les vues expliquent les critères réellement comparés et leurs limites.
94. **[P0] Vidéo avec données lisibles** : montrer sources et limites à l’écran, pas seulement des animations de carte.
95. **[P0 · LIVRÉ] Phrase de distinction** : FieldNova relie séries NASA mensuelles, contexte local et rotations de cinq ans pour comparer des critères descriptifs, sans prétendre prévoir un rendement ou diagnostiquer une parcelle.
96. **[P1 · LIVRÉ · `/methode`] Page technique publique** : accessible depuis le pied de page de la landing, la fiche décrit les sources actives ou saisies localement, les étapes de traitement, la licence MIT du code séparée des conditions tierces, les règles de confidentialité, les limites d’usage et les commandes de lancement. Elle renvoie aussi au README et à la traçabilité détaillée dans l’application.
97. **[P1 · PARTIEL] État de service visible** : la barre supérieure distingue la série reçue en ligne, le cache récent, la copie locale ancienne et l’indisponibilité; le bandeau démo distingue séparément les données fictives des séries NASA. Les dates de fraîcheur propres à chaque produit GIBS et les réponses servies en cache par d’autres intermédiaires ne sont pas connues.
98. **[P1 · LIVRÉ · EXTRAIT NASA DATÉ] Mode de secours hors réseau** : si POWER échoue au point fictif de la démo, l’application utilise un extrait NASA POWER archivé au 15 novembre 2026 (dernière période exploitable : septembre 2026), dans le dashboard, l’assistant et la traçabilité. L’état, la date et l’export CSV indiquent explicitement qu’il s’agit d’un extrait hors ligne, et cet extrait ne s’applique pas aux autres points.
99. **[P1] Captures et script de présentation** : préparer un parcours de secours si la connexion ou la carte échoue.
100. **[P1 · GUIDE SOURCÉ LIVRÉ · PRÉPARATION ORALE RESTANTE] Réponses aux questions des juges** : [`judge-brief-fieldnova.md`](judge-brief-fieldnova.md) résume le défi, les données, la méthode, la licence, l’architecture d’assistant, les limites, les preuves à ouvrir et les affirmations non étayées à éviter. L’équipe doit encore ajouter ses rôles réels, répéter les réponses et recueillir des preuves d’impact et de validation terrain.

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

