# Remplacement de Clerk par Supabase Auth — plan (aucun code écrit)

Choix du porteur du projet (2026-10-30, option « B ») : remplacer Clerk par
l'authentification de Supabase, déjà utilisé pour la base et le stockage. Ce
changement revient sur la décision n°1 du 2026-10-26 (« Clerk conservé »).
**Rien n'est développé avant votre accord sur ce plan.** Branche
`mvp/dossiers` uniquement, `main` intact, phase 4 non commencée.

Raison principale : la vérification anti-robot imposée par Clerk n'aboutit
pas sur une connexion lente. Le porteur du projet l'a constaté le 2026-10-30,
et c'est un risque réel pour les futurs utilisateurs au Bénin.

## 0. Ce qui ne change pas

- **Simulateur** : formules, résultats et historiques (local et en ligne)
  inchangés. Dans `simulateur.tsx` et `historique.tsx`, seule la façon de
  savoir si quelqu'un est connecté change.
- **L'API reste le seul point d'accès aux données.** Les tables et le
  stockage restent fermés aux rôles publics `anon` et `authenticated` de
  Supabase (vérifié sur les 16 tables, revérifié après le changement).
- **Règles de la phase 2** : aucune fusion automatique de comptes (refus 409
  et journal) ; administrateur = email listé dans `ADMIN_EMAILS` **et
  confirmé** ; accès transitaire accordé seulement par l'administrateur ;
  actions sensibles journalisées.
- **Règles de la phase 3** : un dossier n'est visible que par son
  propriétaire.

## 1. Fonctionnement prévu

| Élément | Fonctionnement |
| --- | --- |
| Navigateur | Bibliothèque `supabase-js` avec l'adresse du projet et la **clé publique** (`sb_publishable_…`, conçue pour être publique). Elle ne sert **qu'à la connexion** : inscription, connexion, déconnexion, mot de passe oublié, nouveau mot de passe. Elle ne donne accès à aucune donnée |
| Appels à l'API | Chaque appel porte l'en-tête `Authorization: Bearer <jeton>`. Le jeton est valable 1 h et renouvelé automatiquement. Plus de cookie de session, donc pas de risque de requête forgée par un autre site (CSRF) |
| Serveur | Vérifie la signature et l'expiration du jeton (`getClaims`, clés publiques du projet), puis relit le compte via l'API d'administration de Supabase (clé `service_role`, déjà côté serveur seulement) pour l'email et sa confirmation. C'est la même logique qu'aujourd'hui avec Clerk |
| Confirmation de l'email | Obligatoire pour pouvoir se connecter (réglage par défaut de Supabase) |

## 2. Fichiers concernés

**Serveur** (`artifacts/api-server`)
- Nouveau : `src/lib/auth/supabaseAuth.ts` (vérification du jeton, lecture du compte).
- Modifiés : `src/app.ts` (retrait du module Clerk), `src/middlewares/requireAuth.ts`,
  `src/lib/userUtils.ts`, et les routes `admin.ts`, `profile.ts`,
  `simulations.ts`, `subscriptions.ts`, `upgrade-request.ts`. Seul
  l'identifiant de connexion change : la logique métier reste la même.
- Supprimés : `src/middlewares/clerkProxyMiddleware.ts`, dépendances `@clerk/express`, `@clerk/shared`.

**Interface** (`artifacts/simdouane/src`)
- Nouveaux : `lib/auth.tsx` (session et état « connecté ») ; pages Connexion,
  Inscription, Mot de passe oublié, Nouveau mot de passe, Confirmation de
  l'email (français, textes prêts pour la traduction, téléphone et ordinateur).
- Modifiés : `App.tsx` (pages protégées, redirections, destination mémorisée
  conservée), `components/layout.tsx`, pages `accueil`, `dashboard`,
  `historique`, `simulateur` (détection « connecté » seulement), `profil`
  (le bouton « Gérer mon compte » de Clerk devient « Changer mon mot de
  passe » dans SimDouane), `lib/private-files.ts` (jeton ajouté à l'envoi
  des justificatifs), `lib/redirects.ts` et ses tests.
- Supprimés : dépendances `@clerk/react`, `@clerk/themes`.

**Contrat d'API** : `openapi.yaml`. Le champ `clerkId` devient facultatif
(vide pour les nouveaux comptes), puis le client est régénéré.

**Base** : `lib/db/src/schema/users.ts`, `admin_logs.ts`, migration 0007 (§3).

**Tests** : un faux fournisseur d'identité remplace le faux Clerk
(`test/clerkMock.ts`), au même endroit dans la chaîne. Les 52 tests d'API
sont conservés et adaptés, avec les mêmes vérifications. De nouveaux tests
couvrent l'authentification (§7).

**Configuration et documentation** : `.env.example` (lignes Clerk retirées,
`VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` ajoutées), `README.md`,
`SECURITE-DONNEES.md` (Clerk retiré des sous-traitants), `SUPABASE-DEV.md`
(réglages d'authentification), `MIGRATION.md` (anciens comptes),
`MVP-PHASE0.md` (décision 1 mise à jour), `RECETTE-PHASE3.md` réécrite à
partir de R0d.

## 3. Base de données : migration 0007

Aucune donnée supprimée ni modifiée.

| Table | Changement | Effet |
| --- | --- | --- |
| `users` | Nouvelle colonne `auth_user_id` (identifiant Supabase Auth, unique) | Les nouveaux comptes y sont reliés |
| `users` | `clerk_id` n'est plus obligatoire | Les nouveaux comptes n'en ont pas ; les anciens comptes Replit **gardent** le leur |
| `admin_logs` | Nouvelle colonne `admin_user_id` (lien vers le compte de l'administrateur) + index | Pour les nouvelles actions d'administration |
| `admin_logs` | `admin_clerk_id` n'est plus obligatoire | Les anciennes lignes sont conservées telles quelles |

Retirer une obligation n'efface rien, et les nouvelles colonnes héritent du
verrouillage déjà en place. Impact sur `simdouane-dev` : aucun, il n'y a
aucun compte. Base Replit (pas encore transférée) : lignes intactes.

Contrôles : migration sur base vide et sur base contenant des données
fictives, test sur `simdouane-dev` en transaction annulée, puis application
réelle avec mise à jour du registre et contrôles de sécurité Supabase.

## 4. Sécurité : ce qui change

| Sujet | Avant (Clerk) | Après (Supabase Auth) |
| --- | --- | --- |
| Vérification de la session par le serveur | Bibliothèque Clerk | Signature du jeton vérifiée (`getClaims`), compte relu par l'API d'administration |
| Transport de la session | Cookie, même origine | En-tête `Authorization` : pas de CSRF |
| Jeton dans le navigateur | Cookie lisible par le code de la page | `localStorage`, également lisible par le code de la page. Exposition équivalente en cas de faille XSS ; avant la production : politique de sécurité du contenu (CSP) |
| Anti-robots | Vérification Clerk imposée (celle qui a bloqué) | Aucune par défaut ; les limites de débit de Supabase Auth restent actives. Un CAPTCHA pourra être activé si des abus apparaissent, à arbitrer avec les connexions lentes |
| Mots de passe | Gérés par Clerk | Gérés par Supabase (chiffrés). Longueur minimale fixée à 8. La détection des mots de passe divulgués est réservée à l'offre Pro |
| Double authentification | Non activée | Non activée ; possible plus tard |
| Sous-traitants | Clerk (États-Unis) + Supabase | Supabase seul (Paris) |

## 5. Comptes

- **`simdouane-dev`** : aucun compte, aucun impact.
- **Anciens comptes Replit** (pas encore transférés) : ils n'étaient déjà pas
  rattachables automatiquement avec Clerk. La règle reste la même : une
  inscription avec la même adresse est refusée (409) et journalisée, puis le
  rattachement se fait à la main après vérification. Concrètement, on renseigne
  `auth_user_id` sur l'ancienne ligne (procédure mise à jour dans
  `SECURITE-DONNEES.md` §6). Les simulations de l'ancien compte sont conservées.

## 6. Emails

- **Développement** : le service intégré de Supabase n'envoie qu'aux adresses
  des membres de votre équipe Supabase, avec un débit limité
  ([documentation](https://supabase.com/docs/guides/auth/auth-smtp)). Pour la
  recette, les comptes de test sont donc créés dans le tableau de bord
  (« Auto Confirm User »), sans email.
- **Avant toute production** : un service d'envoi (Resend, Brevo…, avec une
  offre gratuite pour débuter), un nom de domaine (enregistrements SPF/DKIM),
  et l'adresse du site de production dans les réglages Supabase.

## 7. Tests prévus

| Famille | Contenu |
| --- | --- |
| API (PostgreSQL local et GitHub Actions) | Les 52 tests actuels, adaptés. Nouveaux : jeton absent, forgé, expiré ou mal formé → 401 ; cookie seul ignoré ; service d'authentification indisponible → 503 ; un email non confirmé n'est jamais administrateur ; un compte supprimé dans Supabase est refusé. Contrôle par mutation : vérification du jeton désactivée volontairement, les tests doivent échouer |
| Base réelle `simdouane-dev` | Migration 0007 testée en transaction annulée, puis appliquée ; droits publics revérifiés |
| Interface | Aperçu navigateur ordinateur et téléphone : connexion, inscription, erreurs, mot de passe oublié, pages protégées |
| Service réel | Votre recette, à reprendre à R0d. Mon environnement ne peut pas joindre `supabase.co` |
| Non-régression | Les tests du calculateur, typecheck et compilation |

## 8. Réglages à faire par vous dans Supabase (je vous guiderai pas à pas)

Aucun secret n'est à me transmettre.
- *Authentication → URL Configuration* : Site URL `http://localhost:5173` ;
  Redirect URLs `http://localhost:5173/**`.
- *Authentication → Sign In / Providers → Email* : activé, « Confirm email »
  activé, longueur minimale du mot de passe 8.
- *Authentication → Users → Add user* : comptes de test A, B et admin, avec
  « Auto Confirm User ».
- `.env` : retirer les lignes Clerk ; ajouter `VITE_SUPABASE_URL` et
  `VITE_SUPABASE_PUBLISHABLE_KEY` (la clé publique).

R0a à R0c restent valables. La recette reprend à R0d.

## 9. Étapes de réalisation

1. Migration 0007 et contrôles de base (local, puis `simdouane-dev`).
2. Serveur et tests, y compris les nouveaux tests d'authentification et le contrôle par mutation.
3. Interface et aperçu navigateur.
4. Documentation et nouvelle procédure de recette.
5. Vérifications complètes (typecheck, tests, compilation, GitHub Actions),
   puis compte rendu. Je m'arrête et vous demande avant de continuer si un
   choix imprévu touche la sécurité, les données ou l'architecture.

## 10. Décisions à confirmer

| N° | Question | Recommandation |
| --- | --- | --- |
| DA1 | Méthode de connexion | **Email + mot de passe.** Un code envoyé par email à chaque connexion exigerait un service d'envoi dès maintenant |
| DA2 | Connexion avec Google | **Pas maintenant** (ajout possible plus tard) |
| DA3 | Comptes de recette | **Créés dans le tableau de bord Supabase**, sans email. En option, tester aussi l'inscription depuis l'application avec votre propre adresse Gmail : membre de l'équipe Supabase, elle reçoit l'email de confirmation |
| DA4 | Colonne `clerk_id` | **Conservée**, pour les anciens comptes Replit |

## 11. Coûts

Aucun en développement. Supabase Auth est inclus dans l'offre gratuite
(50 000 utilisateurs actifs par mois, 100 000 en offre Pro). Retirer Clerk
supprime un abonnement potentiel. Avant la production : service d'envoi
d'emails (offre gratuite au départ) et nom de domaine (environ 10 à 15 $ par an).
