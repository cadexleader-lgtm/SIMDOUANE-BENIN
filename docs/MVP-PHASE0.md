# MVP « dossier véhicule » — Phase 0 : audit, architecture, risques et plan

Branche : `mvp/dossiers`, partie de `migration/hors-replit`. Rien n'est
fusionné dans `main`. Spécification : [`SPECIFICATION-MVP.md`](SPECIFICATION-MVP.md).

## 1. Où en est le projet

| Phase du plan | État |
| --- | --- |
| 0 — Audit et sauvegarde | ✅ Audit complet ([`MIGRATION.md`](MIGRATION.md)) + ce document |
| 1 — Indépendance technique | ✅ en grande partie : l'application s'installe, se compile, se teste et démarre hors de Replit ; migrations SQL versionnées ; transfert de données répété avec succès sur données fictives |
| 1 — reste | ⏳ transfert des vraies données Replit (action du propriétaire) ; Clerk conservé (décision 1) ; projet Supabase de développement créé ([`SUPABASE-DEV.md`](SUPABASE-DEV.md)) |
| 1 bis — TypeScript et intégration continue | ✅ |
| 2 — Comptes, rôles, accès transitaire | ✅ ([`PHASE2-RAPPORT.md`](PHASE2-RAPPORT.md)) |
| 3 — Dossiers véhicules | ✅ en attente de votre validation ([`PHASE3-RAPPORT.md`](PHASE3-RAPPORT.md)) |
| 4 — Checklist et documents | ⏸ pas commencée (attend votre accord) |

## 2. Ce que l'existant apporte au MVP (constats vérifiés dans le code)

| Besoin du MVP | Existant | Conséquence |
| --- | --- | --- |
| Comptes | Clerk (connexion, inscription, onboarding) + table `users` liée par `clerk_id` | Réutilisé ; il faut ajouter un **type de compte** (propriétaire / transitaire) |
| Rôle administrateur | Liste d'emails `ADMIN_EMAILS`, vérifiée côté serveur sur `/api/admin/*` | Réutilisé tel quel |
| Contrôle des droits | Dans l'API Express : chaque route filtre par utilisateur ; testé (5 tests d'isolation) | **Le même modèle est étendu** aux dossiers, pas de seconde architecture |
| Base de données | PostgreSQL + Drizzle + migrations versionnées | Nouvelles tables = nouvelles migrations |
| Stockage de fichiers | **Aucun** | À créer (§3) |
| Estimation des coûts | Simulateur côté navigateur + table `simulations` | Une simulation pourra être **rattachée** à un dossier (colonne facultative), sans toucher aux formules ni à l'historique |
| PDF | jsPDF dans le navigateur (`lib/export-pdf.ts`) | Réutilisé pour le récapitulatif |
| Page « Procédure » | Texte explicatif statique (FR/EN) | Conservée ; pourra renvoyer vers la création de dossier |
| Bilingue FR/EN | Tout le site (`lib/translations.ts`) | Voir décision 3 |
| Mobile / PWA | Oui | Les nouveaux écrans suivent le même cadre (`layout.tsx`) |

## 3. Architecture proposée

Principe : **l'API Express reste le seul point d'accès** aux données et aux
fichiers. Le navigateur ne parle jamais directement à la base ni au stockage.

- **Autorisations** : une fonction centrale `assertCaseAccess(user, caseId,
  action)` utilisée par toutes les routes dossier ; un accès refusé répond 404
  (on ne révèle pas l'existence d'un dossier). Chaque route reçoit son test
  « un autre utilisateur ne peut pas » (changement d'identifiant dans l'URL).
- **Fichiers** : interface `FileStore` à deux implémentations : disque local
  (développement et tests) et **Supabase Storage, bucket privé** (production).
  - Dépôt via l'API : 10 Mo maximum, PDF/JPEG/PNG uniquement, contrôle du vrai
    type (signature du fichier, pas seulement l'extension), nom de stockage
    généré (jamais le nom fourni).
  - Téléchargement : l'API vérifie les droits puis délivre un **lien signé de
    60 secondes** (forcé en téléchargement). Une révocation prend effet au plus
    tard 60 s après.
  - La clé de service Supabase reste exclusivement côté serveur.
- **Défense en profondeur en base** : RLS déjà activé (accès public fermé).
  Des policies par utilisateur supposent que l'API change de rôle base à chaque
  requête ; je propose de les étudier en phase 6, une fois les routes
  stabilisées et testées, plutôt que de compliquer le socle maintenant.
- **Indépendance vis-à-vis du fournisseur de comptes** : avec ce modèle, le
  stockage privé fonctionne aussi bien avec Clerk qu'avec Supabase Auth
  (j'avais dit le contraire précédemment ; c'est corrigé ici).

## 4. Décisions validées (2026-10-26)

1. **Comptes : Clerk conservé**, sur un compte contrôlé par le porteur du
   projet ; Supabase pour la base et le stockage privé, sous réserve de
   confirmer coûts et configuration. Rattachement des comptes Replit :
   vérifier emails vérifiés, doublons et correspondance comptes ↔ données ;
   **aucune fusion automatique sur la seule base de l'email**, aucun privilège
   ajouté sans vérification.
2. **Représentant local : hors MVP.** Trois rôles : propriétaire, transitaire,
   administrateur. À réétudier selon les besoins des utilisateurs.
3. **Langue : nouveaux écrans en français**, textes regroupés pour permettre
   une traduction ultérieure ; le bilinguisme existant est conservé.
4. **Transitaires : activation manuelle par l'administrateur.** Enregistrer le
   numéro d'agrément déclaré, les justificatifs, le résultat, la date et
   l'administrateur responsable. Un numéro saisi n'est pas une preuve ; la
   validation SimDouane n'est pas une certification officielle.
5. **Checklist : validation par 2 ou 3 transitaires.** En attendant, exigences
   « à confirmer », sources et dates conservées, distinction requise /
   conditionnelle / applicabilité à confirmer.
6. **Étape 1 bis** avant la phase 2 : corriger les 8 erreurs TypeScript sans
   modifier règles métier ni comportement, ajouter GitHub Actions.
7. **Protection des données et migration** : documenter sécurité,
   autorisations, conservation, suppression et vérifications juridiques avant
   tout document réel ; pas de migration des vraies données ni de suppression
   de l'ancienne base sans sauvegarde vérifiée, restauration testée et
   correspondance validée ; aucun secret dans le dépôt.
8. **Méthode** : branche `mvp/dossiers`, pas de fusion automatique dans
   `main`, simulateur préservé, rapport avant chaque phase.

## 5. Modèle de données (première version)

Correspondance avec la spécification ; noms définitifs fixés à l'écriture des
migrations.

| Table | Contenu clé |
| --- | --- |
| `users` (existante) | + `account_type` (proprietaire / transitaire), `importer_type` (particulier / entreprise) |
| `transitaire_verifications` | Demande d'activation : numéro d'agrément déclaré, justificatifs, résultat, date, administrateur responsable, motif |
| `organizations`, `organization_members` | Entreprises importatrices et cabinets de transit ; rôle du membre |
| `vehicles` | Marque, modèle, année, VIN/châssis, caractéristiques ; propriétaire |
| `clearance_cases` | Référence `SDB-AAAA-NNNNNN`, parcours (A/B), situation d'arrivée, dates (expédition, arrivée estimée/réelle, sortie), statut interne, responsable et prochaine action, version de checklist appliquée |
| `case_parties` | Lien dossier ↔ utilisateur : rôle (propriétaire, transitaire), état de l'invitation (envoyée, acceptée, refusée, expirée, révoquée), dates |
| `document_requirement_sets`, `document_requirements` | Règles de checklist versionnées : catégorie, condition, source, date de vérification |
| `case_documents` | Pièce attendue ou déposée : statut, version, chemin de stockage, type, taille, déposant |
| `case_events` | Historique : type, ancien/nouveau statut, **catégorie de source** (simdouane / professionnel / officiel confirmé), preuve (document), auteur, date |
| `case_comments` | Commentaires et demandes de correction (état, pièce visée, résolution) |
| `notifications` | Invitations, corrections, changements de statut (affichage dans l'app ; email plus tard) |
| `audit_logs` | Journal des accès et actions sensibles (l'actuel `admin_logs` reste en place) |
| `simulations` (existante) | + `case_id` facultatif |

Règle en base : un événement « officiel confirmé » sans preuve est refusé
(contrainte vérifiée par l'API et en base).

## 6. Risques

| # | Risque | Mesure |
| --- | --- | --- |
| R1 | Comptes existants bloqués après changement d'instance Clerk | Rattachement par email vérifié, testé avant bascule |
| R2 | Checklist inexacte présentée comme officielle | Catégorie « à confirmer » par défaut, source et date affichées, relecture par des transitaires |
| R3 | Données personnelles (pièces d'identité, IFU) | Stockage privé, accès journalisés, durée de conservation à définir ; **vérifier avec un juriste les obligations prévues par le Code du numérique béninois et l'autorité de protection des données (APDP)** avant d'accepter des documents réels |
| R4 | Accès de l'administrateur aux documents | Aucun accès par défaut ; accès exceptionnel tracé, si vous le jugez nécessaire |
| R5 | Fichier malveillant déposé | Types limités et vérifiés, toujours servi en téléchargement, jamais affiché comme page web ; pas d'antivirus au MVP (à ajouter si volume) |
| R6 | Statut officiel affirmé à tort | Trois catégories séparées, preuve obligatoire pour « officiel confirmé » |
| R7 | Régression du simulateur | Tests du calculateur et liste de non-régression (§7) rejoués à chaque phase |
| R8 | Typecheck en échec (8 erreurs préexistantes) masquant de nouvelles erreurs | Les corriger en ouverture du chantier (phase 1 bis), sans changer le comportement |
| R9 | Pas d'intégration continue | Ajouter un contrôle GitHub Actions (typecheck, tests, build) à chaque push |

## 7. Liste de non-régression (à rejouer à chaque phase)

Automatique : `pnpm test` (69 tests à la fin de la phase 3 : 17 interface dont
10 calculateur, 52 API), builds API et frontend, `pnpm db:migrate` sur base
vide — le tout rejoué par GitHub Actions à chaque envoi.

Manuel, dans le navigateur :
- Accueil `/accueil`, Simulateur `/simulateur` → Résultats `/resultats` : mêmes
  montants que les cas de référence de `calculator.test.ts`.
- Export PDF d'une simulation.
- Historique local (`simdouane_history`) et historique en ligne `/historique`.
- Connexion, inscription, onboarding.
- Tableau de bord `/dashboard`, Abonnement `/abonnement` (formulaire Mobile
  Money), Profil `/profil`.
- Quota gratuit (3 simulations/mois).
- Administration `/admin` : utilisateurs, abonnements, simulations, demandes.
- Pages Guide, Procédure, À propos ; bascule FR/EN ; installation PWA.
- Mes dossiers `/dossiers` : création (pas encore arrivé / déjà arrivé), fiche,
  vérification, archivage ; un 2e compte ne voit pas le dossier.

## 8. Plan d'exécution

Chaque phase se termine par : tests rejoués, résultats réels rapportés, commit
poussé sur `mvp/dossiers`, validation de votre part avant la suivante.

| Phase | Contenu | Tests de sortie |
| --- | --- | --- |
| 1 bis | Corriger les 8 erreurs TypeScript sans changer le comportement ; GitHub Actions | Typecheck vert ; non-régression |
| 2 | Type de compte, activation des transitaires, `assertCaseAccess`, `audit_logs` | Accès interdits entre propriétaires et transitaires non invités |
| 3 | Tables véhicules/dossiers, création A/B, brouillon, « Mes dossiers », détail | Persistance après reconnexion ; isolation par URL |
| 4 | Checklist versionnée, `FileStore`, dépôt/téléchargement/versions | Formats et tailles refusés ; aucun fichier accessible sans droit ; lien expiré |
| 5 | Invitations (envoi, acceptation, refus, expiration, révocation), statuts et historique, corrections | Le transitaire ne voit que le dossier partagé ; révocation effective |
| 6 | Récapitulatif PDF, finitions mobile, tests de bout en bout, restauration de sauvegarde, données de démonstration fictives | Recette complète de la spécification |

Estimation indicative de la spécification : 22 à 43 jours ouvrés au total ;
les phases 0 et 1 étant largement faites, le reste représente l'essentiel de
cette fourchette. À réajuster après la phase 2.

## 9. Rapport de l'étape 1 bis (2026-10-26)

**Erreurs TypeScript : 8 → 0.** Analyse et correction :

| Fichier | Cause | Correction | Effet à l'exécution |
| --- | --- | --- | --- |
| `App.tsx` | Prop `afterSignUpUrl` retirée de Clerk ; vérifié dans le code de clerk-js 6.40.1 (version chargée par le navigateur) : elle n'est plus lue, seul le réglage du tableau de bord Clerk compte | Prop supprimée | Aucun (elle était ignorée) |
| `layout.tsx` | `ringColor` n'est pas une propriété CSS | Supprimée | Aucun (le navigateur l'ignorait) |
| `admin.tsx` (×2), `historique.tsx`, `simulateur.tsx` | `queryKey` exigé par les types de React Query | Passage explicite de la clé que le hook générait déjà par défaut | Aucun (même clé de cache) |
| `onboarding.tsx` | Troisième condition inatteignable (`step === "done"` déjà testé avant) | Condition retirée | Aucun |
| `dashboard.tsx` | Le bouton « Demander un upgrade » envoyait une demande incomplète → refus 400 de l'API, rien ne se passait à l'écran | Le bouton ouvre le formulaire Mobile Money existant (le même que dans le simulateur) | **Changement volontaire** : le bouton fonctionne. Règles de l'API inchangées. Commit séparé, annulable seul |

À valider par le porteur du projet :
- **Redirection après inscription.** La redirection vers `/onboarding` après
  l'inscription ne dépend que du réglage « after sign-up URL » du tableau de
  bord Clerk. À configurer dans votre nouvelle application Clerk, ou à
  rétablir dans le code avec `signUpFallbackRedirectUrl` (changement de
  comportement, donc soumis à votre accord).

**Tests exécutés** (PostgreSQL 16 local) : `pnpm run typecheck` ✅ ;
`pnpm test` ✅ 15/15 (10 calculateur, 5 API) ; `pnpm run build` (typecheck +
builds) ✅, pour la première fois.

**GitHub Actions** : premier passage réussi sur `74b0f39` (typecheck,
migrations sur base vide, 10 + 5 tests — les tests d'API ont bien tourné sur
la base PostgreSQL de la CI, pas ignorés —, compilation API et frontend).

**Non vérifié** : affichage des écrans modifiés dans un navigateur connecté
(il faut des clés Clerk).

**GitHub Actions** (`.github/workflows/ci.yml`) : à chaque envoi et chaque
demande de fusion : installation, typecheck, migrations sur base vide, tests
(base PostgreSQL jetable dans le conteneur de CI), compilation API et
frontend. Aucun secret requis.
