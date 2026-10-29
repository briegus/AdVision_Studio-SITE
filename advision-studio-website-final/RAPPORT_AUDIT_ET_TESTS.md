# Rapport — problèmes trouvés/corrigés, tests, actions restantes

## Environnement de travail (limites)
Pas d'accès Internet : impossible d'exécuter `npm install`, `prisma generate`, `tsc` complet, `vite build`, de joindre Neon, Discord, Render ou un fournisseur d'e-mail, et de lancer le site dans un navigateur. **Le code n'a donc pas été compilé dans son ensemble ni testé en conditions réelles.** Les comparaisons visuelles avant/après n'ont pas pu être faites ; le design a été préservé en ne modifiant ni les classes, ni la structure du Hero.

## Problèmes trouvés et corrigés
### Bot / backend
1. Schéma Prisma SQLite avec une URL Neon → démarrage impossible. → PostgreSQL + `directUrl`.
2. `db push --accept-data-loss` à chaque démarrage (risque de perte de données, échec ignoré). → supprimé du démarrage ; schéma appliqué au build sans l'option destructrice ; `process.exit(1)` explicite si la base est injoignable.
3. Build Render cassé : `prisma`/`typescript`/`tsx` en devDependencies avec `NODE_ENV=production`. → déplacés en dependencies ; `postinstall` génère le client.
4. Slash commands jamais enregistrées par défaut. → déployées au démarrage sauf `DEPLOY_COMMANDS_ON_START=false`.
5. Route de santé qui masquait une base HS. → vraie mesure (`/ready`, `/`) + `/health` léger pour les pings.
6. Anti brute-force contournable (`x-forwarded-for` falsifiable). → `trust proxy` + `req.ip` (API, dashboard HTML, contact).
7. Mot de passe comparé non constant → `timingSafeEqual` (SHA-256).
8. CORS ouvert à tous → `ALLOWED_ORIGINS`.
9. Cookie dashboard sans `Secure` en production ; pas de contrôle d'origine sur les POST → `Secure` + vérification `Origin` (anti-CSRF en plus de SameSite=Lax). L'API JSON utilise un jeton `Bearer` (non concernée par CSRF).
10. Références D-/P- en doublon après suppression (`count()+1`) → max+1 avec décalage en cas de collision.
11. Recherche dashboard sensible à la casse sous PostgreSQL → `mode: "insensitive"`.
12. Corps de requête sans limite, erreurs avec détails → limite 64 ko + gestionnaire d'erreurs générique ; en-têtes de sécurité.
13. Erreurs de connexion Discord opaques → messages explicites (intents, token).
14. Scripts hérités d'un autre projet (`reset-db.sh` pointant `lpa.db`, `setup.sh` « Panier d'Amboise ») → corrigés.
15. Notification Discord perdue si le bot/salon est indisponible → suivi `notifiedAt/notifyAttempts` + job de reprise.
16. Dashboard : ajout de la carte « État des services » (`/api/system`).

### Site
1. Aucun backend : code de vérification généré et comparé **dans le navigateur** (fictif), données (avis, demandes, réalisations) en `localStorage`, admin vérifié côté client. → tout passe par l'API du bot ; code haché côté serveur, 10 min, 5 essais, usage unique, limites par IP et e-mail.
2. **Erreur de ma livraison précédente (v2)** : `Reviews.tsx` contenait le composant en double (ancienne version incluse) et ne compilait pas. Corrigé ; ma vérification de syntaxe d'alors ne pouvait pas détecter ce cas — je l'ai remplacée par une vérification de types réelle (voir tests).
3. Hero : même rendu ; hls.js chargé à la demande, reprise après erreur réseau/média, qualité plafonnée à la taille du lecteur, pause hors écran/onglet masqué, `prefers-reduced-motion` respecté, aucune casse si la vidéo échoue.
4. Build en un seul fichier HTML (`vite-plugin-singlefile`) → fichiers séparés mis en cache (le plugin reste déclaré dans package.json mais n'est plus utilisé, pour ne pas désynchroniser `package-lock.json`).
5. Accessibilité/SEO : lien d'évitement, focus visible, titre/description par langue, Open Graph (PNG), favicon, `robots.txt`, `ErrorBoundary` (plus d'écran blanc), états chargement/erreur (avant : « aucun avis » affiché même si le serveur était injoignable), réveil automatique du bot + nouvelles tentatives.

## Tests exécutés
| Test | Résultat |
|---|---|
| Tests unitaires `verification.test.ts` + `mailer.test.ts` (10 tests : code 6 chiffres, aléa, HMAC, comparaison constante, regex e-mail, limiteur, échappement HTML du mail, appel Brevo simulé, échec HTTP ⇒ exception) | **10/10 réussis** (`tsx --test`) |
| Typage strict des modules purs du bot avec `@types/node` | OK |
| Vérification de types du site (noms indéfinis, doublons, imports inutilisés), `react`/`lucide` non résolubles hors ligne | Aucune erreur hors celles dues aux modules/types absents ; 1 variable inutilisée trouvée et corrigée |
| Syntaxe de tout le TypeScript du bot, scripts `.mjs`/`.js`, JSON | OK |

## Tests NON exécutables ici (à faire de votre côté)
`npm install`, `npx prisma generate`, `npm run build` (bot et site), connexion Neon, démarrage du bot, enregistrement des commandes, parcours e-mail réel, routes API avec base réelle, autorisations du dashboard, rendu visuel du Hero, audit `npm audit` des dépendances (non fait : pas d'accès au registre), Core Web Vitals.
Ordre conseillé : `npm run test` → `npm run build` → déploiement → vérifications du guide.

## Non réalisé / choix justifiés
- Pas de refonte des fichiers volumineux (`adminRouter.ts`, `ticketManager.ts`, `setupPanel.ts`…) : impossible à valider sans compilation, risque de régression supérieur au gain.
- Pas de fichiers de migration Prisma (voir guide §1) ; `db push` non destructif conservé.
- Le dashboard existant a été conservé (style et vues) ; seule la carte d'état a été ajoutée.
- CSP du site en mode rapport (à passer en mode bloquant après vérification).
- Intents `GuildMembers` et `MessageContent` conservés : réellement utilisés.

## Actions manuelles restantes
Créer les comptes (Neon, Render, Cloudflare, Brevo/Resend, UptimeRobot), renseigner les variables, activer les intents Discord, valider l'adresse expéditrice, mettre l'URL du site dans `ALLOWED_ORIGINS`, passer la CSP en mode bloquant, décider du sort des anciennes données SQLite.

## Mise à jour — synchronisation bidirectionnelle (réalisations et avis)
- Nouveau service `studio/realisations.ts` : création / modification / masquage / suppression écrivent en base **puis** synchronisent le message Discord (poster, modifier, retirer). Utilisé par la commande `/realisation`, l'API (dashboard + site) : plus de logique dupliquée.
- Schéma : `Realisation.source`, `discordChannelId`, `discordMessageId` (suivi du message miroir).
- Avis du site : notification avec boutons **Approuver / Refuser** (`studio/avisButtons.ts`) ; l'approbation publie dans le salon des avis Discord et affiche l'avis sur le site, avec le nom saisi par le visiteur.
- Site : page **Admin** réelle (connexion serveur, ajout/modification/masquage/vedette/suppression des réalisations, modération des avis) ; pages *Our Work* et *Reviews* actualisées toutes les 30 s ; cache public serveur ramené à 15 s.
- Vérifications : tests unitaires toujours 10/10 ; recherche de noms indéfinis/doublons/arguments dans les fichiers modifiés (bot : aucun ; site : aucun hors erreurs dues aux types React/lucide absents hors ligne).
- **Non testé en réel** : posting/modification/suppression des embeds Discord, boutons de modération, appels admin du site (nécessitent Discord, Neon et le bot lancés).
- Limite connue : une réalisation créée avec « Poster aussi sur Discord » décoché n'est pas postée plus tard automatiquement ; seule la séquence masquer → afficher la publie.
