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
