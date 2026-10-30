# Projet Supabase de développement : `simdouane-dev`

Créé le 2026-10-26 dans l'organisation Supabase du porteur du projet
(« DEV CENTER », offre gratuite), à sa demande. **Données fictives
uniquement.** Ce fichier ne contient aucun secret.

| Élément | Valeur |
| --- | --- |
| Référence du projet | `wmbcjkhakyeofznwggol` |
| URL de l'API | `https://wmbcjkhakyeofznwggol.supabase.co` |
| Région | `eu-west-3` (Paris) |
| Offre | Gratuite : le projet se met en pause après une semaine sans activité (réactivation depuis le tableau de bord) |
| Projet distinct de GestioAuto (`gestiopro-dev`) | Oui, volontairement : aucune donnée partagée |

## Ce qui a été appliqué

1. Migrations `0000` à `0007` du dépôt (`lib/db/migrations`), contenu identique
   aux fichiers (`0005`/`0006` : dossiers véhicules, phase 3 ; `0007` : passage à
   Supabase Auth, le 2026-10-30, testée d'abord en transaction annulée).
2. Registre Drizzle `drizzle.__drizzle_migrations` rempli avec les empreintes
   SHA-256 des fichiers : `pnpm db:migrate` reconnaît ces migrations et
   n'appliquera que les suivantes.
3. Bucket de stockage **privé** `simdouane-private` : 10 Mo, PDF/JPEG/PNG,
   aucune règle d'accès (seule la clé `service_role` du serveur y accède).
4. **Comptes : Supabase Auth** (depuis le 2026-10-30). Réglages à faire dans le
   tableau de bord (Site URL, Redirect URLs, confirmation de l'email, comptes de
   test) : [`RECETTE-PHASE3.md`](RECETTE-PHASE3.md) §2. Le service d'emails
   intégré n'envoie qu'aux membres de l'équipe du projet : un service d'envoi
   (SMTP) sera nécessaire avant d'ouvrir l'inscription au public.

## Contrôles effectués

| Contrôle | Résultat |
| --- | --- |
| Conseiller sécurité Supabase | 1 avertissement (`search_path` de la fonction des historiques) **corrigé par la migration 0004** ; restent les notes « RLS sans règle », **voulues** (accès public fermé) |
| Conseiller performance | 12 clés étrangères sans index **corrigées** (migration 0004) ; restent des notes « index pas encore utilisé », normales sur une base vide |
| Droits des rôles publics `anon` / `authenticated` | 16 tables, toutes avec RLS, **aucune accessible** (ni la séquence des références de dossiers) ; schéma `drizzle` inaccessible ; lecture de `users` sous le rôle `anon` → `permission denied` |
| Test fonctionnel des dossiers en transaction **annulée** (comptes fictifs) | Historique non modifiable et non supprimable, un véhicule par dossier, propriétaire obligatoire, aucune lecture par `anon`/`authenticated` (ni de la séquence des références) ; base vérifiée vide ensuite, compteur des références remis à 1 |
| Après 0005/0006 (phase 3) | Conseiller sécurité : aucun avertissement, 16 notes « RLS sans règle » voulues ; conseiller performance : uniquement « index pas encore utilisé » ; déclencheur d'historique des dossiers présent |
| Stockage | Bucket privé, RLS actif sur `storage.objects`, aucune règle d'accès |

Non vérifié : un appel réel à l'API publique de Supabase depuis l'extérieur
(le réseau de l'environnement de développement bloquait `supabase.co`) et un
dépôt/téléchargement de fichier par l'application (il faut la clé
`service_role`, voir ci-dessous).

## Brancher l'application (sur votre ordinateur)

Procédure pas à pas avec deux comptes de test : [`RECETTE-PHASE3.md`](RECETTE-PHASE3.md).

Dans le tableau de bord Supabase du projet `simdouane-dev` :

1. **Connect → Session pooler** : copiez la chaîne de connexion, remplacez
   `[YOUR-PASSWORD]` par le mot de passe de la base (Project Settings →
   Database ; « Reset database password » si vous ne l'avez pas noté), et
   mettez-la dans `DATABASE_URL` de votre `.env`.
2. **Obligatoire** : Database Settings → SSL Configuration → **Download
   certificate**, enregistrez-le hors du dépôt, chemin dans
   `DATABASE_SSL_CA_FILE`. Sans lui, la connexion (mot de passe compris)
   ne serait pas chiffrée. Avec lui, elle est chiffrée et le serveur est
   vérifié. Ne mettez pas `sslmode=` dans `DATABASE_URL` dans ce cas.
3. **Project Settings → API Keys → `service_role`** (secret) dans
   `SUPABASE_SERVICE_ROLE_KEY`, avec `SUPABASE_URL` (ci-dessus),
   `SUPABASE_STORAGE_BUCKET=simdouane-private` et `STORAGE_DRIVER=supabase`.
   Cette clé donne tous les droits : jamais dans le dépôt, jamais avec le
   préfixe `VITE_`, jamais dans une conversation.
4. Puis :
   ```sh
   pnpm db:migrate        # doit répondre sans rien appliquer de nouveau
   pnpm db:seed           # crée les 3 formules d'abonnement
   pnpm --filter @workspace/scripts run storage-setup   # doit confirmer « exists and is private »
   ```

## Évolutions du schéma

Appliquer les nouvelles migrations avec `pnpm db:migrate` (et non à la main
dans le tableau de bord), pour que le registre Drizzle reste exact.
