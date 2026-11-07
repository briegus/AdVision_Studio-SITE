# Rapport final — ce qui a réellement été testé

## 0. Légende (à lire)
- **EXÉCUTÉ** : un test automatisé a tourné ici et réussi (résultats en §4).
- **RELU** : relecture statique / recherche dans le code, sans exécution.
- **NON TESTÉ** : nécessite des comptes, Internet ou des services que je n'ai pas (Brevo/Resend, Neon, Render, Netlify, Discord, Google, un navigateur). **Ne pas le considérer comme validé.**

Distinction demandée : *code corrigé* ≠ *code compilé* ≠ *application testée en production*. Ici : code corrigé ✔ · tests unitaires/flux exécutés ✔ · **compilation complète (`npm run build`) et déploiement : non faits** — je n'ai pas pu installer `discord.js`, `prisma`, `express`, `react`, `vite` (pas d'accès au registre npm).

## 1. Vérification des codes de vérification e-mail (tâche 1)

| Exigence | Comment vérifié | Résultat |
|---|---|---|
| Génération d'un vrai code aléatoire | EXÉCUTÉ : 1000 tirages = toujours 6 chiffres, valeurs variées (générateur cryptographique `crypto.randomInt`) | ✅ |
| Envoi réel par Brevo / Resend | EXÉCUTÉ avec fournisseur **simulé** : bonne URL, en-têtes (`api-key` / `Bearer`), expéditeur, destinataire, corps ; une réponse d'erreur HTTP → exception (jamais de faux succès) | ✅ format ; ❌ **envoi réel NON testé** (aucune clé, pas d'Internet) |
| Réception par le client (boîte mail, spam) | — | **NON TESTÉ** (dépend du fournisseur, de l'adresse expéditrice et de l'authentification SPF/DKIM) |
| Validation du code saisi | EXÉCUTÉ (flux complet, stockage en mémoire) | ✅ |
| Expiration après 10 minutes | EXÉCUTÉ avec horloge simulée : valide à 9 min 59, refusé à 10 min 00,001 | ✅ |
| Limite de 5 tentatives | EXÉCUTÉ : compteur 4→0, code **brûlé** au 5ᵉ échec, la 5ᵉ tentative peut être la bonne | ✅ |
| Résistance aux tentatives parallèles | EXÉCUTÉ : 300 devinettes simultanées → au plus 5 essais comptés, aucun succès, le bon code ne passe plus ; répété 5 fois (délais aléatoires) | ✅ — **défaut trouvé et corrigé** (voir §2) |
| Code non réutilisable | EXÉCUTÉ : second usage refusé ; double-clic (4 envois simultanés) → 1 seul succès ; 20 simultanés → jamais plus d'un | ✅ |
| Demande de prestation vs compte client | EXÉCUTÉ : un code de connexion ne valide pas une demande (et inversement) ; les deux usages fonctionnent séparément | ✅ logique ; routes HTTP + base **NON TESTÉES** |
| Renvoi / anti-spam | EXÉCUTÉ : 30 s mini entre deux envois par adresse (délai restant renvoyé), nouveau code ⇒ ancien invalidé, adresses indépendantes | ✅ |
| Échec du fournisseur d'e-mail | EXÉCUTÉ : erreur `send_failed`, aucun code fantôme stocké | ✅ |
| Messages affichés au client | EXÉCUTÉ : correspondance code d'erreur → texte (essais restants, délai, expiré, verrouillé…) et **parité FR/EN du dictionnaire**, y compris toutes les clés `t("…")` utilisées | ✅ textes ; rendu visuel **NON TESTÉ** (pas de navigateur) |
| Jamais généré/validé côté navigateur | RELU : recherche dans tout le code du site (`Math.random`, `crypto`, comparaison de code, ancien `generateCode`) → **aucune occurrence** ; l'API ne renvoie jamais le code (EXÉCUTÉ : réponse sans le code ; stockage sans le code en clair) | ✅ |
| Code absent des logs | RELU : aucun `console.*` n'affiche un code ; le journal du mailer n'écrit ni destinataire ni contenu | ✅ |
| Compte connecté : envoi sans code | RELU : accepté seulement si l'e-mail du compte est marqué vérifié par le serveur | ✅ relu ; **NON TESTÉ** en réel |

## 2. Défauts trouvés et corrigés pendant cette vérification
1. **Course sur le compteur de tentatives (vulnérabilité)** : le serveur lisait le compteur, comparait, puis l'incrémentait → des requêtes parallèles pouvaient dépasser 5 essais. Corrigé : incrément **atomique avant** la comparaison.
2. **Mélange des usages** : un identifiant de code de *connexion* pouvait être présenté à la route de *demande de prestation*, et inversement. Corrigé : champ `purpose` imposé des deux côtés.
3. **Anciens codes restaient valides** après un renvoi. Corrigé : un nouveau code invalide les précédents.
4. **Pas de délai entre deux envois** (risque de « mail-bombing »). Corrigé : 30 s par adresse (persisté en base, donc robuste à un redémarrage), avec décompte affiché sur le site.
5. **Messages d'erreur toujours en français** même sur le site en anglais. Corrigé : le serveur renvoie un `code` stable, le site traduit (FR/EN), affiche les essais restants.
6. **Cas « code valide mais enregistrement impossible »** : message explicite (aucune demande créée, redemandez un code) au lieu d'un succès ambigu.
7. La logique, dupliquée entre « demande de prestation » et « connexion par e-mail », est désormais **un seul module testé** (`verificationFlow.ts`) utilisé par les deux routes.

## 3. Autres corrections de ce tour (tâche 2 et « rapidité / sécurité »)
- **Guide** entièrement refait (Render, Neon, Netlify, Brevo/Resend, Google, Discord), variables **extraites du code** : un script a vérifié qu'aucune variable lue par le code n'est absente de `.env.example`.
- `.env.example` des deux projets réécrits (anciens textes périmés « dashboard /admin », `PORT=3000` risqué sur Render).
- **Contrôle de configuration au démarrage** : avertissements lisibles (mot de passe admin absent/court, `ALLOWED_ORIGINS`, e-mails, URL OAuth).
- **Node 22** (Node 20 n'est plus supporté) : `engines`, `.node-version`, `render.yaml` ; `netlify.toml` en Node 22.
- **Vitesse Discord** : `/realisation` répondait sans accuser réception ; créer un post de forum après un réveil de Neon pouvait dépasser les 3 s de Discord (« L'application ne répond pas »). Corrigé : réponse différée.
- **Audit des commandes Discord** (RELU) : les commandes d'administration (`/admin /config /panel /setup /mod /absence /service /statut`) ont des permissions par défaut ; les commandes mixtes (`/annonce /avis /promotion /realisation /sondage /status /util /ticket`) contrôlent le staff dans le code ; les commandes publiques (`/aide /help /moi /prestations /projet /services`) n'exposent rien de sensible ; `/assistant` (IA) a une limitation par utilisateur.
- Site : ajout de `.gitignore` (sans lui, `node_modules` et `.env` auraient pu être envoyés sur GitHub).
- Ancien `RENDER_DEPLOY.md` supprimé (contradictoire avec le nouveau guide).

## 3 bis. Protection Discord (anti-spam / anti-raid) — signalé comme « ne fonctionne pas »
**Causes trouvées dans le code (RELU) :**
1. **L'anti-raid n'était pas implémenté** : `antiRaid`, `raidThreshold`, `raidWindow` n'étaient que des réglages stockés ; aucun code ne surveillait les arrivées. L'interrupteur « 🚨 Anti-raid ✅ » de `/setup` ne protégeait donc de rien.
2. **L'anti-spam exemptait les administrateurs** (permission *Gérer les messages*) : tout test fait avec un compte admin ne pouvait jamais se déclencher.
3. L'anti-spam ne comptait qu'**après** les autres filtres (un spammeur de liens/majuscules n'était jamais compté), ignorait les **messages répétés**, et sanctionnait à plat (1 min).
4. Les protections sont **désactivées par défaut** dans le schéma (`false`) : sur une base Neon neuve, rien n'agit tant qu'on ne les active pas ; et **aucun diagnostic** n'indiquait qu'une permission manquait ou que le rôle du bot était trop bas.
5. Libellé trompeur dans `/setup` (« Seuil anti-raid (membres/s) », défaut 10 au lieu de 5 réel).
6. `/admin dashboard` renvoyait vers `/dashboard`, supprimé (erreur 404).

**Corrections :** nouveau moteur `protection.ts` (anti-spam : débit + répétitions, sanctions progressives 5 min → 30 min → 6 h, anti-raid : N arrivées en T s ⇒ mode raid 10 min, sourdine réversible 1 h, alerte staff avec boutons *Fin d'alerte* / *Expulser les suspects*) ; branchement sur `messageCreate` (anti-spam **en premier**) et `guildMemberAdd` (pas de bienvenue pour les raiders) ; commande **`/protection`** (`statut` : réglages + **permissions réelles du bot** + salon d'alertes ; `activer` ; `fin-raid`) ; **état de la protection dans les logs au démarrage** avec avertissements ; libellé et défaut du seuil corrigés ; `/admin dashboard` pointe vers l'admin du site ; réglage `TRUST_PROXY_HOPS` + ligne « IP vue par le serveur » dans l'onglet État (si l'IP vue était celle d'un intermédiaire, toutes les limites anti-abus s'appliqueraient à tous les visiteurs à la fois).

**Vérifié (EXÉCUTÉ) :** 20 tests du moteur avec horloge et faux membres/messages — seuils (4 messages passent, le 5ᵉ non), fenêtre glissante, utilisateurs indépendants, répétitions (« ok »/« lol » jamais), escalade et expiration des récidives, exemptions, bot sans permission (aucune exception, résultat journalisé), membre non modérable, seuils personnalisés/par défaut, raid (4 arrivées ≠ raid, 5ᵉ = raid, arrivées lentes ≠ raid, prolongation, expiration, serveurs indépendants, même compte ≠ compte multiple), alerte unique, anti-raid désactivé. **Test de mutation : 8 casses volontaires du code, 8 détectées** (la première passe en a laissé échapper une — la prolongation du mode raid — j'ai renforcé le test).
**NON TESTÉ (nécessite Discord) :** suppression/sourdine/expulsion réelles, envoi de l'alerte, boutons, droits du bot, hiérarchie des rôles, effet du niveau de vérification du serveur. **Le test réel à faire est décrit à l'étape L du guide** (compte normal, pas administrateur).
**Limite :** protection en mémoire (un redémarrage remet les compteurs à zéro) ; complémentaire de l'AutoMod natif de Discord, à activer aussi.

## 3 ter. Forums étiquetés, absences, sécurité de /setup et site
**Constats (RELU) :**
1. `/absence panel` (et `/service panel`) refusaient tout salon qui n'était pas un **salon texte** : lancé dans un **post de forum**, il répondait « Ce salon ne permet pas de poster un panel ». Même défaut dans le système de panels du studio (`publishPanel` : « Salon introuvable ou non textuel »).
2. Aucun post de forum n'avait d'**étiquettes**, sauf les réalisations (code spécifique).
3. Dans `/setup`, les sélecteurs **« Rôles modérateurs »** et **« Rôles administrateurs »** étaient enregistrés mais **jamais lus** par le code (fausse sécurité de plus). D'autres réglages (`language`, `ticketCounter`) sont affichés mais sans effet : listés, non modifiés.
4. L'API `PUT /config` enregistrait les valeurs **sans validation de type ni de borne** (une chaîne « false » ou un seuil absurde pouvait être écrit) et ne gérait pas les rôles modérateurs/admins.
5. Détails : date de retour d'absence « aujourd'hui » refusée et 31/02 accepté (devenait le 3 mars) ; l'URL du webhook d'alerte (secret) était renvoyée en clair par `GET /config`.

**Corrections :** module commun `forumPosts.ts` (étiquettes créées/retrouvées, ≤ 20 caractères, ≤ 5 par post, repli si le forum exige une étiquette, désarchivage/archivage) utilisé par **les réalisations, les panels du studio, `/absence panel`, `/service panel` et les avis** ; panel publiable dans un **forum, un post de forum ou un salon texte** ; **chaque absence = un post étiqueté** (statut + durée, « Terminée » + archivage automatique 1 jour après le retour, motif jamais publié) ; rôles modérateurs/administrateurs **enfin appliqués** (staff + exemption de l'automod) ; validation stricte de la configuration ; webhook masqué ; **site : onglets Absences et Sécurité** (interrupteurs, seuils bornés, rôles, salons de logs, état réel des permissions) et forum des absences dans Réglages.

**Vérifié (EXÉCUTÉ) :** 22 tests supplémentaires — étiquettes (retrouvées sans tenir compte de la casse, tronquées, 5 max, 20 max par forum, sans permission → aucune exception), création avec repli quand le forum exige une étiquette, mise à jour/archivage, `postPanelAnywhere` dans un forum / **dans un post de forum (le cas qui échouait)** / salon texte / cible invalide ; rôles (JSON, identifiants invalides, union staff/exemptions) ; validation de configuration (booléens stricts, bornes, injection, clés inconnues) ; étiquettes de toutes les familles de posts. **Un test a révélé un vrai défaut** (étiquettes « a » et « A » dupliquées) : corrigé. Vérification que les 24 clés acceptées par l'API existent dans le modèle `Config`.
**NON TESTÉ (nécessite Discord/Neon) :** création et mise à jour réelles des posts et étiquettes, archivage, boutons, droits du bot, tâche horaire de clôture, rendu des nouveaux onglets du site.

## 3 quater. « Rien ne marche » sur le site, et fond animé du Hero absent
**Fond animé du Hero (régression de MON fait, corrigée).** J'avais « amélioré » la lecture vidéo, ce que je n'avais **pas pu tester dans un navigateur** : ordre inversé (lecteur natif d'abord, alors que l'original utilisait hls.js d'abord — les navigateurs récents annoncent un support HLS natif qui peut échouer sur ce flux), chargement différé de hls.js dans un fichier séparé (peut être bloqué), pause hors écran. Risque : fond noir. **Restauré** à la logique d'origine (module testable `heroVideo.ts`), JSX identique à l'original. Seul ajout sans risque : reprise automatique après une erreur fatale de hls.js. *Note : si le système d'exploitation a « réduire les animations » activé, la vidéo se fige sur sa première image (comportement d'accessibilité voulu, désactivable : `RESPECT_REDUCED_MOTION = false` dans `src/lib/heroVideo.ts`).* Les anciennes affirmations sur un Hero « plus robuste, chargé à la demande, en pause hors écran » sont **retirées**.

**Connexion / code / contact.** J'ai cherché un défaut de code et **n'en ai pas trouvé** : le vrai code du site appelé contre les vraies routes du serveur fonctionne de bout en bout (voir tests). La cause la plus probable est la **configuration du déploiement**, que le site ne savait pas expliquer : `VITE_API_URL` absente au moment du build Netlify, `ALLOWED_ORIGINS` différent de l'URL du site (CORS), service Render endormi, fournisseur d'e-mails non configuré. Ajouts : **page de diagnostic `#/diagnostic`** (accessible sans connexion, lien « Lancer le diagnostic de connexion » sous chaque erreur des formulaires) qui teste depuis le navigateur : variable présente, adresse valide, serveur joignable, **CORS** (avec l'adresse exacte à mettre dans `ALLOWED_ORIGINS`), base, Discord, **e-mails** — et affiche la correction ; route publique `GET /api/public/status` (booléens seulement, aucun secret).
**Formulaire de contact d'un client connecté :** son **adresse e-mail est préremplie et verrouillée** (lecture seule), le nom est prérempli, et un lien « Ce n'est pas vous ? Changer de compte » est proposé. Compte à e-mail vérifié : envoi **sans code** ; compte sans e-mail vérifié : code envoyé à l'adresse du compte.
**Autre correction :** `getSession()` (appelée pendant le rendu React) notifiait des abonnés quand une session expirait — effet de bord supprimé.

## 4. Tests exécutés (résultats réels)
| Suite | Contenu | Résultat |
|---|---|---|
| Bot — `verificationFlow.test.ts` | 15 tests : flux complet (émission, validation, expiration, 5 essais, attaque parallèle, usage unique, usages séparés, renvoi, échec e-mail, formats) | **15/15** (stable sur 5 exécutions à délais aléatoires) |
| Bot — `verification.test.ts` | code, HMAC, comparaison constante, regex e-mail, limiteur | **6/6** |
| Bot — `mailer.test.ts` | Brevo + Resend simulés, échec HTTP, absence de configuration, échappement HTML | **6/6** |
| Bot — `oauth.test.ts` | état signé/falsifié/expiré, cookies, anti-redirection ouverte, jetons, URL d'autorisation, échanges Google/Discord simulés | **9/9** |
| Bot — `protection.test.ts` | 20 tests : anti-spam, anti-raid, adaptateurs avec faux membres/messages, permissions manquantes | **20/20** (+ **mutation 8/8**) |
| Bot — `forumPosts.test.ts` | 13 tests : étiquettes, création, mise à jour, panels en forum / post / texte | **13/13** |
| Bot — `security.test.ts` | 9 tests : rôles staff, validation de configuration, étiquettes d'absence et de tous les posts | **9/9** |
| **Total bot** | | **78/78** (`npm run test`) |
| Site — `errors.test.ts` | traduction des erreurs, parité FR/EN, clés `t("…")` toutes définies | **6/6** |
| Site — `diagnostic.test.ts` | adresse absente, adresse invalide/http, serveur endormi, **CORS refusé (adresse exacte à corriger)**, e-mails non configurés, base/Discord HS, origine non reconnue, rapport sans donnée sensible | **9/9** |
| Site — `heroVideo.test.ts` | **navigateur récent (hls.js ET natif annoncés) → hls.js utilisé comme à l'origine**, Safari → natif, aucun lecteur → pas d'exception, configuration par défaut, erreurs fatales (réseau/média), démontage, « réduire les animations », **garde-fou : `<video>` du Hero identique à l'original** | **9/9** |
| **Total site** | | **24/24** (`npm run test`) |
| **Bot — intégration des routes HTTP** (`npm run test:integration`) | les VRAIS gestionnaires du contact, des codes e-mail, de la connexion e-mail et **Google (OAuth complet)**, des avis et du statut, avec base en mémoire, faux Brevo et faux Google : code envoyé puis lu dans l'e-mail simulé, mauvais code, bon code → demande D-xxxx + notification Discord, code non réutilisable, échec du fournisseur (aucun code fantôme), e-mails non configurés (503), Discord HS (demande tout de même enregistrée puis relancée), anti-robot, cooldown et limite horaire, session, « Mes demandes », envoi sans code avec l'adresse du compte, suppression de compte, usages séparés, état OAuth falsifié / retour non autorisé / cookie absent / ticket rejoué, avis, statut | **12/12** |
| **Contrat site ↔ serveur** (exécuté ici avec les deux projets côte à côte, non livré car il exige les deux dossiers) | le VRAI code client du site (`api.ts`, `auth.ts`, `session.ts`, `errors.ts`, `diagnostic.ts`) appelle les VRAIES routes : formulaire visiteur, messages d'erreur, connexion e-mail → session → demande sans code → « Mes demandes » → avis → déconnexion, session révoquée, Google, diagnostic contre le serveur | **6/6** |
| Typage strict des modules purs du bot (`@types/node`) | | ✅ aucune erreur |
| Recherche de noms indéfinis / doublons / arguments / imports inutilisés dans les fichiers modifiés (bot et site) | | ✅ aucune, hors artefacts dus aux modules absents hors ligne |
| Syntaxe : scripts `.mjs`, `package.json`, `schema.prisma` (cohérence basique) | | ✅ |
| **Préservation du design** (comparaison fichier par fichier avec l'archive d'origine) | Hero : le JSX affiché est **identique octet pour octet** (la balise `<video>`, ses classes et ses attributs sont protégés par un test) ; la **logique de lecture vidéo est celle d'origine** (hls.js d'abord, lecteur natif en secours, configuration par défaut, hls.js importé comme avant) ; `index.css` d'origine **intégralement conservé** (règles d'accessibilité ajoutées à la fin). Autres fichiers touchés : `Navbar` (+ bouton Connexion), `App` (routes, lien d'évitement, page d'erreur) | ✅ (EXÉCUTÉ) |
| **Cohérence base de données** | Les **461 appels Prisma** du bot : chaque champ utilisé (`where`, `data`, `select`, `orderBy`, `create`, `update`) existe dans le schéma (32 modèles). Seule alerte : `messageId_emoji`, faux positif (clé unique composée `@@unique([messageId, emoji])` bien déclarée) | ✅ (EXÉCUTÉ) — les *types* Prisma, eux, ne sont vérifiés qu'à la vraie compilation |
| Résolution des imports : **89** (site) + **305** (bot) | tous les fichiers importés existent | ✅ aucun manquant |
| Commandes slash | 24 commandes, noms tous uniques (Discord refuse les doublons au déploiement) ; `/protection` incluse | ✅ |
| Site : routes ↔ vues | 11 routes, 11 vues, type `Route` cohérent | ✅ |

> Un contrôle hors ligne signale `form.ts(67)` (`MessageFlags.Ephemeral as const`) : c'est un **artefact** (le type `MessageFlags` n'est pas résolu sans `discord.js`) ; le fichier est identique à l'archive d'origine et valide avec les vrais types.

## 5. NON TESTÉ — à faire chez vous (dans cet ordre)
1. `npm install` puis `npm run build` dans **chaque** projet (compilation TypeScript stricte, `prisma generate`, `vite build`). **Risque principal** : une erreur de typage que seul le vrai compilateur révèle. Si cela arrive, envoyez-moi la ligne d'erreur exacte.
2. `npm run test` dans chaque projet, et `npm run test:integration` dans le bot (relancent les tests ci-dessus avec les vraies dépendances).
   **Je ne peux PAS vérifier visuellement le Hero** (aucun navigateur ici) : la vidéo de fond doit être contrôlée chez vous (étape F.3 du guide). Le JSX et la logique de lecture sont identiques à l'original et couverts par des tests, mais « la vidéo s'affiche » reste à constater à l'écran.
3. Déploiement Neon → Render → Netlify, puis **l'étape K du guide** (checklist complète).
4. Réellement : envoi d'un e-mail Brevo/Resend et réception ; connexion Google et Discord ; publication/modification/suppression d'un post de forum ; boutons Approuver/Refuser ; routes HTTP avec la vraie base ; rendu visuel du Hero et des nouvelles pages ; Core Web Vitals ; icônes `lucide-react` utilisées (version du projet non vérifiable hors ligne).
5. `npm audit` (non fait : pas d'accès au registre npm).

## 6. Rappel de l'ensemble des corrections livrées (versions précédentes)
- Bot : SQLite → Neon/PostgreSQL ; suppression de `db push --accept-data-loss` au démarrage ; build Render réparé (outils en dependencies) ; commandes déployées au démarrage ; health réel (`/health`, `/ready`) ; anti-brute-force fiable (`trust proxy`) ; comparaison de secret en temps constant ; CORS restreint ; en-têtes de sécurité ; références D-xxxx sans doublon ; reprise automatique des notifications Discord ; dashboard hébergé par le bot **supprimé** ; salon de notifications résolu avec alerte explicite (cause probable du « aucun message » initial).
- Réalisations : un seul service, **forum Discord** (post par réalisation, étiquettes), synchronisation dans les deux sens. Avis : boutons Approuver/Refuser pour les avis du site et de Discord, publication dans le salon des avis.
- Comptes clients : Google, Discord, e-mail (état OAuth signé + cookie nonce, URL de retour validée, ticket à usage unique 60 s, sessions hachées, liaison par e-mail seulement si vérifié, suppression de compte).
- Site : Hero **conservé à l'identique** (JSX et logique vidéo d'origine) ; panel Admin réel (Demandes, Réalisations, Avis, Réglages, État avec tests Discord/e-mail) ; pages Connexion / Mon compte ; accessibilité, SEO, états de chargement/erreur, page d'erreur de secours.
- Erreur de ma part, corrigée plus tôt : une archive intermédiaire (v2) contenait un `Reviews.tsx` dupliqué ; les archives `-final` sont les seules à utiliser.


## 3 quinquies. Vidéo du Hero réellement animée + section « CTA + pied de page » (session du 07/11/2026)
**Cause probable du « fond qui n'est qu'une image »** : `RESPECT_REDUCED_MOTION = true` figeait la vidéo sur sa première image chez toute personne ayant « réduire les animations » activé dans son système. **Corrigé : `false`** (`src/lib/heroVideo.ts`) → la vidéo tourne toujours en boucle. Cette cause est une hypothèse cohérente avec votre description, **non constatée à l'écran**.
**Ajout** : `src/components/CtaFooter.tsx` (vidéo HLS du prompt, fondus haut/bas 200 px, titre, deux boutons, barre de pied de page), affiché sous le Hero sur l'accueil ; le Footer global reste sur les autres pages. Textes FR/EN via `i18n`, boutons → Contact / Tarifs. La vidéo de cette section ne démarre qu'à l'approche de l'écran. Hero : balise `<video>` inchangée (garde-fou conservé).
**Exécuté** : `tsc --noEmit` sans erreur, 27/27 tests, `vite build` réussi.
**NON vérifié** : lecture réelle du flux Mux dans un navigateur (aucun navigateur ni accès à stream.mux.com ici), rendu visuel (hauteur du Hero, fondus, effet verre), test sur iOS/Android. À constater chez vous après déploiement.

**Badge « Powered by Netlify » (07/11/2026)** : le badge, injecté par Netlify et non par le code du site, masquait les liens Discord / Email / Admin en bas à droite. Les barres de pied de page (`Footer.tsx` et `CtaFooter.tsx`) ont maintenant une marge à droite : les liens restent sur la même ligne que le copyright mais s'arrêtent avant le badge ; sur mobile, une marge basse les remonte au-dessus. Exécuté : `tsc`, tests, build. NON vérifié : le rendu exact (largeur du badge variable), à contrôler chez vous.


## 3 sexies. Choix de messagerie, cookies / RGPD, règles d'utilisation (07/11/2026)
**Livré**
- **Bouton « Email »** (`EmailChooser.tsx`) : ouvre un petit menu — Gmail, Outlook, Yahoo Mail, application de messagerie par défaut (`mailto:`), copier l'adresse. Utilisé dans le pied de page de toutes les pages et dans la section finale de l'accueil.
- **Bandeau d'information** (`StorageNotice.tsx`), placé à gauche (le badge Netlify est à droite). Ce n'est **pas** un bandeau de consentement : le code ne contient aucun cookie publicitaire ni outil de mesure d'audience (vérifié par un test). Seuls du stockage navigateur strictement nécessaire est utilisé : `advision_lang`, `advision_account` (session client, 30 jours), `advision_notice`, et le jeton admin en `sessionStorage` (12 h). Si vous ajoutez un jour des statistiques ou de la publicité, il faudra un vrai choix « accepter / refuser » AVANT leur activation.
- **3 nouvelles pages**, FR/EN, liées dans le pied de page : **Mentions légales** (`#/legal`), **Confidentialité et cookies** (`#/privacy`), **Conditions d'utilisation** (`#/terms`, le « règlement » : interdiction de copier, scraper, attaquer, signaler une faille).
**À FAIRE PAR VOUS avant la mise en ligne publique** : compléter `src/lib/legalConfig.ts` (nom ou raison sociale, statut, adresse ou domiciliation, SIRET, directeur de publication). Ces champs affichent « [À COMPLÉTER …] » tant qu'ils ne sont pas remplis. Vérifiez aussi : le prestataire d'e-mails réellement utilisé (Brevo ou Resend), les durées de conservation que vous voulez appliquer, et les coordonnées des hébergeurs.
**Limites, à lire**
- Ces textes sont des **modèles** rédigés de bonne foi ; **je ne suis pas juriste** et ils ne remplacent pas l'avis d'un professionnel (ou de la CNIL / de votre CCI / de votre expert-comptable).
- **Personne ne peut empêcher la copie d'un site web** : tout site affiche son code et ses images au navigateur. Les pages ci-dessus donnent une base juridique contre la copie ; elles n'empêchent rien techniquement. La vraie sécurité est côté serveur (limites de tentatives, codes à usage unique, jeton admin, Neon) : déjà en place, mais à contrôler chez vous.
- Google Fonts et la vidéo Mux reçoivent l'adresse IP des visiteurs : c'est indiqué dans la politique de confidentialité. Héberger les polices soi-même éviterait la première (non fait).
- La politique de sécurité de contenu (CSP) reste en mode « rapport seulement » : la passer en mode bloquant sans test dans un navigateur risquerait de casser le site.
**Exécuté** : `tsc` sans erreur, 31 tests (dont 4 sur les pages légales et l'absence de traceurs), build réussi. **NON vérifié** : le rendu visuel du menu e-mail et du bandeau, l'ouverture réelle de Gmail / Outlook / Yahoo avec le destinataire prérempli (liens construits selon leurs formats publics habituels, non testés), la validité juridique des textes.

## 3 septies. Suivi client amélioré (07/11/2026)
- **Mon compte** : chaque demande affiche une barre de progression Reçue → En cours → Traitée (« Refusée » reste un état à part) et une phrase indiquant qu'un e-mail est envoyé à chaque changement de statut. La langue du visiteur est maintenant envoyée avec la demande d'un compte connecté. Exécuté : `tsc`, 32 tests, build. NON vérifié : rendu visuel.
- **Bot** (archive séparée) : e-mail au client à chaque changement de statut + récap hebdomadaire Discord — détails et limites dans `GUIDE_DEPLOIEMENT_ADVISION.md` du bot (le bot n'a pas pu être compilé complètement ici).
- **Connexion Google / Discord** : le code existe et a été relu (état signé, nonce, ticket à usage unique) ; il est inactif tant que les variables `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DISCORD_CLIENT_SECRET` ne sont pas ajoutées sur Render (étape I). Jamais testé avec de vrais comptes Google/Discord.

## 3 octies. Mention « publicités générées par IA » (07/11/2026)
Ligne discrète (11 px, gris clair) en bas du Hero, sous la grille des réalisations, et rubrique « Contenus générés par IA » dans les mentions légales (FR/EN). Texte : « Publicités vidéo générées par intelligence artificielle. » — à modifier dans `src/lib/i18n.tsx` (clé `ai.note`) si votre formulation change. La balise `<video>` du Hero est inchangée. Exécuté : `tsc`, 33 tests, build. NON vérifié : rendu visuel (position de la ligne sur le Hero selon la taille d'écran).
