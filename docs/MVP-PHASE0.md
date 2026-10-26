# MVP « dossier véhicule » — Phase 0 : audit, architecture, risques et plan

Branche : `mvp/dossiers`, partie de `migration/hors-replit`. Rien n'est
fusionné dans `main`. Spécification : [`SPECIFICATION-MVP.md`](SPECIFICATION-MVP.md).

## 1. Où en est le projet

| Phase du plan | État |
| --- | --- |
| 0 — Audit et sauvegarde | ✅ Audit complet ([`MIGRATION.md`](MIGRATION.md)) + ce document |
| 1 — Indépendance technique | ✅ en grande partie : l'application s'installe, se compile, se teste et démarre hors de Replit ; migrations SQL versionnées ; transfert de données répété avec succès sur données fictives |
| 1 — reste | ⏳ choix du fournisseur de comptes (§4, décision 1), transfert des vraies données Replit (action du propriétaire), projet Supabase réel |

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

## 4. Décisions à prendre avant de coder

1. **Fournisseur de comptes** — recommandation révisée : **garder Clerk, sur
   votre propre compte**. Raisons : écrans de connexion existants conservés
   (règle « ne pas casser »), aucun changement de modèle d'accès, stockage privé
   possible via l'API comme expliqué au §3. Supabase sert alors à la base et
   aux fichiers. Dans les deux cas, les comptes créés sur l'instance Clerk de
   Replit doivent être rattachés (par email vérifié) — voir `MIGRATION.md` §4.
2. **Représentant local** — l'inclure comme troisième partie du dossier
   (proposition détaillée en conversation) : oui ou non, et les trois réglages
   (pièce d'identité visible, choix du transitaire, un seul représentant).
3. **Langue des nouveaux écrans** — recommandation : **français seulement**
   pour le MVP, anglais ensuite. Le site actuel reste bilingue.
4. **Vérification des transitaires** — recommandation : un compte « transitaire »
   est créé à la demande puis **activé par l'administrateur** après contrôle du
   numéro d'agrément déclaré. Tant qu'il n'est pas activé, il ne peut pas être
   invité sur un dossier.
5. **Contenu de la checklist** — faire relire par 2 ou 3 transitaires la liste
   de départ (spécification). En attendant, chaque pièce est marquée
   « à confirmer » avec sa source.

## 5. Modèle de données (première version)

Correspondance avec la spécification ; noms définitifs fixés à l'écriture des
migrations.

| Table | Contenu clé |
| --- | --- |
| `users` (existante) | + `account_type` (proprietaire / transitaire), `importer_type` (particulier / entreprise), `agrement_number`, `verified_at` |
| `organizations`, `organization_members` | Entreprises importatrices et cabinets de transit ; rôle du membre |
| `vehicles` | Marque, modèle, année, VIN/châssis, caractéristiques ; propriétaire |
| `clearance_cases` | Référence `SDB-AAAA-NNNNNN`, parcours (A/B), situation d'arrivée, dates (expédition, arrivée estimée/réelle, sortie), statut interne, responsable et prochaine action, version de checklist appliquée |
| `case_parties` | Lien dossier ↔ utilisateur : rôle (propriétaire, transitaire, représentant si validé), état de l'invitation (envoyée, acceptée, refusée, expirée, révoquée), dates |
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

Automatique : `pnpm test` (10 tests calculateur, 5 tests API), builds API et
frontend, `pnpm db:migrate` sur base vide.

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
