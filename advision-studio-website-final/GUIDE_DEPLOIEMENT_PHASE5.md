# Guide de déploiement — Phase 5 (complément)

Ce guide complète `GUIDE_DEPLOIEMENT_ADVISION.md` (Phases 1 à 4) : il ne couvre que ce que la Phase 5 change. **Rien de ceci n'a été essayé en production.** Lisez les points 1 à 3 avant tout dépôt.

## 1. Vérifier le dossier racine Render (bloquant)

D'après le tableau de bord, le service Render `AdVision_Studio-BOT` a pour **dossier racine `advision-studio-bot-final`** (branche `main`, déploiement automatique à chaque commit, build `npm install; npm run build`, démarrage `npm run start`). Or le guide de base indique de laisser « Root Directory » **vide**.

Les fichiers des lots `ENVOI-GITHUB-1` et `ENVOI-GITHUB-2` sont à des chemins déjà finaux (`package.json`, `src/`, `prisma/` à la racine du lot). Deux cas :
- Votre dépôt contient déjà un dossier `advision-studio-bot-final/` : déposez les lots **dedans**.
- Sinon : mettez le dossier racine Render à vide (ou au bon dossier) **avant** de déposer.

Si les deux ne correspondent pas, Render ne trouvera pas `package.json` : le déploiement échoue et l'ancienne version reste en ligne (comportement habituel de Render, à confirmer dans l'historique des déploiements).

## 2. Déposer les deux lots en UN SEUL commit

`ENVOI-GITHUB-2` contient des fichiers de `src/` (tickets, studio, utilitaires) que le code de `ENVOI-GITHUB-1` importe. Le déploiement automatique se déclenchant à chaque commit, un dépôt en deux temps déclenche deux builds, dont le premier a de bonnes chances d'échouer à la compilation (non vérifié). Deux options :
- fusionner les deux lots dans le même dossier local, puis un seul commit et un seul `push` ;
- ou désactiver temporairement le déploiement automatique dans Render, déposer les deux lots, puis lancer un déploiement manuel.

## 3. Le build modifie la base Neon

`npm run build` exécute `prisma generate && node scripts/db-push.mjs && tsc`. **Le premier déploiement appliquera donc le nouveau schéma à Neon.** Les changements sont des ajouts (colonnes facultatives et 5 tables : `TicketCategorie`, `AdminSession`, `AdminLoginAttempt`, `AdminTwoFactor`, `AdminChallenge`), sans migration destructive, mais **jamais exécutés sur Neon**. Avant de déployer :
1. Faites une sauvegarde / un point de restauration de la base Neon.
2. Idéalement, testez d'abord sur une branche Neon (copie) en pointant `DATABASE_URL` dessus.
3. Surveillez les journaux du premier déploiement (Render → Logs), en particulier la ligne du script `db-push`.

## 4. Variables d'environnement nouvelles (toutes facultatives)

| Variable | Rôle |
|---|---|
| `TWO_FACTOR_KEY` | Clé de chiffrement des secrets 2FA (sinon `VERIFY_SECRET` sert de clé). **Ne la changez plus ensuite** : les secrets enregistrés deviendraient illisibles. |
| `ADMIN_REQUIRE_2FA=true` | Rend la 2FA obligatoire pour accéder à l'administration. N'activez qu'après avoir configuré la 2FA sur au moins un compte et conservé les codes de récupération. |
| `ADMIN_2FA_RESET=compte1,compte2` | Secours si téléphone et codes sont perdus : à ajouter, redémarrer, puis **retirer**. |
| `RETENTION_DEMANDES_MONTHS` | Entier 1–240. Anonymise automatiquement les demandes traitées plus anciennes. **Désactivé par défaut** ; l'anonymisation est irréversible. |
| `ALLOWED_ORIGINS` | Non nouvelle mais signalée au démarrage : à renseigner avec l'URL du site pour fermer le CORS. |
| `ADMIN_USERS` | Non nouvelle : un compte par personne plutôt qu'un mot de passe partagé. |

## 5. Ordre recommandé

1. Sauvegarde Neon (point 3).
2. Vérifier le dossier racine Render (point 1).
3. Déposer le bot en un seul commit (point 2) ; attendre la fin du déploiement ; lire les journaux (`db-push`, démarrage du bot, ligne `[CATALOGUE]`).
4. Déposer le site (archive `advision-studio-website-final`) ; le site Netlify `advisionstudio` se reconstruit ; vérifier que `VITE_API_URL` pointe vers l'API du bot.
5. Se connecter à l'administration avec le mot de passe, **puis seulement** activer la 2FA (onglet « Accès et données »), conserver les 10 codes de récupération hors de l'appareil.
6. Vérifier dans l'ordre : onglet Projets (ouvrir une fiche), Catalogue → Catégories de tickets (`siteweb` et `sitebot` archivées), Prestations (options), une demande de test sur le site, le ticket Discord correspondant.
7. N'activez `ADMIN_REQUIRE_2FA` et `RETENTION_DEMANDES_MONTHS` qu'en dernier.

## 6. Retour arrière

- Code : rétablir le commit précédent dans GitHub (Render redéploie). Les nouvelles tables et colonnes de Neon restent en place sans gêner, en principe, l'ancien code (ajouts uniquement ; non vérifié sur Neon).
- Base : restaurer le point de restauration Neon uniquement si le schéma est endommagé ; cela perd les données écrites depuis.
- 2FA verrouillée : `ADMIN_2FA_RESET` (point 4).

## 7. Relancer les tests chez vous

```
cd <dossier du bot>
npm ci && npm run build        # génère Prisma, applique le schéma (base réelle !), compile
npm test                       # 71 tests unitaires
npm run test:integration       # 55 tests (base en mémoire)
# Tests navigateur (Python + Playwright + Chromium requis) :
(cd ../site && npm ci && VITE_API_URL=http://127.0.0.1:4317 npm run build)
E2E_SITE_DIST=../site/dist bash tests/e2e/run-e2e.sh tests/e2e/phase5.e2e.py
```
Attention : `npm run build` applique le schéma à la base désignée par `DATABASE_URL` ; pour les tests seuls, utilisez `npx prisma generate && npx tsc`.
