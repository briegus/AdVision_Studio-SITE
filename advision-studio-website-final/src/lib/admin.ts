/**
 * Administration depuis le site — toutes les opérations passent par l'API du bot (jeton vérifié côté serveur).
 * Le jeton vit uniquement en sessionStorage (effacé à la fermeture de l'onglet) et expire côté serveur au bout de 12 h.
 * Rien n'est « sécurisé » côté navigateur : sans jeton valide, le serveur refuse chaque requête.
 */
import { call, ApiError } from "./api";

const KEY = "advision_admin_session";

export function getToken(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const { t, exp } = JSON.parse(raw) as { t: string; exp: number };
    if (!t || Date.now() > exp) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return t;
  } catch {
    return null;
  }
}

export const clearToken = () => sessionStorage.removeItem(KEY);

export async function login(password: string): Promise<void> {
  const r = await call<{ token: string; expiresIn: number }>("/auth/login", { method: "POST", body: JSON.stringify({ password }) });
  sessionStorage.setItem(KEY, JSON.stringify({ t: r.token, exp: Date.now() + Math.min(r.expiresIn, 12 * 3600_000) - 60_000 }));
}

export async function logout(): Promise<void> {
  const t = getToken();
  clearToken();
  if (t) await call("/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${t}` } }).catch(() => {});
}

async function authed<T>(path: string, init: RequestInit = {}): Promise<T> {
  const t = getToken();
  if (!t) throw new ApiError(401, "session");
  try {
    return await call<T>(path, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${t}` } });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) clearToken();
    throw e;
  }
}

export interface AdminWork {
  id: string;
  titre: string;
  description: string | null;
  marque: string | null;
  type: string;
  format: string | null;
  duree: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  featured: boolean;
  published: boolean;
  origine: string;
  source: string;
  discordMessageId: string | null;
  discord?: "posted" | "updated" | "removed" | "none" | "failed";
}

export interface WorkInput {
  titre: string;
  type: string;
  marque: string;
  description: string;
  videoUrl: string;
  imageUrl: string;
  format: string;
  duree: string;
  origine: string;
  featured: boolean;
  postDiscord: boolean;
}

export interface AdminReview {
  id: string;
  note: number;
  commentaire: string | null;
  status: "pending" | "approved" | "rejected";
  hidden: boolean;
  featured: boolean;
  source: string;
  auteurNom: string | null;
  auteur: string;
  createdAt: string;
}

export type ReviewAction = "approve" | "reject" | "unpublish" | "hide" | "show" | "feature" | "unfeature";

export const listAdminWork = () => authed<AdminWork[]>("/realisations");
export const createWork = (w: WorkInput) => authed<AdminWork>("/realisations", { method: "POST", body: JSON.stringify(w) });
export const updateWork = (id: string, w: Partial<WorkInput> & { published?: boolean }) =>
  authed<AdminWork>(`/realisations/${id}`, { method: "PUT", body: JSON.stringify(w) });
export const deleteWork = (id: string) => authed<{ ok: true }>(`/realisations/${id}`, { method: "DELETE" });

export const listAdminReviews = () => authed<{ avis: AdminReview[] }>("/avis").then((r) => r.avis);
export const moderateReview = (id: string, action: ReviewAction) =>
  authed<{ publishedOnDiscord: boolean | null }>(`/avis/${id}/moderate`, { method: "POST", body: JSON.stringify({ action }) });
export const deleteReview = (id: string) => authed<{ ok: true }>(`/avis/${id}`, { method: "DELETE" });

// ───────────── Demandes clients ─────────────
export interface AdminRequest {
  id: string;
  ref: string;
  demandeur: string | null;
  marque: string | null;
  contact: string | null;
  description: string | null;
  statut: string;
  archived: boolean;
  format: string | null;
  duree: string | null;
  budget: string | null;
  source: string;
  createdAt: string;
}
export const REQUEST_STATUTS = ["nouvelle", "en_cours", "traitee", "refusee"] as const;

export const listRequests = (o: { statut?: string; q?: string; archived?: boolean }) => {
  const p = new URLSearchParams();
  if (o.statut) p.set("statut", o.statut);
  if (o.q) p.set("q", o.q);
  if (o.archived) p.set("archived", "1");
  return authed<{ demandes: AdminRequest[] }>(`/demandes?${p}`).then((r) => r.demandes);
};
export const updateRequest = (id: string, b: { statut?: string; archived?: boolean }) =>
  authed<AdminRequest>(`/demandes/${id}`, { method: "PATCH", body: JSON.stringify(b) });

// ───────────── Réglages (salons Discord, notifications) ─────────────
export interface StudioSettings {
  notifyChannelId: string | null;
  realisationsChannelId: string | null;
  absencesChannelId: string | null;
  notifyRoleId: string | null;
  notifyEvents: Record<string, boolean>;
  siteUrl: string | null;
  discordInviteUrl: string | null;
  contactUrl: string | null;
  [k: string]: unknown; // le serveur renvoie d'autres réglages (statuts, tickets…) : on les renvoie tels quels à l'enregistrement
}
export interface DiscordChoices {
  channels: { id: string; name: string }[];
  forums: { id: string; name: string }[];
  roles: { id: string; name: string }[];
}
export const getSettings = () => authed<{ settings: StudioSettings; events: Record<string, string> }>("/studio/settings");
export const getChoices = () => authed<DiscordChoices>("/studio/channels");
export const saveSettings = (s: StudioSettings) => authed<{ settings: StudioSettings }>("/studio/settings", { method: "PUT", body: JSON.stringify(s) });

// ───────────── État des services + tests ─────────────
export interface SystemStatus {
  bot: { ok: boolean; ws: number; uptimeMin: number };
  db: { ok: boolean; ms: number | null };
  email: { ok: boolean };
  cors: { restreint: boolean; origines: string[] };
  notify: { ok: boolean; via: string; channel: string | null };
  realisations: { ok: boolean; kind: "forum" | "text" | null; via: string; channel: string | null };
  proxy: { ip: string | null; forwardedFor: string | null; hops: number };
  protection: {
    flags: { automod: boolean; antiSpam: boolean; antiRaid: boolean };
    spam: { threshold: number; windowSec: number };
    raid: { count: number; windowSec: number; active: boolean; remainingMin: number; suspects: number };
    perms: { manageMessages: boolean; moderateMembers: boolean; kickMembers: boolean; viewChannels: boolean };
    alertChannel: string | null;
  } | null;
  oauth: { google: boolean; discord: boolean };
}
export const getSystem = () => authed<SystemStatus>("/system");
export const testNotify = () => authed<{ ok: true; channel: string; via: string }>("/system/test-notify", { method: "POST" });
export const testEmail = (to: string) => authed<{ ok: true }>("/system/test-email", { method: "POST", body: JSON.stringify({ to }) });

// ───────────── Absences du staff ─────────────
export interface AdminAbsence {
  id: string;
  userId: string;
  membre: string | null;
  motif: string;
  dateDebut: string;
  dateRetourPrevue: string;
  statut: string;
  terminee: boolean;
  commentaire: string | null;
  disponibilite: string | null;
  noteAdmin: string | null;
  threadId: string | null;
}
export const ABSENCE_STATUTS = ["en_attente", "acceptee", "refusee", "prise_en_compte"] as const;
export const listAbsences = (statut?: string) =>
  authed<{ absences: AdminAbsence[] }>(`/absences${statut ? `?statut=${encodeURIComponent(statut)}` : ""}`).then((r) => r.absences);
export const updateAbsence = (id: string, b: { statut?: string; terminee?: boolean; noteAdmin?: string }) =>
  authed<{ absence: AdminAbsence }>(`/absences/${id}`, { method: "PATCH", body: JSON.stringify(b) });

// ───────────── Sécurité / modération (réglages de /setup, maintenant aussi sur le site) ─────────────
export const getConfig = () => authed<{ config: Record<string, unknown> | null }>("/config").then((r) => r.config ?? {});
export const saveConfig = (b: Record<string, unknown>) =>
  authed<{ ok: true; saved: string[]; ignored: string[] }>("/config", { method: "PUT", body: JSON.stringify(b) });
