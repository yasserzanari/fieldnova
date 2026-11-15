# Connexion

- **Route :** `/login`
- **Entrée :** `LoginPage.tsx`
- **Responsabilités :** en développement, formulaire local de démonstration avec retour vers `/demo`, qui démarre le cas fictif balisé. Aucun compte ni fournisseur d’authentification n’est raccordé; hors développement, la page propose directement l’entrée démo sans identifiants. La visibilité du mot de passe, le retour à l’accueil et le lien vers la méthode restent disponibles.
- **Dépendances partagées :** React Router, tokens globaux, logo FieldNova.
- **Données :** l’écran n’est pas relié à un service d’authentification. En développement, il accepte uniquement les identifiants fictifs configurés par `VITE_DEMO_ADMIN_EMAIL` et `VITE_DEMO_ADMIN_PASSWORD`, préremplis depuis `.env.example`. Le formulaire n’accepte pas ces identifiants dans une build de production.
- **Shader :** `mesh-drift.frag.glsl` reprend le shader exact de l’archive FrontUI Mesh Drift. `MeshDriftBackground.tsx` le rend avec WebGL 1, un triangle plein écran et une boucle suspendue quand l’onglet est masqué.
- **Évolution :** remplacer le contrôle local dans `LoginPage.tsx` par le service d’authentification réel avant d’utiliser cet écran en production.
