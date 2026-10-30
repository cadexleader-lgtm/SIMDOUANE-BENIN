# Phase 4 — Checklist et documents : conception (avant développement)

**État : préparation seulement, aucune ligne de code de la phase 4.**
Décisions D1 à D7 confirmées le 2026-10-26 (§6). Le développement n'est
**pas autorisé** tant que la recette réelle de la phase 3
([`RECETTE-PHASE3.md`](RECETTE-PHASE3.md)) n'est pas terminée et que le
porteur du projet n'a pas donné son accord explicite. Branche `mvp/dossiers`,
rien dans `main`.

## 1. Checklist provisoire (version « 2026-10-provisoire-1 »)

> **Ce n'est pas la liste officielle des Douanes béninoises.** C'est une liste
> indicative, établie à partir des sources du §2, à confirmer par des
> transitaires agréés. Ce message sera affiché en tête de la checklist dans
> l'application, et chaque pièce affichera sa source, son type (officielle,
> professionnelle, article), sa date de vérification et « confirmation par un
> professionnel : en attente ».

Catégories :
- **Obligatoire** : exigée par une source **officielle** pour l'importation
  par le port de Cotonou, et s'applique de façon évidente à un véhicule
  expédié par mer. La source n'est pas propre aux véhicules : la pièce reste
  à confirmer par un professionnel.
- **Conditionnelle** : source officielle, mais seulement dans certains cas.
- **À confirmer** : citée seulement par des guides non officiels, ou sources
  en désaccord.

| Code | Pièce | Catégorie | Condition d'application | Sources (§2) |
| --- | --- | --- | --- | --- |
| `facture` | Facture finale d'achat (ou acte de vente entre particuliers) | Obligatoire | Tous les dossiers | S1 (« facture finale ») ; S6, S7 (acte de vente, originaux) |
| `transport` | Document de transport : connaissement (BL), original ou « télex release » | Obligatoire | Dès l'expédition ; véhicule pas encore expédié : « à fournir plus tard » | S1 (connaissement, LTA, lettre de voiture) ; S6 (sans BL original ou télex, pas de retrait) |
| `besc` | Bordereau électronique de suivi des cargaisons (BESC) | Obligatoire | Arrivée par mer au port de Cotonou ; normalement demandé **avant chargement** | S3 (« toute cargaison débarquée au Port de Cotonou doit être couverte par un BESC ») |
| `ifu_importateur` | Carte IFU de l'importateur | Conditionnelle | Entreprise ; **pour un particulier : à confirmer** | S1 |
| `ifu_declarant` | IFU du déclarant (commissionnaire en douane) | Conditionnelle | Fourni par le transitaire, pas par le propriétaire | S1 |
| `colisage` | Liste de colisage | Conditionnelle | Si la facture n'est pas colisée | S1 |
| `dv` | Déclaration des éléments relatifs à la valeur (DV) | Conditionnelle | Selon le processus en vigueur, notamment en cas de relations particulières avec le vendeur | S1 |
| `justificatifs_valeur` | Documents complémentaires sur la valeur ou le classement | Conditionnelle | Si demandés | S1 |
| `declaration_export` | Déclaration d'exportation du pays de départ | À confirmer | Lorsqu'elle est exigée | Citée par la spécification MVP (documentation Bénin Control) mais absente des extraits de S1 consultés |
| `idi` | Intention d'importation (IDI) | À confirmer | Fait partie de la demande d'AVD selon Bénin Control ; application aux véhicules et rôle du transitaire à confirmer | S1, S2 |
| `carte_grise_etrangere` | Certificat d'immatriculation étranger ou titre de propriété | À confirmer | Véhicule d'occasion | S6, S7, S8 (guides) |
| `piece_identite` | Pièce d'identité du propriétaire | À confirmer | Particulier. **Ne la déposer que si votre transitaire la demande** (donnée sensible) | S6 (guide) |
| `carte_importateur` | Carte d'importateur | À confirmer | Importateur professionnel ; pour un particulier, à confirmer | S5 (guide citant la loi 90-005) |
| `mandat_transitaire` | Mandat ou procuration au commissionnaire en douane | À confirmer | Si un commissionnaire agréé intervient | S6 (recours présenté comme obligatoire) |
| `documents_obtenus` | Documents déjà obtenus : attestation de vérification (AVD), déclaration, quittance, bon à enlever | Conditionnelle | Véhicule déjà arrivé, si vous les avez. Les déposer ici **ne vaut pas confirmation officielle** | S4 (étapes du dédouanement) |
| `autre` | Autre document | — | Libre, avec un intitulé | — |

Point de vigilance affiché à part (pas une pièce) : **limite d'âge des
véhicules d'occasion**. Les sources non officielles divergent : 10 ans pour
les voitures particulières depuis février 2025 selon S8 et S9, 7 ou 8 ans
selon d'autres articles. SimDouane ne l'affirmera pas sans texte officiel.

États d'une pièce dans un dossier (spécification) : **à fournir · reçue · à
corriger · vérifiée par le transitaire · non applicable**. « Reçue » ne veut
pas dire acceptée, et « vérifiée par le transitaire » ne veut pas dire validée
par l'administration.

La checklist est **versionnée** : un dossier garde la version appliquée à sa
création. Une nouvelle version, par exemple après relecture par des
transitaires, ne modifie pas les dossiers existants sans action explicite.

### Questions à poser à des transitaires avant d'en faire des règles

1. Particulier qui importe sa propre voiture : IFU et carte d'importateur
   exigés ? À quelle étape ?
2. IDI, DV, AVD pour un véhicule d'occasion : lesquels s'appliquent, et
   lesquels le transitaire prépare-t-il lui-même ?
3. Carte grise étrangère : l'original est-il exigé ? Une copie suffit-elle
   pour préparer le dossier ?
4. Limite d'âge en vigueur et texte de référence.
5. Pièce d'identité : exigée pour qui, à quelle étape, original ou copie ?
6. BESC : qui le fournit au propriétaire (expéditeur, transitaire) et sous
   quelle forme ?
7. Mandat au commissionnaire : un modèle est-il exigé ?
8. Véhicule **neuf** : quelles pièces diffèrent (certificat de conformité…) ?

## 2. Sources consultées (2026-10-26)

**Limite importante** : depuis mon environnement, les sites officiels béninois
(`douanes.gouv.bj`, `guce.gouv.bj`, `benincontrol.com`/`.bj`) sont
**inaccessibles**, en lecture directe comme par l'outil de récupération de
pages. Les contenus ci-dessous viennent d'**extraits renvoyés par un moteur de
recherche**. Il faut les relire directement sur les sites avant validation.

| Réf. | Source | Type |
| --- | --- | --- |
| S1 | [FAQ Bénin Control](https://benincontrol.com/a-propos/faq/) (aussi [benincontrol.com/faq](https://www.benincontrol.com/faq)) : pièces de la demande d'AVD (IDI, DV, facture finale, document de transport, liste de colisage si facture non colisée, IFU importateur et déclarant, documents complémentaires) | Officielle (non propre aux véhicules ; page ancienne selon ses métadonnées) |
| S2 | [GUCE — Comment soumettre une demande d'AVD (DA)](https://guce.gouv.bj/trade-server/wp-content/uploads/2022/06/Nouvelle_Procedure_de_demande_dAVD.pdf), 2022 | Officielle |
| S3 | [Douanes — Note de service n°4021 DGDDI/DLRI (BESC)](https://douanes.gouv.bj/wp-content/uploads/2020/10/NOTE-DE-SERVICE-N°4021-DGDDI-DLRI-1.pdf) | Officielle |
| S4 | [Douanes — Dédouanement et enlèvement des marchandises au port de Cotonou](https://douanes.gouv.bj/en/professional_service/dedouanement-et-enlevement-des-marchandises-au-port-de-cotonou/) et [Manuel de procédure des recettes, Cotonou-Port](https://douanes.gouv.bj/manuel-de-procedure-des-recettes-des-douanes-cotonou-port-marchandises-et-vehicules/) | Officielle (contenu non lu directement) |
| S5 | [Guide de l'importateur et de l'exportateur](https://maritimafrica.com/wp-content/uploads/2022/10/Guide-de-limportateur-et-de-lexportateur.pdf) (carte d'importateur, loi 90-005) | Professionnelle |
| S6 | [ADTrans Logistics — Dédouaner une voiture au Bénin en 2026](https://www.adtranslogistics.com/guides/dedouanement-vehicule-benin-2026) et [Documents pour importer au Bénin](https://www.adtranslogistics.com/guides/documents-importation-benin) | Professionnelle (prestataire) |
| S7 | [AutoMag.bj — Importation de voiture : documents et étapes](https://automag.bj/2025/10/30/importation-de-voiture-au-benin-droits-de-douane-documents-et-etapes-cles/) | Article |
| S8 | [AutoMag.bj — 8 choses à savoir avant d'importer (mars 2026)](https://automag.bj/2026/03/09/8-choses-a-savoir-avant-dimporter-une-voiture-au-benin/) | Article |
| S9 | [AutoMag.bj — Importer depuis le Canada (sept. 2026)](https://automag.bj/2026/09/22/importer-une-voiture-depuis-le-canada-au-benin-conseils-pratiques/) | Article |

Désaccords relevés : le sigle « AVD » est traduit différemment selon les
guides (attestation de vérification documentaire, ou de valeur douanière) ;
limite d'âge (voir plus haut) ; mention du numéro BESC sur le connaissement.

## 3. Architecture prévue

### Données (migrations **additives** uniquement)

| Table | Rôle |
| --- | --- |
| `document_requirement_sets` | Versions de la checklist (identifiant, statut « provisoire », date). Une version publiée n'est plus modifiée |
| `document_requirements` | Pièces d'une version : code, intitulé, utilité, catégorie, condition (situation d'arrivée, neuf/occasion, particulier/entreprise), sources (titre, adresse, type, date de consultation), ordre |
| `clearance_cases.requirement_set_id` | Nouvelle colonne **facultative** : la version appliquée au dossier. Les dossiers existants la reçoivent à leur première ouverture de checklist, sans autre modification |
| `case_requirement_states` | État de chaque pièce pour un dossier (à fournir, reçue, à corriger, vérifiée, non applicable) et motif « non applicable » |
| `case_document_versions` | Chaque fichier déposé = une version **en ajout seul**. Remplacer ajoute une version, l'ancienne reste |
| `case_shares` | Partage explicite d'un dossier avec un transitaire actif : qui, par qui, quand ; retrait daté |
| `case_corrections` | Demandes de correction : pièce visée, message, auteur, état (ouverte, réponse fournie, résolue, rouverte) |
| `case_events` (existante) | Historique de tout ce qui précède, non modifiable |

Les métadonnées de fichier restent dans `stored_files` (phase 2), avec la
finalité `case_document`, distincte de `transitaire_justificatif`.

### Stockage : exclusivement le stockage privé Supabase

- Nouveau bucket **privé** `simdouane-dossiers`, réservé aux documents de
  dossiers. Les justificatifs transitaires restent dans `simdouane-private`.
  Deux buckets distincts : une erreur de clé ne peut pas mélanger les deux
  familles, et chacune pourra avoir sa propre conservation et sa propre sauvegarde.
- Accès par le seul serveur (clé `service_role`), aucune règle d'accès public,
  dépôt sans écrasement (`upsert: false`), nom de stockage généré
  (`cases/<dossier>/<uuid>`). Le nom d'origine n'est conservé que pour l'affichage.
- À l'exécution, le serveur **refuse** de recevoir un document si le stockage
  n'est pas Supabase. Le stockage sur disque local ne sert plus qu'aux tests
  automatiques, comme simulation (décision D3).
- Contrôles à chaque dépôt : type réel lu dans le contenu (PDF, JPEG, PNG ;
  l'extension et le type annoncé par le navigateur ne comptent pas),
  10 Mo maximum, empreinte SHA-256 enregistrée dans l'historique.
- Téléchargement : lien signé valable **60 secondes**, délivré seulement après
  vérification des droits, téléchargement forcé (jamais affiché comme page
  web), chaque délivrance **journalisée**. Le propriétaire voit qui a
  téléchargé ses documents.

### Qui peut faire quoi (vérifié par le serveur à chaque opération)

| Action | Propriétaire | Transitaire **avec** partage actif | Transitaire sans partage, autre utilisateur | Administrateur |
| --- | :-: | :-: | :-: | :-: |
| Voir la checklist et la liste des documents | ✅ | ✅ | ❌ 404 | ❌ 404 |
| Déposer, remplacer, marquer « non applicable » | ✅ | ❌ (D2) | ❌ | ❌ |
| Télécharger (lien 60 s) | ✅ | ✅ journalisé | ❌ | ❌ |
| Demander une correction, marquer « vérifiée » | ❌ | ✅ | ❌ | ❌ |
| Répondre à une correction (nouvelle version) | ✅ | ❌ | ❌ | ❌ |
| Partager / retirer le partage | ✅ | ❌ | ❌ | ❌ |

- Un transitaire perd l'accès **immédiatement** si le propriétaire retire le
  partage ou si l'administrateur suspend ou révoque son accès transitaire.
- L'administrateur n'a **aucune** route vers les documents de dossiers. Sa
  route de justificatifs (phase 2) ne retrouve un fichier qu'à travers une
  demande d'accès transitaire. Test prévu : lui donner l'identifiant d'un
  document de dossier ne doit rien renvoyer.

### Historique non falsifiable

- `case_events` et `case_document_versions` sont **en ajout seul** :
  modification et suppression refusées par la base, comme pour l'historique
  de la phase 3 (déjà vérifié sur `simdouane-dev`).
- Chaque dépôt et chaque remplacement inscrit la version, l'empreinte, la
  taille et le type. Un fichier remplacé dans le stockage serait détectable en
  recalculant l'empreinte.
- Les actions du transitaire sont inscrites dans la catégorie « déclaré par le
  professionnel », jamais « officiel ».

## 4. Tests prévus

| Famille | Contenu |
| --- | --- |
| Unitaires | Conditions de la checklist (situation, neuf/occasion, particulier/entreprise), détection du type réel, noms de fichiers |
| API, base réelle (PostgreSQL local), fournisseur d'identité et stockage simulés | Dépôt/remplacement/versions ; refus : faux PDF, type non autorisé, fichier trop gros, dossier d'autrui ; **téléchargement non autorisé** : autre propriétaire, transitaire sans partage, transitaire après retrait du partage, transitaire suspendu, administrateur (y compris par sa route de justificatifs), identifiant deviné, lien modifié ou expiré ; corrections ; historique non modifiable ; journalisation de chaque lien délivré |
| Base réelle `simdouane-dev` (PostgreSQL 17) | Mêmes vérifications SQL qu'en phase 3, dans une transaction **annulée** (faisable depuis mon environnement) |
| Stockage Supabase réel | Suite de tests à part, lancée seulement si les clés sont présentes : dépôt d'un PDF fictif généré, lien valable, lien expiré refusé, adresse publique refusée, accès avec la clé publique refusé, écrasement refusé, puis suppression des seuls fichiers de test. **À lancer sur votre ordinateur** (`.env`) ; je ne peux pas la lancer moi-même sans la clé `service_role`, que je ne demande pas |
| Écrans | Aperçu navigateur ordinateur et téléphone (dépôt depuis l'appareil photo du téléphone) |

Option si vous le souhaitez : autoriser `wmbcjkhakyeofznwggol.supabase.co` dans
l'accès réseau de mon environnement. Je pourrais alors lancer moi-même les
tests **négatifs** du stockage réel (adresse publique, clé publique refusées),
qui ne demandent aucun secret.

## 5. Étapes de développement (chacune vérifiée avant la suivante)

1. Migrations (tables, checklist provisoire, protections) + contrôles SQL sur
   la base réelle (transaction annulée).
2. API checklist + tests.
3. Dépôt, versions, téléchargement (stockage Supabase uniquement) + tests de
   sécurité.
4. Partage minimal avec un transitaire actif + tests d'accès.
5. Corrections et « vérifiée par le transitaire » + historique + tests.
6. Écrans (checklist dans la fiche, dépôt, corrections, partage) + aperçu.
7. Suite de tests du stockage réel, documentation, rapport détaillé.

## 6. Décisions à prendre (ma recommandation en premier)

| N° | Question | Recommandation |
| --- | --- | --- |
| D1 | Partage avec un transitaire dès la phase 4 ? | **Oui, version minimale** : le propriétaire ajoute un transitaire **dont l'accès a été activé par l'administrateur**, par son email, et peut le retirer à tout moment. Invitation avec acceptation, refus, expiration et notifications : phase 5 |
| D2 | Le transitaire peut-il déposer des documents ? | **Pas en phase 4** : il consulte, télécharge, demande des corrections, marque « vérifiée ». Dépôt par le transitaire en phase 5 |
| D3 | « Exclusivement Supabase » s'applique-t-il aussi aux justificatifs de la phase 2 ? | **Oui** : plus de stockage sur disque local en dehors des tests automatiques |
| D4 | Bucket séparé `simdouane-dossiers` (que je créerai dans `simdouane-dev`, opération non destructive) | **Oui** |
| D5 | Document déposé par erreur | **Retrait sans effacement** en phase 4 : masqué, fichier et historique conservés. Une vraie suppression dépend de la politique de conservation, à fixer avec un juriste |
| D6 | Pièce d'identité | Laisser « à confirmer », avec le conseil « ne la déposez que si votre transitaire la demande » |
| D7 | Contenu de la checklist provisoire (§1) | À valider ou corriger par vous, puis par un ou deux transitaires |

### Décisions confirmées par le porteur du projet (2026-10-26)

| N° | Décision |
| --- | --- |
| D1 | Partage minimal d'un dossier, **uniquement** avec un transitaire approuvé et activé par l'administrateur (`transitaire_status = active`, vérifié par le serveur au partage **et** à chaque accès). Un compte qui se déclare simplement transitaire ne peut jamais recevoir l'accès. Le propriétaire peut révoquer à tout moment |
| D2 | Pas de dépôt par le transitaire en phase 4 : il consulte les pièces autorisées, les télécharge, demande une correction et signale qu'une pièce a été vérifiée |
| D3 | Supabase reste le stockage des documents (privé, permissions vérifiées par le serveur) |
| D4 | Créer le bucket privé séparé `simdouane-dossiers` |
| D5 | Retrait logique d'un document déposé par erreur : **plus aucun accès** au document retiré (ni consultation, ni lien de téléchargement), fichier original et historique conservés. Pas de suppression définitive automatique avant la définition d'une politique de conservation |
| D6 | La pièce d'identité reste « à confirmer », jamais obligatoire par défaut |
| D7 | La checklist reste **provisoire** jusqu'à la vérification directe des sources officielles et la consultation d'un ou deux transitaires ; aucune pièce n'est présentée comme obligatoire sans cela |

## 7. Coûts prévisionnels avant une mise en production

Tant que l'on reste en développement avec des données fictives : **0**.

| Service | Gratuit | Payant (si nécessaire) | Remarque |
| --- | --- | --- | --- |
| Supabase | 1 Go de fichiers ; le projet se met en pause après une semaine sans activité | Pro : **25 $/mois** par organisation, 100 Go de fichiers et 250 Go de trafic sortant inclus, puis 0,0213 $/Go/mois ([facturation](https://supabase.com/docs/guides/platform/your-monthly-invoice), [stockage](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size)) | Pour de vrais documents, l'offre Pro paraît nécessaire (pas de mise en pause). Ordre de grandeur : 1 000 dossiers × 10 documents × 1 Mo ≈ 10 Go, dans le quota |
| Comptes (Supabase Auth, depuis le 2026-10-30) | Inclus : 50 000 utilisateurs actifs par mois sur l'offre gratuite, 100 000 sur Pro | — | Clerk n'est plus utilisé ; prévoir un service d'envoi d'emails (offre gratuite au départ) et un nom de domaine |
| Sauvegarde des fichiers | — | Quelques $/mois (copie vers un autre stockage) | `pg_dump` ne sauvegarde pas les fichiers : solution à choisir avant tout document réel |
| Hébergement de l'API | Selon l'hébergeur | Environ 5 à 25 $/mois (non vérifié) | À chiffrer au moment du choix de l'hébergeur |
| Avis juridique (protection des données) | — | Variable | Prérequis avant tout document réel (`SECURITE-DONNEES.md` §8) |

Ces montants seront vérifiés et repris dans le rapport final de la phase 4.
