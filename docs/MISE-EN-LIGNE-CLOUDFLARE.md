# Mise en ligne sur Cloudflare (version de test)

Le site et l'API tournent sur **un seul Worker Cloudflare** : le site (pages
de l'application) est servi directement par Cloudflare, et les adresses
`/api/*` passent par l'API. La base reste chez Supabase (`simdouane-dev`), et
Cloudflare s'y connecte via **Hyperdrive**. À chaque envoi sur GitHub
(branche `mvp/dossiers`), Cloudflare reconstruit et remet en ligne
automatiquement. **Données fictives uniquement.**

| Élément | Où |
| --- | --- |
| Configuration du Worker (publique, sans secret) | `wrangler.jsonc` |
| Point d'entrée Cloudflare de l'API | `artifacts/api-server/src/worker.ts` |
| Build | `pnpm run build:cloudflare` (`scripts/cloudflare-build.mjs`) |
| Secret à saisir dans Cloudflare | `SUPABASE_SERVICE_ROLE_KEY` |
| Connexion à la base | Hyperdrive (créé dans votre compte Cloudflare) |

Vérifié avant la mise en ligne (2026-10-30), avec le moteur Cloudflare en
local (`wrangler dev`) : toute la recette dans un navigateur (35 contrôles),
aucune erreur JavaScript, paquet de 631 Ko compressés (limite de l'offre
gratuite : 3 Mo).

## Réglages dans votre compte Cloudflare (une seule fois)

### Étape 1 — Hyperdrive (connexion à la base Supabase)

✅ Fait le 2026-10-30 : configuration `simdouane-dev`, ID
`cd60e7be166e4555a958814718582c72`, inscrit dans `wrangler.jsonc`.

1. Tableau de bord Cloudflare → **Storage & Databases** → **Hyperdrive** →
   **Create configuration**.
2. Nom : `simdouane-dev`. Connexion : l'adresse **Session pooler** de
   Supabase (port 5432), avec le mot de passe de la base. C'est la même que
   `DATABASE_URL` dans votre `.env`. **Décochez « Enable caching »** : sinon,
   un dossier tout juste créé ou modifié peut rester invisible pendant
   environ une minute. Laissez les autres options par défaut.
3. Copiez l'**identifiant** (ID) affiché et transmettez-le-moi. Ce n'est pas
   un secret. Je le mets dans `wrangler.jsonc` à la place de
   `00000000000000000000000000000000`.

### Étape 2 — Relier le dépôt GitHub (Workers Builds)

1. **Workers & Pages** → **Create** → **Import a repository** → GitHub :
   autorisez l'accès au dépôt `SIMDOUANE-BENIN`.
2. Nom du projet : **`simdouane-benin`** (doit être identique au `name` de
   `wrangler.jsonc`, sinon le déploiement est refusé).
3. **Build command** : `pnpm run build:cloudflare`.
4. **Deploy command** : `npx wrangler deploy`.
5. **Settings → Build → Branch control** : branche de production
   **`mvp/dossiers`** (`main` ne contient pas ces fichiers).
6. **Settings → Build → Build variables and secrets** : ajoutez
   `NODE_VERSION` = `22` et `PNPM_VERSION` = `10.26.1` (valeurs publiques,
   type texte). Sans elles, Cloudflare peut prendre pnpm 9, qui échoue à
   l'installation (voir « En cas d'échec » plus bas).

### Étape 3 — Le seul secret

Dans le Worker **simdouane-benin** → **Settings → Variables and Secrets** → **Add**
→ type **Secret** → nom `SUPABASE_SERVICE_ROLE_KEY`, valeur : la clé
`service_role` de Supabase. Elle n'est jamais dans le dépôt, ni dans
`wrangler.jsonc`, ni dans le navigateur.

Attention : c'est la section **Variables and Secrets** du Worker (utilisée
quand le site tourne), **pas** *Build → Build variables and secrets*
(utilisée seulement pendant la construction : l'API ne la verrait pas, et
le build n'a pas besoin de cette clé).

### Étape 4 — Ouvrir le site

L'adresse est du type `https://simdouane-benin.<votre-sous-domaine>.workers.dev`
(affichée dans le Worker). Connectez-vous avec un compte de test.

**À faire dès la première connexion** : avec le compte administrateur,
*Mon profil → Mot de passe*, choisissez un nouveau mot de passe. Celui
d'origine a été écrit dans une conversation, et le site est désormais
public.

### Étape 5 (facultative pour l'instant) — Supabase

*Authentication → URL Configuration* : **Site URL** = l'adresse du site ;
**Redirect URLs** : la même adresse suivie de `/**`. Ce réglage n'est
nécessaire que pour les liens envoyés par email (confirmation d'inscription,
mot de passe oublié).

## En cas d'échec du build

| Message dans le journal | Cause | Correction |
| --- | --- | --- |
| `Detected … pnpm@9.x` puis `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH … "overrides"` | Cloudflare a pris pnpm 9 ; ce dépôt exige pnpm 10 (réglages dans `pnpm-workspace.yaml`). Reproduit en local le 2026-10-30 : même erreur avec pnpm 9.10.0, installation et build réussis avec pnpm 10.26.1 / Node 22. | Variables `PNPM_VERSION` = `10.26.1` et `NODE_VERSION` = `22` (étape 2.6), branche `mvp/dossiers` (étape 2.5), puis relancer. |
| `Missing script: build:cloudflare` (souvent avec `Ignored build scripts: @clerk/shared`) | Cloudflare a construit `main`, qui n'a ni ce script ni la configuration Cloudflare. « Retry » reconstruit toujours le même commit. | Branche de production `mvp/dossiers` (étape 2.5), puis un nouvel envoi sur `mvp/dossiers` déclenche un build neuf. |
| Le nom du Worker ne correspond pas | Le projet Cloudflare et `name` dans `wrangler.jsonc` diffèrent. | Même nom des deux côtés (`simdouane-benin`). |
| Le dossier `artifacts/simdouane/dist/public` n'existe pas | La commande de build est vide ou différente. | Build command : `pnpm run build:cloudflare`. |

## Sécurité de cette version de test

- **Secrets** : seule `SUPABASE_SERVICE_ROLE_KEY` est un secret (stockée
  chiffrée par Cloudflare). Le mot de passe de la base est stocké dans
  Hyperdrive. `wrangler.jsonc` ne contient que des valeurs publiques.
- **Accès aux données** : inchangé. Seule l'API y accède ; les tables et
  le stockage restent fermés au public.
- **Inscriptions** : possibles sur le site public, mais l'email de
  confirmation n'est envoyé qu'aux membres de votre équipe Supabase tant
  qu'aucun service d'envoi n'est configuré. Personne d'autre ne peut donc
  activer un compte.
- **Chiffrement vers la base** : Hyperdrive se connecte à Supabase en TLS.
  Avec les options par défaut, la connexion est **chiffrée mais le
  certificat de Supabase n'est pas vérifié**. **Avant la production**, il
  faut téléverser le certificat de Supabase dans Cloudflare
  (`wrangler cert upload certificate-authority`), puis passer Hyperdrive en
  `verify-full`
  ([documentation Cloudflare](https://developers.cloudflare.com/hyperdrive/configuration/tls-ssl-certificates-for-hyperdrive)).
- **Limites de l'offre gratuite de Cloudflare** : le temps de calcul par
  requête est limité. Je n'ai pas pu le mesurer en local. Si le site affiche
  l'erreur Cloudflare 1102, il faudra l'offre Workers payante (5 $/mois).

## Coûts

Offre gratuite de Cloudflare (Workers, Hyperdrive) et de Supabase : **0** pour
cette version de test. Possible plus tard : Workers payant (5 $/mois) si les
limites gratuites sont atteintes ; nom de domaine (environ 10 à 15 $/an).
