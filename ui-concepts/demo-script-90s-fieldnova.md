# Démonstration FieldNova — 90 secondes

## Promesse à montrer

FieldNova aide une exploitation à examiner des rotations avec le contexte climatique NASA disponible et les informations locales qu’elle a saisies. La démo met en avant des faits consultables, les critères de comparaison et les inconnues; elle ne prétend pas donner un conseil agronomique validé.

## Préparation avant l’enregistrement

1. Lancer le projet sur le réseau local avec `npm run dev -- --port 5180`.
2. Depuis la landing, cliquer « Essayer la démo fictive ». Le bandeau permanent **MODE DÉMO** doit distinguer le profil fictif des observations NASA POWER réelles. L’option « Quitter » permet de restaurer les données locales d’avant la démo.
3. Vérifier que Codex CLI est installé et connecté sur la machine qui lance Vite avec `codex login status`; vérifier aussi `/api/codex/status` dans le navigateur.
4. Ouvrir `/app/scenarios` et attendre la fin du chargement NASA POWER. Vérifier que la période mensuelle et les références du même mois précédent sont visibles.
5. Vérifier que les rotations sont marquées **Exemple illustratif** et que le sol est inconnu dans ce cas fictif.
6. Ne pas ajouter de valeurs de sol inventées. Le profil inconnu montre comment FieldNova garde une inconnue visible.
7. Si NASA POWER ou Codex CLI est indisponible, conserver l’état d’erreur à l’écran et expliquer que FieldNova garde une réponse locale et ne remplace pas les observations absentes par des nombres fictifs.
8. Fermer les onglets inutiles et enregistrer en 1625 × 1231 ou dans un format 16:9 qui laisse les panneaux lisibles.

## Script avec actions et narration

| Temps | Action à l’écran | Narration |
|---|---|---|
| 0–10 s | Depuis l’accueil, lancer « Essayer la démo fictive »; montrer le bandeau MODE DÉMO puis la carte et les trois rotations. | « Un agriculteur doit réfléchir à la succession de ses cultures alors que les conditions climatiques varient. Voici une ferme fictive pour la démonstration; les données NASA restent réelles et identifiées. » |
| 10–24 s | Pointer la carte, les coordonnées, la période NASA POWER et la cellule de grille. | « Ici, la carte est interactive. Les valeurs NASA POWER correspondent à une cellule de grille et à un mois complet; elles ne sont pas une mesure de la parcelle. » |
| 24–37 s | Montrer pluie, température et humidité racinaire, puis les moyennes et plages des mêmes mois des années précédentes. | « L’agriculteur voit les conditions récentes à côté d’un repère calculé sur les mêmes mois observés auparavant. Le nombre d’années utilisées est indiqué. » |
| 37–51 s | Modifier une culture dans une option de cinq ans, puis changer la priorité vers « Alternance des racines connues ». | « Il peut modifier une rotation et choisir le critère qui compte pour lui. FieldNova montre les familles, les légumineuses et les racines seulement lorsqu’elles sont documentées; le classement reste un compte explicable, pas un rendement prédit. » |
| 51–65 s | Ouvrir Assistant et demander : « Que montre l’humidité racinaire pour le point suivi ? » Déplier la trace et afficher la couche racinaire. | « L’assistant lit la série chargée, explique le produit et ses limites, puis active la couche demandée sur la carte. Les sources consultées sont visibles dans la conversation. » |
| 65–76 s | Revenir à Scénarios et montrer le panneau de sol vide, ou l’origine/date d’un profil réellement saisi. | « Si le sol n’est pas renseigné, FieldNova le laisse inconnu. Si une analyse est ajoutée, son origine, sa date et sa référence sont conservées comme déclarations de l’utilisateur, sans prétendre les vérifier. » |
| 76–90 s | Cliquer sur « Exporter la fiche » et ouvrir le Markdown généré. | « La comparaison peut être emportée avec ses hypothèses, ses valeurs NASA, sa méthode et ses limites. La fiche rappelle ce qui manque avant toute décision agronomique. » |

Lire les valeurs affichées en direct pendant la narration. Ne pas apprendre par cœur les exemples du catalogue ni promettre un gain de rendement, une économie d’eau ou une amélioration du sol.

## Plans à inclure dans la vidéo

- Carte satellite, changement de couche et point suivi.
- Valeur NASA POWER, période, coordonnées de cellule et référence historique du même mois.
- Édition d’une rotation et changement du critère de comparaison.
- Conversation Assistant avec trace d’outil, réponse sourcée et couche actualisée.
- Profil du sol marqué inconnu ou avec origine déclarée, date et référence.
- Téléchargement et ouverture de la fiche Markdown.

## Transparence pour le jury

- Le routeur local exécute les outils de données FieldNova; Codex CLI formule une réponse à partir de leurs résultats et des derniers messages. La démo dépend de la session Codex CLI sur le serveur Vite.
- Les pièces jointes ne sont pas analysées.
- Le catalogue de cultures est illustratif et n’a pas été validé par un spécialiste de la région.
- Le polygone GeoJSON est visualisé et sa superficie approximative calculée; FieldNova ne calcule pas de statistiques NASA zonales à l’intérieur.
- Les séries mensuelles et produits satellites régionaux ne fournissent ni prévision locale, ni dose d’irrigation, ni rendement.

## Repli si un service ne répond pas

La démo reste honnête : montrer le message d’indisponibilité et passer à l’édition des rotations, au profil de sol local ou à l’export. Ne pas remplacer une réponse absente par une capture ou une valeur qui semblerait en direct.
