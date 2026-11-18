# PHASE 5 — État réel au moment de la livraison et reste à faire

**Cette phase N'EST PAS terminée.** Ce document dit précisément ce qui est fait, testé, et ce qu'il reste. Rien n'a été déployé. Mis à jour après la session de tests navigateur (voir `RAPPORT_TESTS_PHASE5.md` et `GUIDE_DEPLOIEMENT_PHASE5.md`).

## 1. Fait ET testé automatiquement (base en mémoire, faux Discord, faux e-mails — jamais Neon, Discord ou Brevo réels)
| Domaine | Livré | Tests |
|---|---|---|
| Sécurité admin | Sessions **en base** (jeton haché, 12 h glissantes, révocation, survivent au redémarrage) ; anti-force-brute **persistant** (par IP 5 essais, par compte 10) ; **2FA TOTP** sans dépendance (RFC 6238 vérifié), secret chiffré AES-256-GCM, 10 codes de récupération à usage unique, anti-rejeu, défi limité à 5 essais ; 2FA **obligatoire** optionnelle (`ADMIN_REQUIRE_2FA`) ; secours `ADMIN_2FA_RESET` ; journal d'audit | `tests/totp.test.ts` (5) + `tests/integration/security.test.ts` (9) |
| RGPD | Export client (`GET /me/export`), export admin par e-mail, **anonymisation** (identité / complète), suppression de compte avec option d'anonymiser les demandes, **conservation** (codes/sessions périmés ; anonymisation des demandes anciennes seulement si `RETENTION_DEMANDES_MONTHS` est défini — désactivée par défaut) | `tests/integration/rgpd.test.ts` (6) |
| Options de prestation (mode mixte) | `info` / `select`, actif, ordre, supplément (texte libre), conditions, FR/EN ; choix enregistrés avec la demande (instantané : nom, tarif, options) ; visibles dans description, ticket, e-mails ; étape **Options** dans le parcours Discord | `tests/integration/options.test.ts` (9) |
| Traductions en base | Prestations, catégories, options : champs FR/EN séparés, repli français, aucun texte inventé ; tarifs FR/EN | idem |
| Archivage uniquement | Plus de suppression définitive : prestations, catégories, services, formules, projets, catégories de tickets, réalisations, avis (routes `DELETE` → 405) | `archivage.test.ts` (6) + tests Phase 4 adaptés |
| Tickets dynamiques | Table `TicketCategorie` (5 d'origine copiées au démarrage, `siteweb`/`sitebot` créées **archivées** : anciens tickets toujours lisibles/suivis, plus proposées) ; catégorie par service ; création/archivage depuis l'admin | idem |
| Projets universels | Champs communs + champs de suivi **par service** (configurables), dates, historique avant/après, conversion demande→projet adaptée au service, anciens projets conservés | `tests/integration/projets.test.ts` (7) |
| Admin FR/EN | Sélecteur FR/EN, ~640 traductions, repli français ; **test de couverture** (chaque `ta("…")` a sa traduction, aucun texte JSX hors `ta()`) | `src/lib/adminI18n.test.ts` (3) |
| Écrans admin (site) | Prestations (EN, options mixtes), Catalogue (archivage, champs de projet, catégories de tickets), **Projets**, **Accès et données** (2FA, sessions, RGPD), connexion en 2 étapes | **compilation TypeScript seulement** + tests unitaires — voir §3 |
| Site public | Prestations/options bilingues, options cochables, export de mes données, anonymisation au choix | tests unitaires + compilation |

Totaux actuels : bot **71** tests unitaires + **55** d'intégration ; site **53** tests ; **navigateur 17/17** (Chromium, base en mémoire) ; `tsc` propre (bot : hors typage Prisma, client non généré).

## 2. Variables / base de données nouvelles
Variables (toutes facultatives) : `TWO_FACTOR_KEY` (sinon `VERIFY_SECRET` sert de clé de chiffrement 2FA), `ADMIN_REQUIRE_2FA=true`, `ADMIN_2FA_RESET=compte1,compte2` (secours, à retirer ensuite), `RETENTION_DEMANDES_MONTHS` (entier 1–240).
Schéma Prisma : **ajouts uniquement** (colonnes facultatives + 5 tables : `TicketCategorie`, `AdminSession`, `AdminLoginAttempt`, `AdminTwoFactor`, `AdminChallenge`). Aucune migration destructive, mais **jamais exécuté sur Neon** : lancer `npm run build` chez vous (génère Prisma + compile).

## 3. NON FAIT / NON VÉRIFIÉ
**Fait depuis la livraison précédente :** tests navigateur Phase 5 écrits et passés (17/17, `tests/e2e/phase5.e2e.py`, ancien script Phase 4 supprimé) ; écrans Projets, Accès et données, options mixtes, catégories de tickets, bascule FR/EN et mobile vus dans un vrai navigateur ; 4 défauts corrigés (plantage de la fiche projet, onglets EN en double, `totp.test.ts` absent de `npm test`, banc d'essai) ; rapport et guide Phase 5 écrits.

**Reste à faire :**
1. **Neon jamais essayé** : le build applique le schéma (`db-push`) ; sauvegarde et essai sur une branche Neon d'abord (guide Phase 5, §3).
2. **Dossier racine Render** : le service pointe sur `advision-studio-bot-final` ; vérifier la structure du dépôt avant de déposer (guide Phase 5, §1). Déposer les deux lots en un seul commit (§2).
3. **Discord, Brevo/Resend, vraie application 2FA** : aucun essai réel.
4. **Audit de sécurité écrit** : non fait.
5. Écrans non parcourus par les tests navigateur : éditeur de champs de projet par service, Réalisations, Avis, parcours Discord. Pas de Firefox/Safari ni de vrai téléphone.
6. Observations non corrigées : champ « Supplément » sans étiquette accessible ; boutons « Anonymiser » peu contrastés ; onglet « Accès et données » sur deux lignes ; identifiant de catégorie de ticket normalisé sans avertissement ; une ressource externe non identifiée échoue au chargement dans l'environnement de test.
7. Traduction admin : messages d'erreur dynamiques du serveur (avec chiffres/noms) encore en français ; langue mémorisée par navigateur, pas par compte.
8. Tickets dynamiques : le menu du panel classique ne liste pas les nouvelles catégories. Pas de test Discord réel.
9. Typage Prisma non vérifié par compilation (client non généré dans l'environnement de test).
10. Décisions à confirmer : « Retirer » une question de formulaire reste possible ; réalisations/avis ne se suppriment plus (dépublier / masquer / anonymiser).

## 4. Structure du dépôt bot (limite 100 fichiers par envoi)
L'archive du bot est découpée en `ENVOI-GITHUB-1/`, `ENVOI-GITHUB-2/` (chacun < 100 fichiers, chemins déjà à leur place finale : déposez-les l'un après l'autre sur le même dépôt) et `HORS-DEPOT/` (documents). Les tests sont dans ENVOI-2 (non nécessaires au fonctionnement).
