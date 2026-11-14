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

Le socle React, le shell partagé, la landing page, la connexion de démonstration et les six vues authentifiées sont réalisés : Vue d’ensemble, Atlas, Mon terrain, Scénarios, Assistant et Données & confiance. Les principales interactions fonctionnent localement dans le prototype.

Les parcelles, couches, réponses de l’assistant, métriques et profils du sol visibles sont illustratifs. Aucun flux NASA, météo, capteur, fournisseur de sol ni modèle LLM n’est connecté. L’interface signale ces limites au lieu de présenter les valeurs de démonstration comme des observations réelles.
