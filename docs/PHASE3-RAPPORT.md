# Phase 3 — Dossiers véhicules : rapport

Branche `mvp/dossiers` (non fusionnée dans `main`). La phase 4 n'est pas
commencée. Données fictives uniquement.

> SimDouane aide à **préparer** un dossier. Rien n'est déposé auprès des
> Douanes, du GUCE ou de Bénin Control ; le statut « prêt » signifie
> « prêt pour la préparation administrative avec un transitaire ». Ce rappel
> est affiché sur la liste, la création et la fiche de chaque dossier.

## 1. Ce qui a été fait

| Consigne | Réalisation |
| --- | --- |
| 1. Préserver l'existant | Simulateur, formules, résultats et historique **non modifiés** (aucune ligne changée dans `calculator.ts`, les routes et la table des simulations). Réutilise le contrôle de session existant (`requireUser`), le journal `audit_logs` et la fonction « historique en ajout seul » de la phase 2. |
| 2. Créer et consulter ses dossiers | Page « Mes dossiers » (`/dossiers`), création (`/dossiers/nouveau`) en deux temps : **situation** (véhicule pas encore arrivé / déjà arrivé au port de Cotonou), puis formulaire. Fiche dossier (`/dossiers/:id`). |
| 3. Informations essentielles | Marque, modèle, année, état (neuf/occasion), numéro de châssis, pays de provenance, port de départ, date d'expédition, date d'arrivée **estimée** ou **réelle**, référence de transport (BL…), notes. Pour un véhicule déjà arrivé : références existantes, formalités déjà faites, blocages connus. **Seules la situation et la marque sont obligatoires** pour créer le dossier. |
| 4. Permissions | Un utilisateur ne voit, ne modifie, ne vérifie et n'archive **que ses propres dossiers**. Un dossier d'autrui répond exactement comme un dossier inexistant (404), pour ne pas révéler son existence. L'administrateur n'a **aucun** accès aux dossiers. Une seule fonction décide de l'accès : `lib/cases/access.ts` (`loadCaseForUser`). |
| 5. Suivi administratif préparé | Voir §3. Aucun dépôt officiel n'est simulé ni annoncé. |
| 6. Documents | **Aucun dépôt de document** sur les dossiers (pas de route, pas d'écran). Le stockage n'a pas été nécessaire aux tests de cette phase. |
| 7. Base de données | Deux migrations **uniquement additives** (nouvelles tables), testées, appliquées au projet Supabase de développement, documentées ci-dessous. Aucune donnée existante modifiée, supprimée ou fusionnée. |
| 8. Interface | Français, textes regroupés dans `mvp-texts.ts` (prêts pour la traduction), utilisable sur téléphone et ordinateur. Trois états visibles : **Brouillon**, **Informations à compléter**, **Prêt pour la préparation administrative**, chacun avec une phrase d'explication. |

### Règles du statut (première version, à confirmer avec des transitaires)

- À la création, le dossier est un **brouillon** ; il le reste tant que
  l'utilisateur n'a pas cliqué sur « Vérifier le dossier ».
- La vérification passe le dossier à **Informations à compléter** s'il manque
  l'un de ces éléments : marque, modèle, année, pays de provenance, date
  d'arrivée estimée (véhicule pas encore arrivé) ou réelle (déjà arrivé) ;
  sinon à **Prêt pour la préparation administrative**.
- Le numéro de châssis et la référence de transport sont **conseillés**, pas
  bloquants (affichés à part).
- Après la première vérification, chaque modification réévalue le statut
  (un dossier prêt dont on efface l'année redevient « à compléter »).
- Le client ne peut jamais fixer lui-même le statut, le propriétaire ni la
  référence : ces champs sont ignorés par l'API (testé).

Contrôles de saisie (message en français sous le champ concerné) : année entre
1900 et l'an prochain ; dates réelles au format AAAA-MM-JJ ; date d'arrivée
réelle ni dans le futur, ni avant l'expédition, et seulement si le véhicule est
arrivé ; châssis de 5 à 30 lettres/chiffres, sans I, O ni Q s'il fait 17
caractères (norme ISO 3779) ; longueurs maximales des textes. Un dossier reçoit
une référence lisible `SDB-AAAA-NNNNNN`. Limite de 100 dossiers actifs par
compte (garde-fou contre les abus, ajustable).

**Archiver** un dossier le retire de la liste sans l'effacer (date
d'archivage enregistrée, action journalisée). Il n'est plus consultable
depuis l'application.

## 2. Fichiers modifiés

**Base de données**
- `lib/db/src/schema/clearance_cases.ts` (nouveau) : tables `vehicles`,
  `clearance_cases`, `case_events` ; `lib/db/src/schema/index.ts`.
- `lib/db/migrations/0005_clearance_cases.sql`, `0006_protect_clearance_cases.sql`
  (+ `meta/` générés par Drizzle).

**API** (`artifacts/api-server`)
- `src/lib/cases/rules.ts` (complétude, dates, châssis, référence),
  `src/lib/cases/validate.ts` (validation et messages),
  `src/lib/cases/access.ts` (décision d'accès unique) — nouveaux.
- `src/routes/cases.ts` (nouveau), monté dans `src/routes/index.ts`.
- `src/middlewares/requireAuth.ts` : un compte **désactivé** par
  l'administrateur est refusé (403) sur les fonctions construites sur
  `requireUser` (dossiers, accès transitaire, justificatifs).
- Tests : `test/case-rules.test.ts`, `test/cases.test.ts` (nouveaux),
  `test/harness.ts` (vidage des nouvelles tables).

**Contrat d'API** : `lib/api-spec/openapi.yaml` (routes `/cases`) et clients
régénérés (`lib/api-client-react`, `lib/api-zod`).

**Interface** (`artifacts/simdouane/src`)
- `pages/dossiers.tsx`, `pages/dossier-nouveau.tsx`, `pages/dossier-detail.tsx`,
  `components/cases/case-form.tsx`, `components/cases/case-status-badge.tsx` (nouveaux).
- `App.tsx` (3 routes protégées), `components/layout.tsx` (entrée
  « Mes dossiers » dans les menus ordinateur et téléphone),
  `lib/mvp-texts.ts` (textes).

Routes de l'API (toutes exigent une session) :

| Route | Effet |
| --- | --- |
| `GET /api/cases` | Mes dossiers non archivés |
| `POST /api/cases` | Créer un dossier |
| `GET /api/cases/:id` | Lire un de mes dossiers |
| `PATCH /api/cases/:id` | Modifier (partiel) |
| `POST /api/cases/:id/check` | Vérifier la complétude |
| `DELETE /api/cases/:id` | Archiver |
| `GET /api/cases/:id/events` | Historique du dossier |

## 3. Préparation des phases suivantes (sans les construire)

| Besoin futur | Ce qui est en place |
| --- | --- |
| Historique des étapes | Table `case_events`, **non modifiable** (déclencheur en base) : type, ancien/nouveau statut, auteur, date, détails, et **catégorie de source** (`simdouane` aujourd'hui ; plus tard « professionnel » et « officiel confirmé », ce dernier avec preuve obligatoire). Création, modifications (liste des champs changés), changements de statut et archivage y sont déjà inscrits et affichés. |
| Transitaire invité (phase 5) | Toutes les routes passent par `loadCaseForUser` : l'invitation s'ajoutera **à cet endroit seulement**, sans toucher aux routes. |
| Checklist documentaire (phase 4) | Le dossier porte la situation d'arrivée (parcours A/B), qui servira de condition aux règles de checklist versionnées. |
| Demandes de correction | S'appuieront sur `case_events` et une table de commentaires (phase 5). |
| Véhicule séparé du dossier | Table `vehicles` distincte (un véhicule par dossier aujourd'hui). |

## 4. Migrations créées

| Migration | Contenu | Impact sur l'existant |
| --- | --- | --- |
| `0005_clearance_cases` | 3 types énumérés, la séquence des références, les tables `vehicles`, `clearance_cases`, `case_events`, clés étrangères vers `users` et index | **Additive** : aucune table existante modifiée |
| `0006_protect_clearance_cases` | RLS activé sans règle, droits retirés aux rôles publics `anon`/`authenticated` de Supabase (tables et séquence), historique en ajout seul | Aucune donnée touchée |

Aucune migration destructive. Testées : sur base vide (`pnpm db:migrate`,
deux fois de suite pour vérifier qu'une relance n'applique rien), à chaque
lancement des tests API, et dans GitHub Actions.

**Projet Supabase `simdouane-dev`** : 0005 et 0006 appliquées avec un contenu
identique aux fichiers, registre Drizzle complété (empreintes SHA-256) :
`pnpm db:migrate` ne les rejouera pas. Vérifié après coup : 16 tables, toutes
avec RLS, aucune règle d'accès, **aucun droit** pour `anon`/`authenticated`
(tables et séquence), déclencheur d'historique présent. Conseillers Supabase :
**aucun avertissement** ; restent les notes attendues « RLS sans règle »
(accès public fermé volontairement) et « index pas encore utilisé » (base vide).

## 5. Tests réellement exécutés (2026-10-26, PostgreSQL 16 local)

| Contrôle | Résultat |
| --- | --- |
| `pnpm run typecheck` | ✅ 0 erreur |
| `pnpm test` | ✅ **69/69** : interface 17 (calculateur 10, redirections 7) ; API 52 (phase 2 : 22, **dossiers : 13**, isolation existante : 5, **règles des dossiers : 12**) |
| `pnpm run build` (API + interface) | ✅ |
| Migrations sur base vide, puis relance | ✅ 7 migrations, 16 tables avec RLS ; la relance n'applique rien |
| GitHub Actions sur le dernier commit (`2e90d31`) | ✅ succès |
| Contrôle des tests : deux règles volontairement cassées (vérification du propriétaire retirée ; refus des comptes désactivés retiré) | ✅ les tests échouent comme attendu, puis repassent une fois le code rétabli |
| Écrans (aperçu Playwright avec une API simulée, ordinateur 1280 px et téléphone 390 px) | ✅ pas de débordement horizontal, aucune erreur JavaScript ; erreur affichée sous le champ concerné ; parcours création → brouillon → vérification → à compléter → complété → prêt → archivage → liste vide ; requêtes envoyées conformes |

Ce que vérifient les 13 tests API des dossiers (vraie base, Clerk simulé) :
- toutes les routes refusées sans session (401) ;
- création d'un brouillon avec seulement la situation et la marque ;
  références uniques et croissantes ; châssis normalisé ;
- statut, propriétaire et référence **impossibles à fixer** par le client ;
- erreurs de validation : un message par champ, **rien n'est créé** ;
- limite de dossiers actifs ;
- **isolation** : un autre utilisateur, **même administrateur**, reçoit 404 en
  lecture, modification, vérification, historique et archivage, et ne voit
  rien dans sa liste ; le dossier reste intact ; identifiant inconnu → même
  réponse ;
- compte désactivé par l'administrateur → 403 ;
- brouillon → à compléter → prêt → à compléter, avec l'historique dans l'ordre ;
- parcours B (déjà arrivé) : date réelle, formalités, blocages ;
- historique non modifiable en base ;
- archivage : dossier masqué, conservé en base, journalisé.

Les 12 tests unitaires couvrent les règles de complétude selon la situation,
la date du jour au Bénin, les dates, le châssis, la référence, les champs
obligatoires et ignorés, les messages d'erreur et la cohérence des dates.

## 6. Non vérifié, et pourquoi

| Point | Raison | À faire |
| --- | --- | --- |
| Écrans dans l'application connectée (vrai Clerk) | Pas de clés Clerk dans cet environnement ; écrans testés avec une API simulée, API testée séparément contre une vraie base | Avec vos clés de test : créer un dossier « pas encore arrivé » et un « déjà arrivé », se déconnecter, se reconnecter → les dossiers sont là ; avec un 2e compte, ouvrir l'adresse d'un dossier du 1er → « Dossier introuvable » |
| Application branchée sur `simdouane-dev` | Il faut le mot de passe de la base et la clé `service_role`, que vous seul détenez (voir `SUPABASE-DEV.md`) | `pnpm db:migrate` doit répondre sans rien appliquer |
| Sur un vrai téléphone | Pas d'appareil ; aperçu à 390 px seulement | Recette manuelle |

## 7. Limites restantes et décisions à prendre

- **Règles de complétude provisoires** : à relire avec un ou deux
  transitaires (quelles informations rendent vraiment un dossier « prêt » ?).
- **Archivage** : le dossier reste en base sans être consultable ni
  restaurable depuis l'application ; aucune suppression définitive. Durée de
  conservation à décider avec les autres données (`SECURITE-DONNEES.md` §5).
- **Comptes désactivés** : refusés sur les nouvelles fonctions (dossiers,
  accès transitaire, justificatifs). Le simulateur, le profil et les
  abonnements gardent leur comportement d'avant (pas de refus), pour ne rien
  changer à l'existant. À aligner si vous le souhaitez.
- Un dossier = un véhicule. Pas encore de lien entre une simulation et un
  dossier (prévu plus tard, sans toucher aux simulations existantes).
- Les champs de date utilisent le sélecteur du navigateur : l'affichage
  (JJ/MM/AAAA ou autre) dépend de la langue du téléphone ou de l'ordinateur.
- Les numéros de référence peuvent sauter une valeur si une création échoue
  (fonctionnement normal d'une séquence PostgreSQL, sans conséquence).
- Avertissement de compilation déjà présent avant cette phase : le fichier
  JavaScript principal de l'interface dépasse 500 Ko (1,2 Mo, 373 Ko
  compressé). À découper plus tard.

## 8. Correctifs issus de la préparation de la recette (2026-10-26)

| Problème trouvé | Correctif | Vérification |
| --- | --- | --- |
| `pnpm db:migrate`, `pnpm db:seed`, `db:report` et `storage-setup` ne lisaient pas le fichier `.env` (seul `pnpm dev` le faisait) : la procédure du README échouait dès la première commande | `lib/db/src/load-env.ts`, importé en premier par ces commandes ; une variable déjà définie dans l'environnement reste prioritaire (CI et tests inchangés) | Commandes lancées avec un `.env` temporaire et sans variable : ✅ ; priorité de l'environnement : ✅ ; sans `.env` : message clair « DATABASE_URL must be set » |
| Page « Mes dossiers » **vide sans message** si l'API répondait par une erreur (compte désactivé, base ou Clerk injoignable) ; fiche affichant « Dossier introuvable » quelle que soit la cause ; échec silencieux de « Vérifier le dossier » et « Archiver » | Message de l'API affiché (ou message générique) avec bouton « Réessayer » ; « Dossier introuvable » réservé au 404 | Aperçu navigateur avec API simulée (403, API injoignable, 404, 503, 500) : ✅ messages affichés, aucune erreur JavaScript |

Procédure de recette réelle : [`RECETTE-PHASE3.md`](RECETTE-PHASE3.md).

## 9. Coûts

**Aucun.** Supabase : offre gratuite (le projet se met en pause après une
semaine sans activité). Clerk : non utilisé dans cet environnement. GitHub
Actions : environ 1 minute par envoi, dans le quota gratuit. Aucun service
payant ajouté.
