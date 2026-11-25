import { useEffect, useState } from "react";
import { API_URL } from "./api";
import { DEFAULT_PUBLIC_CATALOGUE } from "./catalogueDefaults";

/**
 * Catalogue public (services + formules + questions) servi par le bot : /api/public/catalogue.
 * Le site ne garde AUCUNE liste de prestations en dur : au chargement il lit le catalogue ; s'il est injoignable il utilise
 * la dernière copie mémorisée dans le navigateur, puis, en dernier recours, le repli hors ligne (catalogueDefaults.ts).
 */
export interface L { fr: string; en?: string }
export type QKind = "text" | "long" | "select" | "slider";
export type QRole = "duree" | "resolution" | "format";
export interface QOption { value: string; label: L }
export interface SliderCfg { min: number; max: number; step: number; default: number }
export interface QuestionCfg { name: string; label: L; placeholder?: L; kind: QKind; required: boolean; options?: QOption[]; slider?: SliderCfg; default?: string; role?: QRole; skipIfServices?: string[] }
/** Option d'une prestation : « info » = information (rien à choisir), « select » = le client peut la cocher (enregistrée avec sa demande). */
export interface PublicOption { id: string; mode: "info" | "select"; nom: L; description?: L; prix?: string; conditions?: L }
/** Prestation détaillée : chaque texte arrive dans les deux langues SÉPARÉMENT (l'anglais peut manquer : on affiche alors le français, rien n'est traduit automatiquement). */
export interface PublicPrestation { id: string; nom: L; description: L; tarif: L | null; formatDuree: L | null; delai: L | null; conditions: L | null; options: PublicOption[] }
export interface PublicService { key: string; nom: L; description: L; points: L[]; icon: string; requiresBrand: boolean; aiNotice: boolean; questions: QuestionCfg[]; prestations: PublicPrestation[] }
export interface PublicFormule { key: string; nom: L; description: L; services: string[]; requiresBrand: boolean; questions: QuestionCfg[] }
export interface PublicCatalogue { source?: string; services: PublicService[]; formules: PublicFormule[] }
export type CatalogueSource = "api" | "cache" | "default";

/** Texte dans la langue du visiteur (anglais absent → français). */
export const tr = (l: L | undefined, lang: "fr" | "en"): string => (lang === "en" && l?.en ? l.en : l?.fr ?? "");

const isL = (x: unknown): x is L => !!x && typeof x === "object" && typeof (x as L).fr === "string";
const isQuestion = (x: unknown): x is QuestionCfg => {
  if (!x || typeof x !== "object") return false;
  const q = x as QuestionCfg;
  if (typeof q.name !== "string" || !isL(q.label) || !["text", "long", "select", "slider"].includes(q.kind)) return false;
  if (q.kind === "select") return Array.isArray(q.options) && q.options.length >= 2 && q.options.every((o) => typeof o.value === "string" && isL(o.label));
  if (q.kind === "slider") return !!q.slider && [q.slider.min, q.slider.max, q.slider.step, q.slider.default].every(Number.isFinite) && q.slider.step > 0 && q.slider.max > q.slider.min;
  return true;
};

/** Texte bilingue reçu de l'API ({ fr, en? }) ; une simple chaîne est lue comme du français (anciennes réponses en cache). */
const toL = (x: unknown): L | null => {
  if (typeof x === "string") return x.trim() ? { fr: x } : null;
  if (x && typeof x === "object" && typeof (x as { fr?: unknown }).fr === "string" && (x as { fr: string }).fr.trim()) {
    const o = x as { fr: string; en?: unknown }; return { fr: o.fr, ...(typeof o.en === "string" && o.en.trim() ? { en: o.en } : {}) };
  }
  return null;
};
/** Prestations détaillées d'un service. Un élément illisible est ignoré, jamais bloquant : le reste du catalogue reste utilisable. */
export function parsePrestations(x: unknown): PublicPrestation[] {
  if (!Array.isArray(x)) return [];
  const out: PublicPrestation[] = [];
  for (const p of x as Record<string, unknown>[]) {
    const nom = p && typeof p === "object" ? toL(p.nom) : null;
    if (!nom || typeof p.id !== "string") continue;
    const options: PublicOption[] = [];
    if (Array.isArray(p.options)) for (const o of p.options as Record<string, unknown>[]) {
      const on = o && typeof o === "object" ? toL(o.nom) : null;
      if (!on) continue;
      const desc = toL(o.description), cond = toL(o.conditions);
      options.push({ id: typeof o.id === "string" && o.id ? o.id : `l${options.length}`, mode: o.mode === "select" ? "select" : "info", nom: on, ...(desc ? { description: desc } : {}), ...(typeof o.prix === "string" && o.prix.trim() ? { prix: o.prix } : {}), ...(cond ? { conditions: cond } : {}) });
    }
    out.push({ id: p.id, nom, description: toL(p.description) ?? { fr: "" }, tarif: toL(p.tarif), formatDuree: toL(p.formatDuree), delai: toL(p.delai), conditions: toL(p.conditions), options });
  }
  return out;
}

/** Vérifie la forme d'un catalogue reçu (API ou copie mémorisée) ; renvoie null s'il est inutilisable. */
export function parseCatalogue(x: unknown): PublicCatalogue | null {
  if (!x || typeof x !== "object") return null;
  const o = x as { services?: unknown; formules?: unknown; source?: unknown };
  if (!Array.isArray(o.services) || !Array.isArray(o.formules)) return null;
  const services: PublicService[] = [];
  for (const s of o.services as PublicService[]) {
    if (!s || typeof s.key !== "string" || !isL(s.nom)) continue;
    services.push({
      key: s.key, nom: s.nom, description: isL(s.description) ? s.description : { fr: "" }, points: Array.isArray(s.points) ? s.points.filter(isL) : [],
      icon: typeof s.icon === "string" ? s.icon : "sparkles", requiresBrand: s.requiresBrand === true, aiNotice: s.aiNotice === true,
      questions: Array.isArray(s.questions) ? s.questions.filter(isQuestion) : [],
      prestations: parsePrestations((s as { prestations?: unknown }).prestations),
    });
  }
  const formules: PublicFormule[] = [];
  for (const f of o.formules as PublicFormule[]) {
    if (!f || typeof f.key !== "string" || !isL(f.nom) || !Array.isArray(f.services) || !f.services.length) continue;
    formules.push({
      key: f.key, nom: f.nom, description: isL(f.description) ? f.description : { fr: "" }, services: f.services.filter((s) => typeof s === "string"),
      requiresBrand: f.requiresBrand === true, questions: Array.isArray(f.questions) ? f.questions.filter(isQuestion) : [],
    });
  }
  if (!services.length || !formules.length) return null;
  return { source: typeof o.source === "string" ? o.source : undefined, services, formules };
}

const LS_KEY = "advision.catalogue.v1";
let memo: { catalogue: PublicCatalogue; source: CatalogueSource } | null = null;
let lastFetch = 0;

function readCache(): PublicCatalogue | null {
  try { const raw = localStorage.getItem(LS_KEY); return raw ? parseCatalogue(JSON.parse(raw)) : null; } catch { return null; }
}
function initial(): { catalogue: PublicCatalogue; source: CatalogueSource } {
  if (memo) return memo;
  const cached = readCache();
  // Le repli passe par le même lecteur que l'API : il complète les champs récents (ex. prestations: []) au lieu d'être utilisé tel quel
  return cached ? { catalogue: cached, source: "cache" } : { catalogue: parseCatalogue(DEFAULT_PUBLIC_CATALOGUE) ?? DEFAULT_PUBLIC_CATALOGUE, source: "default" };
}

export async function fetchCatalogue(): Promise<PublicCatalogue> {
  if (!API_URL) throw new Error("VITE_API_URL is not configured");
  const res = await fetch(`${API_URL}/api/public/catalogue`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const cat = parseCatalogue(await res.json());
  if (!cat) throw new Error("catalogue illisible");
  return cat;
}

/** Catalogue courant : copie mémorisée ou repli immédiat, puis mise à jour silencieuse depuis le bot (2 nouvelles tentatives si le bot dort). */
export function useCatalogue(): { catalogue: PublicCatalogue; source: CatalogueSource } {
  const [state, setState] = useState(initial);
  useEffect(() => {
    if (!API_URL || (memo?.source === "api" && Date.now() - lastFetch < 60_000)) return;
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const attempt = async (n: number) => {
      try {
        const cat = await fetchCatalogue();
        if (!alive) return;
        lastFetch = Date.now();
        memo = { catalogue: cat, source: "api" };
        try { localStorage.setItem(LS_KEY, JSON.stringify(cat)); } catch { /* stockage indisponible : sans importance */ }
        setState(memo);
      } catch {
        if (alive && n < 2) timers.push(setTimeout(() => void attempt(n + 1), n === 0 ? 10_000 : 30_000));
      }
    };
    void attempt(0);
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, []);
  return state;
}

// ───────────────────────── Aides pour le formulaire ─────────────────────────
/** Anciens liens (#/contact?service=pub&logo=1) → clé de formule. */
export function legacyFormuleKey(service: string | null, withLogo: boolean): string {
  if (service === "montage") return "montage";
  if (service === "logo") return "logo";
  if (service === "discord") return withLogo ? "discord_logo" : "discord";
  return withLogo ? "pub_logo" : "pub";
}
export function defaultDetailsFor(f: PublicFormule | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const q of f?.questions ?? []) if (q.default) out[q.name] = q.default;
  return out;
}
/** Champs obligatoires non remplis (le nom de la marque l'est quand la formule l'exige). */
export function missingFor(f: PublicFormule | undefined, details: Record<string, string>, brand: string): string[] {
  if (!f) return ["formule"];
  const out = f.questions.filter((q) => q.required && !(details[q.name] ?? "").trim()).map((q) => q.name);
  if (f.requiresBrand && !brand.trim()) out.push("marque");
  return out;
}
/** Prestations proposées pour une formule : celles de chacun de ses services (dans l'ordre de la formule), groupées par service. */
export function prestationsForFormule(cat: PublicCatalogue, f: PublicFormule | undefined): { service: PublicService; prestations: PublicPrestation[] }[] {
  if (!f) return [];
  return f.services.map((k) => cat.services.find((s) => s.key === k)).filter((s): s is PublicService => !!s && s.prestations.length > 0).map((s) => ({ service: s, prestations: s.prestations }));
}
/** Une liste de 3 options ou moins s'affiche en boutons, sinon en menu déroulant. */
export const isSegmented = (q: QuestionCfg): boolean => q.kind === "select" && (q.options?.length ?? 0) <= 3;
export const optionLabel = (q: QuestionCfg, v: string, lang: "fr" | "en"): string => (q.kind === "slider" ? `${v} s` : tr(q.options?.find((o) => o.value === v)?.label, lang) || v);
