/**
 * Session du COMPTE CLIENT (Google / Discord / e-mail). Distincte de la session admin.
 * Le jeton est opaque (le serveur n'en garde que l'empreinte) ; il expire côté serveur au bout de 30 jours.
 */
export interface AccountUser {
  id: string;
  name: string;
  email: string | null;
  emailVerified: boolean;
  avatarUrl: string | null;
  providers: { google: boolean; discord: boolean; email: boolean };
}
export interface AccountSession {
  token: string;
  exp: number;
  user: AccountUser;
}

const KEY = "advision_account";
let cache: AccountSession | null | undefined;
const listeners = new Set<() => void>();

function read(): AccountSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as AccountSession;
    return s.token && s.exp > Date.now() ? s : null;
  } catch {
    return null;
  }
}

export function getSession(): AccountSession | null {
  if (cache === undefined) cache = read();
  // Session expirée : on l'oublie SANS notifier d'abonnés (getSession est appelée pendant le rendu React : pas d'effet de bord)
  if (cache && cache.exp <= Date.now()) { cache = null; try { localStorage.removeItem(KEY); } catch { /* ignoré */ } }
  return cache ?? null;
}

export function setSession(s: AccountSession | null): void {
  cache = s;
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* stockage indisponible (navigation privée) : la session reste en mémoire */
  }
  listeners.forEach((l) => l());
}

export function subscribeSession(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = undefined; // autre onglet connecté/déconnecté
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export const getUserToken = (): string | null => getSession()?.token ?? null;
