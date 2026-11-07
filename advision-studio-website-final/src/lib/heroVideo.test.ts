import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { startHeroVideo, type HlsCtor, type VideoLike } from "./heroVideo.ts";

const SRC = "https://stream.mux.com/x.m3u8";

function fakeHls(supported: boolean) {
  const log = { ctorArgs: [] as unknown[][], loaded: "", attached: null as unknown, destroyed: 0, startLoad: 0, recovered: 0, handlers: [] as ((e: string, d: { fatal?: boolean; type?: string }) => void)[] };
  class FakeHls {
    static isSupported() { return supported; }
    static Events = { ERROR: "hlsError" };
    static ErrorTypes = { NETWORK_ERROR: "networkError", MEDIA_ERROR: "mediaError" };
    constructor(...a: unknown[]) { log.ctorArgs.push(a); }
    on(_ev: string, cb: (e: string, d: { fatal?: boolean; type?: string }) => void) { log.handlers.push(cb); }
    loadSource(s: string) { log.loaded = s; } attachMedia(v: unknown) { log.attached = v; }
    destroy() { log.destroyed++; } startLoad() { log.startLoad++; } recoverMediaError() { log.recovered++; }
  }
  return { Hls: FakeHls as unknown as HlsCtor, log };
}
function fakeVideo(native: string) {
  const v = { src: "", paused: 0, listeners: [] as (() => void)[],
    canPlayType: () => native, pause() { v.paused++; }, addEventListener(_t: string, cb: () => void) { v.listeners.push(cb); } };
  return v as VideoLike & typeof v;
}

test("NAVIGATEUR RÉCENT (hls.js supporté ET lecteur natif annoncé « maybe ») → hls.js est utilisé, comme à l'origine (le natif n'est PAS préféré)", () => {
  const { Hls, log } = fakeHls(true); const v = fakeVideo("maybe");
  startHeroVideo(v, SRC, Hls);
  assert.equal(log.loaded, SRC);
  assert.equal(log.attached, v);
  assert.equal(v.src, "", "le lecteur natif n'est pas utilisé quand hls.js est disponible");
});

test("configuration par défaut de hls.js : `new Hls()` sans argument, exactement comme l'original", () => {
  const { Hls, log } = fakeHls(true);
  startHeroVideo(fakeVideo(""), SRC, Hls);
  assert.deepEqual(log.ctorArgs, [[]]);
});

test("SAFARI / iOS (hls.js non supporté, natif supporté) → v.src = flux", () => {
  const { Hls, log } = fakeHls(false); const v = fakeVideo("maybe");
  startHeroVideo(v, SRC, Hls);
  assert.equal(v.src, SRC);
  assert.equal(log.loaded, "");
});

test("aucun lecteur disponible (ou hls.js absent) → aucune exception, le Hero s'affiche sans fond animé", () => {
  const { Hls } = fakeHls(false);
  assert.doesNotThrow(() => startHeroVideo(fakeVideo(""), SRC, Hls)());
  assert.doesNotThrow(() => startHeroVideo(fakeVideo(""), SRC, null)());
});

test("jamais de play() programmatique ni de pause hors écran : seul l'attribut autoPlay lance la vidéo", () => {
  const { Hls } = fakeHls(true); const v = fakeVideo("");
  startHeroVideo(v, SRC, Hls);
  assert.equal(v.paused, 0);
  assert.equal(v.listeners.length, 0, "aucun écouteur ne peut mettre la vidéo en pause");
});

test("erreurs fatales de hls.js : réseau → rechargement après 2 s ; média → récupération ; autre → destruction ; erreur non fatale ignorée", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { Hls, log } = fakeHls(true);
  startHeroVideo(fakeVideo(""), SRC, Hls);
  const emit = (d: { fatal?: boolean; type?: string }) => log.handlers[0]!("hlsError", d);
  emit({ fatal: false, type: "networkError" }); assert.equal(log.startLoad, 0);
  emit({ fatal: true, type: "networkError" }); assert.equal(log.startLoad, 0); t.mock.timers.tick(2000); assert.equal(log.startLoad, 1);
  emit({ fatal: true, type: "mediaError" }); assert.equal(log.recovered, 1);
  emit({ fatal: true, type: "otherError" }); assert.equal(log.destroyed, 1);
  t.mock.timers.reset();
});

test("démontage : hls.js détruit et nouvelle tentative réseau annulée", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { Hls, log } = fakeHls(true);
  const stop = startHeroVideo(fakeVideo(""), SRC, Hls);
  log.handlers[0]!("hlsError", { fatal: true, type: "networkError" });
  stop(); t.mock.timers.tick(5000);
  assert.deepEqual([log.destroyed, log.startLoad], [1, 0]);
  t.mock.timers.reset();
});

test("« réduire les animations » : la première image se charge puis la vidéo se fige ; sinon elle tourne en boucle", () => {
  const { Hls } = fakeHls(true);
  const calm = fakeVideo(""); startHeroVideo(calm, SRC, Hls, { reduceMotion: true });
  assert.equal(calm.listeners.length, 1); calm.listeners[0]!(); assert.equal(calm.paused, 1);
  const normal = fakeVideo(""); startHeroVideo(normal, SRC, Hls, { reduceMotion: false });
  assert.equal(normal.listeners.length, 0);
});

test("GARDE-FOU DESIGN : la balise <video> du Hero et son fond sont strictement ceux de l'original (classes, attributs, ordre)", () => {
  const home = readFileSync(new URL("../views/Home.tsx", import.meta.url), "utf8");
  const video = /<video[\s\S]*?\/>/.exec(home)![0];
  assert.equal(video, `<video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-60"
      />`);
  assert.match(home, /import Hls from "hls\.js";/, "hls.js reste importé statiquement (pas de fichier séparé à charger)");
  assert.doesNotMatch(home, /import\("hls\.js"\)/, "aucun chargement différé de hls.js");
});
