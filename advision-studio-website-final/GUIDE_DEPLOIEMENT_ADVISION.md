# Guide de déploiement — AdVision Studio (bot + backend + dashboard + site)

Architecture : **Site (Cloudflare Pages)** → HTTPS → **Backend Node + Bot Discord + Dashboard (Render)** → **Neon PostgreSQL** + **API e-mail (Brevo ou Resend)**.
Tout se passe dans un seul service Render : le bot, l'API (`/api`) et le dashboard (`/dashboard`) partagent la même base.

> ⚠️ Rien de ce qui suit n'a été exécuté en production par moi (pas d'accès Internet ni à vos comptes). Suivez la section « Vérifications » à chaque étape.

---

## 0. Variables d'environnement (liste complète)

### Render (bot + backend)
| Variable | Obligatoire | Rôle |
|---|---|---|
| `DISCORD_TOKEN` | oui | Token du bot |
| `DISCORD_CLIENT_ID` | oui | ID de l'application |
| `DISCORD_GUILD_ID` | oui | ID du serveur |
| `DATABASE_URL` | oui | URL Neon `postgresql://…?sslmode=require` |
| `DIRECT_URL` | non | URL Neon « Direct » (sans `-pooler`) ; sinon `DATABASE_URL` est utilisée |
| `ADMIN_PASSWORD` | oui | Mot de passe du dashboard (long, unique) |
| `ALLOWED_ORIGINS` | oui (prod) | URL(s) du site, séparées par des virgules, sans `/` final |
| `BREVO_API_KEY` **ou** `RESEND_API_KEY` | oui | Envoi du code par e-mail |
| `MAIL_FROM_EMAIL` | oui | Adresse expéditrice validée chez le fournisseur |
| `MAIL_FROM_NAME` | non | Nom affiché (défaut : AdVision Studio) |
| `VERIFY_SECRET` | recommandé | Secret de hachage des codes (sinon `ADMIN_PASSWORD`) |
| `NODE_ENV` | oui | `production` |
| `REALISATIONS_CHANNEL_ID` | non | Salon Discord des réalisations (sinon détection par le nom) |
| `DEPLOY_COMMANDS_ON_START` | non | `true` par défaut ; `false` pour ne pas redéployer les commandes à chaque démarrage |
| `ALERT_WEBHOOK_URL` | non | Webhook Discord d'alerte en cas de crash |
| `AI_API_KEY`, `AI_PROVIDER`, `AI_MODEL` | non | Assistant IA facultatif |

`PORT` est fourni par Render. `RENDER_EXTERNAL_URL` aussi (auto-ping).

### Hébergeur du site (variable publique — jamais de secret ici)
| Variable | Rôle |
|---|---|
| `VITE_API_URL` | URL du bot, ex. `https://advision-studio-assistant.onrender.com` |
| `NODE_VERSION` | `22` (Vite 7 exige Node ≥ 20.19 / 22.12) |

---

## 1. Neon
1. neon.tech → créer un projet (région proche de votre région Render).
2. **Connect** → copier la chaîne (garder `?sslmode=require`) → `DATABASE_URL`.
3. Les tables sont créées au *build* Render par `scripts/db-push.mjs` (= `prisma db push` **sans** `--accept-data-loss`). Une modification qui supprimerait des données est **refusée** au lieu d'être exécutée.
4. **Avant toute modification du schéma en production** : Neon → *Branches* → créer une branche (copie instantanée = sauvegarde), puis déployer.
5. Limites (à revérifier sur neon.tech/pricing) : l'offre gratuite endort la base après quelques minutes sans requête (premier appel plus lent) et plafonne les heures de calcul → **ne pingez pas la base en continu** (voir §2).

### Données SQLite anciennes
Elles ne sont pas migrées automatiquement (formats différents). Si elles comptent : gardez le fichier `.db`, ne le supprimez pas, et demandez un script d'import ponctuel. Sinon la base Neon démarre vide.

### Migrations « versionnées »
J'ai conservé `db push` (sûr, non destructif) car je n'ai pas pu générer de fichiers de migration sans accès à Prisma/Neon. Pour passer aux migrations versionnées plus tard : `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > migration.sql`, puis `prisma migrate resolve --applied` sur la base existante, puis `prisma migrate deploy` au build.

---

## 2. Render
1. Poussez le dossier du bot sur GitHub.
2. Render → **New → Blueprint** → choisissez le dépôt (`render.yaml`) ; renseignez les variables `sync: false`.
   Sinon *Web Service* manuel : Build `npm install --no-audit --no-fund && npm run build` — Start `node dist/index.js` — Health check `/health`.
3. Logs attendus : `[DB] ✅ Connexion Neon OK` puis `Bot prêt`.
4. **Vérifications** :
   - `https://VOTRE-BOT.onrender.com/health` → `{"ok":true}` (liveness, instantané)
   - `/ready` → `{"ready":true,"db":true,"discord":true}` (contrôle réel base + Discord)
   - `/dashboard` → page de connexion ; après connexion, la carte **État des services** doit afficher Bot / Base / E-mails / CORS.

### Limites réelles du forfait gratuit (à lire)
- Le service est **mis en veille après ~15 min sans requête entrante** ; le réveil prend jusqu'à ~1 min. Pendant la veille, **le bot Discord est hors-ligne** (il ne reçoit plus les commandes).
- L'auto-ping interne et un ping externe réduisent la veille mais **ne la garantissent pas** : Render peut aussi redémarrer ou suspendre le service. Ce n'est pas un service « toujours actif » au sens contractuel.
- UptimeRobot (gratuit) → monitor HTTP sur `/health` toutes les 5 min : bon compromis. Utilisez `/health`, **pas** `/ready` (qui interroge Neon et consommerait ses heures gratuites).
- Le disque est éphémère : rien d'important ne doit être écrit en fichier (tout est dans Neon).
- Le SMTP sortant est bloqué sur l'offre gratuite : d'où l'API HTTP pour les e-mails.
- Si vous exigez 24 h/24 sans coupure : plan payant Render (le seul vrai remède).
- Après un redémarrage, les notifications Discord non envoyées sont **reprises automatiquement** (job toutes les 2 min, 12 tentatives max, 7 jours).

---

## 3. Discord
1. discord.com/developers/applications → New Application → copier **Application ID** (`DISCORD_CLIENT_ID`).
2. **Bot** → Reset Token (`DISCORD_TOKEN`).
3. Intents privilégiés à activer : **Server Members Intent** (bienvenue, rôles, noms d'avis) et **Message Content Intent** (automod, compteur, AFK, messages dans les tickets). Ils sont réellement utilisés par le code ; **Presence Intent n'est pas nécessaire**.
4. Inviter le bot : `https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=8&scope=bot+applications.commands`
   (Administrateur = simple ; pour réduire les droits, donnez : gérer salons, rôles, messages, expulser/bannir, modérer les membres, envoyer des messages/embeds.)
5. Mode développeur → clic droit sur le serveur → *Copier l'identifiant* (`DISCORD_GUILD_ID`).
6. Les slash commands sont enregistrées au démarrage. `/aide` liste tout ; groupes : `admin/config/panel/setup` (administrateurs), `mod` (modération), `tickets/statut`, `avis`, `realisation`, `projet`, `service(s)`, `promotion`, `sondage`, `annonce`, `absence`, `moi`, `status`, `assistant`.

---

## 4. E-mails (code de vérification)
**Brevo** (le plus simple) : compte → *SMTP & API* → clé API v3 (`BREVO_API_KEY`) ; *Senders* → ajouter et valider votre adresse (`MAIL_FROM_EMAIL`).
**Resend** : clé API (`RESEND_API_KEY`) + vérification de votre domaine (obligatoire pour écrire à des adresses quelconques) ; `MAIL_FROM_EMAIL` = adresse de ce domaine.
Quotas gratuits à revérifier chez le fournisseur (ordre de grandeur : quelques centaines de mails/jour).
**Test** : formulaire de contact → vous recevez le code → saisie → page de confirmation avec une référence `D-xxxx` → notification dans le salon de notifications Discord + ligne dans le dashboard.
Si le fournisseur échoue : le visiteur voit un message d'indisponibilité et la demande n'est **pas** enregistrée comme vérifiée ; il peut passer par Discord.

---

## 5. Site
**Comparatif** : Cloudflare Pages et Netlify conviennent (site statique, routage par `#` donc aucune règle de réécriture). Je recommande **Cloudflare Pages** (bande passante gratuite généreuse, `_headers` pris en charge).
- Build : `npm run build` — Sortie : `dist` — `NODE_VERSION=22` — `VITE_API_URL=<URL Render>`.
- Après déploiement : mettre l'URL du site dans `ALLOWED_ORIGINS` (Render) → redéploiement du bot.
- `public/_headers` contient en-têtes de sécurité + CSP en mode **rapport seulement** : ouvrez la console du navigateur, vérifiez qu'aucune violation n'apparaît (vidéo HLS incluse), puis remplacez `Content-Security-Policy-Report-Only` par `Content-Security-Policy`.
- `og:image` : pour les aperçus sociaux, remplacez `/og-image.png` par l'URL absolue de votre domaine dans `index.html`.

### Vérifications post-déploiement
Hero + vidéo visibles, FR/EN, menu mobile, page Avis (liste ou message « aucun avis »), dépôt d'un avis → apparaît dans le dashboard (« à modérer ») → approuvé → visible sur le site ; formulaire de contact complet ; `/dashboard` protégé.

---

## 6. Synchronisation Discord ↔ site (réalisations et avis)

Une seule source de vérité : la base Neon. Le site, le dashboard et Discord la lisent et l'écrivent via le bot.

| Action | Résultat |
|---|---|
| **Site → Admin → Réalisations → Ajouter** | Enregistrée en base, **visible sur le site tout de suite**, embed **posté automatiquement** dans le salon réalisations de Discord (case « Poster aussi sur Discord » cochée par défaut) |
| Site → Modifier / Masquer / Supprimer | Le message Discord est **modifié / retiré / supprimé** |
| Discord `/realisation ajouter` (ou dashboard) | Enregistrée en base, apparaît sur le site (au plus ~15 s de cache serveur + 30 s d'actualisation de la page) |
| Discord `/realisation visibilite` ou `retirer` | Le site suit ; le message du salon est retiré/republié |
| **Avis déposé sur le site** | Enregistré « à modérer » (jamais publié automatiquement) + notification Discord avec boutons **✅ Approuver / 🚫 Refuser** |
| Approbation (bouton Discord, `/avis`, dashboard **ou** Admin du site) | Avis **visible sur le site** + **publié dans le salon des avis** Discord |
| **Avis déposé via Discord** (ticket / `/avis`) | Après approbation, il apparaît sur le site |

Détails :
- **Admin du site** : menu *Admin* → mot de passe = `ADMIN_PASSWORD` (vérifié par le serveur, jeton de 12 h en `sessionStorage`).
- Salon réalisations : détecté par son nom (contient « réalisations »). Pour forcer un salon précis : variable `REALISATIONS_CHANNEL_ID`.
- Si Discord refuse (permissions, salon absent), l'opération en base **réussit quand même** et l'interface affiche un avertissement.
- Si vous supprimez à la main le message Discord d'une réalisation, elle reste sur le site ; modifiez-la puis masquez/affichez-la pour republier.
- Permissions nécessaires au bot dans ces salons : voir les salons, envoyer des messages, intégrer des liens, gérer les messages (pour supprimer ses propres embeds, « envoyer/modifier » suffit pour les siens).

### Test de bout en bout (à faire après déploiement)
1. Site → Admin → ajouter une réalisation test → elle apparaît dans le salon Discord **et** sur la page *Our Work*.
2. La masquer depuis Discord (`/realisation visibilite`) → elle disparaît de la page *Our Work* (≤ 1 min) et le message du salon est retiré.
3. Déposer un avis depuis le site → notification avec boutons dans Discord → *Approuver* → l'avis apparaît sur le site et dans le salon des avis.
4. Faire l'inverse : approuver un avis venant de Discord → il apparaît sur la page *Reviews*.
