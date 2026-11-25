/**
 * Client de l'API du bot AdVision Studio (le bot Discord et le site partagent la même base Neon).
 * Configurer VITE_API_URL (ex : https://votre-bot.onrender.com) dans .env ou chez l'hébergeur.
 */
const raw = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ?? "";
export const API_URL = raw.replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(status: number, message: string, data: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

import { getUserToken } from "./session";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Réveille le bot (Render gratuit s'endort sans trafic) — appelé dès l'ouverture du site, en arrière-plan. */
export function wakeUp(): void {
  if (!API_URL) return;
  fetch(`${API_URL}/health`, { cache: "no-store" }).catch(() => {});
}

// Le premier appel après une veille peut prendre 30 à 60 s : on patiente et on réessaie au lieu d'afficher une erreur.
export async function call<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) throw new ApiError(0, "VITE_API_URL is not configured");
  const attempts = 3;
  for (let i = 0; i < attempts; i++) {
    let res: Response | null = null;
    try {
      res = await fetch(`${API_URL}/api${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", Accept: "application/json", ...(getUserToken() ? { Authorization: `Bearer ${getUserToken()}` } : {}), ...(init?.headers ?? {}) },
        signal: AbortSignal.timeout(45000),
      });
    } catch {
      res = null; // réseau coupé, timeout ou bot en train de démarrer
    }
    // 502/503/504 = Render est en train de réveiller le service
    const waking = res === null || res.status === 502 || res.status === 503 && !isJson(res) || res.status === 504;
    if (waking && i < attempts - 1) {
      await sleep(4000 * (i + 1));
      continue;
    }
    if (res === null) throw new ApiError(0, "network");
    let data: Record<string, unknown> = {};
    try {
      data = await res.json();
    } catch {
      /* corps vide */
    }
    if (!res.ok) throw new ApiError(res.status, String(data.error ?? `HTTP ${res.status}`), data);
    return data as T;
  }
  throw new ApiError(0, "network");
}

// Un 503 « métier » (ex : e-mails non configurés) est du JSON : on ne réessaie pas dans ce cas.
const isJson = (res: Response) => (res.headers.get("content-type") ?? "").includes("application/json");

const post = <T,>(path: string, body: unknown) => call<T>(path, { method: "POST", body: JSON.stringify(body) });

export interface InquiryInput {
  /** clé de la formule choisie (catalogue) */
  formule: string;
  /** réponses aux questions de la formule (uniquement les champs de cette formule) */
  details: Record<string, string>;
  name: string;
  email: string;
  /** nom de la marque ou du projet */
  company: string;
  /** précisions complémentaires (facultatif) */
  message: string;
  /** prestation détaillée du catalogue choisie (facultatif) */
  prestationId?: string;
  /** identifiants des options « au choix » cochées pour la prestation (facultatif) */
  options?: string[];
  lang: "en" | "fr";
}

const inquiryBody = (i: InquiryInput) => ({
  name: i.name,
  lang: i.lang,
  formule: i.formule,
  prestationId: i.prestationId || undefined,
  ...(i.prestationId && i.options ? { options: i.options } : {}),
  marque: i.company || undefined,
  details: i.details,
  message: i.message || undefined,
});

/** Étape 1 — le serveur envoie le code par e-mail (il n'est jamais renvoyé au navigateur). */
export const requestCode = (i: InquiryInput) =>
  post<{ ok: true; id: string; cooldownSec: number }>("/public/contact/request-code", { ...inquiryBody(i), email: i.email });

/** Compte connecté (e-mail déjà vérifié) : la demande est enregistrée directement, sans code. */
export const submitInquiryAsUser = (i: InquiryInput) =>
  post<{ ok: true; ref: string }>("/public/contact/submit", inquiryBody(i));

/** Étape 2 — le serveur vérifie le code puis crée la demande (D-0001…) et prévient le staff sur Discord. */
export const verifyCode = (id: string, code: string) => post<{ ok: true; ref: string }>("/public/contact/verify", { id, code });

export interface PublicReview {
  id: string;
  auteur: string;
  note: number;
  commentaire: string;
  date: string;
}
export const listReviews = () => call<{ avis: PublicReview[] }>("/public/avis?limit=30").then((r) => r.avis);
export const postReview = (r: { nom: string; entreprise: string; note: number; commentaire: string }) =>
  post<{ ok: true }>("/public/avis", r);

export interface PublicWork {
  id: string;
  /** type historique (produit, marque…) ou service du catalogue (« svc:<clé> ») */
  type: string;
  titre: string;
  description: string | null;
  marque: string | null;
  format: string | null;
  duree: string | null;
  videoUrl: string | null;
}
export const listWork = () => call<{ realisations: PublicWork[] }>("/public/realisations?limit=60").then((r) => r.realisations);
