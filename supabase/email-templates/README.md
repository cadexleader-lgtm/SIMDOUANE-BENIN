# E-mails envoyés par Supabase Auth

Ces fichiers sont la copie de référence des e-mails de SimDouane. Ils ne sont
pas déployés automatiquement : ils se collent à la main dans le tableau de bord
Supabase (projet `simdouane-dev`).

## 1. Adresse du site (sinon le lien ouvre `localhost`)

*Authentication → URL Configuration* :

- **Site URL** : `https://simdouanebenin.com`
- **Redirect URLs** → *Add URL* : `https://simdouanebenin.com/**`

Adresse du site : le domaine simdouanebenin.com (acheté chez LWS, relié à Cloudflare).

## 2. Modèles

*Authentication → Emails → Templates* :

| Modèle Supabase | Objet à saisir | Fichier à coller |
| --- | --- | --- |
| Confirm signup | `Confirmez votre adresse — SimDouane Bénin` | `confirm-signup.html` |
| Reset password | `Votre nouveau mot de passe — SimDouane Bénin` | `reset-password.html` |

Le logo des e-mails est chargé depuis le site (`/icon-192.png`).

## 3. Expéditeur « SimDouane » (obligatoire avant le lancement)

Le service d'e-mails intégré de Supabase est prévu pour les essais : il
n'écrit qu'aux adresses des membres de l'organisation Supabase, en très petit
nombre, et l'expéditeur est Supabase. Pour de vrais utilisateurs il faut un
service d'envoi (SMTP) : *Authentication → Emails → SMTP Settings*, avec un
service comme Resend ou Brevo, et un nom de domaine vérifié pour que
l'expéditeur soit par exemple `SimDouane <noreply@votre-domaine>`.

Le mot de passe SMTP est un secret : il se saisit uniquement dans le tableau
de bord Supabase, jamais dans le dépôt ni dans une conversation.
