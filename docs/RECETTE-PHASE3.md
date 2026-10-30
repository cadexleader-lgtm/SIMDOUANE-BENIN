# Recette de la phase 3 avec Supabase `simdouane-dev` (comptes Supabase Auth)

Procédure à suivre **sur votre ordinateur**. Vous configurez vous-même les
secrets dans un fichier `.env` local : ne les envoyez à personne, ni dans une
conversation, ni sur GitHub. Comptes et données **fictifs uniquement**.

> Depuis le 2026-10-30, les comptes sont gérés par **Supabase Auth**, et non
> plus par Clerk (voir [`PLAN-AUTH-SUPABASE.md`](PLAN-AUTH-SUPABASE.md)). Les
> étapes R0a à R0c déjà réussies restent valables. Il faut seulement
> récupérer le nouveau code (§0), faire les réglages Supabase Auth (§2) et
> compléter le `.env` (§3), puis reprendre à **R0d**.

Chaque étape porte un numéro (R1, R2…). Notez pour chacune ✅ ou ❌ (avec le
message exact en cas de ❌) : c'est ce compte rendu, **sans aucun secret**,
qu'il faut me transmettre. Ne m'envoyez pas de capture du `.env`.

---

## 0. Ce qu'il faut sur l'ordinateur

- Node.js 22 (`node -v` → `v22.…`), pnpm 10 (`pnpm -v` → `10.…`), Git.
- Le projet sur la branche `mvp/dossiers`, **à jour** (une ligne à la fois) :
  ```sh
  cd ~/simdouane-recette
  ```
  ```sh
  git pull origin mvp/dossiers
  ```
  ```sh
  pnpm install
  ```
  `pnpm install` est nécessaire parce que les bibliothèques ont changé :
  Clerk est retiré et la bibliothèque Supabase est ajoutée.
- Deux fenêtres de navigateur **séparées** : une fenêtre normale (compte A) et
  une fenêtre de **navigation privée** (Ctrl+Maj+N) pour le compte B. Deux
  onglets d'une même fenêtre partagent la même session : cela ne suffit pas.

## 1. Supabase `simdouane-dev` : base, certificat, clés (déjà fait pour R0a à R0c)

- **Mot de passe de la base** et **adresse Session pooler** (bouton
  *Connect*) → `DATABASE_URL`.
- **Certificat** (*Database Settings → SSL Configuration → Download
  certificate*), enregistré hors du dépôt → `DATABASE_SSL_CA_FILE`.
- **Clé `service_role`** (*Project Settings → API Keys*, onglet « Legacy »),
  secrète, serveur uniquement → `SUPABASE_SERVICE_ROLE_KEY`.
- **Nouveau : la clé publique.** Sur la même page *API Keys*, onglet
  « Publishable and secret keys » : la **Publishable key** (`sb_publishable_…`).
  Elle n'est pas secrète, mais elle ne sert qu'à la connexion → `VITE_SUPABASE_PUBLISHABLE_KEY`.

## 2. Réglages Supabase Auth (tableau de bord, projet `simdouane-dev`)

1. *Authentication → URL Configuration* :
   - **Site URL** : `http://localhost:5173` ;
   - **Redirect URLs** → *Add URL* : `http://localhost:5173/**`.
2. *Authentication → Sign In / Providers → Email* : laissez **Email** activé
   et **Confirm email** activé. Si le réglage existe, mettez la longueur
   minimale du mot de passe à **8**.
3. **Comptes de test**, sans email : *Authentication → Users → Add user →
   Create new user*, en cochant **Auto Confirm User** pour chacun :

| Compte | Adresse | Mot de passe (fictif, à votre choix) |
| --- | --- | --- |
| A (propriétaire) | `proprietaire-a@example.com` | au moins 8 caractères |
| B (autre propriétaire) | `proprietaire-b@example.com` | au moins 8 caractères |
| Admin (facultatif, R15-R16) | `admin-recette@example.com` | au moins 8 caractères |

> Le service d'emails intégré de Supabase n'envoie qu'aux adresses des
> membres de votre équipe Supabase. Les comptes ci-dessus sont donc créés
> **dans le tableau de bord**, sans email. L'inscription depuis
> l'application se teste en option (R18) avec votre propre adresse.

## 3. Le fichier `.env` (à la racine du projet, jamais committé)

Votre `.env` contient déjà 6 lignes : base, certificat et stockage. Ajoutez
ces **4 lignes**, une par ligne, avec `nano .env` :

| Tapez | Puis, juste derrière |
| --- | --- |
| `VITE_SUPABASE_URL=` | `https://wmbcjkhakyeofznwggol.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY=` | collez la **Publishable key** (`sb_publishable_…`) |
| `ADMIN_EMAILS=` | `admin-recette@example.com` |
| `VITE_ADMIN_EMAILS=` | `admin-recette@example.com` |

Contrôles, sans afficher aucun secret :
```sh
wc -l .env
```
On doit voir `10 .env`.
```sh
grep -vc "^[A-Z_]*=" .env
```
On doit voir `0` (aucune ligne coupée).
```sh
grep -c "^VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_" .env
```
On doit voir `1`.
```sh
git status --short
```
Cette commande ne doit **rien** afficher.

Rappels : `ADMIN_EMAILS` doit être renseigné (vide, il retomberait sur
l'adresse de l'administrateur historique), et la clé `service_role` ne doit
**jamais** avoir le préfixe `VITE_`.

## 4. Vérifier, puis lancer l'application

| N° | Commande | Résultat attendu |
| --- | --- | --- |
| R0a | `pnpm db:migrate` | `Migrations applied from …/lib/db/migrations`, sans erreur. Les 8 migrations, dont la nouvelle 0007, sont déjà appliquées sur `simdouane-dev` : rien de nouveau ne s'applique |
| R0b | `pnpm db:seed` | `Plans already seeded: 3` (déjà fait) |
| R0c | `pnpm --filter @workspace/scripts run storage-setup` | `Bucket "simdouane-private" exists and is private.` |
| R0d | `pnpm dev` | L'API démarre (`Server listening`, port 8080), puis le site (`Local: http://localhost:5173/`). Ouvrez **http://localhost:5173** dans Chrome (sinon **http://penguin.linux.test:5173**) : la page d'accueil de SimDouane s'affiche |

Laissez le Terminal de `pnpm dev` ouvert pendant toute la recette. Après une
modification du `.env`, arrêtez (Ctrl+C) puis relancez `pnpm dev`.

### Si une étape échoue

| Message | Cause probable |
| --- | --- |
| Page blanche, console du navigateur : `Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY` | Une des deux lignes manque ou est mal écrite dans `.env` ; relancer `pnpm dev` |
| Après connexion : « Service d'authentification indisponible, réessayez. » | `SUPABASE_URL` ou `SUPABASE_SERVICE_ROLE_KEY` absente ou incorrecte côté serveur |
| « Adresse e-mail ou mot de passe incorrect. » avec le bon mot de passe | Compte non créé dans *simdouane-dev*, mot de passe différent, ou autre projet Supabase dans `VITE_SUPABASE_URL` |
| « Votre adresse e-mail n'est pas encore confirmée… » | « Auto Confirm User » non coché : supprimez le compte de test et recréez-le |
| « Impossible de charger vos dossiers pour le moment. » | L'API ne joint pas la base : regardez le Terminal de `pnpm dev` |
| « Un compte SimDouane existe déjà avec cette adresse… » | Un compte de test a été supprimé puis recréé avec la même adresse : c'est voulu (aucun rattachement automatique). Utilisez une autre adresse (`proprietaire-a2@example.com`) |
| Erreurs de base de données ou de certificat | Voir R0a (déjà réussie) : `DATABASE_URL`, `DATABASE_SSL_CA_FILE` |

## 5. Recette avec deux comptes

« Fiche » = la page d'un dossier (`/dossiers/<identifiant>`).

### Compte A — fenêtre normale

| N° | Action | Résultat attendu |
| --- | --- | --- |
| R1 | Ouvrez http://localhost:5173/dossiers | Redirection vers **Connexion**. Cliquez sur **Se connecter** sans rien remplir : « Adresse e-mail invalide. » sous le champ. Entrez l'adresse de A avec un mauvais mot de passe : « Adresse e-mail ou mot de passe incorrect. ». Puis le bon mot de passe : retour automatique sur **Mes dossiers** |
| R2 | (vous êtes sur Mes dossiers) | Titre « Mes dossiers véhicules », « Vous n'avez encore aucun dossier. », rappel « SimDouane vous aide à préparer votre dossier. Il n'est pas déposé auprès des Douanes, du GUCE ou de Bénin Control. » |
| R3 | **Nouveau dossier** → « Pas encore arrivé au Bénin » → laissez **Marque** vide → **Créer le dossier** | « La marque est obligatoire. » sous Marque ; rien n'est créé |
| R4 | Marque `Toyota` → **Créer le dossier** | Fiche avec **Brouillon**, la référence **SDB-2026-000001**, historique « Dossier créé ». **Copiez l'adresse de la page** : c'est « l'adresse du dossier 1 » |
| R5 | **Vérifier le dossier** | **Informations à compléter** ; liste : Modèle, Année, Pays de provenance, Date d'arrivée estimée |
| R6 | Année `1800` → **Enregistrer** | « Année entre 1900 et 2027. » ; rien d'enregistré |
| R7 | Modèle `Corolla`, Année `2018`, Pays `Belgique`, Date d'arrivée estimée dans quelques semaines → **Enregistrer** | **Prêt pour la préparation administrative** ; « Recommandé : … » ; historique mis à jour |
| R8 | **Nouveau dossier** → « Déjà arrivé au port de Cotonou » → Marque `Peugeot`, Date d'arrivée au port = **demain** → **Créer le dossier** | « La date d'arrivée réelle ne peut pas être dans le futur. » ; mettez une date passée → **SDB-2026-000002**, Brouillon |
| R9 | Menu du compte (votre nom, en haut à droite) → **Déconnexion** | Retour à l'accueil. Reconnectez A : les 2 dossiers sont là, avec le même statut |

### Compte B — fenêtre de navigation privée

| N° | Action | Résultat attendu |
| --- | --- | --- |
| R10 | http://localhost:5173/sign-in → adresse et mot de passe de B → **Mes dossiers** | Tableau de bord, puis « Vous n'avez encore aucun dossier. » |
| R11 | Collez l'**adresse du dossier 1** | « Dossier introuvable. » |
| R12 | **Test côté serveur** : F12 → onglet **Console**. Chrome peut demander de taper `allow pasting`. Collez le bloc ci-dessous en remplaçant `IDENTIFIANT` par la fin de l'adresse du dossier 1, puis Entrée | Les 5 lignes affichent **404**, puis `Liste de B : []` et `Sans jeton : 401` |

```js
const id = "IDENTIFIANT";
const k = Object.keys(localStorage).find((x) => x.startsWith("sb-") && x.endsWith("-auth-token"));
const tok = JSON.parse(localStorage.getItem(k)).access_token;
const h = { "Content-Type": "application/json", authorization: `Bearer ${tok}` };
for (const [nom, url, method, body] of [
  ["Lire", `/api/cases/${id}`, "GET"],
  ["Modifier", `/api/cases/${id}`, "PATCH", { notes: "tentative du compte B" }],
  ["Vérifier", `/api/cases/${id}/check`, "POST"],
  ["Historique", `/api/cases/${id}/events`, "GET"],
  ["Archiver", `/api/cases/${id}`, "DELETE"],
]) {
  const r = await fetch(url, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  console.log(nom, r.status);
}
console.log("Liste de B :", await (await fetch("/api/cases", { headers: h })).json());
console.log("Sans jeton :", (await fetch(`/api/cases/${id}`)).status);
```

Ce bloc utilise la session de B (son jeton) pour appeler l'API directement,
sans passer par l'interface : c'est le serveur qui refuse.

### Retour au compte A

| N° | Action | Résultat attendu |
| --- | --- | --- |
| R13 | Ouvrez l'adresse du dossier 1 | Inchangé : statut Prêt, pas de note « tentative du compte B », aucune ligne d'historique venant de B |
| R14 | Ouvrez le dossier 2 (Peugeot) → **Archiver** → confirmez | Retour à Mes dossiers avec le seul dossier Toyota ; l'adresse du dossier 2 affiche « Dossier introuvable. » |

### Facultatif

| N° | Action | Résultat attendu |
| --- | --- | --- |
| R15 | Dans la fenêtre privée, déconnectez B puis connectez **admin-recette** | Lien **Administration** dans le menu. L'adresse du dossier 1 → « Dossier introuvable. » ; le bloc de R12 → **404** partout |
| R16 | **Administration** → utilisateurs → compte B **désactivé** ; reconnectez B → **Mes dossiers** | « Ce compte est désactivé. Contactez l'administrateur. » ; remettez B en **actif** |
| R17 | Compte A → **Mon profil** → « Mot de passe » : nouveau mot de passe deux fois → **Changer le mot de passe** | « Mot de passe modifié. » ; après déconnexion, l'ancien mot de passe est refusé et le nouveau accepté |
| R18 | Fenêtre privée → **Créer un compte** avec **votre propre adresse** (celle de votre compte Supabase) | « Vérifiez votre boîte e-mail ». Ouvrez le lien reçu **sur ce Chromebook** : « Adresse confirmée », puis **Continuer** mène à la page « Quel est votre poste ? » |
| R19 | **Mot de passe oublié ?** avec votre propre adresse | « E-mail envoyé » ; le lien reçu ouvre « Nouveau mot de passe » ; après enregistrement, vous êtes connecté |

## 6. Contrôles en base (lecture seule)

Supabase → **SQL Editor**, requêtes `SELECT` uniquement :

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

-- Q5. Comptes SimDouane reliés à Supabase Auth
select email, auth_user_id is not null as relie_supabase_auth, email_verified from users order by email;
```

Attendu : Q1 → `SDB-2026-000001` (A, `ready`, non archivé) et
`SDB-2026-000002` (A, archivé) ; Q2 → uniquement des actions de A ;
**Q3 → 0** ; Q4 → `case.created` ×2 et `case.archived` ×1 ; Q5 → chaque compte
connecté au moins une fois, relié (`true`) et confirmé (`true`).

Je peux aussi faire ces contrôles moi-même sur `simdouane-dev` avec mes outils
Supabase, sans vos secrets : dites-moi simplement quand la recette est faite.

## 7. Après la recette

- Les données créées sont fictives : elles peuvent rester dans `simdouane-dev`.
- Arrêtez l'application par Ctrl+C dans le Terminal de `pnpm dev`.
- Transmettez la liste R0a → R19 (✅ / ❌ + message exact). **Jamais** le
  contenu du `.env`, une clé ou un mot de passe.

## Ce qui a déjà été vérifié de mon côté (2026-10-30)

Mon environnement ne peut pas joindre Supabase par le réseau. J'ai donc fait
une **répétition complète hors ligne** : la vraie interface et la vraie API,
une base PostgreSQL locale migrée de zéro, et à la place de Supabase Auth un
serveur local qui émet de vrais jetons signés (ES256) et publie ses clés.
Toute la recette ci-dessus a été jouée automatiquement dans un navigateur,
avec trois comptes fictifs :

| Contrôle | Résultat |
| --- | --- |
| R1 à R14 (connexion, erreurs, création, vérification, statuts, date future refusée, archivage, déconnexion) | ✅ |
| Compte B : liste vide, « Dossier introuvable. », appels directs à l'API → 404 ×5, liste `[]`, sans jeton → 401 | ✅ |
| Dossier de A inchangé après les tentatives de B ; en base, 0 action d'un autre compte | ✅ |
| Administrateur : lien Administration, page ouverte, dossier de A introuvable | ✅ |
| Inscription (erreurs sous les champs, « Vérifiez votre boîte e-mail »), compte non confirmé refusé, mot de passe oublié, lien expiré | ✅ |
| Changement de mot de passe depuis le profil (même mot de passe refusé ; ancien refusé ; nouveau accepté) | ✅ |
| Téléphone (390 px) : pas de débordement horizontal ; aucune erreur JavaScript | ✅ |
| Jeton altéré d'un seul caractère → 401 | ✅ |

**Non vérifié** : le vrai service Supabase Auth (réglages du §2, envoi réel
des emails, liens de confirmation et de réinitialisation). C'est l'objet de
votre recette.
