# SimDouane Bénin — Validation du simulateur (phase S10)

Mis à jour le 12 novembre 2026.

## 1. Où en est le simulateur

**Le simulateur n'est pas validé sur le plan réglementaire.** Les écrans, le PDF et
les textes le disent : c'est une *estimation indicative*. Aucun taux n'a encore le
statut « confirmé » (texte officiel 2026 lu, ou réponse écrite d'un commissionnaire
agréé en douane — CAD — ou de la DGD).

Ce qui est vérifié, c'est le **logiciel** : les montants affichés sont bien ceux que
le moteur calcule, partout (écran, PDF, serveur), et la saisie, les conversions de
devises, les montants déjà payés et l'enregistrement fonctionnent comme prévu.

| Phase | Contenu | État |
| --- | --- | --- |
| S0 | Textes : plus d'affirmation d'officialité | Fait |
| S1 | Grille réglementaire (recherche) — `docs/GRILLE-REGLEMENTAIRE-S1.md` | Fait, **à valider par un CAD** |
| S2 | Saisie de la valeur : prix d'achat, CIF connu ou montant global | Fait |
| S3 | Convertisseur de devises (parité fixe EUR, taux BCE datés) | Fait ; taux BCE en ligne non testés depuis la session |
| S4 | Correction du moteur | **Bloqué** : attend la validation de la grille. Préparé : grille sourcée `lib/sim-engine/src/grid.ts` |
| S5 | Frais de port et annexes | **Bloqué** : aucun montant officiel trouvé. Préparé dans la même grille |
| S6 | Situation d'importation, montants déjà payés, reste à payer | Fait |
| S7 | Neuf/occasion, type de véhicule : avertissements sourcés | Fait (avertissements seulement, aucun effet sur les montants) |
| S8 | Présentation des résultats | Fait |
| S9 | PDF fidèle, recalcul et contrôle côté serveur, historique | Fait |
| S10 | Validation | Partie technique faite (ce document) ; partie réglementaire = section 4 |

## 2. Ce qui est vérifié automatiquement

Commande unique (base PostgreSQL de test nécessaire pour les tests de l'API) :

```bash
TEST_DATABASE_URL=postgres://… pnpm test     # tous les paquets
pnpm run typecheck                           # TypeScript, tout le dépôt
```

La CI (`.github/workflows/ci.yml`) lance les mêmes commandes, applique les
migrations sur une base vide et compile l'API et le site.

| Paquet | Tests | Ce qu'ils garantissent |
| --- | --- | --- |
| `lib/sim-engine` (moteur partagé) | 68 | 61 résultats de référence figés (6 cylindrées × 3 régimes × valeurs, jours, années) : le moteur ne peut pas changer sans que les tests le signalent. 7 tests de la grille : chaque taux et frais listé dans `grid.ts` est exactement celui que le moteur applique ; aucune règle absente du moteur n'y a de valeur ; le moteur est déclaré « non validé » tant qu'une entrée n'est pas confirmée. |
| `artifacts/simdouane` (site) | 68 | Saisie de la valeur (3 cas, parties manquantes), conversions et arrondis des devises, budget (situations, montants payés, reste à payer, arrondis), hypothèses et avertissements (identiques écran/PDF), avertissements véhicule S7 (neuf, âge, utilitaire), redirections, messages d'erreur de connexion. |
| `artifacts/api-server` (API) | 127 | Contrôle des simulations envoyées (types, bornes, détail ≤ 20 Ko, valeurs inconnues refusées), **totaux recalculés par le serveur** (ceux du navigateur sont ignorés), détail conservé sans propriété inconnue, quota mensuel, isolation des données entre comptes, authentification, dossiers, taux de change (cache, repli, état dégradé). |

Total : **263 tests**, tous au vert au 12/11/2026.

## 3. Vérifications dans un vrai navigateur

Faites avec Chromium (Playwright) sur une compilation de production, ordinateur
(1280 px) et téléphone (390 px), à chaque phase. Scripts conservés hors du dépôt.

- S2/S3 : les 3 cas de saisie, 8 devises + FCFA, taux daté affiché et conservé, mode dégradé si le service de change ne répond pas.
- S6 : situations « pas encore arrivé », « en mer », « au port » ; montants réels qui remplacent les estimations ; reste à payer.
- S7 (26 contrôles) : avertissements en direct (neuf → abattement annoncé non appliqué ; occasion > 10 ans tourisme / 13 ans utilitaire ; utilitaire ; électrique/hybride d'occasion), repris dans les résultats et le PDF ; **neuf et occasion donnent le même montant** ; anglais ; pas de débordement sur téléphone.
- S8 : réponse en tête, 3 catégories, détail replié, hypothèses regroupées, frais après le port signalés non inclus.
- S9 : PDF identique à l'écran (montants, hypothèses, taux), multipage sans débordement ; formulaire refusant ce que le serveur refuserait.
- Exemple de la page d'accueil = résultat réel du moteur.

## 4. Ce qui doit être validé par un CAD ou la DGD

Liste reprise de `lib/sim-engine/src/grid.ts`, qui fait foi (en cas d'écart, c'est
la grille qui compte ; mettre ce tableau à jour en même temps qu'elle).

| Élément | Appliqué par le moteur | Statut | Question |
| --- | --- | --- | --- |
| Droit de douane (DD) (`dd`) | 20 % (< 1 000 cm³), 22 %, 25 %, 28 %, 30 %, 35 % (> 2 500 cm³) | Incertain | 1 |
| Redevance statistique (RS) (`rs`) | 1 % | Ancien | 2 |
| Prélèvement communautaire CEDEAO (PC) (`pc`) | 0,5 % | Ancien | 2 |
| Prélèvement communautaire de solidarité UEMOA (PCS) (`pcs`) | 0,8 % | Ancien | 2 |
| TVA (`tva`) | 18 % | Ancien | 7 |
| Base de la TVA (`tva_base`) | CIF + DD + RS + PC + PCS | Incertain | 7 |
| Prélèvement de l'Union africaine (PS) (`ps`) | non appliqué | Ancien | 3 |
| Redevance d'aménagement urbain (RAU) (`rau`) | non appliqué | Incertain | 4 |
| Redevance informatique (SYDONIA) (`ri`) | non appliqué | Incertain | 5 |
| AIB (`aib`) | non appliqué | Incertain | 6 |
| Consignation par véhicule d'occasion (`consignation`) | non appliqué | Incertain | 9 |
| Taxe de voirie (`taxe_voirie`) | non appliqué | À vérifier | 10 |
| Valeur retenue pour un véhicule d'occasion (`valeur_reference`) | valeur saisie | Incertain | 8 |
| Abattement des véhicules neufs (`vehicule_neuf`) | non appliqué (avertissement) | Incertain | 11 |
| Âge maximal des véhicules d'occasion (`age_occasion`) | non appliqué (avertissement) | Ancien | 12 |
| Magasinage (`magasinage`) | 3 500 FCFA/jour | Sans source | 14 |
| Manutention (`manutention`) | 45 000 FCFA | Sans source | 14 |
| Contrôle Bénin (`benin_control`) | 38 000 FCFA | Sans source | 14 |
| SEGUB (`segub`) | 7 500 FCFA | Sans source | 14 |
| Frais GUCE (`frais_guce`) | 15 000 FCFA | Sans source | 14 |
| Honoraires du CAD (`frais_cad`) | 65 000 FCFA | Sans source | 14 |
| Régime « Exonération partielle » | DD × 0,6, TVA × 0,8 | Sans source | 15 |
| Régime « Enlèvement direct » | frais de port × 0,7 | Sans source | 15 |

### Fiche à faire remplir par un CAD

Les questions 1 à 13 sont celles de la grille S1 (`docs/GRILLE-REGLEMENTAIRE-S1.md`,
section 5) ; les questions 14 et 15 couvrent les frais de port et les régimes.

| # | Question | Réponse du CAD | Texte cité |
| --- | --- | --- | --- |
| 1 | Taux de DD pour une voiture de tourisme d'occasion (8703), essence, 1 500-3 000 cm³ : 20 % ou 35 % ? Le taux change-t-il selon la cylindrée, le carburant ou neuf/occasion ? | | |
| 2 | RS 1 %, PCS 0,8 %, PC 0,5 % : toujours appliqués en 2026 ? | | |
| 3 | PS (Union africaine) 0,2 % : appliqué en 2026 ? | | |
| 4 | RAU : 0,5 % de la valeur en douane ? Sur quelle base ? | | |
| 5 | Redevance informatique : 5 000 ou 10 000 FCFA par déclaration ? | | |
| 6 | AIB : dû par un particulier qui importe sa voiture ? Taux (1 % avec IFU, 5 % sans) ? Base (avec ou sans TVA) ? | | |
| 7 | Base de la TVA : quelles taxes y entrent (RS, PCS, PC, PS, RAU, RI) ? | | |
| 8 | Valeur retenue pour un véhicule d'occasion : facture, valeur de référence, Argus ? Existe-t-il un plancher ? | | |
| 9 | Consignation ou acompte de 50 000 FCFA par véhicule d'occasion : concerne-t-il les particuliers ? | | |
| 10 | Taxe de voirie ou autre taxe propre aux véhicules : existe-t-elle ? Montant ? | | |
| 11 | Véhicules neufs en 2026 : abattements (99 / 95 / 90 %) et exonération de TVA, conditions (IFU, âge, kilométrage) ? | | |
| 12 | Âge maximal d'un véhicule de tourisme d'occasion : 10 ans (décret 2000-671) toujours appliqué ? | | |
| 13 | Pouvez-vous fournir une liquidation réelle anonymisée d'un véhicule de tourisme d'occasion ? | | |
| 14 | Pour une voiture de tourisme débarquée à Cotonou en 2026 : montants actuels du magasinage (par jour, après combien de jours gratuits ?), de la manutention, de Bénin Control, du SEGUB, des frais GUCE ; fourchette habituelle de vos honoraires ? | | |
| 15 | Les régimes « Exonération partielle » (DD × 0,6, TVA × 0,8) et « Enlèvement direct » (frais de port − 30 %) proposés par SimDouane existent-ils sous cette forme ? Sinon, quels régimes un particulier peut-il réellement demander ? | | |

## 5. Quand les réponses arrivent : procédure

1. Mettre à jour l'entrée de `grid.ts` : valeur trouvée, `status: "confirmed"`,
   `source` = lien du texte officiel ou « Réponse écrite de <CAD>, <date> » (la
   réponse écrite est conservée hors du dépôt). Ne jamais confirmer sur une
   supposition.
2. Modifier `lib/sim-engine/src/calculator.ts` **seulement** pour les entrées
   confirmées, en gardant l'ancien calcul disponible : les simulations déjà
   enregistrées portent `calculatorVersion: "historical"` et doivent rester
   lisibles avec leurs montants d'origine.
3. Mettre à jour volontairement les résultats de référence
   (`lib/sim-engine/test/golden.ts`) et les tests de la grille : un écart non
   expliqué est une erreur.
4. Le serveur et le site utilisent le même moteur : rien d'autre à recopier.
   Vérifier l'exemple de la page d'accueil (calculé par le moteur) et les textes
   d'aide qui citent des montants (`translations.ts`, guide).
5. Retirer la mention « estimation indicative » uniquement quand
   `engineReadiness().validated` vaut `true` — et après accord explicite.

## 6. Recette avant chaque mise en ligne

1. `pnpm run typecheck` et `pnpm test` au vert (section 2).
2. Sur le site en ligne : une simulation en FCFA (5 000 000, 1 600-2 000 cm³,
   10 jours, droit commun) doit afficher **7 893 200 FCFA** ; la même en EUR doit
   afficher le taux 655,957 (parité fixe).
3. Une simulation en USD : le taux BCE daté doit s'afficher (sinon, message de
   service de change indisponible — à signaler).
4. Connecté : enregistrer une simulation, la retrouver dans la liste avec le même
   total.
5. Télécharger le PDF : même total, mêmes hypothèses que l'écran.
6. Sur téléphone : aucune page ne dépasse en largeur.

## 7. Limites connues

- Les sites officiels béninois et la BCE ne sont pas joignables depuis la session
  de développement : les taux BCE réels et le site en ligne n'ont pas pu y être
  testés ; la recette de la section 6 doit être faite sur le site.
- Les fichiers PDF utilisent la police standard (jeu de caractères Windows-1252) :
  les caractères hors de ce jeu sont remplacés.
- Les avertissements de la phase S7 reposent sur des textes anciens ou non lus en
  entier ; ils préviennent, ils ne bloquent rien.
