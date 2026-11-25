import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { playWhenVisible } from "./videoVisibility.ts";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("bas de page de l'accueil : vidéo Mux plein cadre, dégradés noirs de 200 px en haut et en bas, parent noir, aucune image de remplacement", () => {
  const src = read("../components/HomeBottom.tsx");
  assert.match(src, /<video ref=\{videoRef\} autoPlay loop muted playsInline[^>]*className="absolute inset-0 w-full h-full object-cover z-0" \/>/);
  assert.equal((src.match(/height: "200px"/g) ?? []).length, 2);
  assert.match(src, /linear-gradient\(to bottom, black, transparent\)/);
  assert.match(src, /linear-gradient\(to top, black, transparent\)/);
  assert.match(src, /bg-black/);
  assert.doesNotMatch(src, /<img|background-image|radial-gradient|conic-gradient/);
  const home = read("../views/Home.tsx");
  assert.match(home, /<HomeBottom src=\{HLS_SRC\} \/>/, "même flux Mux que le héros");
  assert.doesNotMatch(home, /playWhenVisible/, "le héros garde sa logique d'origine : aucune pause hors écran");
  const app = read("../App.tsx");
  assert.match(app, /route !== "home" && <Footer \/>/, "le pied de page noir habituel reste sur les autres pages");
});

test("fonds : aucun fond décoratif ajouté (cercles, orbes, lignes, grain) ; fond noir hors accueil", () => {
  assert.equal(existsSync(new URL("../components/AmbientBackdrop.tsx", import.meta.url)), false);
  const css = read("../index.css");
  for (const bad of [/\.orb\b/, /\.rings\b/, /\.lines\b/, /\.grain\b/, /\.ambient\b/]) assert.doesNotMatch(css, bad, String(bad));
  assert.match(read("../App.tsx"), /bg-black/);
  assert.doesNotMatch(css, /radial-gradient|conic-gradient|repeating-/, "aucun cercle, halo ni faisceau dessiné par le site");
  const home = read("../views/Home.tsx");
  assert.doesNotMatch(home, /hero-fallback|hero-scrim/, "le héros est la vidéo Mux sur le fond noir d'origine, rien d'ajouté");
  assert.match(home, /className="absolute inset-0 w-full h-full object-cover z-0 opacity-60"/, "balise vidéo d'origine, opacité d'origine");
});

test("lecture seulement quand visible : pause hors écran, chargement différé au premier affichage, notifications groupées (la plus récente compte)", () => {
  let cb: (e: { isIntersecting: boolean; intersectionRatio: number }[]) => void = () => {};
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class { constructor(f: typeof cb) { cb = f; } observe() {} disconnect() {} };
  const calls: string[] = []; const video = { play: () => { calls.push("play"); return Promise.resolve(); }, pause: () => calls.push("pause") } as unknown as HTMLVideoElement;
  let init = 0; playWhenVisible(video, {} as Element, () => init++);
  cb([{ isIntersecting: false, intersectionRatio: 0 }]); assert.deepEqual(calls, ["pause"]); assert.equal(init, 0, "pas de chargement tant que le bloc n'approche pas");
  cb([{ isIntersecting: true, intersectionRatio: 0 }]); assert.equal(init, 0, "bord à bord : pas visible");
  cb([{ isIntersecting: true, intersectionRatio: 0.4 }]); cb([{ isIntersecting: true, intersectionRatio: 0.6 }]); assert.equal(init, 1, "chargement une seule fois");
  assert.deepEqual(calls, ["pause", "pause", "play", "play"]);
  init = 0; calls.length = 0; let pass = 0; (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class { constructor(f: typeof cb) { cb = f; } observe() {} disconnect() {} };
  playWhenVisible(video, {} as Element, () => pass++);
  cb([{ isIntersecting: false, intersectionRatio: 0 }, { isIntersecting: true, intersectionRatio: 0.5 }]); assert.equal(pass, 1, "deux notifications groupées : la dernière (visible) l'emporte"); assert.deepEqual(calls, ["play"]);
});
