# SimDouane Bénin

SimDouane Bénin est une application web qui aide les importateurs et les
professionnels à **estimer** certains frais liés à l'importation de véhicules
au Port de Cotonou. Les résultats sont indicatifs et ne constituent ni une
liquidation douanière, ni une décision de l'administration.

> Documentation :
> - [`docs/MIGRATION.md`](docs/MIGRATION.md) — sortie de Replit, transfert des données ;
> - [`docs/SPECIFICATION-MVP.md`](docs/SPECIFICATION-MVP.md) et [`docs/MVP-PHASE0.md`](docs/MVP-PHASE0.md) — MVP « dossier véhicule » ;
> - [`docs/PHASE2-RAPPORT.md`](docs/PHASE2-RAPPORT.md) — comptes, rôles, accès transitaire ;
> - [`docs/PHASE3-RAPPORT.md`](docs/PHASE3-RAPPORT.md) — dossiers véhicules ;
> - [`docs/PLAN-AUTH-SUPABASE.md`](docs/PLAN-AUTH-SUPABASE.md) — passage de Clerk à Supabase Auth (2026-10-30) ;
> - [`docs/RECETTE-PHASE3.md`](docs/RECETTE-PHASE3.md) — recette avec Supabase `simdouane-dev`, deux comptes de test ;
> - [`docs/MISE-EN-LIGNE-CLOUDFLARE.md`](docs/MISE-EN-LIGNE-CLOUDFLARE.md) — version de test en ligne sur Cloudflare (Workers + Hyperdrive) ;
> - [`docs/PHASE4-CONCEPTION.md`](docs/PHASE4-CONCEPTION.md) — checklist provisoire et sources, conception des documents (avant développement) ;
> - [`docs/SECURITE-DONNEES.md`](docs/SECURITE-DONNEES.md) — rôles et permissions, sécurité, protection des données ;
> - [`docs/SUPABASE-DEV.md`](docs/SUPABASE-DEV.md) — projet Supabase de développement et comment y brancher l'application.

## Fonctionnalités

- Simulateur de coûts douaniers et portuaires (`artifacts/simdouane/src/lib/calculator.ts`).
- Résultats détaillés et export PDF (jsPDF, dans le navigateur).
- Historique local (`localStorage`) et, avec un compte, historique sauvegardé côté serveur.
- Comptes (Supabase Auth : inscription avec confirmation de l'email, connexion, mot de passe oublié), profil et onboarding ; type de compte particulier ou entreprise.
- Accès transitaire sur demande, avec justificatifs privés, activé par l'administrateur.
- Dossiers véhicules (« Mes dossiers ») : véhicule pas encore arrivé ou déjà arrivé
  au port de Cotonou, statut brouillon / à compléter / prêt pour la préparation
  administrative, historique. Aide à la préparation uniquement : rien n'est
  déposé auprès des Douanes, du GUCE ou de Bénin Control.
- Formules d'abonnement (Gratuit : 3 simulations/mois, limite appliquée par l'API).
- Demandes d'abonnement Mobile Money traitées à la main par l'administrateur.
- Tableau de bord d'administration (utilisateurs, abonnements, simulations).
- Interface en français et en anglais, installable (PWA).

## Architecture

```
navigateur ──► frontend React (Vite, fichiers statiques)
          └──► /api/* ──► API Express (Node) ──► PostgreSQL (Drizzle ORM)
                                  └──► Supabase Auth (vérification des jetons de session)
          └──► Supabase Auth (connexion uniquement, clé publique)
```

| Dossier | Rôle |
| --- | --- |
| `artifacts/simdouane` | Application web React 19, TypeScript, Vite 7, Tailwind 4, wouter |
| `artifacts/api-server` | API Express 5 (routes `/api/*`), compilée avec esbuild |
| `lib/db` | Schéma PostgreSQL (Drizzle), **migrations SQL versionnées** (`lib/db/migrations`) |
| `lib/api-spec` | Contrat OpenAPI et configuration Orval |
| `lib/api-client-react` | Client React Query généré depuis l'OpenAPI |
| `lib/api-zod` | Schémas Zod générés |
| `scripts` | Seed des formules, rapport de vérification de base |

Le navigateur n'accède **jamais** directement à la base : tout passe par l'API,
qui vérifie le jeton de session (en-tête `Authorization`) et filtre chaque
requête par utilisateur. La clé publique Supabase du navigateur ne sert qu'à la
connexion : les tables et les fichiers lui sont fermés.

## Prérequis

- Node.js 22 ou 24
- pnpm 10 (`corepack enable && corepack prepare pnpm@10.26.1 --activate`)
- PostgreSQL 14+ (local) ou un projet Supabase

## Installation sur un ordinateur

```sh
git clone https://github.com/cadexleader-lgtm/SIMDOUANE-BENIN.git
cd SIMDOUANE-BENIN
git checkout mvp/dossiers            # branche de travail, pas encore fusionnée
pnpm install
cp .env.example .env                  # puis remplissez .env (voir ci-dessous)
```

### 1. Base de données

**Option A — PostgreSQL local (développement)**

```sh
createdb simdouane_dev
# dans .env : DATABASE_URL=postgresql://<utilisateur>:<mot_de_passe>@localhost:5432/simdouane_dev
pnpm db:migrate     # crée toutes les tables depuis une base vide
pnpm db:seed        # crée les 3 formules (Gratuit, Standard, Pro) si absentes
```

**Option B — Supabase**

1. Créez un projet sur [supabase.com](https://supabase.com) (région la plus
   proche de vos utilisateurs, ex. Europe de l'Ouest).
2. *Project Settings → Database → Connection string* : copiez la chaîne
   **Session pooler** (port 5432) et remplacez `[YOUR-PASSWORD]` par le mot de
   passe de la base. Mettez-la dans `DATABASE_URL` de votre `.env` — jamais
   dans le code ni sur GitHub.
3. **Obligatoire** : *Database Settings → SSL Configuration → Download certificate*,
   enregistrez le fichier hors du dépôt et indiquez son chemin dans
   `DATABASE_SSL_CA_FILE` (sans lui, la connexion n'est pas chiffrée).
4. `pnpm db:migrate` puis `pnpm db:seed` (sauf si vous transférez les données
   de Replit : voir docs/MIGRATION.md §6, on ne seed pas dans ce cas).

La migration `0001_lock_down_data_api` active Row Level Security sur toutes
les tables et retire les droits des rôles `anon`/`authenticated` : l'API REST
publique de Supabase ne peut donc rien lire ni écrire. N'ajoutez pas de policy
qui ouvrirait ces tables sans revoir le modèle de sécurité.

### 2. Comptes (Supabase Auth)

1. Projet Supabase → *Project Settings → API Keys* : l'adresse du projet dans
   `SUPABASE_URL` **et** `VITE_SUPABASE_URL` ; la clé publique
   (`sb_publishable_…`) dans `VITE_SUPABASE_PUBLISHABLE_KEY` ; la clé
   `service_role` (secrète) dans `SUPABASE_SERVICE_ROLE_KEY`.
2. *Authentication → URL Configuration* : Site URL `http://localhost:5173`,
   Redirect URLs `http://localhost:5173/**` (en production : votre domaine).
3. *Authentication → Sign In / Providers → Email* : « Confirm email » activé.
4. Avant d'ouvrir l'inscription au public : un service d'envoi d'emails
   (*Authentication → Emails → SMTP*), le service intégré de Supabase
   n'envoyant qu'aux membres de l'équipe du projet.

La clé `service_role` ne doit jamais être préfixée par `VITE_` (tout ce qui
commence par `VITE_` est intégré au code envoyé au navigateur).

### 3. Lancer en développement

```sh
pnpm dev
```

- Frontend : http://localhost:5173
- API : http://localhost:8080 (Vite redirige `/api` vers elle)

## Commandes

| Commande | Effet |
| --- | --- |
| `pnpm dev` | API + frontend en développement |
| `pnpm db:migrate` | Applique les migrations SQL (`lib/db/migrations`), sans risque à relancer |
| `pnpm db:seed` | Crée les formules d'abonnement si la table est vide |
| `pnpm db:report` | Nombre de lignes + empreinte par table (lecture seule, pour vérifier un transfert) |
| `pnpm --filter @workspace/scripts run storage-setup` | Crée (ou vérifie) le bucket **privé** Supabase des fichiers |
| `pnpm test` | Tests (calculateur ; API si `TEST_DATABASE_URL` est défini) |
| `pnpm run typecheck` | Vérification TypeScript (aussi lancée par GitHub Actions à chaque envoi) |
| `pnpm --filter @workspace/api-server run build` | Compile l'API → `artifacts/api-server/dist` |
| `pnpm --filter @workspace/simdouane run build` | Compile le frontend → `artifacts/simdouane/dist/public` |
| `pnpm start` | Lance l'API compilée (production) |

Les commandes `pnpm dev`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:report` et
`storage-setup` lisent le fichier `.env` de la racine ; une variable déjà définie
dans l'environnement (terminal, CI, hébergeur) reste prioritaire.

Modifier le schéma : éditez `lib/db/src/schema/*.ts`, puis
`pnpm --filter @workspace/db run generate --name <description>` crée une
nouvelle migration SQL à relire et à committer. Ne modifiez jamais une
migration déjà appliquée. `pnpm --filter @workspace/db run push` (synchronisation
directe sans migration) est réservé à une base locale jetable.

### Tests de l'API

Les tests d'isolation des données tournent contre une vraie base PostgreSQL
**jetable** (ses tables sont vidées) :

```sh
createdb simdouane_test
TEST_DATABASE_URL=postgresql://…/simdouane_test pnpm test
```

## Mise en production (hors Replit)

**Cloudflare (choisi)** : site et API sur un seul Worker, base via Hyperdrive,
mise en ligne automatique à chaque envoi sur GitHub. Procédure :
[`docs/MISE-EN-LIGNE-CLOUDFLARE.md`](docs/MISE-EN-LIGNE-CLOUDFLARE.md).

Autre possibilité, un serveur Node.js classique :

GitHub ne fait qu'héberger le code : il faut un hébergeur qui exécute Node.js
(Render, Railway, Fly.io, un VPS…). Le plus simple est **un seul processus**
qui sert l'API et le site :

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/simdouane run build   # VITE_* doivent être définies à ce moment
pnpm db:migrate
NODE_ENV=production PORT=8080 WEB_DIST_DIR=artifacts/simdouane/dist/public pnpm start
```

Variables à définir dans le gestionnaire de secrets de l'hébergeur (jamais dans
le dépôt) : `DATABASE_URL`, `DATABASE_SSL_CA_FILE` (facultatif),
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (serveur uniquement),
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `ADMIN_EMAILS`,
`VITE_ADMIN_EMAILS`, et pour les fichiers `STORAGE_DRIVER=supabase`,
`SUPABASE_STORAGE_BUCKET`. Dans Supabase Auth : Site URL et Redirect URLs du
domaine de production, service d'envoi d'emails configuré.

## Variables d'environnement

Voir [`.env.example`](.env.example), commenté variable par variable.

## Historique local

Les résultats locaux utilisent les clés `localStorage` `simdouane_history` et
`simdouane_current` ; elles ne sont pas modifiées par la migration.
