/**
 * Administration depuis le site — toutes les opérations passent par l'API du bot (jeton vérifié côté serveur).
 * Le jeton vit uniquement en sessionStorage (effacé à la fermeture de l'onglet) et expire côté serveur au bout de 12 h.
 * Rien n'est « sécurisé » côté navigateur : sans jeton valide, le serveur refuse chaque requête.
 */
import { call, ApiError } from "./api";
import { ta } from "./adminI18n";

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

const keep = (r: { token: string; expiresIn: number }) => sessionStorage.setItem(KEY, JSON.stringify({ t: r.token, exp: Date.now() + Math.min(r.expiresIn, 12 * 3600_000) - 60_000 }));
export interface LoginResult { twoFactorRequired: boolean; challenge?: string; mustSetup2fa?: boolean }
/** Étape 1 : identifiant + mot de passe. Si la double authentification est activée, le serveur renvoie un « défi » à compléter avec le code (étape 2). */
export async function login(password: string, user = ""): Promise<LoginResult> {
  const r = await call<{ token?: string; expiresIn: number; twoFactorRequired?: boolean; challenge?: string; mustSetup2fa?: boolean }>("/auth/login", { method: "POST", body: JSON.stringify({ password, ...(user.trim() ? { user: user.trim() } : {}) }) });
  if (r.twoFactorRequired) return { twoFactorRequired: true, challenge: r.challenge! };
  keep({ token: r.token!, expiresIn: r.expiresIn });
  return { twoFactorRequired: false, mustSetup2fa: !!r.mustSetup2fa };
}
/** Étape 2 : code à 6 chiffres de l'application, ou code de récupération. */
export async function loginSecondFactor(challenge: string, code: string): Promise<{ recoveryUsed: boolean; recoveryLeft?: number }> {
  const r = await call<{ token: string; expiresIn: number; recoveryUsed?: boolean; recoveryLeft?: number }>("/auth/login/2fa", { method: "POST", body: JSON.stringify({ challenge, code }) });
  keep(r);
  return { recoveryUsed: !!r.recoveryUsed, ...(r.recoveryLeft !== undefined ? { recoveryLeft: r.recoveryLeft } : {}) };
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
  annoncesChannelId: string | null;
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

// ───────────── Salons Discord : registre central (onglet « Salons ») ─────────────
export type ChannelStatus = "manual" | "auto" | "ambiguous" | "missing" | "deleted" | "wrong_type";
export interface ChannelRoleItem {
  key: string; label: string; group: "studio" | "vitrine" | "tickets" | "journaux";
  kind: "text" | "forum" | "textOrForum" | "category"; usage: string;
  manualId: string | null; status: ChannelStatus;
  manual: { id: string; name: string } | null; detected: { id: string; name: string }[];
  effective: { id: string; name: string; source: "manual" | "auto" } | null; canDetect: boolean;
}
export interface ChannelRolesData {
  connected: boolean; items: ChannelRoleItem[];
  staffRoles: { notifyRoleId: string | null; absenceManagerRoleIds: string[]; ticketSupportRoles: string[] };
  choices: { channels: { id: string; name: string }[]; forums: { id: string; name: string }[]; categories: { id: string; name: string }[]; roles: { id: string; name: string }[] };
}
export const getChannelRoles = () => authed<ChannelRolesData>("/studio/channel-roles");
export const saveChannelRoles = (b: { channels?: Record<string, string | null>; staffRoles?: Record<string, unknown> }) =>
  authed<{ ok: true; saved: string[]; ignored: { key: string; reason: string }[] }>("/studio/channel-roles", { method: "PUT", body: JSON.stringify(b) });

// ───────────── Catalogue central : services et formules (onglet « Catalogue ») ─────────────
export interface AL { fr: string; en?: string }
export interface AQuestion {
  name: string; label: AL; placeholder?: AL; kind: "text" | "long" | "select" | "slider"; required: boolean;
  options?: { value: string; label: AL }[]; slider?: { min: number; max: number; step: number; default: number };
  default?: string; role?: "duree" | "resolution" | "format"; skipIfServices?: string[];
}
export interface AProjectField { name: string; label: AL; kind: "text" | "long" }
export interface AService {
  key: string; nom: AL; description: AL; points: AL[]; icon: string; actif: boolean; ordre: number; archived?: boolean;
  requiresBrand: boolean; ticketCategory: string; aiNotice: boolean; questions: AQuestion[]; projectFields?: AProjectField[]; categorieIds?: string[];
}
export interface AFormule { key: string; nom: AL; description: AL; services: string[]; actif: boolean; ordre: number; archived?: boolean }
export interface AdminCatalogueData { services: AService[]; formules: AFormule[] }
export interface ATicketCategory { id: string; key: string; labelFr: string; labelEn: string | null; emoji: string; descriptionFr: string; descriptionEn: string | null; actif: boolean; archived: boolean; systeme: boolean; ordre: number }
export interface CatalogueResponse { catalogue: AdminCatalogueData; source: "db" | "default"; defaults: AdminCatalogueData; icons: string[]; ticketCategories: string[]; ticketCategoryList: ATicketCategory[]; defaultProjectFields: Record<string, AProjectField[]> }
export const getCatalogueAdmin = () => authed<CatalogueResponse>("/studio/catalogue");
export const saveCatalogueAdmin = (catalogue: AdminCatalogueData) =>
  authed<{ ok: true; catalogue: AdminCatalogueData; discord?: DiscordSync }>("/studio/catalogue", { method: "PUT", body: JSON.stringify({ catalogue }) });
export const resetCatalogueAdmin = () => authed<{ ok: true; catalogue: AdminCatalogueData }>("/studio/catalogue/reset", { method: "POST", body: "{}" });

// ───────────── Synchronisation avec les panels Discord (renvoyée par chaque modification du catalogue) ─────────────
export interface DiscordSync { status: "synced" | "none" | "partial" | "failed"; updated: number; failed: number }
/** Phrase affichée à l'administrateur après une modification (jamais « synchronisé » si Discord a échoué). */
export function syncMessage(d: DiscordSync | undefined): string {
  if (!d) return "";
  if (d.status === "synced") return ta("Discord synchronisé : {0} panel(s) mis à jour.", [d.updated]);
  if (d.status === "none") return ta("Aucun panel Discord publié à actualiser (les menus Discord lisent le catalogue à chaque utilisation).");
  return ta("⚠️ Enregistré, mais Discord n'a pas pu être mis à jour (salon introuvable ou permissions du bot). Utilisez « Synchroniser Discord » pour réessayer.");
}
export const syncFailed = (d: DiscordSync | undefined): boolean => !!d && (d.status === "failed" || d.status === "partial");

// ───────────── Prestations détaillées (tarifs, délais, options, visibilité) et rattachement aux services ─────────────
export type PrixMode = "aucun" | "fixe" | "a_partir" | "fourchette" | "devis";
export interface POption {
  id?: string; nom: string; nomEn?: string; description?: string; descriptionEn?: string; prix?: string; mode?: "info" | "select"; actif?: boolean; ordre?: number; conditions?: string; conditionsEn?: string;
}
export interface APrestation {
  id: string; nom: string; description: string; categorieId: string | null; imageUrl: string | null;
  prixMode: PrixMode; prixMin: number | null; prixMax: number | null; devise: string;
  formatDuree: string | null; options: POption[]; conditions: string | null; delai: string | null;
  nomEn: string | null; descriptionEn: string | null; conditionsEn: string | null; delaiEn: string | null; formatDureeEn: string | null;
  actif: boolean; archived: boolean; ordre: number; visibleDiscord: boolean; visibleSite: boolean; tarifAffiche: string | null;
}
export interface PrestationInput {
  nom: string; description: string; categorieId: string | null; imageUrl: string | null; prixMode: PrixMode; prixMin: number | null; prixMax: number | null; devise: string;
  formatDuree: string | null; options: POption[]; conditions: string | null; delai: string | null; actif: boolean; visibleDiscord: boolean; visibleSite: boolean;
  nomEn: string | null; descriptionEn: string | null; conditionsEn: string | null; delaiEn: string | null; formatDureeEn: string | null;
}
export interface RattachementData {
  services: { key: string; nom: string; actif: boolean; categories: { id: string; nom: string; auto: boolean; prestations: number }[] }[];
  orphans: { id: string; nom: string; libre: boolean; prestations: number }[];
  pendingAuto: { categorieId: string; categorie: string; service: string; serviceNom: string }[];
  categories: { id: string; nom: string; nomEn: string | null; description: string | null; descriptionEn: string | null; ordre: number; actif: boolean; archived: boolean; visibleDiscord: boolean; visibleSite: boolean; prestations: number }[];
}
export const listPrestationsAdmin = (archived: boolean) => authed<{ prestations: APrestation[] }>(`/catalogue${archived ? "?archived=1" : ""}`).then((r) => r.prestations);
export const createPrestation = (p: PrestationInput) => authed<{ prestation: { id: string }; discord?: DiscordSync }>("/catalogue/prestations", { method: "POST", body: JSON.stringify(p) });
export const updatePrestation = (id: string, p: Partial<PrestationInput> & { archived?: boolean }) =>
  authed<{ prestation: { id: string }; discord?: DiscordSync }>(`/catalogue/prestations/${id}`, { method: "PUT", body: JSON.stringify(p) });
export const archivePrestation = (id: string) => authed<{ ok: true; discord?: DiscordSync }>(`/catalogue/prestations/${id}`, { method: "DELETE" });
export const reorderPrestations = (ids: string[]) => authed<{ ok: true; discord?: DiscordSync }>("/catalogue/prestations/reorder", { method: "POST", body: JSON.stringify({ ids }) });
export interface EmbedPreview { title?: string; description?: string; fields?: { name: string; value: string; inline?: boolean }[]; footer?: { text: string } }
export const previewPrestation = (p: PrestationInput) => authed<{ embed: EmbedPreview }>("/catalogue/preview", { method: "POST", body: JSON.stringify(p) }).then((r) => r.embed);
export const getRattachement = () => authed<RattachementData>("/studio/catalogue/rattachement");
export const saveRattachement = (assign: Record<string, string | null>) => authed<{ ok: true; discord?: DiscordSync }>("/studio/catalogue/rattachement", { method: "PUT", body: JSON.stringify({ assign }) });
export const runAutoRattachement = () => authed<{ ok: true; rattachees: number; discord?: DiscordSync }>("/studio/catalogue/rattachement/auto", { method: "POST", body: "{}" });
export const createServiceCategory = (serviceKey: string) => authed<{ categorieId: string; created: boolean; discord?: DiscordSync }>("/studio/catalogue/service-category", { method: "POST", body: JSON.stringify({ serviceKey }) });
export const createCategory = (c: { nom: string; nomEn?: string; description?: string }) => authed<{ categorie: { id: string }; discord?: DiscordSync }>("/catalogue/categories", { method: "POST", body: JSON.stringify(c) });
export const updateCategory = (id: string, c: Partial<{ nom: string; nomEn: string; description: string; descriptionEn: string; actif: boolean; archived: boolean; visibleDiscord: boolean; visibleSite: boolean }>) =>
  authed<{ categorie: { id: string }; discord?: DiscordSync }>(`/catalogue/categories/${id}`, { method: "PUT", body: JSON.stringify(c) });
export const syncDiscordCatalogue = () => authed<{ ok: boolean; discord: DiscordSync }>("/studio/panels/refresh-catalog", { method: "POST", body: "{}" });

// ───────────── PHASE 5 : sécurité du compte administrateur (2FA, sessions) ─────────────
export interface SessionInfo { user: string; twoFactor: boolean; twoFactorEnabled: boolean; required: boolean; mustSetup2fa: boolean }
export const getSessionInfo = () => authed<SessionInfo>("/auth/session");
export const get2fa = () => authed<{ enabled: boolean; recoveryLeft: number; required: boolean }>("/auth/2fa");
export const setup2fa = () => authed<{ secret: string; uri: string }>("/auth/2fa/setup", { method: "POST", body: "{}" });
export const enable2fa = (code: string) => authed<{ ok: true; recoveryCodes: string[] }>("/auth/2fa/enable", { method: "POST", body: JSON.stringify({ code }) });
export const disable2fa = (code: string) => authed<{ ok: true }>("/auth/2fa/disable", { method: "POST", body: JSON.stringify({ code }) });
export const regenerateRecoveryCodes = (code: string) => authed<{ recoveryCodes: string[] }>("/auth/2fa/recovery", { method: "POST", body: JSON.stringify({ code }) });
export interface AdminSessionRow { id: string; user: string; createdAt: string; lastSeenAt: string; expiresAt: string; twoFactor: boolean; current: boolean; ip: string | null }
export const listAdminSessions = () => authed<{ sessions: AdminSessionRow[] }>("/auth/sessions").then((r) => r.sessions);
export const revokeAdminSession = (id: string) => authed<{ ok: true }>(`/auth/sessions/${id}`, { method: "DELETE" });
export const revokeOtherSessions = () => authed<{ ok: true; revoked: number }>("/auth/sessions/revoke-others", { method: "POST", body: "{}" });

// ───────────── PHASE 5 : données personnelles (RGPD) ─────────────
export const exportPersonData = (email: string) => authed<Record<string, unknown>>(`/studio/rgpd/export?email=${encodeURIComponent(email)}`);
export const anonymizePerson = (email: string, scope: "identite" | "complet") =>
  authed<{ ok: true; demandes: number; avis: number; accountDeleted: boolean; verifications: number; limits: string[] }>("/studio/rgpd/anonymize", { method: "POST", body: JSON.stringify({ email, confirm: email, scope }) });
export const getRgpdPolicy = () => authed<{ retentionMonths: number; verificationCodes: string; sessionsClients: string; sessionsAdmin: string }>("/studio/rgpd/policy");

// ───────────── PHASE 5 : catégories de tickets dynamiques ─────────────
export const listTicketCategoriesAdmin = () => authed<{ categories: ATicketCategory[] }>("/studio/ticket-category-list").then((r) => r.categories);
export type TicketCategoryInput = { key?: string; labelFr: string; labelEn?: string; emoji?: string; descriptionFr?: string; descriptionEn?: string };
export const createTicketCategory = (c: TicketCategoryInput & { key: string }) => authed<{ categorie: ATicketCategory }>("/studio/ticket-category-list", { method: "POST", body: JSON.stringify(c) });
export const updateTicketCategory = (key: string, c: Partial<TicketCategoryInput> & { actif?: boolean; archived?: boolean }) => authed<{ categorie: ATicketCategory }>(`/studio/ticket-category-list/${key}`, { method: "PUT", body: JSON.stringify(c) });

// ───────────── PHASE 5 : suivi universel des projets ─────────────
export interface AProjet {
  id: string; ref: string; titre: string; statut: string; clientNom: string | null; clientDiscordId: string | null; marque: string | null; typePub: string | null; description: string | null;
  format: string | null; duree: string | null; datePrevue: string | null; dateDebut: string | null; dateLivraisonReelle: string | null; serviceKey: string | null; prestationId: string | null; formuleKey: string | null;
  details: string; archived: boolean; createdAt: string; updatedAt: string; demandeId: string | null;
}
export interface ProjetSection { service: string; nom: AL; fields: AProjectField[] }
export interface ProjetChange { at: string; by: string; champ: string; avant: string; apres: string }
export interface ProjetDetail { projet: AProjet; sections: ProjetSection[]; changes: ProjetChange[]; statuts: { key: string; label: string }[]; notes: { at: string; by: string; text: string }[]; historique: unknown[] }
export type ProjetInput = Partial<Pick<AProjet, "titre" | "statut" | "clientNom" | "marque" | "description" | "serviceKey" | "prestationId" | "formuleKey">> & { datePrevue?: string | null; dateDebut?: string | null; dateLivraisonReelle?: string | null; details?: Record<string, Record<string, string>>; archived?: boolean };
export const listProjets = (o: { service?: string; archived?: boolean; q?: string }) => {
  const p = new URLSearchParams(); if (o.service) p.set("service", o.service); if (o.archived) p.set("archived", "1"); if (o.q) p.set("q", o.q);
  return authed<{ projets: AProjet[]; statuts: { key: string; label: string }[] }>(`/projets${p.toString() ? `?${p}` : ""}`);
};
export const getProjet = (id: string) => authed<ProjetDetail>(`/projets/${id}`);
export const createProjet = (b: ProjetInput) => authed<{ projet: AProjet }>("/projets", { method: "POST", body: JSON.stringify(b) });
export const updateProjet = (id: string, b: ProjetInput) => authed<{ projet: AProjet }>(`/projets/${id}`, { method: "PATCH", body: JSON.stringify(b) });
export const addProjetNote = (id: string, text: string) => authed<{ ok: true }>(`/projets/${id}/notes`, { method: "POST", body: JSON.stringify({ text }) });
