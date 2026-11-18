/**
 * Diagnostic de connexion du site au serveur (bot + API). Tout est fait DEPUIS LE NAVIGATEUR du visiteur, donc il reproduit
 * exactement ce qui se passe quand le formulaire de contact ou la connexion échoue :
 *   1. VITE_API_URL est-elle définie ?   2. l'adresse est-elle valide ?   3. le serveur répond-il (réveil de Render) ?
 *   4. le navigateur est-il autorisé à lui parler (CORS / ALLOWED_ORIGINS) ?   5. base, Discord, e-mails, connexions OK ?
 * L'astuce du point 4 : une requête « no-cors » aboutit même si le CORS refuse la lecture ; si elle réussit mais que la requête
 * normale échoue, c'est la preuve que le serveur est joignable mais ne reconnaît pas l'adresse du site.
 */
export interface DiagStep { id: string; ok: boolean | null; label: string; detail: string; fix?: string }

export interface DiagDeps {
  apiUrl: string;
  origin: string;
  fetchImpl: typeof fetch;
  timeoutMs?: number;
}

const bool = (v: unknown): boolean => v === true;

export async function runDiagnostic(d: DiagDeps): Promise<DiagStep[]> {
  const steps: DiagStep[] = [];
  const push = (s: DiagStep) => { steps.push(s); return s; };
  const timeout = d.timeoutMs ?? 60_000;   // un réveil de Render peut durer ~1 minute

  // 1) Variable VITE_API_URL
  if (!d.apiUrl) {
    push({ id: "config", ok: false, label: "Adresse du serveur (VITE_API_URL)", detail: "Absente : le site ne sait pas où est le serveur. Rien ne peut fonctionner.",
      fix: "Netlify → Site configuration → Environment variables → VITE_API_URL = l'URL de votre service Render (https://…onrender.com, sans « / » final). Puis : Deploys → Trigger deploy → Clear cache and deploy site." });
    return steps;
  }

  // 2) Forme de l'adresse
  const mixed = d.origin.startsWith("https://") && d.apiUrl.startsWith("http://") && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(d.apiUrl);
  if (!/^https?:\/\/[^\s/]+/.test(d.apiUrl)) {
    push({ id: "url", ok: false, label: "Forme de l'adresse", detail: `« ${d.apiUrl} » n'est pas une adresse valide.`, fix: "Elle doit ressembler à https://votre-service.onrender.com (avec https://, sans espace)." });
    return steps;
  }
  if (mixed) {
    push({ id: "url", ok: false, label: "Forme de l'adresse", detail: "Le site est en https mais l'adresse du serveur est en http : le navigateur bloque la requête (contenu mixte).", fix: "Utilisez l'adresse https:// de Render, puis redéployez le site." });
    return steps;
  }
  push({ id: "url", ok: true, label: "Forme de l'adresse", detail: d.apiUrl });

  // 3) Le serveur répond-il ? (no-cors : réussit dès qu'une réponse revient, même si le CORS en interdit la lecture)
  let reachable = true;
  try {
    await d.fetchImpl(`${d.apiUrl}/health`, { mode: "no-cors", cache: "no-store", signal: AbortSignal.timeout(timeout) });
    push({ id: "reach", ok: true, label: "Le serveur répond", detail: "Le service Render est joignable." });
  } catch {
    reachable = false;
    push({ id: "reach", ok: false, label: "Le serveur répond", detail: "Aucune réponse : service endormi (offre gratuite de Render), arrêté, ou adresse incorrecte.",
      fix: "Patientez 1 minute et relancez ce diagnostic (le premier appel réveille le service). Si ça persiste : vérifiez l'adresse dans Render, puis l'onglet Logs (erreur de démarrage ?) et que « https://VOTRE-URL/health » s'ouvre dans le navigateur." });
    return steps;
  }

  // 4) Le navigateur a-t-il le droit de lire la réponse ? (CORS)
  let status: Record<string, unknown> | null = null;
  try {
    const r = await d.fetchImpl(`${d.apiUrl}/api/public/status`, { mode: "cors", cache: "no-store", signal: AbortSignal.timeout(timeout) });
    status = (await r.json()) as Record<string, unknown>;
    push({ id: "cors", ok: true, label: "Autorisation du site (CORS)", detail: "Le serveur accepte les requêtes venant de ce site." });
  } catch {
    push({ id: "cors", ok: false, label: "Autorisation du site (CORS)", detail: reachable ? `Le serveur répond mais REFUSE les requêtes venant de ${d.origin}.` : "Réponse illisible.",
      fix: `Render → Environment → ALLOWED_ORIGINS = ${d.origin} (exactement, avec https://, sans « / » final ; plusieurs sites séparés par des virgules). Enregistrez : Render redéploie (1–2 min).` });
    return steps;
  }

  // 5) État du serveur
  if (!bool(status["originAllowed"])) push({ id: "origin", ok: false, label: "Adresse du site reconnue", detail: `ALLOWED_ORIGINS ne contient pas ${d.origin}.`, fix: `Ajoutez ${d.origin} à ALLOWED_ORIGINS sur Render.` });
  push({ id: "db", ok: bool(status["db"]), label: "Base de données (Neon)", detail: bool(status["db"]) ? "Connectée." : "Injoignable : aucune demande ni connexion ne peut être enregistrée.", fix: bool(status["db"]) ? undefined : "Render → vérifiez DATABASE_URL (chaîne Neon) et les Logs." });
  push({ id: "discord", ok: bool(status["discord"]), label: "Bot Discord", detail: bool(status["discord"]) ? "En ligne." : "Hors ligne : les notifications Discord ne partiront pas.", fix: bool(status["discord"]) ? undefined : "Render → Logs : vérifiez DISCORD_TOKEN et l'activation des intents (Server Members, Message Content)." });
  push({ id: "mail", ok: bool(status["mail"]), label: "Envoi d'e-mails (codes de vérification)", detail: bool(status["mail"]) ? "Fournisseur configuré." : "NON configuré : aucun code ne peut être envoyé (connexion par e-mail et formulaire de contact impossibles).",
    fix: bool(status["mail"]) ? undefined : "Render → Environment : BREVO_API_KEY (ou RESEND_API_KEY) ET MAIL_FROM_EMAIL (adresse validée chez le fournisseur). Puis Admin → État → « Envoyer un e-mail de test »." });

  // 6) Modes de connexion proposés
  try {
    const r = await d.fetchImpl(`${d.apiUrl}/api/auth/providers`, { mode: "cors", cache: "no-store", signal: AbortSignal.timeout(timeout) });
    const p = (await r.json()) as Record<string, unknown>;
    push({ id: "providers", ok: null, label: "Connexions proposées", detail: `Google : ${bool(p["google"]) ? "oui" : "non"} · Discord : ${bool(p["discord"]) ? "oui" : "non"} · E-mail : ${bool(p["email"]) ? "oui" : "non"}` });
  } catch { /* information facultative */ }
  return steps;
}

/** Texte à copier-coller pour demander de l'aide (sans aucune donnée sensible). */
export function reportText(steps: DiagStep[], origin: string): string {
  return [`Diagnostic AdVision — site : ${origin}`, ...steps.map((s) => `${s.ok === null ? "i" : s.ok ? "OK " : "KO "} ${s.label} : ${s.detail}${s.ok === false && s.fix ? `\n     → ${s.fix}` : ""}`)].join("\n");
}
