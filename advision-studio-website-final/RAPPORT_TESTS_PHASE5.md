# Rapport de tests — Phase 5 (AdVision Studio)

Ce rapport distingue trois niveaux : **code corrigé**, **code compilé / testé automatiquement**, **application réellement testée en production**. Le troisième niveau n'est **pas atteint** : rien n'a été déployé ni essayé sur Neon, Discord, Brevo/Resend, Render ou Netlify.

## 1. Résultats

| Suite | Commande | Résultat |
|---|---|---|
| Bot — unitaires | `npm test` | **71 / 71** (le script omettait `totp.test.ts`, 5 tests : corrigé) |
| Bot — intégration | `npm run test:integration` | **55 / 55** (54 + 1 test de régression) |
| Site — unitaires | `npm test` | **53 / 53** (52 + 1 test d'unicité des onglets EN) |
| Typage | `tsc --noEmit` | Propre côté site. Côté bot : propre **hors typage Prisma** (client non généré dans l'environnement de test, le réseau vers les binaires Prisma est bloqué) |
| Site — compilation | `npm run build` (Vite) | OK |
| **Navigateur** (nouveau) | `bash tests/e2e/run-e2e.sh tests/e2e/phase5.e2e.py` | **17 / 17**, aucune erreur JavaScript |

## 2. Ce que les tests navigateur prouvent

Chromium réel (Playwright), site compilé, **vrai routeur du bot**, base **en mémoire**, faux Discord, faux e-mails. Les étapes :

1. Connexion par mot de passe.
2. Activation de la 2FA : mauvais code refusé, bon code accepté, 10 codes de récupération affichés.
3. Connexion en 2 étapes : mauvais code refusé, code rejoué refusé (anti-rejeu).
4. Un code de récupération n'ouvre une session qu'une fois (9 restants).
5. Liste des sessions et fermeture des autres sessions.
6. RGPD : anonymisation d'une adresse.
7. Désactivation de la 2FA.
8. Rattachement automatique des catégories aux services.
9. Création d'une prestation à options mixtes (information + au choix, supplément, nom EN) enregistrée en base.
10. Site public : seule l'option « au choix » est cochable ; le choix est enregistré avec la demande.
11. Projets : création (titre requis, service).
12. Projets : modification, historique avant/après, archivage, restauration.
13. Catégories de tickets : `siteweb` et `sitebot` archivées et conservées ; création d'une catégorie.
14. Aucun bouton « Supprimer » dans Catalogue, Prestations, Projets, Réalisations, Avis.
15. Archivage puis restauration d'un service (disparaît du site, revient).
16. Bascule FR → EN → FR sans perdre un formulaire en cours.
17. Mobile 390 px : pas de défilement horizontal (Projets, Accès et données, Catalogue, Prestations).

## 3. Défauts trouvés par ces tests (corrigés)

| # | Défaut | Correction | Protection |
|---|---|---|---|
| 1 | **L'administration plantait à l'ouverture d'une fiche projet** : `GET /projets/:id` renvoyait le journal d'audit à la place des notes internes ; l'écran lisait une date inexistante. Aucun test automatique ne couvrait cet écran. | Le serveur renvoie `notes` ; l'écran lit `notes` et tolère une date absente. | Test d'intégration `projets.test.ts` n° 8 : **échoue sans la correction, passe avec** (vérifié). |
| 2 | En anglais, « Réalisations » et « Projets » s'appelaient tous deux « Projects ». | « Réalisations » → « Portfolio ». | Test d'unicité des onglets (`adminI18n.test.ts`). |
| 3 | `npm test` n'exécutait pas `totp.test.ts`. | Ajouté au script. | 71 tests. |
| 4 | Le banc d'essai ne créait pas les catégories de tickets comme `ready.ts`. | Ajouté dans `tests/e2e/server.ts`. | Étape 13. |

## 4. Observations non corrigées

- Champ « Supplément » d'une option : texte indicatif sans étiquette accessible.
- Boutons « Anonymiser » : contraste faible (rouge sombre sur noir).
- Onglet « Accès et données » sur deux lignes dans la barre d'onglets.
- L'identifiant d'une catégorie de ticket est normalisé sans avertissement (`montage_ticket` → `montage-ticket`).
- Le test ignore les erreurs console « Failed to load resource » : une ressource externe est bloquée dans l'environnement de test, elle n'a pas été identifiée.

## 5. Limites précises (non testé)

- **Neon** : aucun `db push` réel. Le build (`prisma generate && node scripts/db-push.mjs && tsc`) l'exécutera au premier déploiement.
- **Discord** : étape Options, panels, tickets, notifications : faux Discord uniquement.
- **E-mails** (Brevo / Resend) : faux e-mails uniquement.
- **2FA** : codes calculés par le script selon la RFC 6238 ; aucune vraie application d'authentification essayée.
- **Navigateurs** : Chromium seulement (bureau 1280 px ; mobile **émulé** 390 px). Ni Firefox ni Safari, ni vrai téléphone.
- **Écrans non parcourus** : éditeur de champs de projet par service, Réalisations et Avis (seule l'absence de « Supprimer » est vérifiée), parcours Discord.
- **Audit de sécurité écrit** : non fait (relecture des routes et permissions Discord à réaliser).
- **Traduction** : les messages d'erreur dynamiques du serveur (avec chiffres ou noms) restent en français ; la langue est mémorisée par navigateur, pas par compte.
- **Menu de tickets classique** : ne liste pas les nouvelles catégories dynamiques.
