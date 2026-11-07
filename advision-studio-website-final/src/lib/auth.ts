/** Connexion des clients du site : Google, Discord ou adresse e-mail (code). Toute la vérification est faite par le serveur. */
import { useSyncExternalStore } from "react";
import { API_URL, call } from "./api";
import { getSession, setSession, subscribeSession, type AccountSession, type AccountUser } from "./session";

export type Provider = "google" | "discord";

export const useAuth = (): AccountSession | null => useSyncExternalStore(subscribeSession, getSession);

export const loadProviders = () => call<{ google: boolean; discord: boolean; email: boolean }>("/auth/providers");

/** Redirige vers le fournisseur : le serveur renverra le visiteur sur ce même site avec un ticket à usage unique. */
export function startOAuth(p: Provider): void {
  const back = `${window.location.origin}/`;
  window.location.assign(`${API_URL}/api/auth/${p}/start?return=${encodeURIComponent(back)}`);
}

interface LoginResult {
  token: string;
  expiresAt: string;
  user: AccountUser;
}
const store = (r: LoginResult) => setSession({ token: r.token, exp: new Date(r.expiresAt).getTime(), user: r.user });

export async function exchangeTicket(ticket: string): Promise<void> {
  store(await call<LoginResult>("/auth/exchange", { method: "POST", body: JSON.stringify({ ticket }) }));
}

export const emailRequest = (email: string, name: string, lang: "en" | "fr") =>
  call<{ ok: true; id: string; cooldownSec: number }>("/auth/email/request", { method: "POST", body: JSON.stringify({ email, name, lang }) });

export async function emailVerify(id: string, code: string): Promise<void> {
  store(await call<LoginResult>("/auth/email/verify", { method: "POST", body: JSON.stringify({ id, code }) }));
}

/** Revalide la session auprès du serveur (jeton révoqué ou expiré → déconnexion locale). */
export async function refreshMe(): Promise<void> {
  const s = getSession();
  if (!s) return;
  try {
    const r = await call<{ user: AccountUser }>("/me");
    setSession({ ...s, user: r.user });
  } catch (e) {
    if ((e as { status?: number }).status === 401) setSession(null);
  }
}

export interface MyRequest {
  ref: string;
  statut: string;
  marque: string | null;
  typePub: string | null;
  format: string | null;
  duree: string | null;
  description: string | null;
  createdAt: string;
}
export const myRequests = () => call<{ demandes: MyRequest[] }>("/me/demandes").then((r) => r.demandes);

export async function logoutAccount(): Promise<void> {
  try {
    await call("/me/logout", { method: "POST" });
  } catch {
    /* hors ligne : on se déconnecte quand même localement */
  }
  setSession(null);
}

export async function deleteAccount(): Promise<void> {
  await call("/me", { method: "DELETE" });
  setSession(null);
}
