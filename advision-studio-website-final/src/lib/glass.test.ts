import { test } from "node:test";
import assert from "node:assert/strict";
import { supportsRefraction, glassMode, shouldDowngrade } from "./glass.ts";

test("réfraction : Chromium oui, Safari / Firefox / navigateurs iOS non", () => {
  assert.equal(supportsRefraction("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36"), true);
  assert.equal(supportsRefraction("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0"), true);
  assert.equal(supportsRefraction("Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15"), false);
  assert.equal(supportsRefraction("Mozilla/5.0 (Windows NT 10.0; rv:130.0) Gecko/20100101 Firefox/130.0"), false);
  assert.equal(supportsRefraction("Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CriOS/130.0 Mobile Safari/604.1"), false);
});

const CHROME = "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36";
test("niveau de rendu : lentille sur Chromium puissant ; css ailleurs ; opaque si transparence réduite ; appareils modestes sans réfraction", () => {
  assert.equal(glassMode({ ua: CHROME, reducedTransparency: false, cores: 8 }), "lens");
  assert.equal(glassMode({ ua: CHROME, reducedTransparency: false }), "lens");                       // capacités inconnues → on garde la réfraction
  assert.equal(glassMode({ ua: CHROME, reducedTransparency: true, cores: 8 }), "solid");
  assert.equal(glassMode({ ua: CHROME, reducedTransparency: false, cores: 2 }), "css");
  assert.equal(glassMode({ ua: CHROME, reducedTransparency: false, memory: 2 }), "css");
  assert.equal(glassMode({ ua: CHROME, reducedTransparency: false, saveData: true }), "css");
  assert.equal(glassMode({ ua: CHROME, reducedTransparency: false, cores: 8, force: "css" }), "css");
  assert.equal(glassMode({ ua: CHROME, reducedTransparency: false, cores: 2, force: "lens" }), "lens");
  assert.equal(glassMode({ ua: "Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15", reducedTransparency: false, cores: 8, force: "lens" }), "css");
  assert.equal(glassMode({ ua: "Mozilla/5.0 (Windows NT 10.0; rv:130.0) Gecko/20100101 Firefox/130.0", reducedTransparency: false, cores: 8 }), "css");
});

test("garde-fou de fluidité : on ne rétrograde que sur une médiane réellement lente, jamais sur trop peu de mesures ni sur un pic isolé", () => {
  assert.equal(shouldDowngrade(Array(60).fill(16.7)), false);
  assert.equal(shouldDowngrade(Array(60).fill(60)), true);
  assert.equal(shouldDowngrade([...Array(55).fill(16.7), ...Array(5).fill(300)]), false, "quelques pics isolés ne comptent pas");
  assert.equal(shouldDowngrade(Array(10).fill(200)), false, "trop peu de mesures");
  assert.equal(shouldDowngrade(Array(60).fill(45), 50), false, "seuil configurable");
});
