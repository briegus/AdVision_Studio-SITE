import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "fr";

const dict: Record<Lang, Record<string, string>> = {
  en: {
    "a11y.skip": "Skip to content",
    "meta.title": "AdVision Studio — Your brand. In motion.",
    "meta.desc": "AdVision Studio — Cinematic advertising videos created to capture attention. Your brand. In motion.",
    "state.loading": "Loading…",
    "state.retry": "Retry",
    "state.loadError": "Could not load this content. Our server may be waking up — please retry in a few seconds.",
    // Nav
    "nav.home": "Home",
    "nav.services": "Services",
    "nav.work": "Our Work",
    "nav.process": "Our Process",
    "nav.pricing": "Pricing",
    "nav.reviews": "Reviews",
    "nav.contact": "Contact",
    "nav.menu": "Menu",

    // Home
    "home.tagline": "Your brand. In motion.",
    "home.desc": "Cinematic advertising videos created to capture attention.",
    "home.cta1": "Start a project",
    "home.cta2": "See our services",

    // Footer
    "footer.rights": "All rights reserved.",
    "footer.admin": "Admin",
    "footer.discord": "Discord",
    "footer.email": "Email",

    // Services
    "services.title": "Services",
    "services.intro": "We do one thing only: advertising videos. Short, cinematic and built for attention.",
    "services.s1.title": "Short-form ad films",
    "services.s1.desc": "Punchy ads of 4, 6, 8 or 10 seconds — the formats that perform on social feeds and pre-rolls.",
    "services.s2.title": "Any screen, any feed",
    "services.s2.desc": "Delivered in 16:9 for web and screens, or 9:16 for Reels, TikTok, Shorts and Stories.",
    "services.s3.title": "Concept to final cut",
    "services.s3.desc": "You bring the brand and the goal. We handle the idea, the visuals, the edit and the sound.",
    "services.specs": "You choose every spec",
    "services.spec.duration": "Duration",
    "services.spec.resolution": "Resolution",
    "services.spec.aspect": "Aspect ratio",
    "services.cta": "Request your ad",

    // Work
    "work.title": "Our Work",
    "work.empty.title": "Our first productions are on the way.",
    "work.empty.desc": "We only show real projects here — no fake portfolio. Be one of our first clients and see your ad featured on this page.",
    "work.empty.cta": "Start your project",
    "work.watch": "Watch",

    // Process
    "process.title": "Our Process",
    "process.p1.title": "Brief",
    "process.p1.desc": "You tell us about your brand, your goal and the specs you want — duration, format, resolution.",
    "process.p2.title": "Concept",
    "process.p2.desc": "We write a short, sharp concept designed to hook viewers in the first second.",
    "process.p3.title": "Production",
    "process.p3.desc": "We craft the visuals, motion, edit and sound design of your ad.",
    "process.p4.title": "Delivery",
    "process.p4.desc": "You receive your ad in the chosen specs, ready to publish — with one round of revisions.",
    "process.cta": "Send your brief",

    // Pricing
    "pricing.title": "Pricing",
    "pricing.free": "Free",
    "pricing.launch": "Launch offer",
    "pricing.desc": "While we launch the studio, every ad is produced at no cost. One simple offer, everything included.",
    "pricing.f1": "1 advertising video, 4 / 6 / 8 / 10 seconds",
    "pricing.f2": "360p or 720p — your choice",
    "pricing.f3": "16:9 or 9:16 — your choice",
    "pricing.f4": "Concept, edit and sound included",
    "pricing.f5": "Delivery by email or Discord",
    "pricing.note": "No hidden fees. No commitment. This launch offer may evolve later.",
    "pricing.cta": "Claim your free ad",

    // Reviews
    "reviews.title": "Reviews",
    "reviews.empty": "No reviews yet. Reviews appear here once clients share their experience — nothing is invented.",
    "reviews.leave": "Leave a review",
    "reviews.name": "Your name",
    "reviews.company": "Company (optional)",
    "reviews.rating": "Rating",
    "reviews.text": "Your review",
    "reviews.submit": "Submit review",
    "reviews.sending": "Sending…",
    "reviews.thanks": "Thank you! Your review has been submitted and will appear after moderation.",
    "reviews.error": "Could not submit your review. Please try again.",

    // Contact
    "contact.title": "Contact",
    "contact.intro": "Tell us about your ad. We reply fast — by email or on Discord.",
    "contact.discord": "Join our Discord",
    "contact.or": "or send a project inquiry",
    "contact.name": "Your name",
    "contact.email": "Your email",
    "contact.company": "Brand / company (optional)",
    "contact.duration": "Duration",
    "contact.resolution": "Resolution",
    "contact.aspect": "Format",
    "contact.message": "Describe your project — product, audience, goal…",
    "contact.send": "Send inquiry",
    "contact.sending": "Sending…",
    "contact.verify.title": "Check your inbox",
    "contact.verify.desc": "We sent a 6-digit code to {email} to confirm you own this address. Enter it below — your inquiry will only be sent once verified.",
    "contact.verify.placeholder": "6-digit code",
    "contact.verify.confirm": "Verify & send inquiry",
    "contact.verify.checking": "Verifying…",
    "contact.verify.wrong": "Wrong code. Please check and try again.",
    "contact.verify.resend": "Resend code",
    "contact.verify.resent": "A new code was sent.",
    "contact.verify.back": "Edit my inquiry",
    "contact.verify.spam": "Not seeing it? Check your spam folder.",
    "contact.done.title": "Inquiry sent.",
    "contact.done.desc": "Your email is verified and your inquiry has reached us at contact@advisionstudio.useinbox.email. We will get back to you shortly.",
    "contact.done.again": "Send another inquiry",
    "contact.error": "Sending failed. Please try again, or reach us directly on Discord.",
    "contact.waking": "Our server is waking up — this can take up to a minute the first time. Please keep this page open…",
    "contact.required": "Please fill in all required fields.",

    // Admin
    "admin.title": "Administration",
    "admin.login.desc": "Private area. Enter the admin code to continue.",
    "admin.login.placeholder": "Admin code",
    "admin.login.btn": "Sign in",
    "admin.login.wrong": "Invalid code.",
    "admin.logout": "Sign out",
    "admin.tab.inquiries": "Inquiries",
    "admin.tab.reviews": "Reviews",
    "admin.tab.projects": "Projects",
    "admin.inquiries.empty": "No inquiries stored on this device yet.",
    "admin.inquiries.note": "Inquiries are emailed to contact@advisionstudio.useinbox.email and also saved locally on the device where they were submitted.",
    "admin.handled": "Handled",
    "admin.markHandled": "Mark handled",
    "admin.delete": "Delete",
    "admin.approve": "Approve",
    "admin.unapprove": "Hide",
    "admin.reviews.empty": "No reviews submitted on this device.",
    "admin.reviews.pending": "Pending",
    "admin.reviews.approved": "Published",
    "admin.projects.add": "Add a project",
    "admin.projects.title": "Title",
    "admin.projects.client": "Client / brand",
    "admin.projects.video": "Video URL (.mp4 or link)",
    "admin.projects.descr": "Short description",
    "admin.projects.save": "Publish project",
    "admin.projects.empty": "No projects published yet. The Our Work page shows an honest empty state.",
    "admin.storage.note": "Data is stored in this browser (localStorage). Clearing site data removes it.",

    // misc
    "misc.verified": "verified email",
    "misc.seconds": "s",
  },

  fr: {
    "a11y.skip": "Aller au contenu",
    "meta.title": "AdVision Studio — Votre marque. En mouvement.",
    "meta.desc": "AdVision Studio — Des publicités vidéo cinématographiques conçues pour capter l'attention. Votre marque. En mouvement.",
    "state.loading": "Chargement…",
    "state.retry": "Réessayer",
    "state.loadError": "Impossible de charger ce contenu. Notre serveur est peut-être en train de se réveiller — réessayez dans quelques secondes.",
    "nav.home": "Accueil",
    "nav.services": "Services",
    "nav.work": "Réalisations",
    "nav.process": "Notre Processus",
    "nav.pricing": "Tarifs",
    "nav.reviews": "Avis",
    "nav.contact": "Contact",
    "nav.menu": "Menu",

    "home.tagline": "Votre marque. En mouvement.",
    "home.desc": "Des vidéos publicitaires cinématiques créées pour capter l'attention.",
    "home.cta1": "Lancer un projet",
    "home.cta2": "Voir nos services",

    "footer.rights": "Tous droits réservés.",
    "footer.admin": "Admin",
    "footer.discord": "Discord",
    "footer.email": "Email",

    "services.title": "Services",
    "services.intro": "Nous ne faisons qu'une seule chose : des vidéos publicitaires. Courtes, cinématiques, pensées pour l'attention.",
    "services.s1.title": "Pubs courtes percutantes",
    "services.s1.desc": "Des publicités de 4, 6, 8 ou 10 secondes — les formats qui performent sur les réseaux et en pre-roll.",
    "services.s2.title": "Tous les écrans, tous les feeds",
    "services.s2.desc": "Livrées en 16:9 pour le web et les écrans, ou en 9:16 pour Reels, TikTok, Shorts et Stories.",
    "services.s3.title": "Du concept au montage final",
    "services.s3.desc": "Vous apportez la marque et l'objectif. Nous gérons l'idée, l'image, le montage et le son.",
    "services.specs": "Vous choisissez chaque spécification",
    "services.spec.duration": "Durée",
    "services.spec.resolution": "Résolution",
    "services.spec.aspect": "Format d'image",
    "services.cta": "Demander votre pub",

    "work.title": "Réalisations",
    "work.empty.title": "Nos premières productions arrivent.",
    "work.empty.desc": "Nous ne montrons ici que de vrais projets — aucun faux portfolio. Devenez l'un de nos premiers clients et retrouvez votre pub sur cette page.",
    "work.empty.cta": "Lancer votre projet",
    "work.watch": "Voir",

    "process.title": "Notre Processus",
    "process.p1.title": "Brief",
    "process.p1.desc": "Vous nous parlez de votre marque, votre objectif et vos specs — durée, format, résolution.",
    "process.p2.title": "Concept",
    "process.p2.desc": "Nous écrivons un concept court et percutant, conçu pour accrocher dès la première seconde.",
    "process.p3.title": "Production",
    "process.p3.desc": "Nous créons l'image, le mouvement, le montage et le sound design de votre pub.",
    "process.p4.title": "Livraison",
    "process.p4.desc": "Vous recevez votre pub dans les specs choisies, prête à publier — avec une série de retours incluse.",
    "process.cta": "Envoyer votre brief",

    "pricing.title": "Tarifs",
    "pricing.free": "Gratuit",
    "pricing.launch": "Offre de lancement",
    "pricing.desc": "Pendant le lancement du studio, chaque pub est produite gratuitement. Une offre simple, tout inclus.",
    "pricing.f1": "1 vidéo publicitaire de 4 / 6 / 8 / 10 secondes",
    "pricing.f2": "360p ou 720p — au choix",
    "pricing.f3": "16:9 ou 9:16 — au choix",
    "pricing.f4": "Concept, montage et son inclus",
    "pricing.f5": "Livraison par email ou Discord",
    "pricing.note": "Aucun frais caché. Aucun engagement. Cette offre de lancement pourra évoluer.",
    "pricing.cta": "Obtenir votre pub gratuite",

    "reviews.title": "Avis",
    "reviews.empty": "Pas encore d'avis. Les avis apparaissent ici lorsque des clients partagent leur expérience — rien n'est inventé.",
    "reviews.leave": "Laisser un avis",
    "reviews.name": "Votre nom",
    "reviews.company": "Entreprise (optionnel)",
    "reviews.rating": "Note",
    "reviews.text": "Votre avis",
    "reviews.submit": "Envoyer l'avis",
    "reviews.sending": "Envoi…",
    "reviews.thanks": "Merci ! Votre avis a été envoyé et apparaîtra après modération.",
    "reviews.error": "Impossible d'envoyer votre avis. Veuillez réessayer.",

    "contact.title": "Contact",
    "contact.intro": "Parlez-nous de votre pub. Réponse rapide — par email ou sur Discord.",
    "contact.discord": "Rejoindre notre Discord",
    "contact.or": "ou envoyez une demande de projet",
    "contact.name": "Votre nom",
    "contact.email": "Votre email",
    "contact.company": "Marque / entreprise (optionnel)",
    "contact.duration": "Durée",
    "contact.resolution": "Résolution",
    "contact.aspect": "Format",
    "contact.message": "Décrivez votre projet — produit, audience, objectif…",
    "contact.send": "Envoyer la demande",
    "contact.sending": "Envoi…",
    "contact.verify.title": "Vérifiez votre boîte mail",
    "contact.verify.desc": "Nous avons envoyé un code à 6 chiffres à {email} pour confirmer que cette adresse vous appartient. Saisissez-le ci-dessous — votre demande ne sera envoyée qu'après vérification.",
    "contact.verify.placeholder": "Code à 6 chiffres",
    "contact.verify.confirm": "Vérifier & envoyer",
    "contact.verify.checking": "Vérification…",
    "contact.verify.wrong": "Code incorrect. Vérifiez et réessayez.",
    "contact.verify.resend": "Renvoyer le code",
    "contact.verify.resent": "Un nouveau code a été envoyé.",
    "contact.verify.back": "Modifier ma demande",
    "contact.verify.spam": "Rien reçu ? Vérifiez vos spams.",
    "contact.done.title": "Demande envoyée.",
    "contact.done.desc": "Votre email est vérifié et votre demande est bien arrivée sur contact@advisionstudio.useinbox.email. Nous revenons vers vous rapidement.",
    "contact.done.again": "Envoyer une autre demande",
    "contact.error": "L'envoi a échoué. Réessayez, ou contactez-nous directement sur Discord.",
    "contact.waking": "Notre serveur se réveille — cela peut prendre jusqu'à une minute la première fois. Merci de garder cette page ouverte…",
    "contact.required": "Merci de remplir tous les champs requis.",

    "admin.title": "Administration",
    "admin.login.desc": "Espace privé. Entrez le code admin pour continuer.",
    "admin.login.placeholder": "Code admin",
    "admin.login.btn": "Se connecter",
    "admin.login.wrong": "Code invalide.",
    "admin.logout": "Se déconnecter",
    "admin.tab.inquiries": "Demandes",
    "admin.tab.reviews": "Avis",
    "admin.tab.projects": "Projets",
    "admin.inquiries.empty": "Aucune demande enregistrée sur cet appareil pour le moment.",
    "admin.inquiries.note": "Les demandes sont envoyées par email à contact@advisionstudio.useinbox.email et sauvegardées localement sur l'appareil d'envoi.",
    "admin.handled": "Traitée",
    "admin.markHandled": "Marquer traitée",
    "admin.delete": "Supprimer",
    "admin.approve": "Publier",
    "admin.unapprove": "Masquer",
    "admin.reviews.empty": "Aucun avis soumis sur cet appareil.",
    "admin.reviews.pending": "En attente",
    "admin.reviews.approved": "Publié",
    "admin.projects.add": "Ajouter un projet",
    "admin.projects.title": "Titre",
    "admin.projects.client": "Client / marque",
    "admin.projects.video": "URL vidéo (.mp4 ou lien)",
    "admin.projects.descr": "Courte description",
    "admin.projects.save": "Publier le projet",
    "admin.projects.empty": "Aucun projet publié. La page Réalisations affiche un état vide honnête.",
    "admin.storage.note": "Les données sont stockées dans ce navigateur (localStorage). Effacer les données du site les supprime.",

    "misc.verified": "email vérifié",
    "misc.seconds": "s",
  },
};

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string>) => string;
}

const Ctx = createContext<I18nCtx>({ lang: "en", setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("advision_lang");
    if (saved === "fr" || saved === "en") return saved;
    return navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("advision_lang", l);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = dict[lang]["meta.title"] ?? document.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", dict[lang]["meta.desc"] ?? "");
  }, [lang]);

  const t = (key: string, vars?: Record<string, string>) => {
    let s = dict[lang][key] ?? dict.en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
    return s;
  };

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}
