# SimDouane Bénin — Phase S1 : grille réglementaire à valider

Date : 31 octobre 2026. Phase S1 de la feuille de route du simulateur.
**Recherche uniquement : aucun fichier du projet, aucune formule et aucune donnée n'a été modifié.**

---

## 0. À lire d'abord

1. **Aucune règle n'atteint le statut « confirmé ».** Pour être confirmée, une règle doit être lue dans le texte officiel en vigueur en 2026 (loi de finances 2026, tarif douanier, décret). Je n'ai pu lire aucun texte en entier : les sites officiels béninois (`douanes.gouv.bj`, `finances.bj`, `impots.bj`, `budgetbenin.bj`, `sgg.gouv.bj`) sont bloqués par les réglages réseau de cette session. Tout ce qui suit vient des **extraits** fournis par le moteur de recherche.
2. **La grille ne doit pas être programmée telle quelle.** Elle sert de base de discussion avec un commissionnaire agréé en douane (CAD) ou avec la DGD. La fiche de validation de la section 5 est prévue pour cela.
3. **Le point le plus incertain est le droit de douane.** Les voitures de tourisme sont souvent à 20 %, mais une source institutionnelle (tralac) indique que la bande à 35 % du TEC contient aussi des véhicules neufs et d'occasion. Le taux dépend donc de la **ligne tarifaire exacte** (sous-position 8703 à 10 chiffres), à faire confirmer.

### Statuts utilisés

| Statut | Signification |
| --- | --- |
| **Confirmé** | Texte officiel en vigueur lu et daté. *(Aucune règle à ce stade.)* |
| **Ancien** | Source officielle ou institutionnelle, mais datée ; le maintien en 2026 n'est pas vérifié. |
| **Incertain** | Sources qui se contredisent, ou extrait officiel incomplet. |
| **À vérifier** | Aucune source suffisante. |

---

## 1. Grille de synthèse

« Moteur actuel » = `calculator.ts`, inchangé depuis l'audit. VD = valeur en douane (CAF/CIF).

| # | Élément | Taux ou règle trouvés | Meilleure source | Date | Statut | Effet sur le calcul |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Droit de douane (DD), voitures de tourisme, position 8703** | 20 % (catégorie 3 du TEC) le plus souvent cité ; **35 % possible pour certaines lignes** (5ᵉ bande du TEC) | Brochure DGD Bénin (DD 20 %) ; GUCE Côte d'Ivoire, même TEC (20 sur des lignes 8703) ; tralac (la bande à 35 % contient des véhicules neufs et d'occasion) | ~2020 ; 2019 ; 2026 (portail ivoirien) | **Incertain** | Le moteur applique 20 à 35 % selon 6 tranches de cylindrée inventées. Le vrai taux dépend de la ligne tarifaire. |
| 2 | **Différences selon la cylindrée** | La nomenclature 8703 découpe par moteur (essence, diesel, hybride, électrique) et par cylindrée (≤ 1 000, 1 000-1 500, 1 500-3 000, > 3 000 cm³…), mais **aucune source ne montre un taux différent par tranche** | GUCE Côte d'Ivoire ; nomenclature SH 2022 appliquée au TEC (circulaire des douanes ivoiriennes du 31/07/2023) | 2023-2026 | **Incertain** | Les tranches du moteur (1 300, 1 600, 2 000, 2 500 cm³) ne correspondent même pas à celles de la nomenclature. |
| 3 | **Redevance statistique (RS)** | 1 % de la VD | Système fiscal de référence 2021 (DGI Bénin) ; brochure DGD ; CCI Bénin 2024 | 2021-2024 | **Ancien**, sources concordantes | Déjà à 1 % dans le moteur. |
| 4 | **Prélèvement communautaire CEDEAO (PC)** | 0,5 % de la VD | Brochure DGD ; loi de finances 2024 (le PC reste dû même en cas d'exonération) | ~2020 ; 2024 | **Ancien**, concordant | Déjà à 0,5 % dans le moteur. |
| 5 | **Prélèvement communautaire de solidarité UEMOA (PCS)** | 0,8 % de la VD (ramené de 1 % le 01/07/2017, maintenu à 0,8 % depuis le 01/01/2019) | Système fiscal de référence 2021 ; brochure DGD ; loi de finances 2024 ; décisions des chefs d'État de l'UEMOA (presse) | 2017-2024 | **Ancien**, concordant | Déjà à 0,8 % dans le moteur (libellé corrigé en S0). |
| 6 | **Prélèvement de l'Union africaine (PS)** | 0,2 % de la VD, sans seuil, sur les produits hors UA | Système fiscal de référence 2021 (« Prélèvement de l'Union Africaine (PS) 0,20 % ») ; brochure DGD ; décision de l'UA (2016-2017) | 2021 | **Ancien** | **Absent du moteur.** |
| 7 | **Redevance d'aménagement urbain (RAU)** | 0,5 % de la VD, instituée au 01/01/2020. **Un extrait de la loi de finances 2020 indique pourtant « 1 % ou 3 % de la VD majorée des droits et taxes »** (peut-être une confusion avec l'AIB) | Brochure DGD (0,5 %) ; loi de finances 2020 (extrait contradictoire) | 2020 | **Incertain** | **Absente du moteur.** |
| 8 | **Redevance informatique (RI)** | Forfait par déclaration : **10 000 FCFA** (brochure DGD, OMC) **ou 5 000 FCFA** (CCI Bénin 2024) ; anciennement 2 000 FCFA | Brochure DGD ; examen OMC ; CCI Bénin | ~2017-2024 | **Incertain** | **Absente du moteur.** Faible effet (5 000 à 10 000 FCFA). |
| 9 | **AIB (acompte sur impôt assis sur les bénéfices)** | **1 %** si l'importateur a un IFU, **5 %** sinon (ou si son IFU est désactivé, mesure de septembre 2026), sur la VD majorée des droits et taxes ; imputable sur l'impôt dû | Site de la DGI (« retenue de 5 % sur les importations des entreprises non immatriculées à l'IFU ») ; CGI art. 132 et 135 (cités par la presse et la CCI) | 2024-2026 | **Incertain** pour un particulier | **Absent du moteur.** De 61 500 à 307 500 FCFA pour un CIF de 5 M. On ne sait pas si un particulier qui importe sa voiture y est soumis, ni à quel taux. |
| 10 | **TVA et sa base** | 18 % ; base = VD **augmentée des droits et taxes de toute nature, hors TVA** | CGI 2010 (version archivée) ; trade.gov ; brochure DGD | 2010 (texte) | **Ancien** (taux sûr, base à confirmer dans le CGI 2022/2024) | Le moteur prend VD + DD + RS + PC + PCS. Il faudrait ajouter PS et RAU (et peut-être RI) si ce sont des « taxes de toute nature ». |
| 11 | **Exonérations et réductions** | (a) Véhicules neufs : exonération de DD et de TVA depuis 2022, reconduite chaque année (voir ligne 12). (b) Réductions de 75 % ou 60 % des droits pour certains véhicules d'entreprises agréées (code des investissements), sauf taxe de voirie. (c) Consignation ou acompte forfaitaire de **50 000 FCFA par véhicule d'occasion** importé (hors transit Burkina/Niger), libératoire pour l'importateur revendeur. | (a) MEF 2022, loi de finances 2024 ; (b) et (c) examen OMC WT/TPR/S/362 (2017), CCI Bénin 2024 | 2017-2024 | (a) **Ancien** ; (b) et (c) **Incertain** | Les régimes du moteur (« Exonération partielle » DD × 0,6 et TVA × 0,8, « Enlèvement direct » port − 30 %) ne correspondent à **aucune** de ces mesures. (c) concerne surtout les revendeurs : à confirmer pour un particulier. |
| 12 | **Véhicules neufs, électriques, hybrides** | **Loi de finances 2024** (texte officiel de la DGI) : abattement sur la valeur en douane de **99 %** (électrique), **95 %** (hybride), **90 %** (autres véhicules neufs), sous condition d'immatriculation du propriétaire à l'IFU. **2026** (loi n° 2025-22 du 8/12/2025) : exonération de TVA des véhicules neufs à quatre roues du 01/01 au 31/12/2026 et reconduction des avantages (presse) ; motos électriques et hybrides exonérées de DD et de TVA. | Loi de finances 2024 (api.impots.bj) ; Assemblée nationale (adoption de la LF 2026) ; presse béninoise | 2024 ; 2026 | 2024 : **Ancien** ; 2026 : **Incertain** (article non lu) | Le moteur n'applique rien et ne propose pas « neuf » à l'écran. Pour un véhicule neuf, il surestime très fortement le coût. |
| 13 | **Âge des véhicules d'occasion** | **Décret n° 2000-671 du 29/12/2000** : importation autorisée si l'âge ne dépasse pas **10 ans** (véhicules de tourisme) ou **13 ans** (autres catégories). La presse 2025 cite 7, 8 ou 10 ans sans texte. | Décret 2000-671 (site du Secrétariat général du gouvernement, sgg.gouv.bj) | 2000 | **Ancien** (modification éventuelle non vérifiée) | Le moteur ne bloque rien et n'avertit pas. Un véhicule de 2008, soit 18 ans en 2026, serait interdit si le décret s'applique toujours. |

### Points supplémentaires trouvés pendant la recherche (hors liste initiale)

| Élément | Ce que disent les sources | Statut | Effet |
| --- | --- | --- | --- |
| **Valeur des véhicules d'occasion** | Selon l'OMC (2017), « un système de valeur plancher est en vigueur pour les véhicules d'occasion ». Selon les guides, la douane retient une valeur de référence (marque, modèle, année) plutôt que la facture. Une note circulaire (vers 2021) distingue le neuf non accidenté (valeur transactionnelle) de l'occasion. | **Incertain** | Essentiel pour la phase S2 : la base taxable d'une occasion peut être une valeur de référence, et non le prix saisi. |
| **Taxe de voirie** | Citée par l'OMC (2017) comme exclue des réductions ; un guide la présente comme un forfait variable. Aucun montant trouvé. | **À vérifier** | Peut-être une taxe supplémentaire sur les véhicules. |

---

## 2. Ordre de calcul probable (hypothèse à valider, non programmée)

```
VD (valeur en douane, CAF)          ← prix + fret + assurance, ou valeur de référence pour l'occasion (à confirmer)
DD   = VD × taux de la ligne 8703   ← 20 % ou 35 % (à confirmer)
RS   = VD × 1 %
PCS  = VD × 0,8 %
PC   = VD × 0,5 %
PS   = VD × 0,2 %
RAU  = VD × 0,5 %                    (à confirmer)
RI   = forfait (5 000 ou 10 000 FCFA, à confirmer)
Base TVA = VD + DD + RS + PCS + PC + PS + RAU (+ RI ?)
TVA  = Base TVA × 18 %
AIB  = (VD + droits et taxes, avec ou sans TVA ?) × 1 % ou 5 %   (assujettissement d'un particulier à confirmer)
Exonérations : véhicules neufs (abattements et TVA), selon le texte 2026
Interdiction éventuelle : âge > 10 ans (véhicule de tourisme d'occasion)
```

### Ordre de grandeur (CIF de 5 000 000 FCFA, véhicule d'occasion, 1 600-2 000 cm³)

Calculs faits hors du projet. **Hypothèses non validées**, présentées uniquement pour mesurer l'enjeu. RI est exclue de la base TVA.

| Hypothèse | DD | Autres prélèvements (RS + PCS + PC + PS + RAU) | RI | TVA | AIB | **Total droits et taxes** |
| --- | --- | --- | --- | --- | --- | --- |
| **Moteur actuel** (DD 28 %, sans PS, RAU, RI, AIB) | 1 400 000 | 115 000 (RS + PCS + PC) | — | 1 172 700 | — | **2 687 700** |
| DD 20 %, RI 10 000, AIB 1 % hors TVA | 1 000 000 | 150 000 | 10 000 | 1 107 000 | 61 500 | **2 328 500** (−359 200) |
| DD 20 %, RI 5 000, AIB 1 % | 1 000 000 | 150 000 | 5 000 | 1 107 000 | 61 500 | **2 323 500** |
| DD 20 %, AIB 1 % calculé avec la TVA | 1 000 000 | 150 000 | 10 000 | 1 107 000 | 72 570 | **2 339 570** |
| DD 20 %, AIB 5 % (sans IFU) | 1 000 000 | 150 000 | 10 000 | 1 107 000 | 307 500 | **2 574 500** |
| **DD 35 %**, AIB 1 % | 1 750 000 | 150 000 | 10 000 | 1 242 000 | 69 000 | **3 221 000** (+533 300) |

**Lecture** : selon le taux réel du DD (20 % ou 35 %), le total varie d'environ 900 000 FCFA pour ce seul véhicule. C'est la première question à faire trancher par un CAD.

---

## 3. Ce que la phase S4 (moteur) ne doit pas faire sans validation

- Remplacer les 6 taux par cylindrée par 20 % uniforme, tant que la ligne tarifaire n'est pas confirmée (le 35 % est possible).
- Appliquer l'AIB à un particulier, ou choisir entre 1 % et 5 %.
- Appliquer les abattements « véhicule neuf » de 2024 en 2026 sans le texte de la loi n° 2025-22.
- Bloquer un véhicule de plus de 10 ans sur la seule base du décret de 2000, sans confirmation qu'il est toujours appliqué.
- Inventer une valeur de référence pour les véhicules d'occasion.

---

## 4. Ce qui débloquerait la validation

1. **Autoriser** dans les réglages réseau de la session les domaines `douanes.gouv.bj`, `impots.bj` (et `api.impots.bj`), `budgetbenin.bj`, `finances.bj`, `sgg.gouv.bj`, `assemblee-nationale.bj`. Je pourrais alors lire en entier la brochure DGD, le CGI 2024, la loi de finances 2026, le décret 2000-671 et le système fiscal de référence 2021.
2. **Faire remplir la fiche de la section 5** par un CAD, idéalement avec une **liquidation réelle anonymisée** d'un véhicule de tourisme d'occasion récent (le document de paiement émis par la douane). Une seule liquidation suffit à confirmer la liste des taxes, leur base et leur ordre.

---

## 5. Fiche de validation à faire remplir par un commissionnaire agréé (CAD)

| # | Question | Réponse du CAD | Texte de référence cité par le CAD |
| --- | --- | --- | --- |
| 1 | Taux de DD pour une voiture de tourisme d'occasion (8703), essence, 1 500-3 000 cm³ : 20 % ou 35 % ? Le taux change-t-il selon la cylindrée, le carburant ou neuf/occasion ? | | |
| 2 | RS 1 %, PCS 0,8 %, PC 0,5 % : toujours appliqués en 2026 ? | | |
| 3 | PS (Union africaine) 0,2 % : appliqué en 2026 ? | | |
| 4 | RAU : 0,5 % de la valeur en douane ? Sur quelle base ? | | |
| 5 | Redevance informatique : 5 000 ou 10 000 FCFA par déclaration ? | | |
| 6 | AIB : dû par un **particulier** qui importe sa voiture ? Taux (1 % avec IFU, 5 % sans) ? Base (avec ou sans TVA) ? | | |
| 7 | Base de la TVA : quelles taxes y entrent (RS, PCS, PC, PS, RAU, RI) ? | | |
| 8 | Valeur retenue pour un véhicule d'occasion : facture, valeur de référence (barème DGD), Argus ? Existe-t-il un plancher ? | | |
| 9 | Consignation ou acompte de 50 000 FCFA par véhicule d'occasion : concerne-t-il les particuliers ? | | |
| 10 | Taxe de voirie ou autre taxe propre aux véhicules : existe-t-elle ? Montant ? | | |
| 11 | Véhicules neufs en 2026 : abattements (99 / 95 / 90 %) et exonération de TVA, conditions (IFU, âge, kilométrage) ? | | |
| 12 | Âge maximal d'un véhicule de tourisme d'occasion : 10 ans (décret 2000-671) toujours appliqué ? | | |
| 13 | Pouvez-vous fournir une liquidation réelle anonymisée d'un véhicule de tourisme d'occasion ? | | |

---

## 6. Sources (consultées via le moteur de recherche)

**Officielles ou institutionnelles, Bénin**
- Brochure de la Direction générale des Douanes (vers 2020) : https://douanes.gouv.bj/storage/2020/10/brochure-douane2-mobile.pdf
- Système fiscal de référence du Bénin 2021 (DGI) : https://api.impots.bj/media/6172b9cbdbb2e_SYSTEME%20FISCAL%20DE%20R%C3%89F%C3%89RENCE%20BENIN-2021.pdf
- Loi de finances 2024 (DGI) : https://api.impots.bj/media/658ab89e86597_B%C3%A9nin-Loi%20de%20finances%202024.pdf
- Code général des impôts 2024 (DGI) : https://api.impots.bj/media/65d5ae32a155a_B%C3%A9nin-Code%20G%C3%A9n%C3%A9ral%20des%20Imp%C3%B4ts%202024.pdf
- Code général des impôts 2010 (archive, base de la TVA à l'importation) : https://benin.eregulations.org/media/code_general_des_impots_2010.pdf
- Échéances fiscales (DGI, retenue AIB de 5 %) : https://www.impots.finances.gouv.bj/les-echeances-fiscales/
- Loi n° 2014-20 portant code des douanes : https://douanes.gouv.bj/storage/2020/09/CODE-DES-DOUANES-BENINOISES.pdf
- Décret n° 2000-671 du 29 décembre 2000 (âge des véhicules d'occasion) : https://sgg.gouv.bj/doc/decret-2000-671/download
- Loi de finances 2026, adoption (Assemblée nationale) : https://assemblee-nationale.bj/index.php/2025/12/04/assemblee-nationale-la-loi-de-finances-gestion-2026-adoptee-a-lunanimite-des-deputes/
- Loi de finances 2026, texte : https://budgetbenin.bj/loi-de-finances-gestion-2026/
- Ministère de l'Économie et des Finances, véhicules neufs (2022) : https://finances.bj/benin-lacquisition-de-voitures-neuves-desormais-exoneree-de-droits-de-douane-et-de-la-tva/
- CCI Bénin, fiche fiscale (avril 2024) : https://cci.bj/admin1/public/upload/publications/file_ebdd7fe9cb159002483fe93a16453b53.pdf
- CCI Bénin, plateforme des propositions fiscales (mars 2024, AIB 1 % art. 132 CGI) : https://cci.bj/admin1/public/upload/publications/file_cfd10560f3e860649d869a3a5d29dbeb.pdf

**Régionales et internationales**
- OMC, examen des politiques commerciales, annexe Bénin (WT/TPR/S/362, 2017) : https://www.wto.org/french/tratop_f/tpr_f/s362-01_f.pdf
- GUCE Côte d'Ivoire, tarif 8703 (même TEC) : https://guce.gouv.ci/customs/tariff/searchByTariffKeywords?tariff=8703
- Douanes ivoiriennes, application du TEC sur la base du SH 2022 : https://www.douanes.ci/node/42571
- Union africaine, FAQ sur le prélèvement de 0,2 % : https://au.int/sites/default/files/pages/31953-file-faq_fr.pdf
- tralac, profils tarifaires Bénin (2019) et Niger (2019), bande à 35 % : https://www.tralac.org/documents/publications/trade-data-analysis/3042-benin-intra-africa-trade-and-tariff-profile-november-2019/file.html ; https://www.tralac.org/documents/publications/trade-data-analysis/3067-niger-intra-africa-trade-and-tariff-profile-december-2019/file.html
- trade.gov, Benin import tariffs : https://www.trade.gov/country-commercial-guides/benin-import-tariffs

**Presse et guides (jamais utilisés comme règle officielle)**
- PCS à 0,8 % (Sidwaya) : https://www.sidwaya.info/uemoa-l-le-taux-du-prelevement-communautaire-de-solidarite-maintenu-a-08/
- Motos électriques et hybrides 2026 (cadreco.media) : https://cadreco.media/politique-economique/2025/loi-de-finances-2026-le-benin-exonere-les-motocyclettes-electriques-et-hybrides-de-droits-de-douane-et-de-tva-des-2026
- Mesures 2026 (Prime News Monde) : https://www.primenewsmonde.bj/2026/01/28/vulgarisation-de-la-loi-des-finances-gestion-2026-a-abomey-les-innovations-et-avantages-exposees-aux-operateurs-economiques/
- AIB à 5 % (La Nouvelle Tribune, sept. 2026) : https://lanouvelletribune.info/2026/09/benin-aib-de-5-ce-qui-change-selon-le-dgi-maxime-mensah-akakpo-djihountry/
- Dédouanement des véhicules neufs (Bénin Web TV, La Marina) : https://beninwebtv.com/dedouanement-des-vehicules-importes-le-benin-fixe-de-nouvelles-dispositions/ ; https://lamarinabj.com/index.php/2024/08/14/benin-de-nouvelles-regles-pour-le-dedouanement-des-vehicules-neufs/
- Guides commerciaux (chiffres contradictoires) : automag.bj, carisowo.com, simplifi-bj.com, adtranslogistics.com
