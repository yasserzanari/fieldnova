# FieldNova

FieldNova est une plateforme d’aide à la décision agricole qui relie climat, observations satellite et contexte des parcelles pour comprendre les risques et planifier les cultures.

## Démarrer

```sh
npm install
npm run dev
```

Le serveur Vite écoute sur `http://localhost:5173` et recharge l’application pendant les modifications. `npm run build` vérifie les types puis produit la version compilée.

## Structure des modules

- `src/app/` — routes, shell authentifié, navigation commune et configuration globale.
- `src/features/landing/` — site public et présentation du produit.
- `src/features/auth/` — connexion et parcours d’accès.
- `src/features/demo/` — lancement public et sortie restaurable du cas fictif.
- `src/features/overview/` — vue d’ensemble de l’exploitation.
- `src/features/atlas/` — carte, couches géospatiales et acquisitions.
- `src/features/terrain/` — parcelles, propriétés du sol et rotation.
- `src/features/scenarios/` — comparaison de rotations et compromis.
- `src/features/assistant/` — chat contextualisé, traces d’outils de démo et carte synchronisée.
- `src/features/data-trust/` — catalogue, provenance et qualité des données.
- `src/styles/` — tokens visuels et styles globaux partagés.
- `data/` — contrats de données et exemples clairement étiquetés.
- `public/` — images et autres ressources statiques.
- `ui-concepts/` — concepts visuels de référence approuvés.
- `docs/` — notes de travail locales, exclues du dépôt.

## État

Le shell partagé, la landing page, la connexion de démonstration et les six vues de l’espace sont réalisés : Vue d’ensemble, Atlas, Mon terrain, Scénarios, Assistant et Données & confiance. Depuis l’accueil, « Essayer la démo fictive » ouvre directement un cas réinitialisable sans identifiants.

### Données et limites actuelles

- NASA POWER fournit des séries mensuelles de précipitations, températures et humidité modélisée pour le point suivi. Le résultat est associé à une cellule de grille, pas à une mesure de parcelle. Au changement de point ou pendant une actualisation, les anciennes valeurs et l’empreinte de grille sont masquées jusqu’au retour de la nouvelle série; les réponses tardives d’un point précédent sont ignorées.
- NASA GIBS sert les couches cartographiques MODIS et SMAP affichées par la carte interactive MapLibre. Les couches de sol SMAP sont des produits modélisés à résolution régionale.
- Le profil local de sol (texture, pH, matière organique, profondeur et drainage) est saisi par l’utilisateur et conservé dans son navigateur. Il n’est pas vérifié par analyse de laboratoire ni envoyé à un serveur.
- Le profil guidé de ferme en cinq étapes enregistre localement le nom, le point confirmé, les cultures de référence connues, l’accès et les restrictions d’eau déclarés, les cultures indisponibles et la priorité de comparaison. Il met en évidence le statut du sol déjà renseigné dans « Mon terrain »; les données restent sur le navigateur et ne deviennent pas des conseils ou des mesures.
- « Essayer la démo fictive » charge une ferme et des rotations d’exemple, conserve un bandeau dans toutes les vues, et restaure les données locales préexistantes à la sortie. Le profil et les rotations de l’exemple sont fictifs; NASA POWER est consulté séparément.
- L’explorateur de rotations compare trois successions selon des métriques descriptives de familles botaniques, répétitions et présence de légumineuses. Chaque rotation expose sa méthode, ses écarts à la référence, ses traits sourcés, ses données NASA et sol disponibles, et les limites à valider. Il peut générer deux options selon le critère choisi et les cultures déclarées indisponibles pour la ferme; les contraintes sont enregistrées localement par point. Ce tri n’utilise pas le climat ni le sol pour prédire la compatibilité culturale. Le catalogue et ses rotations préremplies restent des exemples à adapter et valider localement; ce n’est ni une recommandation agronomique ni une prédiction de rendement.
- L’onglet Climat historique compare des périodes NASA POWER observées. Il ne prédit pas les conditions futures.
- L’assistant route localement les outils FieldNova et utilise Codex CLI en mode démo pour rédiger les réponses à partir des résultats consultés. Il faut une session Codex CLI connectée sur le serveur de développement; aucune clé API séparée n’est requise.
- Le mode démo distingue le profil et les rotations fictifs des observations NASA POWER consultées en direct. Il remplace temporairement, au point de démo, les informations agricoles locales et la limite de parcelle; « Quitter » restaure les valeurs qui existaient avant le lancement.

Les valeurs d’exemple sont étiquetées dans l’interface et séparées des observations NASA et des entrées locales de l’utilisateur.

## Licence

Le code FieldNova est publié sous licence MIT. Voir [LICENSE](LICENSE). Cette licence couvre le code du projet; elle ne remplace pas les conditions et attributions propres aux jeux de données, fonds de carte, bibliothèques et autres contenus tiers référencés dans [`ui-concepts/references-and-data-sources.md`](ui-concepts/references-and-data-sources.md).
