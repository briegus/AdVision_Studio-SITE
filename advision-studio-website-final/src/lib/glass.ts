// Liquid Glass maison — trois niveaux, avec repli propre :
//   « lens » : Chromium, appareil assez puissant → réfraction réelle (feDisplacementMap + carte de lentille) avec dispersion chromatique,
//              sur les surfaces principales ; reflets dynamiques sur toutes les surfaces vitrées.
//   « css »  : Safari, Firefox, appareils modestes → même matière (flou saturé, tranche lumineuse, épaisseur, reflets) SANS réfraction.
//   « solid »: transparence réduite demandée par le système → surfaces opaques.
// Safari ne rend rien avec backdrop-filter: url(#…) et @supports ne le détecte pas : la détection se fait donc sur le navigateur.
import { computeLensMap } from "./lensMap";

export type GlassMode = "lens" | "css" | "solid";

export function supportsRefraction(ua: string): boolean {
  if (/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return false; // navigateurs iOS = WebKit
  return /Chrome\/\d+/.test(ua) && !/Firefox\//.test(ua); // Chrome, Edge, Opera, Brave (Chromium)
}

export interface GlassEnv { ua: string; reducedTransparency: boolean; cores?: number; memory?: number; saveData?: boolean; force?: string | null }
/** Pur : choisit le niveau de rendu. `force` (?glass=off|css|lens) sert aux essais. */
export function glassMode(e: GlassEnv): GlassMode {
  if (e.reducedTransparency) return "solid";
  if (e.force === "off" || e.force === "css") return "css";
  if (!supportsRefraction(e.ua)) return "css";
  if (e.force === "lens" || e.force === "lens-guarded") return "lens";
  if (e.saveData) return "css";
  if (typeof e.cores === "number" && e.cores > 0 && e.cores < 4) return "css";
  if (typeof e.memory === "number" && e.memory > 0 && e.memory <= 2) return "css";
  return "lens";
}

/** Pur : la fluidité mesurée est-elle trop faible pour garder la réfraction ? (médiane des intervalles entre images, en ms) */
export function shouldDowngrade(deltas: number[], thresholdMs = 40): boolean {
  if (deltas.length < 20) return false;
  const s = [...deltas].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]! > thresholdMs;
}

const SVG_NS = "http://www.w3.org/2000/svg";
let defs: SVGDefsElement | null = null;
let seq = 0;
const maps = new Map<string, string>();            // taille → carte PNG (data URL)
const lensOf = new WeakMap<HTMLElement, { id: string; filter: SVGFilterElement; key: string }>();
const visible = new Set<HTMLElement>();
const wantsLens = new WeakSet<HTMLElement>();
let io: IntersectionObserver | null = null, ro: ResizeObserver | null = null;
let mode: GlassMode = "css";
let reduceMotion = false;
const pointer = { x: 0, y: 0, active: false };
let raf = 0;

const GLASS_SEL = ".liquid-glass, .liquid-glass-strong";

function ensureDefs(): SVGDefsElement {
  if (defs) return defs;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.setAttribute("aria-hidden", "true"); svg.setAttribute("focusable", "false");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  defs = document.createElementNS(SVG_NS, "defs"); svg.appendChild(defs); document.body.appendChild(svg);
  return defs;
}

function mapUrl(w: number, h: number, radius: number, bezel: number): string | null {
  const key = `${w}x${h}r${radius}b${bezel}`;
  const hit = maps.get(key); if (hit) return hit;
  const m = computeLensMap({ width: w, height: h, radius, bezel });
  const c = document.createElement("canvas"); c.width = m.width; c.height = m.height;
  const ctx = c.getContext("2d"); if (!ctx) return null;
  ctx.putImageData(new ImageData(m.data, m.width, m.height), 0, 0);
  const url = c.toDataURL("image/png");
  if (maps.size > 40) maps.clear();
  maps.set(key, url); return url;
}

const el = (n: string, a: Record<string, string>): SVGElement => { const e = document.createElementNS(SVG_NS, n); for (const k in a) e.setAttribute(k, a[k]!); return e; };

function channel(src: string, out: string, m: string): SVGElement { return el("feColorMatrix", { in: src, type: "matrix", values: m, result: out }); }

function buildFilter(id: string): SVGFilterElement {
  const f = document.createElementNS(SVG_NS, "filter") as SVGFilterElement;
  f.setAttribute("id", id); f.setAttribute("filterUnits", "userSpaceOnUse"); f.setAttribute("primitiveUnits", "userSpaceOnUse");
  f.setAttribute("color-interpolation-filters", "sRGB");
  f.append(
    el("feImage", { result: "map", preserveAspectRatio: "none" }),
    // dispersion chromatique : trois déplacements d'intensité légèrement différente (rouge < vert < bleu), recombinés
    el("feDisplacementMap", { in: "SourceGraphic", in2: "map", xChannelSelector: "R", yChannelSelector: "G", result: "dR" }),
    el("feDisplacementMap", { in: "SourceGraphic", in2: "map", xChannelSelector: "R", yChannelSelector: "G", result: "dG" }),
    el("feDisplacementMap", { in: "SourceGraphic", in2: "map", xChannelSelector: "R", yChannelSelector: "G", result: "dB" }),
    channel("dR", "r", "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"),
    channel("dG", "g", "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"),
    channel("dB", "b", "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"),
    el("feBlend", { in: "r", in2: "g", mode: "screen", result: "rg" }),
    el("feBlend", { in: "rg", in2: "b", mode: "screen" }),
  );
  return f;
}

function updateLens(node: HTMLElement): void {
  const r = node.getBoundingClientRect();
  const w = Math.round(r.width / 4) * 4, h = Math.round(r.height / 4) * 4;
  // trop petit, ou trop grand (au-delà d'environ 900 000 px² la déformation coûte trop au GPU) : verre sans réfraction
  if (w < 24 || h < 24 || w * h > 900_000) { node.removeAttribute("data-lens"); return; }
  const radius = Math.min(parseFloat(getComputedStyle(node).borderTopLeftRadius) || 16, w / 2, h / 2);
  const bezel = Math.min(Number(node.dataset.bezel) || Math.max(16, Math.min(44, Math.min(w, h) * 0.3)), Math.min(w, h) / 2);
  const key = `${w}x${h}r${radius}b${bezel}`;
  let st = lensOf.get(node);
  if (st && st.key === key) { node.setAttribute("data-lens", "1"); return; }
  const url = mapUrl(w, h, radius, bezel); if (!url) return;
  if (!st) { const id = `ad-lens-${++seq}`; st = { id, filter: buildFilter(id), key }; ensureDefs().appendChild(st.filter); lensOf.set(node, st); }
  st.key = key;
  const f = st.filter, shift = bezel * 1.6;   // décalage maximal d'échantillonnage (px) ; l'échelle SVG vaut deux fois ce décalage
  f.setAttribute("x", "0"); f.setAttribute("y", "0"); f.setAttribute("width", String(w)); f.setAttribute("height", String(h));
  const img = f.querySelector("feImage")!; img.setAttribute("x", "0"); img.setAttribute("y", "0"); img.setAttribute("width", String(w)); img.setAttribute("height", String(h)); img.setAttribute("href", url);
  const scales = [2 * shift * 0.92, 2 * shift, 2 * shift * 1.08];
  f.querySelectorAll("feDisplacementMap").forEach((d, i) => d.setAttribute("scale", String(scales[i])));
  node.style.setProperty("--lens-filter", `url(#${st.id})`);
  node.setAttribute("data-lens", "1");
}

function attach(node: HTMLElement): void {
  if (node.dataset.lg) return;
  node.dataset.lg = "1";
  io!.observe(node);
  if (mode === "lens" && node.classList.contains("liquid-glass-strong") && !node.closest('[data-route="admin"]')) { wantsLens.add(node); ro!.observe(node); }
}

function scan(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>(GLASS_SEL).forEach(attach);
}

function schedule(): void { if (!raf) raf = requestAnimationFrame(frame); }

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

function frame(): void {
  raf = 0;
  const root = document.documentElement;
  if (!reduceMotion) {
    root.style.setProperty("--pxn", pointer.active ? String(((pointer.x / innerWidth) * 2 - 1).toFixed(3)) : "0");
    root.style.setProperty("--pyn", pointer.active ? String(((pointer.y / innerHeight) * 2 - 1).toFixed(3)) : "0");
  }
  const main = document.getElementById("main");
  const sc = main ? main.scrollTop : 0;
  const rects: [HTMLElement, DOMRect][] = [];
  visible.forEach((n) => rects.push([n, n.getBoundingClientRect()]));
  for (const [n, r] of rects) {
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let ang: number, prox: number, lx: number, ly: number;
    if (pointer.active && !reduceMotion) {
      ang = (Math.atan2(pointer.y - cy, pointer.x - cx) * 180) / Math.PI + 90;
      const d = Math.hypot(pointer.x - cx, pointer.y - cy);
      prox = Math.pow(clamp(1 - d / (Math.max(r.width, r.height) * 0.9 + 160), 0, 1), 2);
      lx = clamp(pointer.x - r.left, 0, r.width); ly = clamp(pointer.y - r.top, 0, r.height);
    } else {          // pas de pointeur (tactile) : l'angle de lumière dérive doucement avec le défilement
      ang = 135 + (reduceMotion ? 0 : sc * 0.06 + cy * 0.04); prox = 0.28; lx = r.width * 0.3; ly = r.height * 0.1;
    }
    n.style.setProperty("--ang", `${ang.toFixed(1)}deg`);
    n.style.setProperty("--prox", prox.toFixed(3));
    n.style.setProperty("--lx", `${lx.toFixed(0)}px`);
    n.style.setProperty("--ly", `${ly.toFixed(0)}px`);
  }
}

/** Garde-fou : mesure la fluidité 2,5 s après le chargement ; si elle est trop faible, repasse seul en mode « css » (sans réfraction). */
function guardPerformance(): void {
  const sample = () => {
    if (document.hidden) { setTimeout(sample, 2000); return; }
    const deltas: number[] = []; let last = performance.now();
    const step = (now: number) => {
      deltas.push(now - last); last = now;
      if (deltas.length < 60) { requestAnimationFrame(step); return; }
      if (shouldDowngrade(deltas.slice(5))) downgrade();     // les premières images (mise en place) sont ignorées
    };
    requestAnimationFrame(step);
  };
  setTimeout(sample, 2500);
}

function downgrade(): void {
  mode = "css";
  const root = document.documentElement;
  root.dataset.glass = "css"; root.dataset.refract = "off";
  document.querySelectorAll<HTMLElement>("[data-lens]").forEach((n) => n.removeAttribute("data-lens"));
  ro?.disconnect();
}

export function initGlass(): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  mode = glassMode({
    ua: navigator.userAgent, reducedTransparency: window.matchMedia("(prefers-reduced-transparency: reduce)").matches,
    cores: navigator.hardwareConcurrency, memory: nav.deviceMemory, saveData: nav.connection?.saveData === true,
    force: new URLSearchParams(location.search).get("glass"),
  });
  const root = document.documentElement;
  root.dataset.glass = mode;
  root.dataset.refract = mode === "lens" ? "on" : "off";   // compatibilité avec les anciens sélecteurs
  if (typeof IntersectionObserver === "undefined") return;

  io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const n = e.target as HTMLElement;
      if (e.isIntersecting) { visible.add(n); if (mode === "lens" && wantsLens.has(n)) updateLens(n); }
      else { visible.delete(n); if (wantsLens.has(n)) n.removeAttribute("data-lens"); }   // hors écran : on libère le filtre coûteux
    }
    schedule();
  }, { rootMargin: "120px" });
  ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver((entries) => {
    for (const e of entries) { const n = e.target as HTMLElement; if (visible.has(n) && wantsLens.has(n)) updateLens(n); }
  }) : null;
  if (!ro) mode = "css";

  scan();
  if (mode === "lens" && new URLSearchParams(location.search).get("glass") !== "lens") guardPerformance();   // ?glass=lens = forcé : pas de garde-fou
  new MutationObserver((muts) => {
    for (const m of muts) m.addedNodes.forEach((n) => { if (n instanceof HTMLElement) { if (n.matches(GLASS_SEL)) attach(n); scan(n); } });
  }).observe(document.body, { childList: true, subtree: true });

  if (!reduceMotion) {
    window.addEventListener("pointermove", (e) => { if (e.pointerType === "touch") return; pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; schedule(); }, { passive: true });
    document.addEventListener("pointerleave", () => { pointer.active = false; schedule(); });
  }
  document.addEventListener("scroll", schedule, { capture: true, passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  schedule();
}
