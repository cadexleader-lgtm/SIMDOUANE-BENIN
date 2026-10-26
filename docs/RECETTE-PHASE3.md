# Recette de la phase 3 avec le vrai Clerk et Supabase `simdouane-dev`

Procédure à suivre **sur votre ordinateur**. Vous configurez vous-même les
secrets dans un fichier `.env` local : ne les envoyez à personne, ni dans une
conversation, ni sur GitHub. Comptes et données **fictifs uniquement**.

Durée : environ 45 minutes la première fois.

Chaque étape porte un numéro (R1, R2…). À la fin, notez pour chacune ✅ ou ❌
(avec le message exact et une capture d'écran en cas de ❌) : c'est ce
compte rendu, **sans aucun secret**, qu'il faut me transmettre.

---

## 0. Ce qu'il faut sur l'ordinateur

- Node.js 22 (`node -v` → `v22.…`), pnpm 10 (`corepack enable` puis
  `corepack prepare pnpm@10.26.1 --activate`), Git.
- Le dépôt sur la branche `mvp/dossiers` :
  ```sh
  git clone https://github.com/cadexleader-lgtm/SIMDOUANE-BENIN.git   # si ce n'est pas déjà fait
  cd SIMDOUANE-BENIN
  git fetch origin
  git checkout mvp/dossiers
  git pull origin mvp/dossiers
  pnpm install
  ```
- Deux fenêtres de navigateur **séparées** : une fenêtre normale (compte A) et
  une fenêtre de **navigation privée** ou un autre navigateur (compte B).
  Deux onglets d'une même fenêtre partagent la même session : cela ne suffit pas.

## 1. Clerk : application de développement

1. Sur [dashboard.clerk.com](https://dashboard.clerk.com), créez une
   application, par exemple « SimDouane dev ». Option de connexion :
   **Email** (laissez le mot de passe activé). C'est une instance de
   **développement** (clés `pk_test_…` / `sk_test_…`) : `localhost` y est
   autorisé sans autre réglage.
2. Vérifiez dans les réglages *Email* que l'inscription par email et la
   vérification de l'email à l'inscription sont activées (réglage par défaut).
3. Page **API keys** : gardez sous la main la *Publishable key* (`pk_test_…`)
   et la *Secret key* (`sk_test_…`).

**Comptes de test sans vraie boîte mail** : en développement, Clerk accepte
les adresses contenant `+clerk_test` sans envoyer d'email ; le code de
vérification est toujours **424242**. La recette utilise :

| Compte | Adresse |
| --- | --- |
| A (propriétaire) | `proprietaire-a+clerk_test@example.com` |
| B (autre propriétaire) | `proprietaire-b+clerk_test@example.com` |
| Admin (facultatif, R15-R16) | `admin-recette+clerk_test@example.com` |

> Si vous supprimez un compte dans Clerk puis le recréez avec **la même
> adresse**, SimDouane refusera la connexion (« Un compte SimDouane existe
> déjà avec cette adresse… ») : c'est voulu, aucun compte n'est rattaché
> automatiquement. Utilisez alors une nouvelle adresse (`proprietaire-a2+clerk_test@example.com`).

## 2. Supabase `simdouane-dev` : connexion à la base

Dans le tableau de bord Supabase, projet **simdouane-dev** :

1. **Mot de passe de la base** : *Project Settings → Database → Reset database
   password* si vous ne l'avez pas noté. Préférez un mot de passe fait de
   lettres et de chiffres : les caractères `@ : / ? # %` devraient sinon être
   encodés dans l'adresse de connexion.
2. **Adresse de connexion** : bouton **Connect** (en haut) → *Connection
   string* → **Session pooler** (port 5432). Elle a la forme
   `postgresql://postgres.wmbcjkhakyeofznwggol:[YOUR-PASSWORD]@aws-…-eu-west-3.pooler.supabase.com:5432/postgres`.
   N'utilisez pas *Direct connection* (`db.wmbcjkhakyeofznwggol.supabase.co`) :
   elle ne fonctionne qu'en IPv6 sur l'offre gratuite.
3. **Certificat** : *Project Settings → Database → SSL Configuration →
   Download certificate*. Enregistrez-le **hors du dépôt**, par exemple
   `C:\secrets\simdouane-dev-ca.crt` ou `~/secrets/simdouane-dev-ca.crt`.
4. **Stockage** (prépare la phase 4, qui n'utilisera que le stockage privé
   Supabase) : *Project Settings → API Keys* → clé **`service_role`**
   (secrète, serveur uniquement).

## 3. Le fichier `.env` (à la racine du dépôt, jamais committé)

```sh
cp .env.example .env        # Windows : copy .env.example .env
```

Remplissez **uniquement** ces lignes (laissez les autres telles quelles) :

```ini
DATABASE_URL=postgresql://postgres.wmbcjkhakyeofznwggol:VOTRE_MOT_DE_PASSE@aws-…-eu-west-3.pooler.supabase.com:5432/postgres
DATABASE_SSL_CA_FILE=/chemin/complet/vers/simdouane-dev-ca.crt

CLERK_SECRET_KEY=sk_test_…
CLERK_PUBLISHABLE_KEY=pk_test_…
VITE_CLERK_PUBLISHABLE_KEY=pk_test_…          # la même que la ligne au-dessus
VITE_CLERK_PROXY_URL=

ADMIN_EMAILS=admin-recette+clerk_test@example.com
VITE_ADMIN_EMAILS=admin-recette+clerk_test@example.com

STORAGE_DRIVER=supabase
SUPABASE_URL=https://wmbcjkhakyeofznwggol.supabase.co
SUPABASE_SERVICE_ROLE_KEY=…                   # clé service_role
SUPABASE_STORAGE_BUCKET=simdouane-private
```

Contrôles avant d'aller plus loin :
- `git status` ne doit **pas** lister `.env` (le fichier est ignoré par Git).
- Pas de `sslmode=` dans `DATABASE_URL` (le certificat s'en charge).
- `ADMIN_EMAILS` doit être renseigné : vide, il retomberait sur l'adresse de
  l'administrateur historique.

## 4. Vérifier la connexion, puis lancer l'application

```sh
pnpm db:migrate
pnpm db:seed
pnpm --filter @workspace/scripts run storage-setup
pnpm dev
```

| N° | Commande | Résultat attendu |
| --- | --- | --- |
| R0a | `pnpm db:migrate` | `Migrations applied from …/lib/db/migrations`, sans erreur. Les 7 migrations sont déjà appliquées sur `simdouane-dev` : rien de nouveau ne s'applique. |
| R0b | `pnpm db:seed` | `Subscription plans seeded successfully` (ou `Plans already seeded: 3` si déjà fait) |
| R0c | `storage-setup` | `Bucket "simdouane-private" exists and is private.` |
| R0d | `pnpm dev` | L'API démarre (port 8080) puis le site : ouvrez **http://localhost:5173** |

Ces commandes lisent le fichier `.env` (correctif du 2026-10-26 : seul
`pnpm dev` le lisait auparavant). Après toute modification du `.env`, arrêtez
`pnpm dev` (Ctrl+C) et relancez-le.

### Si une étape échoue

| Message | Cause probable |
| --- | --- |
| `DATABASE_URL must be set` | `.env` absent, mal nommé (`.env.txt` sous Windows) ou commande lancée hors de la racine du dépôt |
| `self-signed certificate in certificate chain` ou `unable to get local issuer certificate` | `DATABASE_SSL_CA_FILE` vide ou mauvais fichier, ou `sslmode=` présent dans l'adresse |
| `ENOENT … .crt` | Chemin du certificat incorrect |
| `password authentication failed` | Mot de passe incorrect, ou caractère spécial non encodé |
| `Tenant or user not found` | L'utilisateur doit être `postgres.wmbcjkhakyeofznwggol` (format du pooler) |
| `ENOTFOUND db.wmbcjkhakyeofznwggol…` ou délai dépassé | Adresse *Direct connection* au lieu de *Session pooler* |
| `Invalid API key` / `signature verification failed` (storage-setup) | Mauvaise clé `service_role` |
| Page blanche, console : `Missing VITE_CLERK_PUBLISHABLE_KEY` | Variable manquante ; relancer `pnpm dev` |
| Après connexion : « Service d'authentification indisponible, réessayez. » | `CLERK_SECRET_KEY` absente ou d'une autre application Clerk que la clé publique |
| « Impossible de charger vos dossiers pour le moment. » | L'API ne joint pas la base : regardez le terminal de `pnpm dev` |

## 5. Recette avec deux comptes

Dans le tableau, « fiche » = la page d'un dossier (`/dossiers/<identifiant>`).

### Compte A — fenêtre normale

| N° | Action | Résultat attendu |
| --- | --- | --- |
| R1 | http://localhost:5173/sign-up → `proprietaire-a+clerk_test@example.com`, un mot de passe, code **424242**. Page « Quel est votre poste ? » : n'importe quel choix, WhatsApp vide, **Terminer** | Tableau de bord affiché |
| R2 | Menu **Mes dossiers** | Titre « Mes dossiers véhicules », « Vous n'avez encore aucun dossier. », rappel « SimDouane vous aide à préparer votre dossier. Il n'est pas déposé auprès des Douanes, du GUCE ou de Bénin Control. » |
| R3 | **Nouveau dossier** → « Pas encore arrivé au Bénin » → laissez **Marque** vide → **Créer le dossier** | « La marque est obligatoire. » sous le champ Marque. Revenez à Mes dossiers : toujours aucun dossier |
| R4 | **Nouveau dossier** → « Pas encore arrivé au Bénin » → Marque `Toyota` → **Créer le dossier** | Fiche avec le badge **Brouillon**, la référence **SDB-2026-000001**, historique « Dossier créé ». **Copiez l'adresse de la page** (barre d'adresse) : c'est « l'adresse du dossier 1 » |
| R5 | **Vérifier le dossier** | Badge **Informations à compléter** ; encadré « À compléter avant la préparation administrative » : Modèle, Année, Pays de provenance, Date d'arrivée estimée |
| R6 | Année `1800` → **Enregistrer** | « Année entre 1900 et 2027. » sous le champ Année ; rien d'enregistré |
| R7 | Modèle `Corolla`, Année `2018`, Pays de provenance `Belgique`, Date d'arrivée estimée = une date dans quelques semaines → **Enregistrer** | Badge **Prêt pour la préparation administrative** ; « Recommandé : Numéro de châssis (VIN), Référence de transport… » ; historique : « Informations modifiées (…) » puis « Statut : Prêt pour la préparation administrative » |
| R8 | **Nouveau dossier** → « Déjà arrivé au port de Cotonou » → Marque `Peugeot`, Date d'arrivée au port = **demain** → **Créer le dossier** | « La date d'arrivée réelle ne peut pas être dans le futur. » ; mettez une date passée → **Créer le dossier** → Brouillon, **SDB-2026-000002** |
| R9 | Menu du compte → **Déconnexion**, puis reconnexion avec le compte A (http://localhost:5173/sign-in ; si un code est demandé : 424242) → Mes dossiers | Les 2 dossiers sont là, avec le même statut (Prêt / Brouillon) |

### Compte B — fenêtre de navigation privée

| N° | Action | Résultat attendu |
| --- | --- | --- |
| R10 | Inscription `proprietaire-b+clerk_test@example.com`, code 424242, Terminer → **Mes dossiers** | « Vous n'avez encore aucun dossier. » (B ne voit pas les dossiers de A) |
| R11 | Collez l'**adresse du dossier 1** dans la barre d'adresse | « Dossier introuvable. » |
| R12 | Test **côté serveur** (ne dépend pas de l'interface) : touche F12 → onglet **Console**. Chrome peut demander de taper `allow pasting` avant de coller. Collez le bloc ci-dessous après avoir remplacé `IDENTIFIANT` par la fin de l'adresse du dossier 1 (après `/dossiers/`), puis Entrée | Les 5 lignes affichent **404**, la dernière `[]` |

```js
const id = "IDENTIFIANT";
for (const [nom, url, method, body] of [
  ["Lire", `/api/cases/${id}`, "GET"],
  ["Modifier", `/api/cases/${id}`, "PATCH", { notes: "tentative du compte B" }],
  ["Vérifier", `/api/cases/${id}/check`, "POST"],
  ["Historique", `/api/cases/${id}/events`, "GET"],
  ["Archiver", `/api/cases/${id}`, "DELETE"],
]) {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  console.log(nom, r.status);
}
console.log("Liste de B :", await (await fetch("/api/cases")).json());
```

### Retour au compte A

| N° | Action | Résultat attendu |
| --- | --- | --- |
| R13 | Rechargez la fiche du dossier 1 | Inchangée : statut Prêt, pas de note « tentative du compte B », aucune nouvelle ligne d'historique |
| R14 | Ouvrez le dossier 2 (Peugeot) → **Archiver** → confirmez « Archiver ce dossier ? » | Retour à Mes dossiers avec le seul dossier Toyota. L'ancienne adresse du dossier 2 affiche « Dossier introuvable. » |

### Facultatif — administrateur et compte désactivé

| N° | Action | Résultat attendu |
| --- | --- | --- |
| R15 | Déconnectez B, inscrivez `admin-recette+clerk_test@example.com` (code 424242) dans la fenêtre privée. Le menu doit afficher **Administration**. Collez l'adresse du dossier 1, puis relancez le bloc de R12 | « Dossier introuvable. » et **404** partout : l'administrateur n'a aucun accès aux dossiers |
| R16 | Dans **Administration**, liste des utilisateurs : passez le compte B en **désactivé**. Reconnectez B, ouvrez **Mes dossiers** | « Ce compte est désactivé. Contactez l'administrateur. » Remettez ensuite B en **actif** |

## 6. Contrôles en base (lecture seule)

Supabase → **SQL Editor** → collez et exécutez (requêtes `SELECT` uniquement,
rien n'est modifié) :

```sql
-- Q1. Dossiers et propriétaires
select c.reference, u.email as proprietaire, c.arrival_situation, c.status,
       c.deleted_at is not null as archive
from clearance_cases c join users u on u.id = c.owner_user_id
order by c.reference;

-- Q2. Historique : qui a fait quoi
select c.reference, e.type, e.from_status, e.to_status, u.email as auteur, e.created_at
from case_events e
join clearance_cases c on c.id = e.case_id
left join users u on u.id = e.actor_user_id
order by e.created_at;

-- Q3. Actions faites par un autre compte que le propriétaire (attendu : 0)
select count(*) as actions_par_un_autre_compte
from case_events e join clearance_cases c on c.id = e.case_id
where e.actor_user_id is distinct from c.owner_user_id;

-- Q4. Journal de sécurité
select action, target_type, created_at from audit_logs order by created_at;
```

Attendu : Q1 → `SDB-2026-000001` (compte A, `ready`, non archivé) et
`SDB-2026-000002` (compte A, archivé) ; Q2 → uniquement des actions du
compte A ; **Q3 → 0** ; Q4 → `case.created` ×2 et `case.archived` ×1 (le
changement de statut de R16 est inscrit dans l'ancien journal
d'administration `admin_logs`, pas ici).

Je peux aussi faire ces contrôles moi-même sur `simdouane-dev` avec mes outils
Supabase, sans vos secrets : dites-moi simplement quand la recette est faite.

## 7. Après la recette

- Les données créées sont fictives : elles peuvent rester dans `simdouane-dev`
  (utiles pour la phase 4). Rien n'est à supprimer.
- Arrêtez l'application par Ctrl+C dans le terminal de `pnpm dev`.
- Transmettez la liste R0a → R16 (✅ / ❌ + message exact). **Jamais** le
  contenu du `.env`, une clé ou un mot de passe.

## Ce qui a déjà été vérifié de mon côté (2026-10-26)

Sans les secrets ni l'accès réseau à Clerk et Supabase (refusés dans
l'environnement où je travaille) :

| Contrôle | Résultat |
| --- | --- |
| Base réelle `simdouane-dev` (PostgreSQL 17), test en transaction **annulée** avec des comptes fictifs : création dossier + historique ; modification et suppression de l'historique ; même véhicule dans 2 dossiers ; propriétaire inexistant ; lecture par les rôles publics `anon`/`authenticated` ; séquence des références | ✅ créations acceptées, tout le reste **refusé** ; base vérifiée vide ensuite, compteur des références remis à 1 |
| Répétition des commandes du §4 sur une base locale, avec un `.env` | ✅ migrations (relance sans effet), formules créées, `storage-setup` lit bien le `.env` |
| `pnpm dev` avec des clés Clerk factices | ✅ API et site démarrent ; `/api/cases` → **401** sans session, avec un jeton forgé et avec un cookie forgé |
| Pages « Mes dossiers » et fiche en cas d'erreur de l'API (aperçu navigateur, API simulée) | ✅ message clair au lieu d'une page vide (compte désactivé, API injoignable, service indisponible, échec de la vérification) |
