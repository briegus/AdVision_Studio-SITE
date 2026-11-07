# Guide de déploiement — AdVision Studio
**Render (bot + API) · Neon (base de données) · Netlify (site) · Brevo ou Resend (e-mails) · Google & Discord (connexion clients)**

Ce guide correspond **exactement** aux deux archives livrées : `advision-studio-bot-final.zip` et `advision-studio-website-final.zip`.
Tous les noms de variables ci-dessous ont été extraits du code et des fichiers `.env.example` des deux projets : copiez-les tels quels (majuscules, underscores).

> **À lire d'abord — ce que ce guide ne peut pas garantir.** Je n'ai accès à aucun de vos comptes ni à Internet : je n'ai donc pas pu déployer, ni envoyer un vrai e-mail, ni me connecter à Google/Discord. Les interfaces de Render, Neon, Netlify, Brevo, Resend, Google et Discord changent régulièrement : si un libellé de bouton diffère légèrement, cherchez le plus proche. Chaque étape importante se termine par une **vérification** qui vous dit si ça a marché.

---

## Sommaire
1. [Vue d'ensemble : qui parle à qui](#1-vue-densemble)
2. [Ce qu'il vous faut avant de commencer](#2-prérequis)
3. [Étape A — Mettre les deux projets sur GitHub](#étape-a--mettre-les-deux-projets-sur-github)
4. [Étape B — Neon (base de données)](#étape-b--neon-base-de-données)
5. [Étape C — Discord : application, token, intents](#étape-c--discord-application-token-intents)
6. [Étape D — E-mails : Brevo (ou Resend)](#étape-d--e-mails-brevo-ou-resend)
7. [Étape E — Render : le bot et son API](#étape-e--render-le-bot-et-son-api)
8. [Étape F — Netlify : le site](#étape-f--netlify-le-site)
9. [Étape G — Relier Render et Netlify](#étape-g--relier-render-et-netlify)
10. [Étape H — Votre serveur Discord : salons, permissions, forum](#étape-h--votre-serveur-discord-salons-permissions-forum)
11. [Étape I — Connexion Google et Discord](#étape-i--connexion-google-et-discord)
12. [Étape J — Garder le bot éveillé (UptimeRobot)](#étape-j--garder-le-bot-éveillé)
13. [Étape K — Vérification complète après déploiement](#étape-k--vérification-complète-après-déploiement)
14. [Étape L — Protection anti-spam et anti-raid : activer et tester](#étape-l--protection-anti-spam-et-anti-raid--activer-et-tester)
15. [Récapitulatif de TOUTES les variables](#récapitulatif-de-toutes-les-variables)
16. [Dépannage](#dépannage)
17. [Mises à jour, sauvegardes, limites des offres gratuites](#mises-à-jour-sauvegardes-et-limites)

---

## 1. Vue d'ensemble

```
Visiteur ──► SITE (Netlify) ──── HTTPS ────► BOT + API (Render) ──► Neon (PostgreSQL)
                                                  │  ├──► Discord (salons, forum, boutons)
                                                  │  └──► Brevo / Resend (e-mails)
          Google / Discord (OAuth) ◄──────────────┘   (retour de connexion sur l'API)
```

- Le **site** n'a pas de serveur : il appelle l'**API du bot** (adresse `VITE_API_URL`).
- Le **bot** est le seul à parler à la base, à Discord et aux e-mails. Les secrets restent **uniquement sur Render**.
- L'**administration** se fait dans le site : adresse `https://VOTRE-SITE.netlify.app/#/admin`. Il n'y a plus de dashboard hébergé par le bot.
- Les deux adresses à relier (étape G) : l'URL de **Render** va dans Netlify (`VITE_API_URL`), l'URL de **Netlify** va dans Render (`ALLOWED_ORIGINS`).

## 2. Prérequis

| Quoi | Pourquoi | Coût |
|---|---|---|
| Un compte **GitHub** (github.com) | Render et Netlify récupèrent le code depuis GitHub | gratuit |
| Un compte **Neon** | base PostgreSQL | gratuit (offre Free) |
| Un compte **Discord** + un serveur dont vous êtes propriétaire | le bot | gratuit |
| Un compte **Render** | héberge le bot et l'API | gratuit (offre Free, avec limites : §16) |
| Un compte **Netlify** | héberge le site | gratuit (offre Free) |
| Un compte **Brevo** *ou* **Resend** | envoi des codes par e-mail | gratuit (quotas : à vérifier chez eux) |
| Un compte **Google** | connexion Google des clients (facultatif) | gratuit |
| Un **nom de domaine** (ex. `advision.fr`) | recommandé pour que les e-mails n'arrivent pas en spam | payant (≈ 10 €/an) — facultatif pour tester |
| Un **gestionnaire de mots de passe** | vous allez manipuler ~10 secrets | gratuit |

**Règles de sécurité à respecter tout du long**
- Copiez chaque secret (token, clé API, mot de passe) **dans un fichier texte temporaire** au moment où il s'affiche : plusieurs ne sont montrés **qu'une seule fois**.
- Ne collez **jamais** un secret dans un message, un e-mail ou une capture d'écran. Si l'un d'eux fuite : régénérez-le (bouton *Reset* du service concerné) et mettez à jour Render.
- Le site (Netlify) ne reçoit **aucun secret** : une seule variable publique, `VITE_API_URL`.

**Fichiers à utiliser** : décompressez les deux ZIP chacun dans son dossier (ex. `advision-bot` et `advision-site`). **À l'intérieur de chaque dossier, vous devez voir directement `package.json`** (pas un dossier de plus). Le bot contient aussi `render.yaml`, `prisma/`, `src/`, `scripts/` ; le site contient `index.html`, `netlify.toml`, `src/`, `public/`.

---

## Étape A — Mettre les deux projets sur GitHub

Il faut **deux dépôts** (un par projet). Méthode la plus simple pour un débutant : **GitHub Desktop**.

1. Créez un compte sur **https://github.com** (*Sign up*).
2. Installez **GitHub Desktop** : https://desktop.github.com → ouvrez-le → *Sign in to GitHub.com*.
3. Menu **File → Add local repository…** → *Choose…* → sélectionnez le dossier `advision-bot` (celui qui contient `package.json`).
4. GitHub Desktop dit « This directory does not appear to be a Git repository » → cliquez sur le lien **create a repository** → *Name* : `advision-bot` → **Create repository**.
5. Bouton **Publish repository** (en haut) → laissez **Keep this code private** coché → **Publish repository**.
6. Recommencez les points 3 à 5 avec le dossier `advision-site` (nom : `advision-site`).

**Vérification** : sur github.com, vos deux dépôts apparaissent. Dans `advision-bot`, vous voyez à la racine `package.json`, `render.yaml`, `prisma`, `src`. **Vous ne devez PAS voir de fichier `.env`** (il est ignoré volontairement par `.gitignore`).

> *Alternative en ligne de commande* (si Git est installé) : dans le dossier du projet : `git init` · `git add .` · `git commit -m "Version initiale"` · `git branch -M main` · `git remote add origin https://github.com/VOTRE-PSEUDO/advision-bot.git` · `git push -u origin main`.
> *Alternative sans Git* : sur GitHub, **Add file → Upload files** fonctionne (le bot compte ~98 fichiers, sous la limite de 100 par envoi), mais les fichiers cachés (`.gitignore`, `.env.example`, `.node-version`) sont souvent oubliés par l'explorateur de fichiers : préférez GitHub Desktop.

---

## Étape B — Neon (base de données)

1. Allez sur **https://neon.tech** → **Sign up** (GitHub ou e-mail).
2. **Create project** (ou *New project*) :
   - **Name** : `advision`
   - **Postgres version** : laissez la valeur par défaut
   - **Region** : la plus proche de vous — pour la France, **Europe (Frankfurt)** (`aws-eu-central-1`). Choisissez la **même zone** sur Render (étape E) pour la rapidité.
3. Une fois le projet créé, cliquez sur le bouton **Connect** (tableau de bord du projet).
4. Dans la fenêtre : **Branch** = `main` · **Database** = `neondb` · **Role** = celui proposé.
5. **Désactivez** l'option **Connection pooling** (interrupteur). *Pourquoi : pour un seul bot, la connexion directe est la plus simple et c'est ce qui permet à Prisma de créer les tables sans réglage supplémentaire.*
6. Cliquez sur **Show password** puis **copiez la chaîne complète**. Elle ressemble à :
   `postgresql://neondb_owner:MOTDEPASSE@ep-nom-12345.eu-central-1.aws.neon.tech/neondb?sslmode=require`
7. **Si la chaîne se termine par `&channel_binding=require`, supprimez cette partie** (par prudence ; gardez `?sslmode=require`).
8. Gardez cette chaîne : ce sera la valeur de **`DATABASE_URL`** (étape E). Laissez **`DIRECT_URL` vide**.

**Vérification** : plus tard, les logs Render affichent `[DB] ✅ Connexion Neon OK`. Dans Neon → **Tables**, vous verrez les tables (`Demande`, `Avis`, `Realisation`, `SiteUser`…) apparaître après le premier déploiement.

**À savoir (offre gratuite)** : la base « s'endort » après quelques minutes sans activité (la première requête est alors un peu plus lente) et son temps de calcul mensuel est plafonné (vérifiez les chiffres actuels sur neon.tech/pricing). Ne programmez donc **aucun ping vers la base**. **Sauvegarde avant chaque mise à jour du schéma** : Neon → **Branches** → **Create branch** (copie instantanée).

---

## Étape C — Discord : application, token, intents

### C.1 Créer l'application et récupérer les identifiants
1. Allez sur **https://discord.com/developers/applications** (connectez-vous) → **New Application** → nom `AdVision Studio` → cochez les conditions → **Create**.
2. Onglet **General Information** → copiez **Application ID** → ce sera **`DISCORD_CLIENT_ID`**.
3. Onglet **Bot** (menu de gauche) → bouton **Reset Token** → confirmez → **copiez le token immédiatement** (il ne s'affiche qu'une fois) → ce sera **`DISCORD_TOKEN`**.
4. Dans l'application Discord, activez le **Mode développeur** : *Paramètres utilisateur → Avancés → Mode développeur*. Puis **clic droit sur l'icône de votre serveur → Copier l'identifiant du serveur** → ce sera **`DISCORD_GUILD_ID`**.

### C.2 Activer les intents (OBLIGATOIRE)
Toujours dans l'onglet **Bot**, section **Privileged Gateway Intents**, activez **les deux** interrupteurs suivants, puis **Save Changes** :
- ✅ **Server Members Intent** — le bot lit les membres (bienvenue, rôles, noms).
- ✅ **Message Content Intent** — le bot lit le contenu des messages (modération automatique, tickets, compteur…).
- ❌ **Presence Intent** — **inutile**, laissez désactivé.

> Les autres intents utilisés par le bot (serveurs, modération, messages, réactions, messages privés) ne sont pas « privilégiés » : rien à activer.
> **Si vous oubliez ces deux interrupteurs**, le bot ne démarre pas et les logs Render affichent : *« Intents privilégiés non activés… »*.

### C.3 Inviter le bot sur votre serveur
1. Menu **OAuth2** → **URL Generator**.
2. **Scopes** : cochez `bot` **et** `applications.commands`.
3. **Bot Permissions** :
   - **Option simple (recommandée pour un serveur privé)** : cochez **Administrator**. Le bot crée des salons, gère des rôles, modère et gère les tickets : c'est ce qui évite les erreurs de permission.
   - **Option restreinte** (si vous refusez Administrator) : *View Channels, Send Messages, Send Messages in Threads, Create Public Threads, Manage Threads, Manage Channels, Manage Roles, Manage Messages, Embed Links, Attach Files, Read Message History, Add Reactions, Use External Emojis, Kick Members, Ban Members, Moderate Members*. (**Manage Threads** est nécessaire pour que le bot modifie/supprime les posts du forum des réalisations.)
4. Copiez l'**URL générée** en bas → ouvrez-la dans le navigateur → choisissez votre serveur → **Autoriser**.
5. **Important** : dans Discord → *Paramètres du serveur → Rôles*, **faites glisser le rôle du bot au-dessus** des rôles qu'il doit gérer (sinon « permission manquante »).

**Vérification** : le bot apparaît dans la liste des membres (hors-ligne tant que Render n'est pas lancé).

> Le **Client Secret** (connexion Discord des clients) et les **URLs de redirection OAuth2** se règlent à l'étape I.

---

## Étape D — E-mails : Brevo (ou Resend)

Choisissez **un seul** fournisseur. Le bot envoie les e-mails par **API HTTP** (le SMTP est bloqué sur l'offre gratuite de Render).

### Option 1 — Brevo (https://www.brevo.com)
1. **Sign up** (gratuit) → confirmez votre e-mail et complétez le profil demandé. *(Brevo peut valider manuellement les nouveaux comptes avant le premier envoi : si l'envoi est refusé, regardez vos e-mails Brevo / leur support.)*
2. **Valider l'adresse expéditrice** : menu du compte (en haut à droite) → **Senders, Domains & Dedicated IPs** → onglet **Senders** → **Add a sender** → nom `AdVision Studio` + l'adresse (ex. `contact@advision.fr`) → Brevo envoie un e-mail de confirmation : cliquez sur le lien. Cette adresse sera **`MAIL_FROM_EMAIL`**.
   - ⚠️ Évitez une adresse **Gmail/Yahoo/Outlook** comme expéditeur : ces fournisseurs rejettent ou classent en spam les e-mails « envoyés en leur nom » par un tiers. Idéal : une adresse sur **votre domaine**, avec l'onglet **Domains → Add a domain** (Brevo vous donne des enregistrements DNS à ajouter chez votre registrar : puis **Authenticate**).
3. **Clé API** : menu du compte → **SMTP & API** → onglet **API Keys** → **Generate a new API key** → nom `render` → **Generate** → **copiez la clé** (`xkeysib-…`, affichée une seule fois) → ce sera **`BREVO_API_KEY`**.
4. Si, plus tard, Brevo répond **« unrecognised IP address »** : menu **Security → Authorised IPs** → désactivez la restriction (les adresses de Render changent).

### Option 2 — Resend (https://resend.com)
1. **Sign up** → **Domains → Add Domain** → entrez votre domaine → ajoutez chez votre registrar les enregistrements DNS affichés → **Verify**.
2. **API Keys → Create API Key** → *Permission* : **Sending access** → copiez la clé (`re_…`) → **`RESEND_API_KEY`**.
3. **`MAIL_FROM_EMAIL`** = une adresse **de votre domaine vérifié** (ex. `no-reply@advision.fr`).
4. ⚠️ Sans domaine vérifié, Resend ne permet d'écrire **qu'à l'adresse de votre propre compte** : inutilisable pour de vrais clients.

**Variables à retenir pour l'étape E** : `BREVO_API_KEY` *(ou `RESEND_API_KEY`)*, `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME` (= `AdVision Studio`).
**Vérification** : à l'étape K, le bouton **« Envoyer un e-mail de test »** du panel Admin envoie un vrai message.

---

## Étape E — Render : le bot et son API

### E.1 Créer le service (méthode manuelle — la plus explicite)
1. **https://render.com** → **Get Started** → *Sign up with GitHub* → autorisez Render à lire vos dépôts.
2. Bouton **+ New** (en haut) → **Web Service**.
3. **Connect a repository** : choisissez `advision-bot` (si absent : *Configure account* → autorisez ce dépôt).
4. Renseignez **exactement** :

| Champ Render | Valeur |
|---|---|
| **Name** | `advision-studio-assistant` (votre URL sera `https://advision-studio-assistant.onrender.com`, ou avec un suffixe si le nom est pris) |
| **Region** | **Frankfurt (EU Central)** — même zone que Neon |
| **Branch** | `main` |
| **Root Directory** | *(laisser vide)* |
| **Runtime / Language** | **Node** |
| **Build Command** | `npm install --no-audit --no-fund && npm run build` |
| **Start Command** | `node dist/index.js` |
| **Instance Type** | **Free** |

   *(Node 22 est choisi automatiquement : Render lit `"engines": {"node": "22.x"}` dans `package.json`. Ne remplacez **pas** `npm install` par `npm ci`.)*

5. Dépliez **Advanced** :
   - **Health Check Path** : `/health`
   - **Auto-Deploy** : *Yes*
6. Section **Environment Variables** → **Add Environment Variable** pour **chacune** des lignes ci-dessous (Name = colonne de gauche) :

| Name | Value à saisir | Où la trouver |
|---|---|---|
| `DISCORD_TOKEN` | le token du bot | C.1 point 3 |
| `DISCORD_CLIENT_ID` | l'Application ID | C.1 point 2 |
| `DISCORD_GUILD_ID` | l'ID du serveur | C.1 point 4 |
| `DATABASE_URL` | la chaîne Neon complète | étape B |
| `ADMIN_PASSWORD` | un mot de passe **long (≥ 12 caractères) et unique** que vous inventez | — |
| `ALLOWED_ORIGINS` | **provisoire** : `https://example.com` *(vous le corrigez à l'étape G)* | — |
| `NODE_ENV` | `production` | — |
| `BREVO_API_KEY` *(ou `RESEND_API_KEY`)* | la clé API | étape D |
| `MAIL_FROM_EMAIL` | l'adresse expéditrice validée | étape D |
| `MAIL_FROM_NAME` | `AdVision Studio` | — |
| `VERIFY_SECRET` | une longue chaîne aléatoire (≥ 40 caractères) que vous inventez | — |

   > **Ne créez pas** `PORT` ni `RENDER_EXTERNAL_URL` : Render les fournit.
   > Les variables Google/Discord OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DISCORD_CLIENT_SECRET`) s'ajoutent à l'étape I.

7. Cliquez sur **Create Web Service**. Le premier déploiement dure **3 à 8 minutes**.

### E.2 (Alternative) Créer via le fichier `render.yaml`
**+ New → Blueprint** → choisissez `advision-bot` → Render lit `render.yaml` (build, démarrage, health check déjà réglés) et vous demande de saisir les variables marquées *sync: false* : renseignez les mêmes valeurs que ci-dessus.

### E.3 Vérifier le déploiement
- Onglet **Logs**. Vous devez voir, dans l'ordre :
  - `[CONFIG] ⚠️ …` *(éventuels avertissements : lisez-les, ils disent quelle variable manque)*
  - `[DB] ✅ Connexion Neon OK`
  - `[BOOT] Connexion Discord…`
  - `[HTTP] API + health check sur le port … (/api, /health, /ready)`
  - `✅ Bot prêt !`
- Notez l'URL du service en haut de la page (ex. `https://advision-studio-assistant.onrender.com`) → c'est votre **URL Render** (étapes F, G et I).
- Ouvrez `https://VOTRE-URL-RENDER/health` → vous obtenez `{"ok":true,…}`.
- Ouvrez `https://VOTRE-URL-RENDER/ready` → `{"ready":true,"db":true,"discord":true}`.
- Dans Discord, le bot passe **En ligne**, et en tapant `/` les commandes AdVision apparaissent (elles sont enregistrées à chaque démarrage).

**Si le build échoue** : lisez la dernière ligne rouge des logs → §15 (Dépannage).

---

## Étape F — Netlify : le site

### F.1 Importer le projet
1. **https://app.netlify.com** → **Sign up** → *GitHub* → autorisez Netlify.
2. **Add new site** → **Import an existing project** → **Deploy with GitHub** → (autorisez l'accès) → choisissez le dépôt **`advision-site`**.
3. Écran **Build settings** — normalement pré-rempli par `netlify.toml`. Vérifiez **exactement** :

| Champ Netlify | Valeur |
|---|---|
| **Branch to deploy** | `main` |
| **Base directory** | *(vide)* |
| **Build command** | `npm run build` |
| **Publish directory** | `dist` |
| **Functions directory** | *(vide / par défaut)* |

4. Dépliez **Add environment variables** (ou, après création : **Site configuration → Environment variables → Add a variable**) et créez :

| Key | Value |
|---|---|
| `VITE_API_URL` | votre **URL Render**, avec `https://`, **sans** `/` final. Exemple : `https://advision-studio-assistant.onrender.com` |

   *(`NODE_VERSION=22` et le réglage anti « secrets scanning » sont déjà dans `netlify.toml` : ne les recréez pas.)*

5. Cliquez sur **Deploy**. Le premier build dure ~1 à 2 minutes.

> ⚠️ **`VITE_API_URL` est lue au moment du build.** Si vous la créez ou la changez **après** un déploiement, rien ne change tant que vous ne relancez pas : **Deploys → Trigger deploy → Clear cache and deploy site**.

### F.2 Choisir le nom du site
**Site configuration → General → Site details → Change site name** → par ex. `advision-studio` → votre **URL Netlify** devient `https://advision-studio.netlify.app` (notez-la : étape G).

### F.3 Vérifier
Ouvrez l'URL Netlify : le **Hero** (**fond vidéo animé**, logo, boutons) s'affiche comme avant — **c'est le premier contrôle à faire** (s'il est noir : voir Dépannage « Fond animé du Hero absent ») ; le menu fonctionne ; le bouton **Connexion** apparaît à droite.

### F.4 (Alternative sans GitHub) Déposer le dossier construit
Installez Node 22 (nodejs.org), ouvrez un terminal dans `advision-site`, puis : `npm install` → (Windows PowerShell) `$env:VITE_API_URL="https://VOTRE-URL-RENDER"; npm run build` · (Mac/Linux) `VITE_API_URL=https://VOTRE-URL-RENDER npm run build` → glissez le dossier **`dist`** sur https://app.netlify.com/drop. À refaire à chaque modification.

### F.5 Nom de domaine personnalisé (facultatif)
**Domain management → Add a domain** → suivez l'assistant DNS. Ajoutez ensuite **les deux adresses** (Netlify et votre domaine) dans `ALLOWED_ORIGINS`, séparées par une virgule (étape G).

---

## Étape G — Relier Render et Netlify

C'est **l'étape** qui fait fonctionner formulaire, connexion et administration.

1. **Render** → votre service → **Environment** → modifiez **`ALLOWED_ORIGINS`** :
   - valeur : l'**URL Netlify exacte**, `https://advision-studio.netlify.app` (https, **pas de `/` final**, pas d'espace).
   - Plusieurs adresses : `https://advision-studio.netlify.app,https://www.advision.fr`.
2. **Save Changes** → Render redéploie automatiquement (1 à 2 min).
3. Contrôle croisé :

| Variable | Où | Doit contenir |
|---|---|---|
| `VITE_API_URL` | Netlify | l'URL **Render** |
| `ALLOWED_ORIGINS` | Render | l'URL **Netlify**, identique caractère pour caractère à la barre d'adresse du site |

**Vérification** : ouvrez `https://VOTRE-SITE/#/admin` → entrez `ADMIN_PASSWORD` → vous accédez au panel (onglets Demandes, Réalisations, Avis, Absences, Sécurité, Réglages, État). Si le message dit « Origine non autorisée » ou « ALLOWED_ORIGINS non configuré », reprenez le point 1.

---

## Étape H — Votre serveur Discord : salons, permissions, forum

### H.1 Salon des notifications (obligatoire pour recevoir les demandes)
1. Dans Discord, créez un salon **texte** réservé à l'équipe, ex. `🔔・notifications-site` (clic droit sur la catégorie → *Créer un salon*). Seuls le staff et le bot doivent le voir.
2. Donnez au bot, sur ce salon : **Voir le salon**, **Envoyer des messages**, **Intégrer des liens**.
3. Site → `#/admin` → onglet **Réglages** → **Salon des notifications** → choisissez ce salon → **Enregistrer**.
   *(Sans ce choix, le bot essaie de deviner un salon dont le nom contient « notification », « demande » ou « staff ». S'il n'en trouve aucun, il écrit une alerte dans les logs et **n'envoie rien** — c'est la cause n°1 d'un « aucun message reçu ».)*
4. Onglet **État** → bouton **« Envoyer un message de test sur Discord »** → le message doit apparaître dans le salon.

### H.2 Forum des réalisations
1. Discord → **Créer un salon** → **Type de salon : Forum** → nom `🖼️・realisations` (le mot *realisations/réalisations* dans le nom permet la détection automatique).
2. Réglages du forum : laissez les **étiquettes** libres ; si vous activez « *Exiger une étiquette* », le bot en crée une automatiquement (une par type de réalisation).
3. Permissions du bot sur ce forum : **Voir le salon**, **Créer des posts / Envoyer des messages**, **Envoyer des messages dans les fils**, **Gérer les fils** (modifier/supprimer ses posts), et idéalement **Gérer le salon** (créer les étiquettes). *Avec le rôle Administrator, tout est déjà couvert.*
4. Site → `#/admin` → **Réglages** → **Forum des réalisations** → choisissez-le → **Enregistrer** (ou laissez « détection automatique »). L'onglet **État** affiche « forum #… ».

### H.3 Salon des avis publics
Créez un salon **texte** dont le nom contient **`avis`** (ex. `⭐・avis`) : c'est là que les avis **approuvés** sont publiés. (Vous pouvez aussi le désigner avec la commande `/setup`.)

### H.4 Qui est « staff » pour le bot ?
Sont reconnus comme staff : les membres qui ont la permission **Gérer les salons** (donc les administrateurs) **et** les membres des **rôles support, modérateurs et administrateurs** choisis dans `/setup` **ou** dans le site (**Admin → Sécurité**). *(Avant cette version, les sélecteurs « Rôles modérateurs » et « Rôles administrateurs » de `/setup` étaient enregistrés mais jamais appliqués.)* Ce sont eux qui peuvent cliquer sur **Approuver/Refuser** et utiliser `/realisation`. Lancez `/setup` une fois pour désigner vos rôles.

### H.5 Forums et étiquettes (réalisations, absences, panels, avis)
**Règle : tout post créé par le bot dans un forum reçoit des étiquettes**, quel que soit le panel. Le bot crée lui-même les étiquettes qui manquent (permission **Gérer le salon**) ; sans cette permission il utilise celles qui existent déjà.

| Contenu | Où | Étiquettes automatiques |
|---|---|---|
| **Réalisation** | forum `realisations` | type (Publicité produit…) · Projet client / Démonstration · En vedette |
| **Absence du staff** | forum `absences` (réglage **Admin → Réglages → Forum des absences**, ou détecté par le nom « absence ») | statut (En attente / Acceptée / Refusée / Prise en compte / **Terminée**) · durée (1 semaine max / 1 à 4 semaines / Plus d'un mois) |
| **Panels** (absences, services, prestations, tickets, avis, central) | le forum que vous choisissez | type du panel · « Panel » |
| **Prise de service** (`/service panel`) | idem | Prise de service · Panel |
| **Avis publics** | forum `avis` (si le salon des avis est un forum) | 1 à 5 étoiles · Avis du site / Avis Discord ; un post « statistiques » (étiquette Statistiques) tenu à jour |

**Publier le panel d'absences dans un forum** : de **trois façons**, toutes valides :
1. `/absence panel salon:#forum-absences` (crée un **nouveau post** étiqueté) ;
2. lancer `/absence panel` **dans un post de forum existant** (le panel s'y ajoute et le post est étiqueté) ;
3. depuis le panel d'administration des panels du studio en donnant l'ID du forum (un post par panel, mis à jour sans doublon à chaque redémarrage).

Fonctionnement des absences : déclaration (bouton du panel) → **un post étiqueté** est créé dans le forum des absences ; quand un responsable change le statut (Discord **ou** site → onglet **Absences**), l'étiquette suit ; « terminée » (manuel, ou **automatique 1 jour après la date de retour**) → étiquette **Terminée**, post **verrouillé et archivé**. Le **motif n'est jamais publié**.
Permissions du bot sur ces forums : voir le salon, créer des posts, envoyer des messages (y compris dans les fils), **gérer les fils**, **gérer le salon** (créer les étiquettes).


---

## Étape I — Connexion Google et Discord

> **Facultatif** : sans cette étape, les clients peuvent se connecter **par e-mail** (code). Chaque bouton (Google, Discord) n'apparaît sur le site **que si son fournisseur est configuré**.
> Dans toutes les adresses ci-dessous, remplacez `VOTRE-URL-RENDER` par votre URL Render (ex. `advision-studio-assistant.onrender.com`). Elles doivent être **identiques au caractère près** à celles saisies chez Google/Discord.

### I.1 Connexion Discord (même application que le bot)
1. https://discord.com/developers/applications → votre application → **OAuth2** (menu de gauche).
2. **Client Secret** → **Reset Secret** → copiez-le (affiché une fois) → ce sera **`DISCORD_CLIENT_SECRET`**.
3. **Redirects** → **Add Redirect** → saisissez **exactement** :
   `https://VOTRE-URL-RENDER/api/auth/discord/callback`
   → **Save Changes**.
4. Render → Environment → ajoutez **`DISCORD_CLIENT_SECRET`** = le secret. (`DISCORD_CLIENT_ID` existe déjà.)

### I.2 Connexion Google
1. **https://console.cloud.google.com** (connectez-vous) → sélecteur de projet (en haut) → **New project** → nom `AdVision` → **Create**, puis sélectionnez-le.
2. Menu ☰ → **APIs & Services** → **OAuth consent screen** (selon la version : *Google Auth Platform*) → **Get started** / **Configure** :
   - **App name** : `AdVision Studio` · **User support email** : votre e-mail
   - **Audience / User type** : **External** · **Contact** : votre e-mail → **Create**.
3. **Credentials** (ou *Clients*) → **+ Create credentials → OAuth client ID** :
   - **Application type** : **Web application** · **Name** : `AdVision web`
   - **Authorized redirect URIs** → **+ Add URI** → saisissez **exactement** :
     `https://VOTRE-URL-RENDER/api/auth/google/callback`
   - (*Authorized JavaScript origins* : **laissez vide** — la connexion se fait côté serveur.)
   - **Create**.
4. Copiez **Client ID** (`…apps.googleusercontent.com`) → **`GOOGLE_CLIENT_ID`** et **Client secret** → **`GOOGLE_CLIENT_SECRET`**.
5. **Audience → Publish app** (passer de *Testing* à *In production*) : sinon seuls les « utilisateurs test » ajoutés à la main peuvent se connecter. Les autorisations demandées (`openid`, `email`, `profile`) sont de base : en principe aucune vérification Google n'est exigée.
6. Render → Environment → ajoutez **`GOOGLE_CLIENT_ID`** et **`GOOGLE_CLIENT_SECRET`**.

### I.3 Vérifier
- Render redéploie après l'ajout des variables. Ouvrez `https://VOTRE-SITE/#/login` : les boutons **Continuer avec Google** / **Continuer avec Discord** apparaissent.
- Site → `#/admin` → **État** : lignes « Connexion Google » et « Connexion Discord » en ●.
- Si, après clic, le fournisseur affiche **« redirect_uri_mismatch »** (Google) ou **« Invalid OAuth2 redirect_uri »** (Discord) : l'adresse saisie chez le fournisseur diffère de `https://VOTRE-URL-RENDER/api/auth/…/callback` (http/https, `/` en trop, faute de frappe…).

---

## Étape J — Garder le bot éveillé

L'offre gratuite de Render **met le service en veille après ~15 minutes sans visite** : le bot Discord est alors **hors-ligne** et le premier visiteur attend ~1 minute. Le bot s'auto-pingue, mais **ce n'est pas garanti**. Ajoutez un ping externe gratuit :
1. **https://uptimerobot.com** → **Register** (gratuit).
2. **+ Add New Monitor** → **Monitor Type** : *HTTP(s)* → **Friendly Name** : `AdVision bot` → **URL** : `https://VOTRE-URL-RENDER/health` → **Monitoring Interval** : **5 minutes** → **Create Monitor**.
3. Utilisez bien **`/health`** (léger, sans base de données) et **pas `/ready`** : `/ready` interroge Neon et consommerait ses heures gratuites.

> **Soyons clairs** : même avec ce ping, rien ne garantit un fonctionnement 24 h/24 sur l'offre gratuite (Render peut redémarrer ou suspendre le service). Pour une disponibilité garantie, il faut un plan payant de Render. Le site, lui, gère l'attente (message « le serveur se réveille » et nouvelles tentatives automatiques).

---

## Étape K — Vérification complète après déploiement

Faites ces contrôles **dans l'ordre**. Cochez chaque case ; à la première qui échoue, allez au §15.

### K.0 Si le formulaire ou la connexion ne marchent pas : le diagnostic
Ouvrez **`https://VOTRE-SITE/#/diagnostic`** (ou cliquez sur **« Lancer le diagnostic de connexion »** sous le message d'erreur). La page teste, depuis votre navigateur : ① la variable `VITE_API_URL` ② la forme de l'adresse ③ si le serveur répond (réveil de Render : jusqu'à 1 minute) ④ si le serveur **autorise votre site (CORS)** — elle indique l'adresse **exacte** à mettre dans `ALLOWED_ORIGINS` ⑤ base Neon, bot Discord, **envoi d'e-mails** ⑥ modes de connexion proposés. Chaque ✗ s'accompagne de la correction. Le bouton **« Copier le rapport »** produit un texte sans donnée sensible à m'envoyer en cas de doute.

### K.1 État général
- [ ] `https://VOTRE-URL-RENDER/ready` → `{"ready":true,"db":true,"discord":true}`.
- [ ] Site → `#/admin` → connexion → onglet **État** : **Bot Discord, Base Neon, E-mails, Notifications Discord, Réalisations Discord, Sécurité CORS** en ●. *(Google/Discord : ● si configurés.)*

### K.2 Tests réels depuis l'onglet État
- [ ] **« Envoyer un message de test sur Discord »** → message reçu dans le salon des notifications.
- [ ] **« Envoyer un e-mail de test »** (saisissez *votre* adresse) → e-mail reçu (vérifiez les indésirables). Dans les logs Render : `[MAIL] ✅ e-mail accepté par Brevo (HTTP 201)` *(ou Resend)*.

### K.3 Connexion client par e-mail (réception et validation d'un code)
1. Navigateur en **navigation privée**, ouvrez le site → **Connexion** → saisissez une adresse e-mail → **Recevoir un code**.
2. [ ] Le message « Un code a été envoyé… valable 10 minutes » s'affiche et le bouton *Renvoyer* affiche un **décompte de 30 s**.
3. [ ] Vous recevez l'e-mail avec un **code à 6 chiffres**.
4. [ ] Saisissez un **faux code** → « Code incorrect. Il reste 4 tentative(s). »
5. [ ] Saisissez le **bon code** → vous arrivez sur **Mon compte**, connecté.
6. [ ] Après vous être déconnecté, redemandez un code, puis tentez de réutiliser **l'ancien** code → refusé (« expiré ou déjà utilisé »).

### K.4 Connexion Google / Discord (si configurés)
- [ ] **Continuer avec Google** → écran Google → retour sur le site, connecté (nom/avatar dans le menu).
- [ ] Idem **Discord**.
- [ ] **Mon compte → Se déconnecter** fonctionne ; **Supprimer mon compte** demande une confirmation.

### K.5 Demande de prestation + affichage dans l'administration
**Avec un code (visiteur non connecté, navigation privée)** :
1. Site → **Contact** → remplissez le formulaire → **Envoyer** → étape « Vérification » → code reçu par e-mail → saisie.
2. [ ] Écran de succès avec une **référence `D-xxxx`**.
3. [ ] Un message **« Nouvelle demande depuis le site (e-mail vérifié ✅) »** arrive dans le salon des notifications Discord.
4. [ ] Site → `#/admin` → **Demandes** : la demande apparaît ; changez son **statut** (Nouvelle → En cours) ; **Archiver** fonctionne.

**Avec un compte connecté (sans code)** :
5. [ ] Connecté à votre compte, **Contact** → le formulaire est prérempli, la mention « *Connecté — votre e-mail est déjà vérifié* » s'affiche → envoi **sans code** → référence `D-xxxx`.
6. [ ] **Mon compte → Mes demandes** montre la demande avec son **statut** (qui change quand vous le modifiez dans l'admin).

### K.6 Modération d'un avis (dans les deux sens)
**Site → Discord**
1. [ ] Site → **Reviews** → déposez un avis (note, texte de 10 caractères minimum).
2. [ ] Discord : notification **« Nouvel avis du site à modérer »** avec les boutons **✅ Approuver / 🚫 Refuser**.
3. [ ] Cliquez **Approuver** → l'avis est **publié dans le salon `avis`** de Discord **et** apparaît sur la page Reviews du site (≤ 30 s, ou en rechargeant).

**Admin du site → Discord**
4. [ ] Déposez un second avis → Site `#/admin` → **Avis** → **Approuver et publier** → publié dans Discord et sur le site.

**Discord → Site**
5. [ ] Un avis déposé côté Discord (ticket/`/avis`) → notification avec boutons → *Approuver* → visible sur la page Reviews du site.

### K.7 Réalisations : publication sur Discord et synchronisation dans les deux sens
**Site → Discord**
1. [ ] `#/admin` → **Réalisations** → renseignez **Titre**, **Type**, **Marque**, **Description** (liens `https://…` facultatifs) → laissez cochée **« Poster aussi sur Discord »** → **Ajouter**.
2. [ ] Message vert « Ajoutée et visible sur le site. ✅ Publiée dans Discord ».
3. [ ] Dans le **forum Discord**, un **nouveau post** porte le titre de la réalisation, avec l'embed et une **étiquette** du type.
4. [ ] Page **Our Work** du site : la réalisation apparaît.
5. [ ] **Modifier** le titre dans l'admin → le titre du post Discord change.
6. [ ] **Masquer** (icône œil) → le post Discord disparaît ; **Afficher** → il est republié.

**Discord → Site**
7. [ ] Dans Discord : `/realisation ajouter` (titre, type…) → réponse « ajoutée et visible sur le site » → post dans le forum → la réalisation apparaît sur **Our Work** (≤ 30 s) et dans `#/admin → Réalisations`.
8. [ ] `/realisation visibilite` (choisir l'ID) → la réalisation disparaît de Our Work.
9. [ ] `/realisation retirer` → elle disparaît du site, de l'admin et du forum.

### K.8 Protection Discord
- [ ] `/protection statut` → tout en ✅ (voir **Étape L** pour le détail et les tests d'anti-spam / anti-raid).
- [ ] Onglet **État** du panel : ligne **« IP vue par le serveur »** = **votre** adresse publique (sinon voir Dépannage).

### K.8 bis Forums et étiquettes
- [ ] `/absence panel` lancé **dans un post de forum** (ou avec `salon:#forum`) → « ✅ Panel de déclaration d'absence posté … avec ses étiquettes » (plus de message « Ce salon ne permet pas de poster un panel »).
- [ ] Déclarez une absence via le panel → un **post** apparaît dans le forum des absences avec les étiquettes **statut + durée**.
- [ ] Site → **Absences** → changez le statut (ou **Marquer terminée**) → l'**étiquette du post change** ; terminée → post **archivé et verrouillé**.
- [ ] Ajoutez une réalisation → post avec étiquettes **type** + **Projet client/Démonstration** ; mettez-la **en vedette** → étiquette « En vedette » ajoutée.
- [ ] Site → **Sécurité** : l'état affiche les permissions du bot ; enregistrez un changement → message « Enregistré… Actif immédiatement ».

### K.9 Rapidité
- [ ] Site (Netlify) : le texte et les boutons du Hero s'affichent **avant** la vidéo.
- [ ] Après une longue inactivité, le premier clic sur un formulaire peut prendre jusqu'à ~1 minute (réveil de Render + Neon) : un message « Notre serveur se réveille… » s'affiche — c'est normal sur l'offre gratuite.

---

## Étape L — Protection anti-spam et anti-raid : activer et tester

### L.1 Ce que fait le bot (version actuelle)
| Protection | Déclenchement | Action |
|---|---|---|
| **Anti-spam — débit** | 5 messages en 5 s (réglable dans `/setup → Modération → ⚙️ Seuils`) | message supprimé + **sourdine** : 1ʳᵉ fois 5 min, récidive (30 min) 30 min, puis 6 h ; avis temporaire dans le salon ; ligne d'infraction + alerte dans le salon de logs |
| **Anti-spam — répétition** | même message (≥ 4 caractères) 3 fois en 30 s | idem |
| **Anti-raid** | **5 nouveaux comptes en 10 s** (réglable dans `/setup → Modération → ⚙️ Seuils`, minimum 2) | **mode raid** 10 min (prolongé à chaque arrivée) : chaque arrivant est mis en **sourdine 1 h** (réversible, rien n'est expulsé automatiquement) ; **alerte** au staff avec 2 boutons : **✅ Fin d'alerte** (lève les sourdines) / **👢 Expulser les suspects** |
| Anti-majuscules / mentions / liens | selon les interrupteurs `/setup → Modération` | suppression + avertissement |

> **Pourquoi « ça ne marchait pas » avant ?** (1) l'**anti-raid n'existait pas** : seul l'interrupteur s'affichait, aucun code ne surveillait les arrivées ; (2) l'anti-spam **ignore les administrateurs et les modérateurs** (permission *Gérer les messages*) : un test fait avec votre compte admin ne peut jamais le déclencher ; (3) il ne s'applique que si les interrupteurs sont activés ; (4) si le bot n'a pas les bonnes permissions, rien ne le signalait.

### L.2 Activer et diagnostiquer — commande `/protection`
Dans Discord (réservée au staff) :
- **`/protection statut`** : affiche les interrupteurs, les seuils, l'état du mode raid, les **permissions réelles du bot** (✅/❌) et le **salon des alertes**.
- **`/protection activer`** : active en une fois modération automatique + anti-spam + anti-raid.
- **`/protection fin-raid`** : termine le mode raid et lève les sourdines.
Au démarrage, les **logs Render** affichent aussi : `[PROTECTION] automod=ON anti-spam=ON (5 msg/5s) anti-raid=ON (5 arrivées/10s) · alertes → #salon` et des **avertissements** si une permission ou le salon d'alertes manque.

### L.3 Permissions indispensables du bot (sinon il ne peut PAS sanctionner)
- **Gérer les messages** (supprimer le spam) · **Mettre les membres en sourdine** (*Moderate Members*) · **Expulser des membres** (bouton « Expulser les suspects »).
- Le **rôle du bot doit être AU-DESSUS** des rôles des membres à sanctionner (*Paramètres du serveur → Rôles*, glisser le rôle du bot vers le haut). Discord refuse toute sourdine sur un membre dont le rôle est plus haut — et **jamais** sur le propriétaire du serveur.
- Un salon d'alertes : salon **logs de modération** (`/setup`) ou **notifications** (Admin → Réglages).

### L.4 Tester l'anti-spam (la bonne méthode)
1. `/protection statut` → tout ✅ (sinon `/protection activer`, puis corrigez les permissions ❌).
2. Utilisez un **compte normal** (second compte, ami) **sans** permission *Gérer les messages* ni rôle d'administrateur, avec un rôle **plus bas** que celui du bot.
3. Avec ce compte, envoyez **5 messages différents en moins de 5 secondes** → le 5ᵉ est supprimé, le compte est en **sourdine 5 min**, un avis s'affiche puis disparaît, une alerte arrive dans le salon des logs.
4. Variante « répétition » : envoyez **3 fois le même texte** (≥ 4 caractères) en 30 s.
5. Renvoyez 5 messages après la fin de la sourdine → sourdine **30 min** (récidive).
6. Lever une sourdine : clic droit sur le membre → *Retirer le délai d'attente*.

### L.5 Tester l'anti-raid (sans risque)
1. `/setup` → **Modération** → **⚙️ Seuils** → *Anti-raid : arrivées en 10 s* = **2** (temporairement).
2. Faites rejoindre **2 comptes secondaires** à moins de 10 s d'écart (lien d'invitation).
3. Résultat attendu : les 2 comptes sont en **sourdine 1 h**, **aucun message de bienvenue**, et une alerte **« 🚨 RAID PROBABLE DÉTECTÉ »** avec les boutons arrive dans le salon des logs/notifications.
4. Cliquez **✅ Fin d'alerte** → sourdines levées ; **remettez le seuil à 5**.
> Un vrai événement (lancement, annonce) peut déclencher une **fausse alerte** : c'est pourquoi la sanction est une sourdine réversible et que le bouton « Fin d'alerte » existe.

### L.6 Limites à connaître
- La protection est **en mémoire** : un redémarrage du bot (ou la veille de l'offre gratuite de Render) remet les compteurs à zéro.
- Elle est **complémentaire** de l'**AutoMod natif de Discord** (*Paramètres du serveur → AutoMod*), qui bloque mots interdits, spam de mentions et liens **côté Discord, même si le bot est endormi** : activez-le aussi.
- Le niveau de **vérification** du serveur (*Paramètres → Sécurité*) et la **vérification par rôle** restent la meilleure parade contre les raids.

### L.7 Tout se règle aussi sur le site : Admin → **Sécurité**
Le panel d'administration du site reprend les réglages de sécurité de `/setup` : interrupteurs (modération automatique, anti-spam, anti-raid, liens, majuscules, mentions), **seuils** (bornés pour éviter une valeur absurde), **rôles modérateurs / administrateurs / exemptés**, **salons de logs**, et affiche l'**état réel de la protection** (permissions du bot ✅/❌, salon d'alertes, mode raid). Les changements sont **actifs immédiatement**. Les valeurs sont validées côté serveur (types, bornes, identifiants Discord).

---

## Étape M — Informations légales (obligatoire avant d'annoncer le site)

1. Ouvrez `src/lib/legalConfig.ts` et remplacez chaque « [À COMPLÉTER …] » par vos vraies informations (nom ou raison sociale, statut, adresse ou domiciliation, SIRET, directeur de la publication).
2. Relisez les pages **Mentions légales**, **Confidentialité et cookies** et **Conditions d'utilisation** (liens en bas du site, ou `#/legal`, `#/privacy`, `#/terms`). Vérifiez notamment le prestataire d'e-mails (Brevo ou Resend) et les durées de conservation.
3. Ce sont des modèles, pas un avis juridique : faites-les relire si votre activité est commerciale.
4. Le site n'utilise aucun cookie publicitaire ni outil de suivi : un bandeau d'information suffit. Si vous ajoutez des statistiques ou de la publicité, il faudra un vrai bandeau « accepter / refuser ».
5. Une copie d'un site web ne peut pas être empêchée techniquement : ces pages servent de base juridique, pas de protection technique.

**Vérification** : ouvrez le site en navigation privée → le bandeau apparaît en bas à gauche → « En savoir plus » ouvre la confidentialité. Pied de page → **Email** → le menu propose Gmail, Outlook, Yahoo, l'application par défaut, copier.

## Récapitulatif de TOUTES les variables

### Render (bot + API) — noms exacts lus par le code
| Variable | Obligatoire | Valeur attendue |
|---|---|---|
| `DISCORD_TOKEN` | **oui** | token du bot (Developer Portal → Bot → Reset Token) |
| `DISCORD_CLIENT_ID` | **oui** | Application ID |
| `DISCORD_GUILD_ID` | **oui** | ID du serveur Discord |
| `DATABASE_URL` | **oui** | chaîne Neon `postgresql://…?sslmode=require` (connexion directe) |
| `ADMIN_PASSWORD` | **oui** | mot de passe long (≥ 12 caractères) |
| `ALLOWED_ORIGINS` | **oui** | URL(s) exacte(s) du site, `https://…`, sans `/` final, séparées par des virgules |
| `NODE_ENV` | **oui** | `production` |
| `BREVO_API_KEY` **ou** `RESEND_API_KEY` | **oui** (un des deux) | clé API du fournisseur |
| `MAIL_FROM_EMAIL` | **oui** | adresse expéditrice validée |
| `MAIL_FROM_NAME` | non | `AdVision Studio` (défaut) |
| `VERIFY_SECRET` | recommandé | chaîne aléatoire ≥ 40 caractères (sinon `ADMIN_PASSWORD` sert de secret) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | non | connexion Google (étape I.2) |
| `DISCORD_CLIENT_SECRET` | non | connexion Discord (étape I.1) |
| `API_PUBLIC_URL` | non | URL publique du bot — **inutile sur Render** (détectée) ; seulement avec un domaine personnalisé |
| `NOTIFY_CHANNEL_ID`, `REALISATIONS_CHANNEL_ID` | non | forcer les salons (sinon Réglages du panel) |
| `TRUST_PROXY_HOPS` | non | `1` (défaut, Render). À ajuster seulement si « Admin → État → IP vue » n'affiche pas **votre** adresse publique |
| `DIRECT_URL` | non | URL Neon directe si `DATABASE_URL` est une URL « pooled » |
| `DEPLOY_COMMANDS_ON_START` | non | `true` (défaut) ; `false` pour désactiver |
| `ALERT_WEBHOOK_URL` | non | webhook Discord d'alerte en cas d'erreur critique |
| `BOT_LOGO_URL` | non | logo des embeds |
| `AI_API_KEY`, `AI_PROVIDER`, `AI_MODEL`, `AI_API_URL` | non | assistant IA `/assistant` (facultatif) |
| `SELF_PING_URL` | non | uniquement hors Render |
| `PORT`, `RENDER_EXTERNAL_URL` | **ne pas créer** | fournis par Render |

### Netlify (site) — une seule variable, publique
| Variable | Valeur |
|---|---|
| `VITE_API_URL` | URL Render, `https://…`, sans `/` final |

---

## Dépannage

| Symptôme | Cause probable | Que faire |
|---|---|---|
| Build Render : `Cannot find module` / erreur Prisma | dépendances non installées | Vérifiez *Build Command* = `npm install --no-audit --no-fund && npm run build` (pas `npm ci`) |
| Build Render : `DATABASE_URL doit commencer par postgresql://` | URL absente/erronée | Corrigez `DATABASE_URL` (chaîne Neon complète) |
| Build Render : erreur de connexion Neon / `P1001` | base endormie ou URL « pooled » | Relancez le déploiement ; utilisez l'URL **non poolée** (étape B.5) |
| Build Render : erreur **TypeScript** (`tsc`) | je n'ai pas pu compiler hors ligne | Envoyez-moi **la ligne d'erreur exacte** des logs : je corrige |
| Logs : *Intents privilégiés non activés* | étape C.2 oubliée | Activez Server Members + Message Content, sauvegardez, redéployez |
| Logs : *DISCORD_TOKEN invalide* | token périmé/mal copié | *Reset Token*, recopiez dans Render |
| Bot en ligne mais pas de commandes `/` | `DEPLOY_COMMANDS_ON_START=false`, ou invitation sans `applications.commands` | Supprimez cette variable ; ré-invitez avec les deux *scopes* (C.3) |
| **Rien ne marche** sur le site (contact, code, connexion) | `VITE_API_URL` absente au build, `ALLOWED_ORIGINS` ≠ URL du site, Render endormi, e-mails non configurés | **Ouvrez `#/diagnostic`** : la cause exacte et la correction s'affichent (§K.0) |
| Site : « le site n'est pas relié à son serveur » | `VITE_API_URL` absente **au moment du build** | Créez-la puis **Clear cache and deploy** (F.1) |
| Site : « serveur injoignable » | Render en veille / `ALLOWED_ORIGINS` faux | Patientez 1 min ; vérifiez qu'il est **identique** à l'URL Netlify (G) |
| Admin : « Origine non autorisée » | `ALLOWED_ORIGINS` ≠ URL du site | Corrigez (G) |
| Admin : « ALLOWED_ORIGINS non configuré… » | variable absente | Ajoutez-la (G) |
| Admin : mot de passe refusé / trop d'essais | erreur de frappe ; blocage temporaire anti-brute-force | Attendez quelques minutes ; vérifiez `ADMIN_PASSWORD` sur Render |
| E-mail de test refusé | clé API fausse, expéditeur non validé, compte Brevo en attente, IP non autorisée | Lisez le message affiché dans l'onglet État (il reprend la réponse du fournisseur) |
| Code reçu en **spam** | expéditeur Gmail / domaine non authentifié | Utilisez une adresse de **votre domaine** authentifiée (SPF/DKIM) chez Brevo/Resend |
| `/absence panel` : « Ce salon ne permet pas de poster un panel » | version ancienne : seuls les salons texte étaient acceptés | Version actuelle : texte, forum **ou** post de forum (§H.5) |
| Panel / post sans étiquettes | le bot n'a pas **Gérer le salon** (création des étiquettes) | Donnez-lui la permission ou créez les étiquettes à la main dans le forum |
| Anti-spam / anti-raid « ne fait rien » | interrupteurs désactivés, permissions manquantes, test fait avec un compte admin/modo (exempté), rôle du bot trop bas | `/protection statut` puis **Étape L** |
| « IP vue par le serveur » ≠ votre IP | proxy supplémentaire devant le bot | Ajustez `TRUST_PROXY_HOPS` (2 par ex.) puis redéployez |
| Demande enregistrée mais **rien dans Discord** | aucun salon de notifications | Réglages → salon → Enregistrer ; **Test Discord** (H.1) |
| Réalisation non publiée (« ⚠️ Enregistrée, mais Discord n'a pas pu… ») | pas de forum, ou permissions manquantes | Créez le forum « réalisations » ; donnez *Gérer les fils* au bot (H.2) ; onglet **État** |
| `redirect_uri_mismatch` / `Invalid OAuth2 redirect_uri` | adresse de retour différente | Reprenez I.1 / I.2 (copie exacte) |
| Boutons Google/Discord absents | variables non définies | Ajoutez-les, attendez le redéploiement |
| Google : « accès bloqué / app en test » | écran de consentement non publié | I.2 point 5 |
| Netlify : build échoue « secrets scanning » | réglage absent | `netlify.toml` contient déjà `SECRETS_SCAN_OMIT_KEYS` : vérifiez qu'il est dans le dépôt |
| Fond animé du Hero absent (fond noir) | flux vidéo bloqué (extension anti-pub / réseau), ou système avec « réduire les animations » (image fixe voulue) | Testez sans extensions ; console du navigateur (F12) ; `RESPECT_REDUCED_MOTION = false` dans `src/lib/heroVideo.ts` pour forcer la lecture |
| Netlify : écran blanc | erreur JavaScript ou `VITE_API_URL` | Console du navigateur (F12) ; renvoyez-moi le message |

---

## Mises à jour, sauvegardes et limites

- **Mettre à jour le bot ou le site** : modifiez les fichiers, puis dans GitHub Desktop → *Commit to main* → *Push origin*. Render et Netlify redéploient seuls.
- **Avant tout changement de base de données** : branche de sauvegarde Neon (étape B). Le build applique le schéma avec `prisma db push` **sans** l'option destructrice : un changement qui effacerait des données est **refusé**, pas exécuté.
- **Anciennes données SQLite** : non migrées automatiquement (Neon démarre vide). Conservez l'ancien fichier `.db`.
- **Render Free** : mise en veille après ~15 min sans visite ; quota d'heures mensuel ; disque éphémère ; SMTP sortant bloqué (d'où l'API e-mail). Vérifiez les limites actuelles sur render.com/pricing.
- **Neon Free** : endormissement + temps de calcul plafonné ; stockage limité. neon.tech/pricing.
- **Netlify Free** : quotas de build/bande passante ; un site statique en consomme très peu. netlify.com/pricing.
- **Brevo / Resend (gratuit)** : quotas journaliers/mensuels d'e-mails — surveillez-les dans leur tableau de bord.
- **Sécurité à maintenir** : mot de passe admin long ; ne partagez jamais les clés ; régénérez-les en cas de doute ; lancez de temps en temps `npm audit` dans chaque projet (non effectué ici : pas d'accès au registre npm).
