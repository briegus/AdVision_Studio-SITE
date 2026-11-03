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
| Site — `errors.test.ts` | traduction des erreurs, parité FR/EN, clés `t("…")` toutes définies | **6/6** (`npm run test`) |
| Typage strict des modules purs du bot (`@types/node`) | | ✅ aucune erreur |
| Recherche de noms indéfinis / doublons / arguments / imports inutilisés dans les fichiers modifiés (bot et site) | | ✅ aucune, hors artefacts dus aux modules absents hors ligne |
| Syntaxe : scripts `.mjs`, `package.json`, `schema.prisma` (cohérence basique) | | ✅ |
| Résolution des imports : **89** (site) + **305** (bot) | tous les fichiers importés existent | ✅ aucun manquant |
| Commandes slash | 24 commandes, noms tous uniques (Discord refuse les doublons au déploiement) ; `/protection` incluse | ✅ |
| Site : routes ↔ vues | 11 routes, 11 vues, type `Route` cohérent | ✅ |

> Un contrôle hors ligne signale `form.ts(67)` (`MessageFlags.Ephemeral as const`) : c'est un **artefact** (le type `MessageFlags` n'est pas résolu sans `discord.js`) ; le fichier est identique à l'archive d'origine et valide avec les vrais types.

## 5. NON TESTÉ — à faire chez vous (dans cet ordre)
1. `npm install` puis `npm run build` dans **chaque** projet (compilation TypeScript stricte, `prisma generate`, `vite build`). **Risque principal** : une erreur de typage que seul le vrai compilateur révèle. Si cela arrive, envoyez-moi la ligne d'erreur exacte.
2. `npm run test` dans chaque projet (relance les tests ci-dessus avec les vraies dépendances).
3. Déploiement Neon → Render → Netlify, puis **l'étape K du guide** (checklist complète).
4. Réellement : envoi d'un e-mail Brevo/Resend et réception ; connexion Google et Discord ; publication/modification/suppression d'un post de forum ; boutons Approuver/Refuser ; routes HTTP avec la vraie base ; rendu visuel du Hero et des nouvelles pages ; Core Web Vitals ; icônes `lucide-react` utilisées (version du projet non vérifiable hors ligne).
5. `npm audit` (non fait : pas d'accès au registre npm).

## 6. Rappel de l'ensemble des corrections livrées (versions précédentes)
- Bot : SQLite → Neon/PostgreSQL ; suppression de `db push --accept-data-loss` au démarrage ; build Render réparé (outils en dependencies) ; commandes déployées au démarrage ; health réel (`/health`, `/ready`) ; anti-brute-force fiable (`trust proxy`) ; comparaison de secret en temps constant ; CORS restreint ; en-têtes de sécurité ; références D-xxxx sans doublon ; reprise automatique des notifications Discord ; dashboard hébergé par le bot **supprimé** ; salon de notifications résolu avec alerte explicite (cause probable du « aucun message » initial).
- Réalisations : un seul service, **forum Discord** (post par réalisation, étiquettes), synchronisation dans les deux sens. Avis : boutons Approuver/Refuser pour les avis du site et de Discord, publication dans le salon des avis.
- Comptes clients : Google, Discord, e-mail (état OAuth signé + cookie nonce, URL de retour validée, ticket à usage unique 60 s, sessions hachées, liaison par e-mail seulement si vérifié, suppression de compte).
- Site : Hero **conservé** (même rendu), vidéo plus robuste ; panel Admin réel (Demandes, Réalisations, Avis, Réglages, État avec tests Discord/e-mail) ; pages Connexion / Mon compte ; accessibilité, SEO, états de chargement/erreur, page d'erreur de secours.
- Erreur de ma part, corrigée plus tôt : une archive intermédiaire (v2) contenait un `Reviews.tsx` dupliqué ; les archives `-final` sont les seules à utiliser.
