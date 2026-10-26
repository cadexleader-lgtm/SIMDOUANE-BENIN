# SimDouane Bénin — Spécification du MVP « dossier véhicule »

Document de référence avant développement. Il condense la spécification
fonctionnelle validée par le porteur du projet et les décisions prises en
conversation. Le plan d'exécution et l'audit sont dans
[`MVP-PHASE0.md`](MVP-PHASE0.md).

## Positionnement

SimDouane devient un **assistant numérique de préparation et de suivi** des
formalités de dédouanement d'un véhicule, avec un dossier unique partagé entre
le propriétaire et son transitaire. Il **ne remplace pas** les systèmes
officiels (Douanes, GUCE, Bénin Control) et n'annonce jamais une démarche
officielle comme accomplie sans preuve.

Parcours cible : créer un dossier → réunir les pièces → inviter un transitaire
→ corriger les pièces → suivre la prochaine action.

## Décisions validées

| Sujet | Décision |
| --- | --- |
| Moment de création du dossier | **Les deux** : avant l'arrivée (parcours A) et véhicule déjà au port (parcours B), même dossier |
| Importateurs couverts | Particuliers **et** entreprises dès le MVP |
| Démarche déjà faite | Jamais imposé de la recommencer : une étape peut être déclarée « déjà réalisée », avec justificatif si disponible |
| Simulateur actuel | Module préservé ; formules inchangées |
| Statuts | Trois catégories séparées (voir plus bas) |
| Représentant local | **En attente de validation** (proposition détaillée en conversation) |

## Les 8 fonctionnalités du MVP

| # | Fonctionnalité | Priorité |
| --- | --- | --- |
| 1 | Comptes et rôles : propriétaire, transitaire, administrateur | P0 |
| 2 | Création du dossier véhicule (parcours A et B), brouillon repris plus tard | P0 |
| 3 | Checklist documentaire : pièces requises, conditionnelles, à confirmer | P0 |
| 4 | Téléversement sécurisé : stockage privé, classement, téléchargement autorisé | P0 |
| 5 | Invitation du transitaire, limitée au dossier partagé, révocable | P0 |
| 6 | Suivi des étapes : statut, date, responsable, prochaine action, historique | P0 |
| 7 | Demandes de correction liées à une pièce ou une information | P0 |
| 8 | Export du récapitulatif PDF (mention « non officiel ») | P1 |

**Hors MVP** : soumission au GUCE ou aux Douanes, paiement des droits,
connexions automatiques aux systèmes externes, lecture automatique des
documents par IA, notifications WhatsApp automatisées, gestion commerciale du
transitaire.

## Parcours

**A — Véhicule pas encore arrivé.** Créer le dossier (« pas encore arrivé » ou
« en transit ») → informations véhicule et importation → checklist → déposer
les pièces disponibles, repérer les manquantes → inviter le transitaire.

**B — Véhicule déjà arrivé.** Créer le dossier (« déjà arrivé ») → date
d'arrivée, références de transport et références existantes si connues →
indiquer les formalités déjà réalisées → déposer les documents obtenus,
signaler les blocages → définir la prochaine action et son responsable.

Champs obligatoires réduits au minimum pour créer le dossier ; le reste peut
rester vide jusqu'à son obtention. Référence interne unique : `SDB-AAAA-NNNNNN`.

## Rôles

| Rôle | Peut |
| --- | --- |
| Propriétaire (particulier ou entreprise) | Créer ses dossiers, compléter, déposer, inviter/révoquer un transitaire, répondre aux corrections, exporter |
| Transitaire / CAD | Voir **uniquement** les dossiers partagés avec lui (ou son organisation), examiner, demander des corrections, commenter, mettre à jour le suivi selon ses droits |
| Administrateur SimDouane | Gérer comptes, paramètres et checklist ; **pas d'accès libre** aux documents privés ; actions sensibles journalisées |
| Partenaire administratif | Plus tard, seulement dans le cadre d'un partenariat réel |

Un simple compte utilisateur ne reçoit jamais les droits réservés à un CAD.

## Checklist documentaire

Chaque exigence porte : nom, utilité, catégorie (**requise / conditionnelle /
à confirmer**), condition d'application, source et date de vérification.
Les règles sont **configurables et versionnées** : un dossier garde la version
de règles qui lui a été appliquée.

États d'une pièce : à fournir · reçue · à corriger · vérifiée par le
transitaire · non applicable. « Reçue » ≠ acceptée ; « vérifiée par le
transitaire » ≠ validée par l'administration.

Pièces de départ citées par la documentation de Bénin Control (à confirmer
pour les véhicules, **jamais codées comme universelles**) : facture finale ;
document de transport (connaissement, LTA, lettre de voiture) ; déclaration des
éléments relatifs à la valeur (DV) ; intention d'importation (IDI) selon le
processus en vigueur ; liste de colisage si requise ; IFU de l'importateur ;
IFU du déclarant selon les exigences ; justificatifs de valeur ou de
classement ; déclaration d'exportation lorsqu'elle est exigée.
Les documents d'immatriculation relèvent d'une autre procédure.

## Statuts

**Trois catégories, toujours affichées séparément**, chacune avec source, date,
preuve éventuelle et action suivante :

1. **Statut SimDouane** — ce que l'utilisateur a fait dans la plateforme.
2. **Déclaré par le professionnel** — ce que le transitaire dit avoir réalisé.
3. **Officiel confirmé** — appuyé par un justificatif officiel (ou une
   intégration autorisée, plus tard). Interdit sans preuve.

Statuts internes du dossier : Brouillon · Préparation des documents ·
À compléter · À vérifier par le transitaire · Corrections demandées ·
Prêt pour la démarche officielle · Démarche externe en cours · En attente
d'un complément externe · Étape externe confirmée · Sortie du véhicule
déclarée · Clôturé.

Étapes externes suivies (statuts inspirés des procédures publiées, saisis par
les intervenants) : déclaration anticipée / AVD si applicables ; autorisations
ou certificats selon le dossier ; déclaration détaillée, contrôle, liquidation
(montants officiels **séparés** des estimations SimDouane) ; paiements et
enlèvement (paiement jamais « confirmé » sur simple déclaration si une preuve
est nécessaire).

Chaque changement enregistre : ancien statut, nouveau statut, auteur,
horodatage. Rien n'est effacé.

## Demandes de correction

Liée au dossier et, si possible, à la pièce ; motif, responsable, dates,
commentaires, pièces jointes. États : ouverte · en cours · réponse fournie ·
résolue (le transitaire peut rouvrir).

## Récapitulatif PDF

Référence, date de génération, véhicule et propriétaire (selon les droits),
situation d'arrivée, pièces et états, historique synthétique, corrections,
responsable et prochaine action, mention « récapitulatif SimDouane, ne
constitue pas une validation officielle ». Les fichiers originaux ne sont pas
intégrés.

## Sécurité

Fichiers privés par défaut, liens temporaires, contrôle des droits côté
serveur, formats et tailles limités, noms de fichiers sûrs, versions conservées,
journal des actions sensibles, sauvegarde et restauration testées avant tout
document réel. Aucun secret dans le dépôt ni dans le frontend.

## Sources officielles de départ

- [Manuel de procédure des recettes des Douanes Cotonou-Port](https://douanes.gouv.bj/manuel-de-procedure-des-recettes-des-douanes-cotonou-port-marchandises-et-vehicules/)
- [Dédouanement et enlèvement des marchandises au port de Cotonou](https://douanes.gouv.bj/professional_service/dedouanement-et-enlevement-des-marchandises-au-port-de-cotonou/)
- [FAQ Bénin Control](https://benincontrol.bj/dev/a-propos/faq/)

Ces exigences doivent être confirmées auprès des organismes concernés et de
transitaires agréés avant d'être transformées en règles automatiques.
