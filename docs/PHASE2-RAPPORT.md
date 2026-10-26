# Phase 2 — Comptes, rôles et permissions : rapport

Branche `mvp/dossiers` (non fusionnée). Décisions appliquées : celles du
2026-10-26 (voir `MVP-PHASE0.md` §4 et la conversation de validation).
Sécurité et protection des données : [`SECURITE-DONNEES.md`](SECURITE-DONNEES.md).

## 1. Ce qui a été fait

| Point validé | Réalisation |
| --- | --- |
| 1. Redirection après inscription | `signUpFallbackRedirectUrl` → onboarding. Une page protégée renvoie vers la connexion **en mémorisant la destination** ; après une inscription, onboarding d'abord, puis la page voulue (`?next=`). Seuls les chemins internes sont acceptés. |
| 2. Bouton « Demander un upgrade » | Conservé (commit `720984c`). Règles de l'API inchangées (seule modification de la route : gestionnaire d'erreurs commun) ; testé de bout en bout. |
| 3. Accès transitaire | Demande avec numéro d'agrément déclaré + justificatifs ; approbation (≥ 1 justificatif) ou refus ; suspension, rétablissement, révocation. Décision, date, auteur, motif enregistrés (motif obligatoire pour suspendre/révoquer, imposé par la base). Le poste déclaré n'accorde rien. |
| 4. Stockage privé | Disque local (dev/tests, fichiers fictifs) ou bucket privé Supabase (prod) ; droits vérifiés par le serveur ; liens de 60 s. Script `storage-setup`. Documentation `SECURITE-DONNEES.md`. |
| 5. Particulier / entreprise | Type de compte, raison sociale (obligatoire pour une entreprise), IFU facultatif. Tables `organizations` / `organization_members` prêtes pour les équipes (phase 5). |
| 6. Accès admin aux documents | Uniquement les justificatifs des demandes d'accès ; **chaque consultation journalisée** ; testé. Aucun accès aux documents de dossiers. |
| Comptes existants | **Aucune fusion automatique** : un nouveau compte Clerk portant l'email d'un compte existant est refusé (`ACCOUNT_LINK_REQUIRED`) et journalisé ; procédure manuelle vérifiée dans `SECURITE-DONNEES.md` §6. Droits admin : email dans la liste **et vérifié** par Clerk. |

Migrations ajoutées : `0002_accounts_transitaire_access.sql`,
`0003_protect_new_tables.sql`. Aucune modification des formules du simulateur
ni de son historique.

## 2. Tests réellement exécutés (2026-10-26, PostgreSQL 16 local)

| Contrôle | Résultat |
| --- | --- |
| `pnpm run typecheck` | ✅ 0 erreur |
| `pnpm test` | ✅ **44/44** : calculateur 10, redirections 7, API isolation 5, API phase 2 **22** |
| `pnpm run build` | ✅ |
| Migrations sur base vide | ✅ |
| Migrations 0002/0003 sur une base contenant déjà des données (rôle non superutilisateur, comme Supabase) | ✅ données inchangées (comptes, 40 simulations : empreinte identique) |
| Transfert « Replit » → base entièrement migrée (`pg_dump` → `pg_restore` → `db:report`) | ✅ 6 tables d'origine identiques |
| Protections en base (motif obligatoire, journal non modifiable, RLS sur toutes les tables) | ✅ vérifiées en SQL et par les tests |
| Contrôle des tests : deux règles volontairement cassées (accès d'un compte « en attente », journal admin retiré) | ✅ les tests échouent comme attendu, puis repassent une fois le code rétabli |
| Écrans (aperçu Playwright, données fictives, ordinateur 1280 px et téléphone 390 px) | ✅ pas de débordement, aucune erreur JavaScript, requêtes envoyées conformes, téléchargement avec le vrai nom de fichier |

Ce que vérifient les 22 tests de la phase 2 (contre la vraie base, Clerk simulé) :
- **comptes** : refus et journalisation d'un email déjà utilisé (sans modifier
  l'ancien compte ni ses simulations), pas de compte créé si Clerk est
  indisponible, profil entreprise/particulier, champs existants inchangés ;
- **transitaire non approuvé** : poste « Transitaire » ou champ forgé sans
  effet, demande en attente sans accès aux fonctions réservées, une seule
  demande en cours, approbation impossible sans justificatif, refus avec motif,
  suspension/rétablissement/révocation avec historique, pas d'auto-décision ;
- **administration** : toutes les routes transitaire refusées aux
  non-administrateurs (403) et aux visiteurs (401), email admin non vérifié refusé ;
- **justificatifs** : vrai type exigé, taille et nombre limités, nom de
  stockage généré, aucun accès par un autre utilisateur ni par adresse devinée,
  lien modifié ou expiré refusé, téléchargement forcé, chaque consultation
  admin journalisée, journal non modifiable ;
- **demandes Mobile Money** : demande incomplète refusée, complète enregistrée,
  doublon refusé, traitement par l'administrateur.

## 3. Non vérifié, et pourquoi

| Point | Raison | À faire |
| --- | --- | --- |
| Redirection après inscription **avec le vrai Clerk** | Pas de clés Clerk. La logique de destination est testée (7 tests) ; les noms de props Clerk sont vérifiés dans les types de la version installée | Avec vos clés de test Clerk : 1) s'inscrire depuis l'accueil → onboarding → tableau de bord ; 2) ouvrir `/historique` déconnecté → s'inscrire → onboarding → `/historique` ; 3) se connecter avec un compte existant depuis `/historique` → retour direct sur `/historique` |
| Stockage Supabase réel | Pas encore de projet SimDouane sur votre compte | Après création du projet : `storage-setup`, puis un dépôt et un téléchargement fictifs |
| Écrans dans l'application connectée | Clerk requis | Recette manuelle avec vos clés |

## 4. Points d'attention

- **Comptes existants sans email « vérifié »** : après migration, toutes les
  lignes existantes ont `email_verified = false`. Pour l'administrateur, une
  seule vérification auprès de Clerk le corrige automatiquement à la première
  requête d'administration. Pour les autres, sans effet aujourd'hui.
- Le **numéro d'agrément** n'est pas comparé à un registre officiel : aucune
  source officielle accessible n'a été identifiée ; l'administrateur vérifie
  les justificatifs.
- Les **justificatifs ne sont pas encore supprimables** : politique de
  conservation à décider (`SECURITE-DONNEES.md` §5).
- `pg_dump` ne sauvegarde pas les fichiers du stockage Supabase : sauvegarde
  séparée à prévoir en production.
- Un compte **révoqué** qui refait une demande puis est **refusé** revient au
  statut « aucun accès » (et non « révoqué ») ; les deux décisions restent
  dans l'historique. À changer si vous préférez conserver « révoqué ».
