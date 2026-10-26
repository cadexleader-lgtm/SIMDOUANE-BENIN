# SimDouane Bénin — Sécurité, autorisations et protection des données

> **Ce document n'est pas un avis juridique.** Il décrit ce que fait le code
> et les décisions à prendre. Les obligations applicables au Bénin doivent
> être vérifiées par un juriste **avant d'accepter le moindre document réel**
> (voir §8). Jusque-là : données et documents **fictifs** uniquement.

État au 2026-10-26 (fin de la phase 3), branche `mvp/dossiers`.

## 1. Données traitées

| Donnée | Où | Qui la fournit |
| --- | --- | --- |
| Compte : nom, email, statut de vérification de l'email | `users` (+ Clerk) | Utilisateur via Clerk |
| Profil : téléphone, WhatsApp, poste déclaré | `users` | Utilisateur |
| Type de compte ; entreprise : raison sociale, IFU | `users.account_kind`, `organizations` | Utilisateur |
| Demande d'accès transitaire : numéro d'agrément déclaré, message | `transitaire_applications` | Utilisateur |
| **Justificatifs** (fichiers PDF/JPEG/PNG, souvent des pièces d'agrément ou d'identité) | Stockage privé + `stored_files` (nom, type, taille, empreinte SHA-256) | Utilisateur |
| Décisions sur les droits transitaire (auteur, date, motif) | `transitaire_access_decisions` | Administrateur |
| Journal de sécurité (qui, quoi, quand, sur quoi) | `audit_logs` — **aucune adresse IP enregistrée** | Système |
| Simulations sauvegardées | `simulations` | Utilisateur |
| Dossiers véhicules : véhicule (marque, modèle, année, châssis), provenance, dates d'expédition et d'arrivée, référence de transport, notes, formalités et blocages déclarés | `vehicles`, `clearance_cases` | Utilisateur |
| Historique des dossiers (qui, quoi, quand, ancien/nouveau statut) | `case_events` (non modifiable) | Système |
| Demandes d'abonnement : téléphone Mobile Money, référence de transaction, montant | `upgrade_requests` | Utilisateur |
| Historique local des simulations | `localStorage` du navigateur (jamais envoyé) | Utilisateur |

Sous-traitants techniques : **Clerk** (comptes), **Supabase** (base de données
et fichiers, en production), l'**hébergeur** de l'API. Leurs pays
d'hébergement entrent dans les questions du §8.

## 2. Rôles et permissions

Trois rôles dans le MVP. **Toutes les règles sont appliquées par l'API**
(`artifacts/api-server`) ; l'interface ne fait que masquer ce qui est interdit.

| Action | Visiteur | Utilisateur (propriétaire) | Transitaire actif | Administrateur |
| --- | :-: | :-: | :-: | :-: |
| Simulateur, pages publiques | ✅ | ✅ | ✅ | ✅ |
| Voir / modifier **son** profil, ses simulations | ❌ | ✅ | ✅ | ✅ |
| Voir les données d'un autre utilisateur | ❌ | ❌ | ❌ | Comptes et simulations (écrans existants) |
| Demander l'accès transitaire, déposer ses justificatifs | ❌ | ✅ | — | ✅ (mais ne peut pas se l'accorder) |
| Fonctions réservées aux transitaires (`/api/transitaire/*`) | ❌ | ❌ | ✅ | ❌ s'il n'est pas lui-même transitaire actif |
| Consulter un justificatif | ❌ | Les siens | Les siens | **Seulement** ceux d'une demande d'accès, chaque consultation journalisée |
| Créer, voir, modifier, vérifier, archiver un dossier véhicule | ❌ | **Les siens uniquement** | Les siens (dossiers partagés : phase 5) | **Aucun accès** (testé) |
| Documents des dossiers véhicules | ❌ | (phase 4, pas encore de dépôt) | (phase 5, dossiers partagés) | **Aucun accès dans le MVP** |
| Approuver / refuser / suspendre / rétablir / révoquer | ❌ | ❌ | ❌ | ✅, jamais pour lui-même |

Règles d'attribution :
- **Transitaire actif** = `users.transitaire_status = 'active'`, posé **uniquement**
  par une approbation de l'administrateur, qui exige au moins un justificatif.
  Le « poste » déclaré dans le profil n'accorde jamais de droit (testé).
- **Administrateur** = email présent dans `ADMIN_EMAILS` **et** vérifié par Clerk.
- La validation SimDouane d'un transitaire n'est **pas** une certification
  officielle de son agrément ; c'est affiché à l'utilisateur et à l'administrateur.

Un dossier d'autrui, archivé ou inexistant reçoit la même réponse (404), pour
ne pas révéler son existence. Un compte désactivé par l'administrateur est
refusé (403) sur les dossiers, l'accès transitaire et les justificatifs.

Code : `middlewares/requireAuth.ts` (`requireUser`, `requireActiveTransitaire`,
`requireAdmin`), `routes/transitaire-access.ts`, `routes/admin-transitaires.ts`,
`routes/cases.ts` et `lib/cases/access.ts` (décision d'accès unique aux dossiers).
Tests : `artifacts/api-server/test/*.test.ts`.

## 3. Mesures de sécurité en place

**Comptes**
- Aucun rattachement automatique : si un nouveau compte Clerk présente l'email
  d'un compte existant, la connexion est refusée (`ACCOUNT_LINK_REQUIRED`) et
  le cas est journalisé (`account.email_conflict`). Rattachement : §6.
- Si Clerk ne répond pas, aucun compte n'est créé (plus d'adresse inventée).

**Base de données**
- Accès uniquement par l'API (rôle serveur). Sur Supabase, RLS est activé
  sans policy et les rôles publics `anon`/`authenticated` n'ont aucun droit :
  l'API REST publique de Supabase ne peut rien lire (migrations 0001 et 0003).
- Journal et décisions **en ajout seul** (trigger : modification et
  suppression refusées). Suspension et révocation **sans motif refusées** par
  la base elle-même.
- Clés étrangères des nouvelles tables sans suppression en cascade : supprimer
  un compte ne peut pas effacer silencieusement ses justificatifs ou l'historique.

**Fichiers**
- Stockage **privé** : disque local (développement) ou bucket Supabase **privé**
  (production, créé par `storage-setup`, qui refuse un bucket public).
- Type réel détecté par les premiers octets (PDF, JPEG, PNG) ; 10 Mo ; 5
  justificatifs par demande ; nom de stockage généré par le serveur (le nom
  fourni n'est qu'un libellé nettoyé) ; empreinte SHA-256 conservée.
- Téléchargement : l'API vérifie les droits **à chaque fois**, puis donne un
  **lien de 60 secondes** qui force le téléchargement (`Content-Disposition:
  attachment`, `nosniff`, `no-store`). Aucun lien permanent.

**Secrets** : uniquement en variables d'environnement serveur (`.env` local
ignoré par Git, gestionnaire de secrets de l'hébergeur). La clé
`SUPABASE_SERVICE_ROLE_KEY` ne doit jamais être préfixée `VITE_`.

## 4. Journal de sécurité (`audit_logs`)

Enregistré : demande d'accès transitaire, dépôt de justificatif, **chaque lien
de consultation d'un justificatif** (par l'utilisateur ou l'administrateur),
approbation, refus, suspension, rétablissement, révocation, conflit de compte.
Consultable par l'administrateur (onglet Transitaires et `GET /api/admin/audit-logs`).

Non enregistré aujourd'hui : lectures de profil et de simulations, actions
de l'ancien écran d'administration (qui écrit dans `admin_logs`).

## 5. Conservation et suppression — décisions à prendre

État actuel : **rien n'est supprimé automatiquement**. Un champ `deleted_at`
existe pour les fichiers, sans fonction de suppression pour l'instant.

À décider avec un juriste, avant tout document réel :

| Donnée | Question |
| --- | --- |
| Justificatifs d'une demande **approuvée** | Durée de conservation ? Suppression à la révocation ? |
| Justificatifs d'une demande **refusée** | Suppression après quel délai ? |
| Journal de sécurité | Durée de conservation (il ne contient pas d'IP) ? |
| Compte supprimé | Que garder (décisions, journal) et que supprimer (profil, fichiers) ? |
| Demande d'effacement d'un utilisateur | Procédure et délai de réponse |

La suppression devra effacer **l'objet stocké et sa ligne `stored_files`**, et
être journalisée.

## 6. Rattachement des anciens comptes (Replit) — procédure

Jamais automatique. Pour chaque conflit (`account.email_conflict`) :

1. Rapport en lecture seule :
   ```sql
   SELECT l.created_at, u.id AS ancien_compte, u.email,
          l.details->>'newClerkId' AS nouveau_compte_clerk,
          l.details->>'emailVerified' AS email_verifie_par_clerk,
          (SELECT count(*) FROM simulations s WHERE s.user_id = u.id) AS simulations,
          (SELECT count(*) FROM subscriptions s WHERE s.user_id = u.id) AS abonnements
     FROM audit_logs l JOIN users u ON u.id = l.target_id
    WHERE l.action = 'account.email_conflict'
    ORDER BY l.created_at;
   ```
2. Ne traiter que si `email_verifie_par_clerk = true` ; sinon, demander à la
   personne de vérifier son adresse dans Clerk.
3. Vérifier avec la personne (par un autre canal que l'email) qu'elle est bien
   titulaire de l'ancien compte. Écarter tout doublon (plusieurs anciens comptes
   pour une même personne) en les examinant un par un.
4. Décision validée par le porteur du projet, puis mise à jour **d'une seule
   ligne**, dans une transaction, avec une ligne de journal :
   ```sql
   BEGIN;
   UPDATE users SET clerk_id = '<nouveau_compte_clerk>', email_verified = false, updated_at = now()
    WHERE id = '<ancien_compte>' AND clerk_id = '<ancien_clerk_id>';
   INSERT INTO audit_logs (id, actor_role, action, target_type, target_id, details)
   VALUES (gen_random_uuid()::text, 'admin', 'account.linked_manually', 'user', '<ancien_compte>',
           jsonb_build_object('newClerkId', '<nouveau_compte_clerk>', 'validatedBy', '<nom>'));
   COMMIT;
   ```
   `email_verified = false` force une nouvelle vérification avant tout droit
   d'administrateur. Le statut transitaire n'est pas modifié par le rattachement.

## 7. Sauvegardes

- **Base** : `pg_dump` (procédure dans `MIGRATION.md` §6–7).
- **Fichiers** : un `pg_dump` **ne contient pas** les fichiers du stockage
  Supabase. Une sauvegarde séparée du bucket est nécessaire en production, et
  sa restauration doit être testée (avec des fichiers fictifs) avant le lancement.
- Supabase propose des sauvegardes automatiques **selon l'offre** : à vérifier
  et à chiffrer avant la production.

## 8. Vérifications juridiques à faire au Bénin (questions pour un juriste)

Je ne peux pas garantir l'exactitude de ces points ; ce sont les questions à poser.

1. **Code du numérique** (loi n° 2017-20) et rôle de l'**APDP** (Autorité de
   protection des données à caractère personnel) : quelles formalités
   (déclaration, autorisation) avant de traiter des pièces d'identité,
   d'agrément ou des IFU ?
2. **Transfert hors du Bénin** : Clerk et Supabase hébergent hors du pays
   (Supabase : région choisie à la création, ex. Europe). Conditions et
   garanties exigées ?
3. **Information des personnes** : mentions à afficher (finalité, durée,
   destinataires, droits), consentement nécessaire ou non.
4. **Droits des personnes** : accès, rectification, effacement — procédure et
   délais.
5. **Durées de conservation** (§5).
6. **Violation de données** : à qui et dans quel délai la notifier.
7. **Contrats** avec les sous-traitants (Clerk, Supabase, hébergeur).
8. **Responsable de traitement** : qui (vous, une société) ; faut-il un
   correspondant à la protection des données ?

## 9. Avant d'accepter de vrais documents

- [ ] Réponses du juriste aux questions du §8, appliquées.
- [ ] Politique de conservation (§5) décidée et implémentée.
- [ ] Mentions d'information publiées dans l'application.
- [ ] Projet Supabase de production, bucket privé vérifié, offre avec sauvegardes.
- [ ] Sauvegarde **et restauration** testées (base + fichiers).
- [ ] Clés Clerk de production, domaine configuré, `ADMIN_EMAILS` à jour.
- [ ] Tests automatiques au vert sur la version déployée.
