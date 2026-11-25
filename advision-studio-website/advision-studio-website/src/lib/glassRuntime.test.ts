import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { supportsRefraction, shouldDowngrade, heroLiveAllowed, HERO_LIVE_ID } from "./glassRuntime.ts";

test("réfraction : Chromium oui ; Safari, Firefox et navigateurs iOS non", () => {
  assert.equal(supportsRefraction("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36"), true);
  assert.equal(supportsRefraction("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0"), true);
  assert.equal(supportsRefraction("Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15"), false);
  assert.equal(supportsRefraction("Mozilla/5.0 (Windows NT 10.0; rv:130.0) Gecko/20100101 Firefox/130.0"), false);
  assert.equal(supportsRefraction("Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CriOS/130.0 Mobile Safari/604.1"), false);
});
test("garde-fou : repli seulement si la fluidité est vraiment mauvaise et la mesure assez longue", () => {
  assert.equal(shouldDowngrade(Array(60).fill(16.7)), false);
  assert.equal(shouldDowngrade(Array(60).fill(80)), true);
  assert.equal(shouldDowngrade(Array(5).fill(200)), false);
});

test("filtre animé du héros : seulement avec réfraction réelle, sans « réduire les animations », sans économie de données", () => {
  assert.equal(heroLiveAllowed("refract", false, false), true);
  for (const m of ["flat", "solid", ""]) assert.equal(heroLiveAllowed(m, false, false), false, m);
  assert.equal(heroLiveAllowed("refract", true, false), false);
  assert.equal(heroLiveAllowed("refract", false, true), false);
});

test("héros : flux Mux d'origine, vidéo en lecture automatique sans son et en boucle, au plus 2 surfaces animées, filtre animé distinct du filtre statique", () => {
  const home = readFileSync(new URL("../views/Home.tsx", import.meta.url), "utf8");
  assert.match(home, /const HLS_SRC = "https:\/\/stream\.mux\.com\/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q\.m3u8";/);
  const video = /<video[\s\S]*?\/>/.exec(home)![0]; for (const a of ["autoPlay", "loop", "muted", "playsInline"]) assert.ok(video.includes(a), a);
  const nav = readFileSync(new URL("../components/Navbar.tsx", import.meta.url), "utf8");
  const marked = (home.match(/data-live-glass/g) ?? []).length + (nav.match(/data-live-glass/g) ?? []).length;
  assert.equal(marked, 3, "CTA du héros + pilule de navigation (ordinateur) + bouton de menu (mobile) : jamais plus de 2 visibles en même temps");
  assert.notEqual(HERO_LIVE_ID, "liquid-glass-filter");
});
