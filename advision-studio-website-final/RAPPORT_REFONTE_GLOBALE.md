# AdVision Studio — Rapport de refonte globale

Version du 15 novembre 2026 (Phase 4) · travail repris sur les dernières archives livrées ; aucune fonctionnalité existante supprimée (0 fichier supprimé par rapport aux archives d'origine). **Aucun déploiement en production n'a été lancé.**

## 0. Lecture rapide
| Élément | Terminé (code) | Testé automatiquement | Testé réellement (services connectés) |
|---|---|---|---|
| Six formules, formulaires adaptés, vérification par code, demandes anonymes et avec compte | oui | oui | **non** |
| Curseur de durée 10–30 s, 360p/720p, 16:9 / 9:16 → base, récapitulatif, Discord, ticket, e-mails, espace client | oui | oui (validation, description, ticket) | **non** (rendu du curseur contrôlé dans Chrome) |
| **Catalogue dynamique** (services, questions, ordre, activation, suppression) | oui | oui | **non** (navigateur réel + API simulée) |
| **Formules administrables** (nom, description, composition, disponibilité) | oui | oui | **non** (navigateur réel + API simulée) |
| Page Services alimentée par le catalogue, repli si l'API est injoignable | oui | oui | navigateur réel + API simulée |
| Salons Discord centralisés (onglet Salons) | oui | oui (registre) | **non** |
| Bouton « Ouvrir le ticket », `/demande`, un seul ticket par demande | oui | partiel (données du ticket) | **non** |
| Réalisations par service (filtre site, choix dans l'admin, étiquettes forum) | oui | oui (validation) | **non** |
| Avis : modération avant publication | relu, inchangé | oui (tests statiques) | **non** |
| Comptes administrateur nommés (fin du mot de passe partagé) | oui | oui | **non** |
| **Phase 4 — administration des prestations** (créer, modifier, désactiver, archiver, restaurer, dupliquer, ordre, tarifs, délais, options, visibilité) | oui | oui (22 + 17 tests) | navigateur réel + API réelle sur base **en mémoire** ; **non** sur Neon |
| **Phase 4 — rattachement visuel** catégories → services (automatique enregistrable, manuel, catégories libres, gestion des catégories) | oui | oui | navigateur réel + API réelle sur base en mémoire ; **non** sur Neon |
| **Phase 4 — site** : prestations sous chaque service (page Services) et choix d'une prestation dans le formulaire | oui | oui | navigateur réel + API réelle sur base en mémoire (code e-mail inclus, e-mails simulés) |
| **Phase 4 — synchronisation Discord** après chaque modification (panels publiés actualisés, échec annoncé) | oui | oui (faux Discord qui enregistre les messages) | **non** : jamais essayé sur un vrai serveur Discord |

**« Testé réellement » = aucun service connecté n'a pu être testé** (Discord, Brevo/Resend, Neon, Render, Netlify : aucun accès depuis mon environnement). Ce que j'ai fait de plus que des tests unitaires : le site construit a été ouvert dans un **vrai navigateur (Chrome)** contre une **API simulée en mémoire qui utilise le vrai code de validation du catalogue** — cela prouve la liaison site ↔ catalogue ↔ formulaire, **pas** le fonctionnement de la base, de Discord ou des e-mails.

## 1. Fonctionnalités terminées

### 1.1 Catalogue central (priorité de cette phase)
- **Source unique** : le catalogue (services + questions + formules) est enregistré dans une ligne `catalogue` de la table `StudioSetting` (JSON) — **aucune migration**, aucun changement de schéma. Il est lu par le site (`GET /api/public/catalogue`), par le bot (validation des demandes, tickets, panels) et par l'administration (`GET/PUT /api/studio/catalogue`, réservées à l'administrateur).
- **Administration → onglet « Catalogue »** : ajouter, modifier, ordonner (↑ ↓), activer/désactiver, supprimer un service ; nom et description en français et anglais (anglais facultatif) ; points forts ; icône ; ticket Discord associé ; mention IA ; nom de marque obligatoire ; **questions du formulaire** (texte court, texte long, liste de choix, curseur ; obligatoire ou non ; aide ; rôle « durée / résolution / format » ; masquage quand un autre service est dans la formule). Formules : nom, description, composition (1 à 3 services), disponibilité, ordre, ajout, suppression. Bouton « Revenir aux valeurs d'origine ».
- **Validation côté serveur** (rien d'incohérent n'est enregistré) : identifiants uniques et valides, noms réservés refusés, listes d'au moins 2 options, curseur cohérent, formule référençant un service inexistant refusée (on ne peut donc pas supprimer un service encore utilisé), au moins un service actif et une formule disponible. Les erreurs sont listées dans l'interface.
- **Désactiver un service** masque ses formules sur le site et les refuse côté serveur ; les autres continuent de fonctionner. Réactivation immédiate.
- **Historique protégé** : à la création, la demande enregistre un **instantané** (formule, libellés, réponses lisibles, durée, format). Modifier, désactiver ou supprimer ensuite un service ou une formule ne change **jamais** une ancienne demande ; le ticket ouvert plus tard depuis une ancienne demande est construit depuis cet instantané, pas depuis le catalogue actuel (testé).
- **Page Services et formulaire** : aucune prestation n'est écrite dans le code du site (un test le vérifie). Les formules deviennent les choix du formulaire ; les questions, le curseur (bornes lues dans le catalogue), les listes (boutons si ≤ 3 choix) et le nom de marque obligatoire s'adaptent automatiquement à la formule. Lien `#/contact?formule=…` (anciens liens `?service=…&logo=1` toujours compris).
- **Catalogue injoignable** : le site utilise la dernière copie mémorisée dans le navigateur, puis un repli intégré (`catalogueDefaults.ts`, copie des valeurs par défaut) ; trois tentatives silencieuses (immédiate, +10 s, +30 s). Côté bot, `getCatalogue()` ne lève jamais d'erreur (base indisponible ou JSON invalide → valeurs par défaut, journalisé). Testé dans le navigateur avec l'API coupée.
- **Répercussions** : site (Services, formulaire, récapitulatif), notifications Discord (formule, préférences, détails), e-mails (studio et client), tickets (formule + détails), panel et commande `/services` (introduction issue du catalogue), réalisations (étiquettes de forum).

### 1.2 Conservé et vérifié (rien supprimé)
Six formules · formulaires adaptés · vérification par code e-mail (11 tests) · demandes anonymes et avec compte · notifications Discord et relances · e-mails et relance des e-mails échoués · curseur 10–30 s par pas de 5, 360p/720p, 16:9 / 9:16 et leur transmission (base, ticket, e-mails, espace client) · salons centralisés · bouton « Ouvrir le ticket » · protection des routes d'administration (tests statiques) · identité visuelle (aucune page terminée n'a été redessinée) · français / anglais.

### 1.3 Autres éléments traités dans cette phase
- **Réalisations par service** : une réalisation peut être associée à un service du catalogue (type `svc:<clé>`, validé côté serveur ; les anciens types restent valides) ; filtre par service sur la page Réalisations ; choix du service dans l'administration ; étiquettes du forum Discord. **Aucune réalisation, client ou avis fictif n'a été créé.**
- **Avis** : relecture complète — dépôt du site toujours « en attente », listes et statistiques publiques limitées aux avis approuvés, boutons de modération réservés au staff, modération aussi depuis l'administration ; 1 test statique.
- **Sécurité** : voir §4.

## 2. Testé automatiquement
| Projet | Résultat |
|---|---|
| Bot — `npx tsx --test tests/*.test.ts` | **51 tests réussis** : catalogue (valeurs par défaut, six formules, curseur, résolution/format, ajout/modification/désactivation d'un service ou d'une formule, historique, validation), vérification par code (11), registre des salons, noms de salons, formulations IA, comptes administrateur, sécurité statique (ordre d'authentification des routes, `/me`, dépôt direct, avis), réalisations par service |
| Bot — TypeScript | **0 erreur hors Prisma** (compilation complète impossible ici : le client Prisma ne peut pas être généré) |
| Site — `npm test` | **43 tests réussis** (catalogue de repli bilingue, formules, réponses d'API illisibles, absence de promesses, mention IA, pas de prestation en dur) |
| Site — TypeScript et `npm run build` | **réussis** |
Les noms de champs de base de données utilisés par le nouveau code ont été **vérifiés un par un dans le schéma Prisma** (la compilation ne peut pas le faire ici).

## 3. Testé réellement
**Navigateur réel (Chrome), site construit, API simulée** — ce n'est pas une intégration avec vos services :
1. Page Services alimentée par l'API (4 cartes) ; formulaire de pub : curseur au clavier jusqu'à 30 s, 360p, 9:16 ; code ; récapitulatif affiché ; demande « reçue » par l'API simulée avec `30 s`, `360p · 9:16 (portrait)`, formule et réponses.
2. **Administration** : connexion, onglet Catalogue, ajout d'un service « Shooting photo » (activé) et d'une formule « Photo seule », enregistrement ; **nouveau navigateur** : la page Services affiche le nouveau service et le formulaire sa question.
3. Désactivation du service « logo » depuis l'administration : les formules Logo seul, Publicité + logo et Discord + logo disparaissent du site.
4. **API coupée** : la page Services et le formulaire fonctionnent avec le repli.
5. Mise en page ordinateur (1280 px) et mobile (390 px) sans débordement horizontal ni erreur JavaScript ; une capture de l'onglet Catalogue a été relue.
Ce test a révélé et fait corriger un vrai défaut : un lien vers une autre formule pendant que le formulaire est déjà ouvert ne changeait pas la formule.

## 4. Audit de sécurité
**Relu et jugé correct :** mot de passe comparé en temps constant · blocage après 5 essais (15 min) · connexion refusée hors des origines autorisées (`ALLOWED_ORIGINS`) en production · jetons de session aléatoires de 256 bits, 12 h · corps de requête limité à 64 ko · en-têtes de sécurité · `trust proxy` (IP non falsifiable) · codes e-mail hachés (HMAC), usage unique, 5 essais comptés avant comparaison, 10 min, délai entre envois · limites par IP et par e-mail sur les demandes · pot de miel · liste blanche des réglages · demande enregistrée avant toute notification · anti-doublon des demandes · validation côté serveur de toutes les entrées du catalogue et des demandes (listes fermées, bornes du curseur, longueurs).
**Corrigé :**
- **Mot de passe administrateur unique partagé** → comptes **nommés** facultatifs (`ADMIN_USERS`), compatibles avec l'ancien `ADMIN_PASSWORD` (rien ne casse si vous ne changez rien) ; chaque action d'administration est journalisée **au nom de la personne connectée** ; avertissement au démarrage si les mots de passe font moins de 12 caractères ou si le mot de passe reste partagé.
- Sessions et compteurs de tentatives jamais purgés → purge toutes les 10 min.
- Aucune protection contre l'ajout d'une route d'administration avant l'authentification → tests statiques.
**Limites restantes (non corrigées) :** pas de double authentification ; mots de passe stockés dans les variables d'environnement ; sessions en mémoire (perdues au redémarrage, un seul serveur) ; CORS ouvert à tous si `ALLOWED_ORIGINS` est vide (à renseigner) ; secret de signature de repli faible si `VERIFY_SECRET`, `ADMIN_PASSWORD`/`ADMIN_USERS` et `DISCORD_TOKEN` manquent tous ; permissions Discord, injection, conformité RGPD **non audités** ; **aucun test d'intrusion**.

## 5. Non testé (à vérifier chez vous)
Compilation complète du bot (Prisma) · connexion réelle à Neon (lecture/écriture de la ligne `catalogue`) · envoi réel d'e-mails (Brevo/Resend) et relance · Discord : notification avec bouton, ouverture du ticket, `/demande`, panels, permissions, étiquettes de forum · comptes administrateur nommés en production · synchronisation des statuts entre Discord, le site et « Mon compte » (relue, jamais exécutée) · rendu avec l'API réelle · Render et Netlify.

## 6. Problèmes rencontrés
- Client Prisma non générable (serveur de binaires bloqué) → compilation complète et tests d'intégration base impossibles ; contournement : fonctions pures testées + vérification manuelle des champs du schéma.
- Aucun accès à Discord, Brevo, Neon, Render, Netlify.
- Pendant le travail : un import mal placé cassait la compilation d'un panel (corrigé), une règle de test trop large signalait la formulation officielle (corrigée), un test de sécurité trop strict (corrigé), un identifiant d'administrateur illisible était accepté avec le mot de passe partagé (corrigé et testé), un lien de formule ne se mettait pas à jour dans le navigateur (corrigé).

## 7. Ce qui reste à faire
**Développement :**
1. **Deux catalogues coexistent encore** : le catalogue de cette phase (services, questions, formules : site, formulaires, e-mails, tickets) et l'ancien catalogue de la base (catégories et prestations avec tarifs, utilisé par les panels de commande Discord). Le panel `/services` affiche désormais l'introduction issue du nouveau catalogue, mais sa liste déroulante de prestations vient toujours de l'ancien. Étape suivante : un écran d'administration pour les prestations détaillées ou leur rattachement aux services.
2. Menu des catégories de tickets Discord : le service choisit sa catégorie (pub, montage, logo, Discord, devis) ; un service créé depuis l'administration utilise « devis » par défaut. Nouveaux types de questions ou nouveaux rôles (au-delà de durée / résolution / format) : modification du code.
3. Textes ajoutés depuis l'administration : traduction anglaise facultative (sinon le français s'affiche).
4. Tests d'intégration réels et audit de sécurité complet (§4).
**De votre part :** voir le guide (`GUIDE_DEPLOIEMENT_ADVISION.md`, section « Mise à jour de novembre 2026 ») — variables, ordre de redéploiement, vérifications.

## 8. Fichiers
**Bot — ajoutés :** `src/commands/utility/demande.ts`, `src/services/adminAuth.ts`, `src/services/adminContext.ts`, `src/studio/catalogue.ts`, `src/studio/catalogueStore.ts`, `src/studio/channelRegistry.ts`, `src/studio/mailRetry.ts`, `src/studio/panels/demandeTicket.ts`, `src/utils/channelName.ts`, `tests/` (7 fichiers de tests), `GUIDE_DEPLOIEMENT_ADVISION.md`, `RAPPORT_REFONTE_GLOBALE.md`.
**Bot — modifiés (36) :** `.env.example`, `package.json`, `render.yaml`, `src/api/apiRouter.ts`, `src/api/siteRoutes.ts`, `src/api/studioRoutes.ts`, `src/client/BotClient.ts`, `src/commands/tickets/statut.ts`, `src/commands/utility/annonce.ts`, `src/commands/utility/projet.ts`, `src/commands/utility/utility.ts`, `src/events/interactionCreate.ts`, `src/events/memberEvents.ts`, `src/events/ready.ts`, `src/services/mailer.ts`, `src/services/postTags.ts`, `src/services/securityConfig.ts`, `src/studio/absences.ts`, `src/studio/assistant.ts`, `src/studio/audit.ts`, `src/studio/catalog.ts`, `src/studio/demandes.ts`, `src/studio/notify.ts`, `src/studio/panelKit.ts`, `src/studio/panels/browse.ts`, `src/studio/panels/build.ts`, `src/studio/panels/form.ts`, `src/studio/panels/router.ts`, `src/studio/realisations.ts`, `src/studio/settings.ts`, `src/tickets/avis.ts`, `src/tickets/genericStatusPanel.ts`, `src/tickets/ticketConstants.ts`, `src/tickets/ticketManager.ts`, `src/utils/autoSetup.ts`, `src/utils/setupPanel.ts`.
**Site — ajoutés :** `src/components/DurationSlider.tsx`, `src/components/Segmented.tsx`, `src/lib/catalogue.test.ts`, `src/lib/catalogue.ts`, `src/lib/catalogueDefaults.ts`, `src/views/AdminCatalogue.tsx`, `src/views/AdminChannels.tsx`, `RAPPORT_REFONTE_GLOBALE.md`.
**Site — modifiés (18) :** `GUIDE_DEPLOIEMENT_ADVISION.md`, `RAPPORT_AUDIT_ET_TESTS.md`, `index.html`, `package.json`, `public/apple-touch-icon.png`, `public/og-image.png`, `src/index.css`, `src/lib/admin.ts`, `src/lib/api.ts`, `src/lib/i18n.tsx`, `src/lib/legal.test.ts`, `src/lib/legalContent.ts`, `src/views/Account.tsx`, `src/views/Admin.tsx`, `src/views/Contact.tsx`, `src/views/Pricing.tsx`, `src/views/Services.tsx`, `src/views/Work.tsx`.
**Supprimés :** aucun fichier des archives d'origine (les anciens `formules.ts` et leur test, créés puis remplacés pendant la refonte, n'existaient pas dans les archives d'origine).

## 9. Règles commerciales (vérifiées par des tests)
Plans vidéo générés par IA, montage, rythme, transitions, son, textes et finalisation par l'équipe — formulation officielle : « Plans vidéo générés par intelligence artificielle, puis montés et finalisés par notre équipe. » · durée, résolution et format = préférences du client à confirmer, jamais de « trois générations » · offre gratuite de lancement = publicité seule ; montage, logos et Discord sur devis · aucun prix, délai, nombre de retouches ni engagement inventé · chaque projet étudié individuellement. Aucune condition commerciale n'a été modifiée.

---
# PHASE 3 — Rattachement de l'ancien catalogue (prestations) au catalogue dynamique (13 novembre 2026) — ⚠ les trois points « NON fait » ci-dessous ont été traités en PHASE 4 (voir plus bas)

*Historique : état à la fin de la Phase 3.* Le moteur (bot) est écrit, compilé et testé par des tests automatiques ; l'interface d'administration des prestations et l'affichage côté site ne sont pas faits, et rien de cette phase n'a été essayé dans un vrai navigateur ni sur Discord.

## Terminé (code écrit)
| Élément | Détail |
|---|---|
| Correspondance anciennes prestations → services | Les prestations restent dans leurs catégories (table `ServiceCategorie`, **aucune donnée déplacée ni supprimée**). Chaque catégorie est rattachée à un service : par rattachement **enregistré** dans le catalogue (`categorieIds`) ou, à défaut, **calculé d'après le nom** (les 5 catégories d'origine → publicité ; « Montage vidéo », « Création de logo », « Création de serveurs Discord » → leur service). Une catégorie inconnue reste **visible** (compatibilité) et peut être rattachée ou laissée libre. |
| Services désactivés respectés | Les prestations d'un service désactivé ne sont plus proposées sur **Discord** (listes, fiches, commande) ni sur le **site** (catalogue public). Formules indisponibles : déjà masquées partout. |
| Panels Discord sur le catalogue | `/services` et le panel prestations listent les **services actifs du catalogue** (+ anciennes catégories non rattachées) ; fiche d'un service (description, points forts, mention IA officielle pour la publicité) ; liste de ses prestations ; bouton « Commander ce service ». Les anciens panels déjà publiés continuent de fonctionner (identifiants de catégorie toujours acceptés). |
| Commande Discord = mêmes questions que le site | « Passer une commande » propose les **formules disponibles** ; les modales sont **générées depuis les questions du catalogue** (5 champs par modale ; liste de choix et curseur saisis en texte, reconnus par valeur ou libellé) ; la demande repasse par la **même validation que le site** (`normalizeSiteRequest` : bornes du curseur, listes, champs obligatoires, formule encore disponible) et crée le **même instantané**. Formulaire générique conservé pour « Projet personnalisé » et « Demande de devis ». |
| Un seul pipeline de demande | `studio/requests.ts` : site et Discord créent la demande par la même fonction (instantané, anti-doublon 2 min). Formule combinée = **une demande, un ticket** ; le ticket reprend formule, réponses, durée/résolution/format. Un second envoi renvoie la demande existante. |
| Prestation choisie par le client (site) | Les routes du site acceptent une `prestationId` **facultative**, validée (existe, proposée sur le site, service actif, appartient à un service de la formule) ; instantané du nom enregistré dans la demande. Le catalogue public renvoie les prestations de chaque service (tarif affiché **seulement s'il a été saisi** par l'équipe). |
| Administration (routes) | `GET/PUT /studio/catalogue/rattachement`, `POST …/rattachement/auto` (enregistre le rattachement automatique, idempotent, ne retire rien), `POST …/service-category` (crée au besoin la catégorie d'un service neuf). La création/modification/archivage des prestations utilise les routes **existantes** `/catalogue/*` (suppression = archivage par défaut : les anciennes demandes ne sont pas touchées). |
| Compatibilité des données | Aucune migration ; aucune ligne modifiée ou supprimée par le code ; anciennes demandes et leurs tickets inchangés (le ticket d'une ancienne demande se construit depuis son instantané, ou son texte si elle n'en a pas). |

## Testé automatiquement (cette phase)
Bot : **65 tests réussis** (dont 7 pour le formulaire Discord dynamique et 7 pour le rattachement : correspondance par nom, rattachement enregistré prioritaire, catégorie supprimée ignorée, détachement, idempotence, service désactivé, absence de liste codée en dur dans les panels, passage par la même validation et la même fonction de création que le site). TypeScript : 0 erreur hors Prisma.
Site : **inchangé** dans cette phase (43 tests réussis lors de la livraison précédente, non relancés après cette phase).

## NON fait / NON testé (à ne pas considérer comme terminé)
1. **Administration des prestations détaillées depuis le site** : l'onglet Catalogue ne gère pas encore les prestations (nom, tarif, délai, options, visibilité) ni le rattachement des catégories. Les routes existent côté bot ; l'écran **n'est pas construit**. Pour l'instant ces réglages ne sont pas modifiables depuis l'administration du site.
2. **Site** : le formulaire ne propose pas encore le choix d'une prestation et la page Services n'affiche pas encore les prestations (l'API les renvoie déjà).
3. **Aucun test dans un vrai navigateur avec API simulée** pour cette phase ; **aucun test sur Discord** (modales, menus, boutons, tickets) : le code Discord de cette phase est compilé et relu, jamais exécuté. À vérifier chez vous avant tout usage.
4. Limites à connaître : une modale Discord est limitée à 5 champs texte (une formule à nombreuses questions est répartie sur plusieurs modales) ; une catégorie supprimée laisse ses prestations « sans catégorie » (comportement existant, elles restent visibles sur Discord et n'apparaissent pas sous un service du site) ; les services/formules créés dans l'administration n'ont pas de panel Discord dédié (ils apparaissent dans les menus).
**Aucun déploiement en production n'a été lancé.**

---

# PHASE 4 — Administration des prestations, rattachement visuel, intégration au site, synchronisation Discord (15 novembre 2026)

## 4.1 Ce qui est livré
| Élément | Détail |
|---|---|
| **Onglet « Prestations »** (Administration du site) | Liste filtrable (service, recherche, archivées) ; **créer**, **modifier**, **désactiver/activer**, **dupliquer** (la copie est créée désactivée), **supprimer = archiver** (réversible, bouton **Restaurer**), **suppression définitive** uniquement pour une prestation **déjà archivée** (deux étapes, confirmation) ; **ordre** (↑ ↓, enregistré en une requête) ; **aperçu de la fiche Discord** avant enregistrement. Champs : nom, description, catégorie (donc service), tarif (aucun / sur devis / fixe / à partir de / fourchette + devise), délai, format/durée, conditions, image https, jusqu'à 20 options (nom, prix en texte libre, description), actif, visible sur le site, visible sur Discord. Pastilles « Site ✓/— » et « Discord ✓/— » : indiquent où la prestation est réellement proposée. **Aucun tarif n'est jamais inventé** : un montant n'est affiché que s'il est saisi. |
| **Rattachement visuel** (sous-onglet « Rattachement aux services ») | Pour chaque service : ses catégories (avec le nombre de prestations) ; menu pour déplacer une catégorie vers un autre service ou la **laisser libre** ; **« Lancer et enregistrer le rattachement automatique »** (affiche d'abord les rattachements déduits du nom, enregistre après confirmation, idempotent, ne retire rien, ne reprend pas une catégorie volontairement libre) ; « Créer sa catégorie » pour un service neuf ; gestion des catégories (renommer, activer, visible site / Discord, ajouter). **Aucune suppression de catégorie** n'est proposée (sécurité des données). |
| **Site — page Services** | Sous chaque service : « Voir les prestations (n) » → nom, tarif (si saisi), description, délai, format, options, conditions, bouton **« Demander cette prestation »** (ouvre le formulaire avec la formule du service et la prestation choisie). Le design existant (liquid glass, animations, FR/EN) est conservé. |
| **Site — formulaire de commande** | Liste « Prestation précise (facultatif) » regroupée par service de la formule choisie ; détail (tarif, délai, options) sous la liste ; le choix reste **facultatif** ; récapitulatif final avec la prestation ; si la prestation disparaît pendant la saisie (archivée, désactivée) : message clair, choix retiré, la demande peut continuer sans. Fonctionne pour les demandes **sans compte (code e-mail)** et **avec compte**. |
| **Synchronisation Discord** | Après chaque modification (prestation, catégorie, ordre, rattachement, services du catalogue) le bot **actualise les panels « Services » et « Prestations » déjà publiés** (modification du message existant, **jamais de doublon, rien n'est créé ni supprimé**). L'administration affiche le résultat : « Discord synchronisé : n panel(s) mis à jour », « aucun panel publié à actualiser », ou « ⚠ enregistré, mais Discord n'a pas pu être mis à jour » (l'enregistrement n'est **jamais** perdu). Bouton **« Synchroniser Discord »** pour réessayer. Les menus, listes et fiches Discord relisent de toute façon la base à **chaque clic** : une prestation créée/archivée est visible/invisible sur Discord immédiatement, même sans republier de panel. |
| **Cohérence site / Discord** | Mêmes règles de visibilité : prestation active, non archivée, visible, catégorie active et visible, service actif. Service désactivé → ses prestations disparaissent partout. Catégorie sans service : visible sur Discord (compatibilité), **pas** sur le site (signalée en orange dans l'administration). |

## 4.2 Défauts trouvés par les tests et corrigés (dont un antérieur à cette phase)
1. **Antérieur à la Phase 4 — création des catégories « Montage vidéo », « Création de logo », « Création de serveurs Discord » au démarrage** : le code transmettait à la base un champ interne `v` ; Prisma refuse tout champ inconnu, donc la création échouait (message `[CATALOGUE] initialisation impossible` dans les logs) et ces trois catégories n'étaient **jamais créées automatiquement**. Corrigé (`studio/catalog.ts`). **Conséquence à connaître** : au prochain démarrage du bot, si ces catégories **n'existent pas déjà** dans votre base, elles seront créées **une seule fois, vides** (aucune donnée modifiée ; pas de doublon si vous les aviez créées à la main : comparaison par nom). Si vous ne les voulez pas, supprimez-les depuis l'ancien dashboard/`/setup` — ou dites-le-moi avant déploiement.
2. **Phase 4, détecté par le test navigateur** : la liste des catégories du rattachement ne renvoyait que `id` et `nom` → l'écran affichait « Site — / Discord — » à tort et de fausses cases de visibilité. Corrigé et verrouillé par un test.
3. **Phase 4, détecté en relecture** : le repli hors ligne du site n'avait pas le champ `prestations` (cast TypeScript) → la page Services aurait pu planter si l'API est injoignable. Corrigé (le repli passe par le lecteur du catalogue) et testé dans un vrai navigateur API coupée.
4. Ajouts de sécurité : une prestation modifiée/créée avec une catégorie inexistante est refusée (400) au lieu d'une erreur 500 ; modification d'une prestation inconnue → 404 ; suppression définitive d'une prestation non archivée → 409.

## 4.3 Testé — et avec quoi exactement
| Test | Résultat | Ce que cela prouve | Ce que cela ne prouve **pas** |
|---|---|---|---|
| Bot, tests unitaires/statiques (`npx tsx --test tests/*.test.ts`) | **66 réussis** (65 + 1 nouveau : routes présentes et protégées, synchronisation non bloquante) | logique pure, absence de routes d'administration non protégées | — |
| Bot, **tests d'intégration** (`npm run test:integration`) | **17 réussis** | Les **vraies routes Express** du bot, avec le **vrai schéma Prisma** émulé en mémoire : accès refusé sans jeton (14 routes, vrai et faux jeton) ; rattachement (proposé, enregistré, idempotent, manuel, libre, refus des valeurs inconnues) ; création/validation/modification/archivage/restauration/suppression en deux étapes ; ordre ; aperçu ; visibilité site **et** Discord (actif, archivé, masqué, service désactivé, catégorie libre) ; synchronisation (« synced », « none », « failed » sans perte) ; **interactions Discord simulées** : fiche de service → liste → fiche de prestation, puis « Demander cette prestation » → modales → récapitulatif → confirmation → demande créée avec sa prestation + notification au staff ; **site** : demande avec prestation → **code e-mail** (capturé) → demande enregistrée avec instantané du nom ; prestation inconnue / autre service / masquée / archivée refusée sans e-mail ; demande sans prestation inchangée. | PostgreSQL/Neon (types, contraintes réelles, transactions, performances) ; Discord réel (permissions, limites de l'API, rendu) ; Brevo/Resend réels |
| Site, tests unitaires (`npm test`) | **49 réussis** (43 + 6) | lecture du catalogue et des prestations, validation du formulaire d'administration (tarif, image, options), câblage des écrans, clés FR/EN | rendu visuel |
| **Navigateur réel (Chromium/Playwright)** contre le **site compilé** + le vrai routeur du bot + base en mémoire (`tests/e2e/prestations.e2e.py`) | **22/22 étapes** | Connexion admin ; rattachement automatique (confirmation) et manuel ; création avec validation, aperçu Discord, tarif, option ; message de synchronisation (panels publiés simulés) et d'échec ; ordre ; dupliquer/archiver/restaurer/supprimer définitivement ; modification ; filtre ; service désactivé disparu du site ; page Services avec prestations ; bouton « Demander cette prestation » ; envoi avec **code faux refusé puis bon code accepté** ; prestation archivée pendant la saisie ; **API coupée** (repli hors ligne) ; mobile 390 px sans défilement horizontal ; **aucune erreur JavaScript** | les mêmes limites que ci-dessus |
| TypeScript | site : 0 erreur ; bot : 0 erreur hors celles liées au client Prisma non généré (voir §4.4) | compilation | typage des appels Prisma du bot |
| `vite build` du site | réussi | le site se construit | — |

## 4.4 NON testé / à vérifier chez vous (ne rien considérer comme prouvé sur ces points)
1. **Neon / PostgreSQL réel et client Prisma réel** : `prisma generate` ne peut pas télécharger ses moteurs depuis mon environnement. La base de test est une imitation fidèle du **schéma** mais pas de PostgreSQL. **Avant de déployer, lancez `npm run build` sur votre machine** : il exécute `prisma generate` puis `tsc` et révélera toute erreur de typage Prisma que je n'ai pas pu voir. La correction n°1 (champ `v`) aurait été invisible sans l'imitation stricte du schéma — c'est la seule raison pour laquelle je l'ai détectée.
2. **Discord réel** : aucun message n'a été envoyé à Discord. Les panels et fiches sont construits par le vrai code (discord.js) et inspectés, mais **jamais publiés** : permissions du bot, limites réelles de l'API, rendu des composants, tickets réels, menus et modales dans le client Discord = **à tester sur un serveur de test**.
3. **Brevo / Resend, Render, Netlify, Google/Discord OAuth** : non testés (e-mails simulés).
4. **CORS restreint (`ALLOWED_ORIGINS`)** et **cache HTTP 60 s** du catalogue public : non testés dans ce parcours (CORS ouvert pendant mes tests). Après une modification dans l'administration, le site peut mettre jusqu'à ~1 minute à la refléter.
5. Les routes `/__test/*` et le faux Discord n'existent que dans `tests/e2e/server.ts` (jamais dans le bot réel).

## 4.5 Limites connues
- Les panels Discord « Services » et « Prestations » listent des **services/catégories** (les prestations s'affichent au clic) : la synchronisation actualise donc surtout la liste des services/catégories visibles ; les listes de prestations sont toujours à jour car relues à chaque clic.
- L'ordre (↑ ↓) agit sur l'ordre global ; il est désactivé pendant une recherche (pour éviter les ambiguïtés).
- Pas de suppression de catégorie depuis l'écran (une catégorie supprimée par l'ancien dashboard laisse ses prestations « sans catégorie »).
- L'administration reste en français (comme avant) ; le site public reste FR/EN.
- Une modale Discord est limitée à 5 champs (inchangé) ; les services créés dans l'administration n'ont pas de panel dédié.

## 4.6 Fichiers
**Bot — ajoutés (7)** : `src/studio/catalogSync.ts` ; `tests/integration/prestations.test.ts` ; `tests/helpers/{fakeDb.ts,harness.ts,register.mjs}` ; `tests/e2e/{server.ts,prestations.e2e.py}`. **Modifiés (7)** : `package.json` (script `test:integration`), `src/api/{catalogRoutes,siteRoutes,studioRoutes}.ts`, `src/studio/catalog.ts` (correctif `v`), `src/studio/panels/build.ts` (renvoie le résultat de l'actualisation), `tests/security.test.ts`. **Supprimés : 0.**
**Site — ajoutés (2)** : `src/views/AdminPrestations.tsx`, `src/lib/prestationForm.ts`. **Modifiés (9)** : `src/lib/{admin,api,catalogue,i18n}.ts(x)`, `src/lib/catalogue.test.ts`, `src/views/{Admin,AdminCatalogue,Contact,Services}.tsx`. **Supprimés : 0.**
Le dossier `tests/` du bot n'est pas utilisé en production (seul `src` est compilé) : il peut être omis d'un dépôt GitHub si la limite de fichiers l'exige.

## 4.7 Reste à faire
1. Validation **sur un serveur Discord de test** (voir le guide, « Phase 4 »), puis seulement ensuite déploiement.
2. Audit de sécurité complet (2FA administrateur, RGPD, permissions Discord) — inchangé, non traité ici.
3. Décisions commerciales (tarifs, délais) : **rien n'a été inventé** ; les champs sont vides tant que vous ne les remplissez pas.
**Aucun déploiement en production n'a été lancé.**
