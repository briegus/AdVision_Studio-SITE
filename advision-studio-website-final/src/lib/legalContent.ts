import { LEGAL } from "./legalConfig.ts";
import { CONTACT_EMAIL } from "./mail.ts";

export type LegalKind = "legal" | "privacy" | "cookies" | "terms";
export type Lang = "fr" | "en";
export interface Table { head: string[]; rows: string[][] }
export interface Section { h: string; p: string[]; table?: Table }
export interface LegalDoc { title: string; intro: string; sections: Section[] }

const rep = (s: string, k: string, v: string) => s.split(k).join(v);
const fill = (s: string, lang: Lang) => {
  let o = s;
  for (const [k, v] of [["{NAME}", LEGAL.name[lang]], ["{STATUS}", LEGAL.status[lang]], ["{ADDRESS}", LEGAL.address[lang]], ["{REGNO}", LEGAL.regNo[lang]], ["{DIRECTOR}", LEGAL.director[lang]], ["{EMAIL}", CONTACT_EMAIL]] as const) o = rep(o, k, v);
  return o;
};

const FR: Record<LegalKind, LegalDoc> = {
  legal: {
    title: "Mentions légales",
    intro: "Informations légales relatives au site AdVision Studio.",
    sections: [
      { h: "Éditeur du site", p: ["Nom / raison sociale : {NAME}", "Statut : {STATUS}", "Adresse : {ADDRESS}", "Immatriculation : {REGNO}", "Contact : {EMAIL}", "Directeur de la publication : {DIRECTOR}"] },
      { h: "Hébergement", p: ["Site web : Netlify, Inc. (États-Unis) — netlify.com.", "Serveur applicatif et bot : Render Services, Inc. (États-Unis) — render.com.", "Base de données : Neon, Inc. (États-Unis) — neon.tech."] },
      { h: "Propriété intellectuelle", p: ["Le nom AdVision Studio, le logo, la charte graphique, les textes, les vidéos, les animations et le code de ce site sont la propriété de l'éditeur, sauf mention contraire. Toute reproduction, représentation, adaptation ou extraction, totale ou partielle, sans autorisation écrite préalable est interdite (articles L.122-4 et L.335-2 du Code de la propriété intellectuelle).", "Les marques et contenus de tiers cités appartiennent à leurs propriétaires respectifs."] },
      { h: "Contenus générés par IA", p: ["Les publicités vidéo présentées sur ce site sont générées par intelligence artificielle."] },
      { h: "Responsabilité", p: ["L'éditeur s'efforce de fournir des informations exactes et un site disponible, sans garantie d'absence d'erreur ou d'interruption (maintenance, hébergeur gratuit pouvant se mettre en veille). Les liens vers des sites tiers (Discord, etc.) n'engagent pas sa responsabilité quant à leur contenu."] },
      { h: "Signaler un problème", p: ["Pour signaler un contenu illicite ou une faille de sécurité, écrivez à {EMAIL}. Merci de ne pas exploiter la faille et de nous laisser un délai raisonnable pour la corriger."] },
      { h: "Droit applicable", p: ["Le site est soumis au droit français. En cas de litige, les tribunaux français sont compétents, sous réserve des règles impératives applicables aux consommateurs."] },
    ],
  },
  privacy: {
    title: "Confidentialité et cookies",
    intro: "Comment AdVision Studio traite vos données personnelles, conformément au RGPD.",
    sections: [
      { h: "Responsable du traitement", p: ["{NAME} — {ADDRESS}. Contact : {EMAIL}."] },
      { h: "Cookies et traceurs", p: ["Ce site n'utilise aucun cookie publicitaire ni outil de mesure d'audience. Le détail de ce qui est enregistré dans votre navigateur (liste, finalités, durées, gestion) figure dans notre politique de cookies, page « Cookies »."] },
      { h: "Données collectées et finalités", p: ["Formulaire de contact : nom, adresse e-mail, entreprise, détails du projet et message, pour répondre à votre demande (mesures précontractuelles).", "Vérification par e-mail : votre adresse e-mail et un code à usage unique valable 10 minutes, pour confirmer que l'adresse est bien la vôtre.", "Compte client : si vous vous connectez avec Google ou Discord, nous recevons votre nom, votre adresse e-mail et votre photo de profil ; avec l'e-mail, votre adresse. Finalité : vous identifier et préremplir vos formulaires.", "Suivi de demande : un e-mail automatique vous est envoyé lorsque le statut de votre demande change (en cours, traitée, refusée). Il ne contient aucun contenu commercial.", "Avis : nom, entreprise (facultatif), note et texte, publiés sur le site après validation.", "Sécurité : votre adresse IP est utilisée temporairement pour limiter les abus (anti-spam, tentatives répétées) — intérêt légitime de protéger le service."] },
      { h: "Destinataires et sous-traitants", p: ["Vos données sont traitées par l'éditeur et par les prestataires techniques suivants : Netlify (hébergement du site), Render (serveur et bot), Neon (base de données), Discord (les demandes et avis sont transmis à l'équipe sur un serveur Discord privé), un prestataire d'envoi d'e-mails (Brevo ou Resend) pour les codes de vérification, et Google ou Discord si vous choisissez ces modes de connexion. Si l'assistant IA de notre serveur Discord est activé, les messages envoyés à sa commande sont transmis à un fournisseur de modèles d'IA (Anthropic ou OpenAI).", "Le site charge aussi des ressources chez des tiers, qui reçoivent donc votre adresse IP : Google Fonts (polices de caractères) et Mux (vidéo d'arrière-plan)."] },
      { h: "Transferts hors Union européenne", p: ["Plusieurs de ces prestataires sont établis aux États-Unis. Ces transferts doivent reposer sur un mécanisme prévu par le RGPD (par exemple le Data Privacy Framework ou les clauses contractuelles types) ; consultez les politiques de ces prestataires pour le détail."] },
      { h: "Durée de conservation", p: ["Les codes de vérification expirent après 10 minutes. Les demandes de contact sont conservées le temps de traiter votre demande puis, au plus, pendant la durée de la relation commerciale ; les avis publiés le restent jusqu'à leur retrait ; la session d'un compte client expire au bout de 30 jours. Vous pouvez demander l'effacement de vos données à tout moment."] },
      { h: "Vos droits", p: ["Vous disposez des droits d'accès, de rectification, d'effacement, de limitation, de portabilité et d'opposition. Pour les exercer, écrivez à {EMAIL}. Vous pouvez aussi introduire une réclamation auprès de la CNIL (cnil.fr)."] },
      { h: "Sécurité", p: ["Les échanges avec le site sont chiffrés (HTTPS), les codes de vérification sont à usage unique et limités en tentatives, et les accès d'administration sont protégés. Aucune mesure ne garantit toutefois une sécurité absolue."] },
      { h: "Mise à jour", p: ["Dernière mise à jour : {UPDATED}. Cette politique peut évoluer ; la version en vigueur est celle publiée sur cette page."] },
    ],
  },
  cookies: {
    title: "Politique de cookies",
    intro: "Ce que ce site enregistre dans votre navigateur, pourquoi, pour combien de temps, et comment le gérer.",
    sections: [
      { h: "En bref", p: ["Aucun cookie publicitaire, aucune mesure d'audience, aucun réseau social, aucun profilage. Seuls quelques éléments strictement nécessaires au fonctionnement du site sont enregistrés. Ils sont exemptés de consentement : c'est pourquoi le site n'affiche qu'un bandeau d'information et non un choix « accepter / refuser »."] },
      { h: "Ce que recouvre le mot « cookie »", p: ["Un cookie est un petit fichier déposé par un site dans votre navigateur. Le même cadre légal (article 82 de la loi Informatique et Libertés, directive ePrivacy) s'applique à d'autres techniques équivalentes, comme le stockage local (localStorage) et le stockage de session (sessionStorage) du navigateur. Nous les désignons ici ensemble par « traceurs »."] },
      { h: "Liste complète des traceurs utilisés", p: ["Tous sont de finalité technique. Aucun n'est utilisé pour vous suivre d'un site à l'autre."], table: {
        head: ["Nom", "Type et émetteur", "Finalité", "Durée"],
        rows: [
          ["advision_lang", "Stockage local · ce site", "Mémoriser votre langue (français / anglais).", "Jusqu'à effacement par vous"],
          ["advision_account", "Stockage local · ce site", "Garder votre session si vous vous connectez à votre compte client (jeton opaque, sans mot de passe).", "30 jours au plus, ou jusqu'à la déconnexion"],
          ["advision_notice", "Stockage local · ce site", "Se souvenir que vous avez fermé le bandeau d'information.", "Jusqu'à effacement par vous"],
          ["advision_admin_session", "Stockage de session · ce site", "Session de l'espace d'administration (équipe uniquement ; n'est jamais créée pour un visiteur).", "12 heures au plus, effacé à la fermeture de l'onglet"],
          ["adv_oauth", "Cookie HTTP · serveur de connexion du studio (onrender.com)", "Protéger la connexion avec Google ou Discord contre le détournement. Créé uniquement quand vous cliquez sur « Continuer avec Google » ou « Continuer avec Discord » (HttpOnly, SameSite=Lax, Secure).", "10 minutes"],
        ] } },
      { h: "Contenus chargés chez des tiers", p: ["Pour s'afficher, la page charge des ressources depuis des services tiers : Google Fonts (polices de caractères) et Mux (vidéo d'arrière-plan). Votre navigateur leur transmet alors des informations techniques, dont votre adresse IP. À notre connaissance, ils ne déposent pas de cookie par ce biais, mais leurs propres politiques s'appliquent.", "Si vous choisissez de vous connecter avec Google ou Discord, vous quittez brièvement notre site pour celui du fournisseur, qui applique ses propres cookies et sa propre politique."] },
      { h: "Gérer ou supprimer les traceurs", p: ["Vous pouvez à tout moment supprimer ces éléments dans les réglages de votre navigateur (rubrique confidentialité, « cookies et données de sites »), ou naviguer en mode privé : tout est alors effacé à la fermeture. Conséquence : le site vous redemandera votre langue et votre connexion, et le bandeau d'information réapparaîtra.", "Le bloquer entièrement empêche seulement la mémorisation de la langue et de la session ; la consultation du site reste possible."] },
      { h: "Si cela change un jour", p: ["Si nous ajoutions un jour des mesures d'audience non exemptées, de la publicité ou tout autre traceur non nécessaire, un bandeau vous demanderait d'abord votre accord : refuser serait aussi simple qu'accepter, et vous pourriez revenir sur votre choix à tout moment. Cette page serait mise à jour avant."] },
      { h: "Questions et réclamation", p: ["Pour toute question : {EMAIL}. Le traitement de vos données personnelles est décrit dans la politique de confidentialité. Vous pouvez aussi vous adresser à la CNIL (cnil.fr)."] },
      { h: "Mise à jour", p: ["Dernière mise à jour : {UPDATED}."] },
    ],
  },
  terms: {
    title: "Conditions d'utilisation",
    intro: "Règles d'utilisation du site AdVision Studio et de son serveur Discord associé.",
    sections: [
      { h: "Acceptation", p: ["En utilisant ce site, vous acceptez les présentes règles. Si vous n'êtes pas d'accord, n'utilisez pas le site."] },
      { h: "Utilisation autorisée", p: ["Le site sert à découvrir nos services, nous contacter, laisser un avis et gérer votre compte client. Vous vous engagez à fournir des informations exactes et à n'utiliser que votre propre adresse e-mail."] },
      { h: "Interdictions", p: ["Il est interdit de : copier, reproduire, extraire ou republier tout ou partie du site, de ses vidéos, de son design ou de son code sans autorisation écrite ; utiliser des robots, scripts ou outils automatisés pour collecter des données ou envoyer des demandes en masse ; tenter d'accéder à des comptes, à l'administration, à la base de données ou au serveur sans autorisation, d'en contourner les protections ou de rechercher des failles pour les exploiter ; envoyer du spam, des contenus injurieux, illicites ou usurpant l'identité d'un tiers.", "Un accès ou un maintien frauduleux dans un système informatique est un délit (articles 323-1 et suivants du Code pénal). Les infractions pourront entraîner le blocage de l'accès, la suppression de contenus et, le cas échéant, des poursuites."] },
      { h: "Contenus que vous envoyez", p: ["Vous restez responsable des contenus (messages, avis) que vous nous envoyez. En publiant un avis, vous nous autorisez à l'afficher sur le site et sur notre serveur Discord. Nous pouvons modérer, refuser ou retirer un contenu."] },
      { h: "Propriété intellectuelle", p: ["Les contenus du site sont protégés (voir les mentions légales). Les vidéos réalisées pour un client sont soumises aux conditions convenues avec lui par écrit."] },
      { h: "Disponibilité et responsabilité", p: ["Le site est fourni « en l'état ». Il peut être interrompu ou modifié à tout moment. L'éditeur ne peut être tenu responsable des dommages indirects liés à l'utilisation du site, dans la limite permise par la loi."] },
      { h: "Sécurité : signaler une faille", p: ["Si vous découvrez une faille, écrivez à {EMAIL} sans l'exploiter ni divulguer les données auxquelles elle donnerait accès."] },
      { h: "Modification et droit applicable", p: ["Ces règles peuvent être modifiées ; la version en ligne fait foi. Elles sont soumises au droit français. Dernière mise à jour : {UPDATED}."] },
    ],
  },
};

const EN: Record<LegalKind, LegalDoc> = {
  legal: {
    title: "Legal notice",
    intro: "Legal information about the AdVision Studio website.",
    sections: [
      { h: "Publisher", p: ["Name / company: {NAME}", "Status: {STATUS}", "Address: {ADDRESS}", "Registration: {REGNO}", "Contact: {EMAIL}", "Publication director: {DIRECTOR}"] },
      { h: "Hosting", p: ["Website: Netlify, Inc. (United States) — netlify.com.", "Application server and bot: Render Services, Inc. (United States) — render.com.", "Database: Neon, Inc. (United States) — neon.tech."] },
      { h: "Intellectual property", p: ["The AdVision Studio name, logo, visual identity, texts, videos, animations and code of this site belong to the publisher unless stated otherwise. Any reproduction, representation, adaptation or extraction, in whole or in part, without prior written permission is prohibited (French Intellectual Property Code, articles L.122-4 and L.335-2).", "Third-party trademarks and content belong to their respective owners."] },
      { h: "AI-generated content", p: ["The advertising videos shown on this site are generated with artificial intelligence."] },
      { h: "Liability", p: ["The publisher aims to provide accurate information and an available site, without guaranteeing the absence of errors or interruptions (maintenance, free hosting that may go idle). Links to third-party sites (Discord, etc.) do not engage its responsibility for their content."] },
      { h: "Report a problem", p: ["To report unlawful content or a security flaw, write to {EMAIL}. Please do not exploit the flaw and allow reasonable time for a fix."] },
      { h: "Governing law", p: ["This site is governed by French law. French courts have jurisdiction, subject to mandatory consumer-protection rules."] },
    ],
  },
  privacy: {
    title: "Privacy and cookies",
    intro: "How AdVision Studio handles your personal data, in line with the GDPR.",
    sections: [
      { h: "Data controller", p: ["{NAME} — {ADDRESS}. Contact: {EMAIL}."] },
      { h: "Cookies and trackers", p: ["This site uses no advertising cookies and no audience-measurement tools. The detail of what is stored in your browser (list, purposes, durations, management) is in our cookie policy, the “Cookies” page."] },
      { h: "Data collected and purposes", p: ["Contact form: name, email, company, project details and message, to answer your request (pre-contractual steps).", "Email verification: your email address and a one-time code valid for 10 minutes, to confirm the address is yours.", "Customer account: if you sign in with Google or Discord, we receive your name, email address and profile picture; with email, your address. Purpose: to identify you and pre-fill forms.", "Request tracking: an automatic email is sent when the status of your request changes (in progress, handled, declined). It contains no marketing content.", "Reviews: name, company (optional), rating and text, published on the site after approval.", "Security: your IP address is used temporarily to limit abuse (spam, repeated attempts) — legitimate interest in protecting the service."] },
      { h: "Recipients and processors", p: ["Your data is handled by the publisher and by these technical providers: Netlify (site hosting), Render (server and bot), Neon (database), Discord (requests and reviews are forwarded to the team on a private Discord server), an email-sending provider (Brevo or Resend) for verification codes, and Google or Discord if you choose those sign-in methods. If the AI assistant on our Discord server is enabled, messages sent to its command are forwarded to an AI model provider (Anthropic or OpenAI).", "The site also loads resources from third parties, which therefore receive your IP address: Google Fonts (typefaces) and Mux (background video)."] },
      { h: "Transfers outside the European Union", p: ["Several of these providers are based in the United States. Such transfers must rely on a GDPR mechanism (for example the Data Privacy Framework or standard contractual clauses); see the providers' own policies for details."] },
      { h: "Retention", p: ["Verification codes expire after 10 minutes. Contact requests are kept while your request is handled and, at most, for the duration of the business relationship; published reviews stay online until removed; a customer-account session expires after 30 days. You may ask for your data to be erased at any time."] },
      { h: "Your rights", p: ["You have the rights of access, rectification, erasure, restriction, portability and objection. To exercise them, write to {EMAIL}. You may also lodge a complaint with the CNIL (cnil.fr) or your local data-protection authority."] },
      { h: "Security", p: ["Traffic with the site is encrypted (HTTPS), verification codes are single-use with limited attempts, and administration access is protected. No measure can guarantee absolute security, however."] },
      { h: "Updates", p: ["Last updated: {UPDATED}. This policy may change; the version published on this page applies."] },
    ],
  },
  cookies: {
    title: "Cookie policy",
    intro: "What this site stores in your browser, why, for how long, and how to manage it.",
    sections: [
      { h: "In short", p: ["No advertising cookies, no audience measurement, no social networks, no profiling. Only a few items strictly necessary for the site to work are stored. They are exempt from consent, which is why the site shows an information notice rather than an “accept / refuse” choice."] },
      { h: "What “cookie” covers", p: ["A cookie is a small file a site places in your browser. The same legal framework (ePrivacy Directive, French Data Protection Act article 82) applies to equivalent techniques such as the browser's local storage (localStorage) and session storage (sessionStorage). We refer to all of them here as “trackers”."] },
      { h: "Complete list of trackers used", p: ["All are technical. None is used to follow you from one site to another."], table: {
        head: ["Name", "Type and issuer", "Purpose", "Duration"],
        rows: [
          ["advision_lang", "Local storage · this site", "Remember your language (French / English).", "Until you clear it"],
          ["advision_account", "Local storage · this site", "Keep you signed in if you use your customer account (opaque token, no password).", "30 days at most, or until you sign out"],
          ["advision_notice", "Local storage · this site", "Remember that you closed the information notice.", "Until you clear it"],
          ["advision_admin_session", "Session storage · this site", "Administration area session (team only; never created for a visitor).", "12 hours at most, cleared when the tab is closed"],
          ["adv_oauth", "HTTP cookie · the studio's sign-in server (onrender.com)", "Protect Google or Discord sign-in against hijacking. Created only when you click “Continue with Google” or “Continue with Discord” (HttpOnly, SameSite=Lax, Secure).", "10 minutes"],
        ] } },
      { h: "Content loaded from third parties", p: ["To display, the page loads resources from third-party services: Google Fonts (typefaces) and Mux (background video). Your browser then sends them technical information, including your IP address. To our knowledge they do not set cookies this way, but their own policies apply.", "If you choose to sign in with Google or Discord, you briefly leave our site for the provider's, which applies its own cookies and policy."] },
      { h: "Managing or deleting trackers", p: ["You can delete these items at any time in your browser settings (privacy section, “cookies and site data”), or browse in private mode: everything is erased when you close it. As a result, the site will ask for your language and sign-in again, and the information notice will reappear.", "Blocking them entirely only prevents remembering your language and session; the site stays usable."] },
      { h: "If this ever changes", p: ["If we ever added non-exempt audience measurement, advertising or any other non-essential tracker, a banner would first ask for your agreement: refusing would be as easy as accepting, and you could change your mind at any time. This page would be updated beforehand."] },
      { h: "Questions and complaints", p: ["For any question: {EMAIL}. How your personal data is processed is described in the privacy policy. You may also contact the CNIL (cnil.fr)."] },
      { h: "Updates", p: ["Last updated: {UPDATED}."] },
    ],
  },
  terms: {
    title: "Terms of use",
    intro: "Rules for using the AdVision Studio website and its linked Discord server.",
    sections: [
      { h: "Acceptance", p: ["By using this site you accept these rules. If you disagree, please do not use the site."] },
      { h: "Permitted use", p: ["The site lets you discover our services, contact us, leave a review and manage your customer account. You agree to provide accurate information and to use only your own email address."] },
      { h: "Prohibited actions", p: ["You must not: copy, reproduce, extract or republish all or part of the site, its videos, design or code without written permission; use bots, scripts or automated tools to collect data or send requests in bulk; attempt to access accounts, administration, the database or the server without authorization, bypass their protections or look for flaws to exploit them; send spam or abusive, unlawful or impersonating content.", "Fraudulent access to or remaining in a computer system is a criminal offence (French Penal Code, articles 323-1 et seq.). Violations may lead to access being blocked, content removed and, where appropriate, legal action."] },
      { h: "Content you send", p: ["You remain responsible for the content (messages, reviews) you send us. By publishing a review, you allow us to display it on the site and on our Discord server. We may moderate, refuse or remove content."] },
      { h: "Intellectual property", p: ["Site content is protected (see the legal notice). Videos produced for a client are subject to the terms agreed with that client in writing."] },
      { h: "Availability and liability", p: ["The site is provided “as is”. It may be interrupted or changed at any time. The publisher is not liable for indirect damages arising from use of the site, to the extent permitted by law."] },
      { h: "Security: report a flaw", p: ["If you find a flaw, write to {EMAIL} without exploiting it or disclosing the data it would expose."] },
      { h: "Changes and governing law", p: ["These rules may change; the online version prevails. They are governed by French law. Last updated: {UPDATED}."] },
    ],
  },
};

export function getLegalDoc(kind: LegalKind, lang: Lang): LegalDoc {
  const d = (lang === "fr" ? FR : EN)[kind];
  const f = (s: string) => rep(fill(s, lang), "{UPDATED}", LEGAL.updated[lang]);
  const ft = (t?: Table): Table | undefined => (t ? { head: t.head, rows: t.rows.map((r) => r.map(f)) } : undefined);
  return { title: d.title, intro: d.intro, sections: d.sections.map((x) => ({ h: x.h, p: x.p.map(f), table: ft(x.table) })) };
}
