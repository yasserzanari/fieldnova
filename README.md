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
- `src/features/assistant/` — chat contextualisé et appels d’outils agricoles.
- `src/features/data-trust/` — catalogue, provenance et qualité des données.
- `src/styles/` — tokens visuels et styles globaux partagés.
- `data/` — contrats de données et exemples clairement étiquetés.
- `public/` — images et autres ressources statiques.
- `ui-concepts/` — concepts visuels de référence approuvés.
- `docs/` — notes de travail locales, exclues du dépôt.

## État

Le socle React, le shell partagé et la landing page sont installés. Les routes authentifiées sont en cours de réalisation, une par une ; tant qu’un onglet n’est pas livré, il affiche son concept visuel de référence.

Les nombres visibles dans les visuels de présentation sont illustratifs. Ils ne proviennent pas encore de données de parcelle en direct.
