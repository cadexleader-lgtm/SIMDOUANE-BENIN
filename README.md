# SimDouane Bénin

SimDouane Bénin est une application web qui aide les importateurs et les
professionnels à **estimer** certains frais liés à l'importation de véhicules.
Les résultats sont indicatifs et ne constituent ni une liquidation douanière,
ni une décision de l'administration.

## Fonctionnalités

- Simulateur de coûts douaniers et portuaires à partir des données saisies.
- Résultats détaillés et export PDF.
- Historique local et, pour les comptes éligibles, historique sauvegardé côté
  serveur.
- Comptes, profil et onboarding via Clerk.
- Tableau de bord d'administration pour les utilisateurs, abonnements et
  simulations.
- Interface en français et en anglais.

## Structure

| Dossier | Rôle |
| --- | --- |
| `artifacts/simdouane` | Application web React, TypeScript et Vite |
| `artifacts/api-server` | API Express et routes d'application |
| `lib/db` | Schéma PostgreSQL et accès Drizzle ORM |
| `lib/api-spec` | Contrat OpenAPI et configuration Orval |
| `lib/api-client-react` | Client React Query généré |
| `lib/api-zod` | Schémas de validation générés |
| `scripts` | Outils et scripts partagés |

Les formules de calcul et les règles métier existantes se trouvent dans
`artifacts/simdouane/src/lib/calculator.ts`. Le contrat API est décrit dans
`lib/api-spec/openapi.yaml`; après sa modification, régénérez le client avec
`pnpm --filter @workspace/api-spec run codegen`.

## Prérequis

- Node.js 24
- pnpm 10 (version testée : 10.26.1)
- PostgreSQL 14 ou supérieur
- Un projet Clerk et ses clés de test/développement pour les fonctions protégées

## Installation et lancement en local

```sh
corepack prepare pnpm@10.26.1 --activate
pnpm install
cp .env.example .env
```

Remplacez ensuite les valeurs fictives de `.env` par les paramètres d'une base
PostgreSQL **locale** et les clés de votre propre projet Clerk. Configurez
également les URL de redirection Clerk pour `http://localhost:5173`.

Pour initialiser le schéma, utilisez une base de développement locale :

```sh
pnpm --filter @workspace/db run push
```

Ne lancez pas cette commande avec l'URL de la base de production ou de la base
Replit. Elle synchronise le schéma avec la base fournie dans `DATABASE_URL`.

Démarrez ensuite l'API et le frontend ensemble :

```sh
pnpm dev
```

Le frontend est disponible sur `http://localhost:5173`. En développement, Vite
transmet les routes `/api` à l'API locale sur le port 8080. `VITE_API_TARGET`,
`WEB_PORT` et `API_PORT` peuvent être définis pour changer ces valeurs.

## Compilation et contrôles

```sh
pnpm --filter @workspace/api-server run build
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/simdouane run build
pnpm run typecheck
pnpm run build
```

La compilation du frontend produit les fichiers statiques dans
`artifacts/simdouane/dist/public`. Le lancement local de l'API requiert une base
PostgreSQL et les clés serveur Clerk décrites dans `.env.example`.

**État des contrôles dans cet export :** les builds séparés de l'API et du
frontend passent. `pnpm run typecheck` signale actuellement huit erreurs
TypeScript préexistantes dans l'interface (`App.tsx`, `layout.tsx`, ainsi que
les pages admin, dashboard, historique, onboarding et simulateur); `pnpm run
build` s'arrête donc à cette étape. Ces erreurs n'ont pas été corrigées dans
cet export afin de ne pas modifier les pages ni les règles métier.

## Variables d'environnement

| Variable | Utilisation |
| --- | --- |
| `DATABASE_URL` | Connexion PostgreSQL utilisée par l'API et Drizzle |
| `CLERK_SECRET_KEY` | Clé serveur Clerk; ne jamais la placer dans le code client |
| `CLERK_PUBLISHABLE_KEY` | Clé publique de secours utilisée par le middleware Clerk côté serveur |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clé publique Clerk intégrée au frontend |
| `VITE_CLERK_PROXY_URL` | URL facultative du proxy Clerk quand la configuration l'exige |
| `LOG_LEVEL` | Niveau de journalisation de l'API; facultatif |
| `VITE_API_TARGET` | Cible du proxy API de Vite en développement; facultatif |
| `PORT`, `BASE_PATH` | Ports et base URL fournis par le script de développement ou la commande de build |

Toutes les valeurs d'exemple sont fictives. Créez `.env` localement et ne le
commitez pas.

## Services liés à Replit

- **Base de données :** l'environnement Replit fournit actuellement
  `DATABASE_URL`. Pour cloner le projet, il faut une base PostgreSQL distincte;
  aucune donnée ni base Replit n'est exportée ou migrée.
- **Authentification :** l'application utilise Clerk. L'instance et les
  paramètres d'authentification gérés dans Replit ne sont pas transférés par
  GitHub. En local, utilisez les clés et URL de redirection de votre propre
  instance Clerk. Le proxy Clerk de l'API sert à l'hébergement configuré pour
  cette fonctionnalité; le développement local peut utiliser Clerk directement.
- **Routage et publication :** le routage des artefacts, les ports de preview,
  les workflows et la publication sont propres à Replit et ne sont pas
  embarqués dans ce dépôt. Le proxy Vite fourni sert uniquement au
  développement local; un déploiement autonome devra configurer un reverse
  proxy pour `/api` et héberger les fichiers statiques.
- **Stockage de fichiers :** le code courant ne nécessite pas de service de
  stockage objet Replit pour démarrer.
- Les plugins Vite `@replit/*` apportent des aides à l'édition dans Replit; le
  démarrage autonome décrit ci-dessus s'appuie sur Vite et l'API locale.

## Historique des données

Les résultats locaux existants utilisent les clés `localStorage`
`simdouane_history` et `simdouane_current`. Les données cloud restent dans la
base à laquelle l'API est connectée. Ce dépôt ne contient aucune sauvegarde de
base de données.
