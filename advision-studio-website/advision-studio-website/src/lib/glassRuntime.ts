// Exécuteur du Liquid Glass (bibliothèque @dpawlikowski/liquid-glass). Remplace l'ancien module de lentille maison.
//  • Chromium (Chrome, Edge, Opera, Brave) : réfraction réelle → filtre SVG STATIQUE injecté une fois, html[data-lg="refract"].
//  • Safari, Firefox, navigateurs iOS : pas de réfraction fiable → flou + reflets de bord (règles CSS dans styles/glass-tokens.css).
//  • Garde-fou : si la fluidité chute pendant les premières secondes, retour aux surfaces sombres (html[data-lg="solid"]).
export function supportsRefraction(ua: string): boolean {
  if (/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return false;   // navigateurs iOS = WebKit
  return /Chrome\/\d+/.test(ua) && !/Firefox\//.test(ua);
}
/** Pur : la fluidité est-elle trop faible ? (médiane des durées d'image, en ms) */
export function shouldDowngrade(frameMs: number[], thresholdMs = 45): boolean {
  if (frameMs.length < 20) return false;
  const s = [...frameMs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] > thresholdMs;
}

let resolveReady: () => void = () => {};
/** Résolue quand le mode de verre est connu (data-lg = refract | flat | solid). */
export const glassReady: Promise<void> = new Promise((r) => { resolveReady = r; });

export async function initGlass(): Promise<void> {
  try { await initGlassInner(); } finally { resolveReady(); startPointerLight(); }
}

async function initGlassInner(): Promise<void> {
  if (typeof document === "undefined") return;
  const root = document.documentElement, q = new URLSearchParams(location.search).get("glass");
  if (q === "solid") { root.dataset.lg = "solid"; return; }
  if (q !== "refract" && !supportsRefraction(navigator.userAgent)) { root.dataset.lg = "flat"; return; }
  try {
    const lib = await import("@dpawlikowski/liquid-glass");
    lib.injectLiquidGlassFilter({ scale: 14, baseFrequency: 0.008, animate: false });   // statique : la bibliothèque recommande de réserver l'animation à 1 ou 2 surfaces
    root.dataset.lg = "refract";
  } catch { root.dataset.lg = "flat"; return; }
  if (q === "refract") return;   // essai forcé : pas de garde-fou
  const d: number[] = []; let last = performance.now(); const t0 = last;
  const tick = (t: number) => {
    d.push(t - last); last = t;
    if (t - t0 < 3000) requestAnimationFrame(tick);
    else if (shouldDowngrade(d.slice(5))) root.dataset.lg = "flat";
  };
  requestAnimationFrame(tick);
}

// ─── Reflet qui suit le pointeur (toutes les surfaces) ──────────────────────────────────────────────────
let lightOn = false;
function startPointerLight(): void {
  if (lightOn || typeof window === "undefined") return; lightOn = true;
  if (!window.matchMedia("(hover: hover)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let raf = 0, ev: PointerEvent | null = null;
  const apply = () => {
    raf = 0; const e = ev; if (!e) return;
    const el = (e.target as Element | null)?.closest?.(".liquid-glass") as HTMLElement | null; if (!el) return;
    const r = el.getBoundingClientRect(); if (!r.width) return;
    el.style.setProperty("--lg-sheen-angle", `${Math.round(105 + ((e.clientX - r.left) / r.width) * 60)}deg`);   // 105° → 165°
  };
  document.addEventListener("pointermove", (e) => { ev = e; if (!raf) raf = requestAnimationFrame(apply); }, { passive: true });
}

// ─── Filtre ANIMÉ : 2 surfaces du héros au maximum ─────────────────────────────────────────────────────
export const HERO_LIVE_ID = "ad-hero-live";
/** Pur : l'animation est-elle autorisée ? (réfraction active, pas de « réduire les animations », pas d'économie de données) */
export function heroLiveAllowed(glassMode: string, reduceMotion: boolean, saveData: boolean): boolean {
  return glassMode === "refract" && !reduceMotion && !saveData;
}
/**
 * Active le filtre animé sur les surfaces marquées data-live-glass tant que le héros est visible (pause hors écran, onglet masqué,
 * ou si la fluidité chute). Renvoie la fonction d'arrêt. Sans réfraction (Safari, Firefox, repli), ne fait rien.
 */
export async function startHeroLiveGlass(hero: Element): Promise<() => void> {
  await glassReady;
  const root = document.documentElement;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (new URLSearchParams(location.search).get("live") === "off") return () => {};
  if (!heroLiveAllowed(root.dataset.lg ?? "", window.matchMedia("(prefers-reduced-motion: reduce)").matches, nav.connection?.saveData === true)) return () => {};
  const opts = { baseFrequency: 0.008, duration: "12s" };
  let lib: typeof import("@dpawlikowski/liquid-glass");
  try { lib = await import("@dpawlikowski/liquid-glass"); lib.injectLiquidGlassFilter({ id: HERO_LIVE_ID, scale: 14, numOctaves: 2, animate: true, ...opts }); }
  catch { return () => {}; }
  root.dataset.heroLive = "on";
  const motion = (on: boolean) => { lib.setLiquidGlassMotion(HERO_LIVE_ID, on, opts); };
  const io = new IntersectionObserver((entries) => { const e = entries[entries.length - 1]; motion(!!e?.isIntersecting && !document.hidden); }, { threshold: 0.05 }); io.observe(hero);
  const vis = () => motion(!document.hidden); document.addEventListener("visibilitychange", vis);
  // garde-fou : si la fluidité est mauvaise pendant les 3 premières secondes, on coupe l'animation (le verre reste, statique)
  const d: number[] = []; let last = performance.now(); const t0 = last; let alive = true;
  const tick = (t: number) => { if (!alive) return; d.push(t - last); last = t; if (t - t0 < 3000) requestAnimationFrame(tick); else if (shouldDowngrade(d.slice(5))) stop(); };
  requestAnimationFrame(tick);
  function stop(): void { alive = false; io.disconnect(); document.removeEventListener("visibilitychange", vis); motion(false); delete root.dataset.heroLive; }
  return stop;
}
