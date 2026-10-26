# Migration de SimDouane Bénin hors de Replit

Branche : `migration/hors-replit` (non fusionnée). La branche `main` est
intacte : elle contient toujours l'archive `simdouane-benin.zip` d'origine.

## 1. Point de départ

Le dépôt GitHub ne contenait qu'un `README.md` et `simdouane-benin.zip`
(export Replit). L'archive a été extraite et versionnée **sans modification**
(commit « Importer le code source extrait… »), puis chaque changement de
migration a été fait dans des commits séparés, relisibles un par un.

## 2. Architecture réellement trouvée

Monorepo **pnpm** (workspaces), TypeScript partout.

| Partie | Technologie | Fichiers |
| --- | --- | --- |
| Frontend | React 19, Vite 7, Tailwind 4, shadcn/Radix, wouter, React Query, jsPDF | `artifacts/simdouane` |
| Backend | Express 5, pino, compilé en un fichier par esbuild | `artifacts/api-server` |
| Base | PostgreSQL via Drizzle ORM (`pg`) | `lib/db` |
| Contrat API | OpenAPI → client React Query + schémas Zod (Orval) | `lib/api-spec`, `lib/api-client-react`, `lib/api-zod` |
| Auth | Clerk (`@clerk/react` côté navigateur, `@clerk/express` côté API) | `App.tsx`, `app.ts`, `middlewares/requireAuth.ts` |
| Calculs | 100 % côté navigateur | `artifacts/simdouane/src/lib/calculator.ts` |

**Données en base** (6 tables) : `users` (profil lié au compte Clerk par
`clerk_id`), `subscription_plans`, `subscriptions`, `simulations` (historique
cloud), `upgrade_requests` (demandes de paiement Mobile Money, saisies à la
main), `admin_logs`. Schéma détaillé : `lib/db/migrations/0000_initial_schema.sql`.

**Autorisation** : faite dans l'API (pas en base). Chaque route utilisateur
retrouve l'utilisateur à partir de la session Clerk et filtre par `user_id` ;
les routes `/api/admin/*` vérifient l'email de l'utilisateur contre une liste
d'administrateurs. Testé (§8).

**Stockage de fichiers** : aucun. Les PDF sont générés dans le navigateur et
téléchargés ; `upgrade_requests.receipt_url` est un simple lien texte saisi par
l'utilisateur ; les images du site sont statiques (`public/`). Aucun stockage
objet Replit à migrer.

## 3. Dépendances à Replit

| Dépendance | Statut |
| --- | --- |
| Plugins Vite `@replit/vite-plugin-cartographer`, `-dev-banner`, `-runtime-error-modal` | **Supprimés** (code + `package.json` + catalogue pnpm + lockfile) |
| `PORT` et `BASE_PATH` obligatoires (fournis par Replit) au build du frontend | **Supprimé** : valeurs par défaut `5173` et `/` |
| `allowedHosts: true` du serveur de dev (aperçu Replit) | **Supprimé** |
| Clé Clerk déduite du nom de domaine (`publishableKeyFromHost`) — mécanisme des instances Clerk gérées par Replit ; ignorait la clé configurée dès qu'elle était `pk_live_…` | **Corrigé** : la clé configurée est toujours prioritaire (frontend et API) |
| Base PostgreSQL fournie par Replit (`DATABASE_URL`) + schéma créé par `drizzle push` sans migrations | **Remplacé** : migrations SQL versionnées, toute base PostgreSQL (Supabase compris) |
| `scripts/post-merge.sh` (hook Replit) faisait `drizzle push` | Passé à `migrate` (inutile hors Replit) |
| Routage/publication Replit (un domaine pour site + API) | **Remplacé** : l'API peut servir le frontend compilé (`WEB_DIST_DIR`), un seul processus Node |
| **Instance Clerk gérée par Replit** (comptes utilisateurs) | ⚠️ **Reste à résoudre**, voir §4 |
| **Données de la base Replit** | ⚠️ Transfert à faire par vous, procédure testée au §6 |
| Middleware proxy Clerk (`/api/__clerk`) | Conservé, optionnel ; inutile si le domaine est configuré dans Clerk |
| Commentaires `@replit` dans `components/ui/*` | Simples commentaires, sans effet |

> **Mise à jour 2026-10-26** : Clerk est conservé (décision validée). Depuis la
> phase 2, l'API refuse proprement un nouveau compte dont l'email existe déjà
> (`ACCOUNT_LINK_REQUIRED`, journalisé) au lieu de l'erreur 500 décrite
> ci-dessous ; le rattachement se fait à la main selon
> `SECURITE-DONNEES.md` §6. Pour le transfert, `db:report` compare la table
> `users` sur ses colonnes d'origine (les colonnes ajoutées en phase 2 prennent
> leur valeur par défaut) ; répétition réussie le 2026-10-26.

## 4. ⚠️ Point bloquant : les comptes utilisateurs

Les comptes vivent dans l'instance Clerk **créée par Replit** (le code
indiquait « il n'y a pas de tableau de bord Clerk externe, tout se règle dans
le panneau Auth de Replit »). Avec votre propre compte Clerk, chaque
utilisateur aura un **nouvel identifiant Clerk**. Conséquence dans le code
actuel : à la première connexion d'un utilisateur existant, l'API tente de
créer une ligne `users` avec le même email → violation d'unicité → erreur 500,
et son historique/abonnement n'est pas retrouvé.

Ce n'est pas corrigé sur cette branche, car le choix vous appartient :

- **A. Garder Clerk (votre propre compte)** — changement minimal (déjà prêt).
  Il faudra rattacher les anciens comptes : soit importer les utilisateurs dans
  votre Clerk (API d'import Clerk, si Replit permet d'exporter les comptes —
  à vérifier dans le panneau Auth de Replit, je n'ai pas pu le vérifier), soit
  un rattachement par **email vérifié** à la première connexion (petit
  changement dans `lib/userUtils.ts`, à sécuriser : n'accepter que les emails
  vérifiés par Clerk).
- **B. Passer à Supabase Auth** — tout (base + comptes) chez un seul
  fournisseur que vous contrôlez. Plus de travail : réécrire les écrans
  connexion/inscription (aujourd'hui fournis par Clerk), le middleware de
  l'API, et rattacher les comptes de la même façon (par email vérifié).
  Les utilisateurs devront redéfinir leur mot de passe dans les deux cas.

Combien d'utilisateurs réels existent ? `pnpm db:report` sur la base Replit
le dira (ligne `users`) ; s'il n'y en a que quelques-uns, l'option A avec
rattachement par email est la plus simple.

## 5. Base de données cible

**Supabase (PostgreSQL) retenu comme cible recommandée** : c'est du PostgreSQL
standard, donc aucun changement de code d'accès aux données (Drizzle + `pg`).
L'application s'y connecte comme à n'importe quelle base, par `DATABASE_URL`
côté serveur uniquement.

Conséquences à connaître :

- La sécurité des données repose sur l'API (testée), pas sur des policies RLS
  par utilisateur : l'API utilise un seul rôle base de données. Ajouter des
  policies par utilisateur n'aurait de sens que si le navigateur interrogeait
  Supabase directement, ce qui n'est pas le cas (et ne doit pas le devenir
  sans refonte).
- Supabase expose automatiquement le schéma `public` via son API REST à la clé
  `anon` (publique). La migration `0001_lock_down_data_api` active RLS sans
  policy et retire tous les droits à `anon`/`authenticated` : cette porte est
  fermée. Testé localement en recréant ces rôles.
- Le mot de passe de la base et `CLERK_SECRET_KEY` ne vont que dans les
  variables d'environnement du serveur. La clé `service_role` de Supabase
  n'est pas utilisée et ne doit jamais l'être côté navigateur.

**Migrations** (`lib/db/migrations`, appliquées par `pnpm db:migrate`, suivies
dans `drizzle.__drizzle_migrations`) :

| Fichier | Contenu |
| --- | --- |
| `0000_initial_schema.sql` | 3 types enum, 6 tables, clés étrangères — généré depuis `lib/db/src/schema` |
| `0001_lock_down_data_api.sql` | RLS activé partout + révocation `anon`/`authenticated` |

Vérifié : le schéma produit par ces migrations est **identique** (dump
`pg_dump -s` comparé) à celui que `drizzle push` produit sur Replit, à l'ajout
de RLS près — les données existantes y entrent donc telles quelles.

## 6. Transfert des données Replit → nouvelle base

Ne rien supprimer côté Replit avant la fin de l'étape 5.

1. **Sauvegarde complète** (dans le Shell Replit) — à télécharger et garder
   hors de GitHub :
   ```sh
   pg_dump "$DATABASE_URL" -Fc -f simdouane-replit-complet.dump
   pg_dump "$DATABASE_URL" -s -n public -f simdouane-replit-schema.sql
   pg_dump "$DATABASE_URL" --data-only --no-owner --no-privileges -n public -Fc -f simdouane-replit-donnees.dump
   ```
2. **Rapport source** : sur Replit, récupérez cette branche puis
   `pnpm install && pnpm db:report > rapport-source.txt` (lecture seule).
3. **Base cible vide** (Supabase) : `DATABASE_URL` vers la cible, puis
   `pnpm db:migrate` (**pas** de `db:seed` : les formules viennent des données
   Replit, avec leurs identifiants référencés par les abonnements).
4. **Restauration** :
   ```sh
   pg_restore --data-only --no-owner --no-privileges --single-transaction \
     -d "$DATABASE_URL" simdouane-replit-donnees.dump
   ```
   `--single-transaction` : en cas d'erreur, rien n'est écrit.
5. **Vérification** : `pnpm db:report > rapport-cible.txt` puis comparer les
   deux fichiers — nombres de lignes et empreintes doivent être identiques.
   En cas d'écart, ne pas basculer ; garder Replit en service.

Répétition faite ici sur des données fictives (2 utilisateurs, 40 simulations,
abonnement, demande, journal) : base « Replit » créée par `push` → dump →
base cible migrée, avec un rôle **non superutilisateur** comme sur Supabase →
rapports identiques.

Si `simdouane-replit-schema.sql` diffère de `0000_initial_schema.sql`
(colonne ajoutée à la main sur Replit, par exemple), arrêtez-vous : il faudra
une migration complémentaire avant le transfert.

## 7. Sauvegarde et restauration

- **Sauvegarde** : `pg_dump "$DATABASE_URL" -Fc -f simdouane-AAAAMMJJ.dump`,
  à conserver hors du dépôt (`.gitignore` exclut déjà `*.dump`). Supabase
  propose aussi des sauvegardes automatiques selon l'offre souscrite.
- **Restaurer dans un nouvel environnement** : créer une base vide →
  `pnpm db:migrate` → `pg_restore --data-only … sauvegarde.dump` (si la
  sauvegarde est un dump complet `-Fc`, `pg_restore --data-only` n'en prend que
  les données) → `pnpm db:report` pour contrôler.

## 8. Résultats des tests (exécutés le 2026-10-20, Node 22, pnpm 10.28, PostgreSQL 16)

| Contrôle | Résultat |
| --- | --- |
| `pnpm install --frozen-lockfile` (code d'origine, hors Replit) | ✅ |
| `pnpm db:migrate` sur base vide | ✅ ; relancé : aucune modification |
| Schéma migré vs schéma `push` | ✅ identique (hors RLS) |
| Rôle `anon` simulé : `SELECT` sur `simulations` | ✅ refusé (`permission denied`) |
| `pnpm db:seed` | ✅ 3 formules |
| Transfert de données (dump → restore → rapport) | ✅ identique, sans superutilisateur |
| Tests calculateur (10, `pnpm test`) | ✅ 10/10 — fixent les formules actuelles, ne les valident pas juridiquement |
| Tests API sur vraie base (5) : 401 sans session ; B ne voit ni ne supprime une simulation de A ; profil toujours celui de l'appelant ; limite gratuite 3/mois ; admin refusé aux non-admins | ✅ 5/5 (Clerk remplacé par un bouchon, cf. en-tête du test) |
| Build API | ✅ |
| Build frontend | ✅ |
| Lancement production un seul processus : `/`, `/simulateur` → HTML ; `/api/healthz`, `/api/subscription-plans` → 200 ; `/api/simulations` sans session → 401 ; origine étrangère → pas d'en-tête CORS | ✅ |
| `pnpm run typecheck` | ❌ 8 erreurs **préexistantes** (identiques avant/après, voir §9) — `pnpm build` s'arrête donc au typecheck ; les builds séparés passent. **Corrigées depuis** (étape 1 bis, voir `MVP-PHASE0.md` §9) |

**Non testé** (impossible sans vos accès) : connexion réelle avec un compte
Clerk, parcours complet dans un navigateur connecté, connexion à un vrai
projet Supabase (TLS/pooler), transfert des vraies données Replit.

## 9. Problèmes préexistants (non causés par la migration)

1. **Bouton « Demander un upgrade » du tableau de bord cassé** —
   `pages/dashboard.tsx` n'envoie que `planWanted`, l'API exige aussi
   téléphone, opérateur, référence et montant → réponse 400. Le formulaire
   complet (`upgrade-request-form.tsx`) n'existait que dans la fenêtre de
   quota du simulateur (et non sur la page Abonnement, comme écrit à tort
   dans une version précédente de ce document). **Corrigé à l'étape 1 bis.**
2. **8 erreurs TypeScript** : `App.tsx` (prop Clerk `afterSignUpUrl`,
   supprimée par Clerk), `layout.tsx` (`ringColor`),
   `admin.tsx`/`historique.tsx`/`simulateur.tsx` (`queryKey` manquant),
   `dashboard.tsx` (point 1), `onboarding.tsx` (comparaison toujours fausse
   avec `"done"`). **Corrigées à l'étape 1 bis.**
3. **Totaux de simulation non recalculés côté serveur** : l'API enregistre les
   totaux envoyés par le navigateur, sans validation (les schémas `api-zod`
   générés ne sont pas utilisés). Un utilisateur ne peut fausser que ses
   propres enregistrements.
4. **Email de repli `unknown@user.com`** dans `getOrCreateUser` si Clerk ne
   répond pas : un deuxième cas identique échouerait (email unique).
5. **Dépendances** (`pnpm audit --prod`) : 9 alertes transitives — `proxy-addr`
   (critique, IP spoofing ; ne concerne que `trust proxy`, non activé),
   `braces` (élevée, via `http-proxy-middleware`), `qs`/`body-parser` (via
   Express), `dompurify` (via jsPDF). Mise à jour à faire dans un lot séparé
   avec re-test.
6. Avertissements « sourcemap » au build frontend (directives `"use client"`
   des composants Radix) : sans effet.

## 10. Changements de cette branche

- Code source extrait de l'archive et versionné.
- Plugins Replit retirés ; `PORT`/`BASE_PATH` facultatifs.
- Clé Clerk configurée prioritaire (frontend + API).
- Admins configurables (`ADMIN_EMAILS` serveur, `VITE_ADMIN_EMAILS` affichage),
  par défaut l'admin historique — comportement inchangé sans configuration.
- CORS : même origine en production (ou `CORS_ORIGINS`), inchangé en dev.
  Avant : toute origine acceptée avec cookies.
- `WEB_DIST_DIR` : l'API peut servir le site compilé.
- `lib/db` : migrations versionnées, `migrate`, `DATABASE_SSL_CA_FILE`.
- `scripts/db-report` : contrôle d'intégrité d'un transfert.
- Tests (Vitest) : calculateur + isolation des données de l'API.
- `README.md`, `.env.example`, ce document.

Aucun calcul, aucune page, aucun texte affiché, aucun design n'a été modifié.

## 11. Actions manuelles restantes (par vous)

1. **Décider pour les comptes** (§4) : Clerk à votre nom, ou Supabase Auth.
2. Créer le projet Supabase (ou autre PostgreSQL) et mettre `DATABASE_URL` dans
   le gestionnaire de secrets de l'hébergeur et dans votre `.env` local.
3. Faire les sauvegardes Replit et le transfert (§6), puis comparer les rapports.
4. Créer votre application Clerk (si option A), récupérer les clés.
5. Choisir un hébergeur Node.js et y configurer les variables (README).
6. Tester en vrai : inscription, simulation, historique, admin.
7. Seulement ensuite : arrêter la base Replit (garder les dumps).
8. Relire la branche puis la fusionner dans `main` vous-même.
