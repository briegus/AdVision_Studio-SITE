import { test } from "node:test";
import assert from "node:assert/strict";
import { computeLensMap, bend, surface } from "./lensMap.ts";

const px = (m: ReturnType<typeof computeLensMap>, x: number, y: number) => { const i = (y * m.width + x) * 4; return [m.data[i]!, m.data[i + 1]!, m.data[i + 2]!, m.data[i + 3]!]; };

test("lentille : profil convexe, courbure maximale au bord et nulle à la fin du biseau", () => {
  assert.equal(surface(0), 0); assert.equal(surface(1), 1);
  assert.ok(Math.abs(bend(0) - 1) < 1e-9); assert.equal(bend(1), 0);
  let prev = 2; for (let t = 0; t <= 1.0001; t += 0.05) { const b = bend(t); assert.ok(b <= prev + 1e-9, "décroissant"); prev = b; }
});

test("lentille : centre neutre (128,128), bords poussés vers l'intérieur, symétrie gauche/droite et haut/bas", () => {
  const m = computeLensMap({ width: 200, height: 120, radius: 24, bezel: 20 });
  assert.equal(m.data.length, 200 * 120 * 4);
  assert.deepEqual(px(m, 100, 60).slice(0, 2), [128, 128]);                // centre : aucun déplacement
  const left = px(m, 0, 60), right = px(m, 199, 60), top = px(m, 100, 0), bottom = px(m, 100, 119);
  assert.ok(left[0]! > 170 && Math.abs(left[1]! - 128) <= 1, "bord gauche → échantillonne vers la droite");
  assert.ok(right[0]! < 86 && Math.abs(right[1]! - 128) <= 1, "bord droit → vers la gauche");
  assert.ok(top[1]! > 170 && Math.abs(top[0]! - 128) <= 1, "bord haut → vers le bas");
  assert.ok(bottom[1]! < 86 && Math.abs(bottom[0]! - 128) <= 1, "bord bas → vers le haut");
  assert.ok(Math.abs((left[0]! - 128) + (right[0]! - 128)) <= 2, "symétrie");
  assert.deepEqual([left[2], left[3]], [128, 255]);
});

test("lentille : coin arrondi → déplacement en diagonale vers l'intérieur ; l'effet décroît du bord vers le centre", () => {
  const m = computeLensMap({ width: 200, height: 120, radius: 30, bezel: 24 });
  const corner = px(m, 10, 10); assert.ok(corner[0]! > 140 && corner[1]! > 140, `coin : ${corner}`);
  const amp = (x: number) => Math.abs(px(m, x, 60)[0]! - 128);
  assert.ok(amp(0) > amp(6) && amp(6) > amp(14) && amp(14) >= amp(30), "décroissance régulière");
  assert.equal(amp(30), 0, "au-delà du biseau : plat");
});

test("lentille : tailles minuscules ou rayon excessif ne produisent ni erreur ni valeur hors limites", () => {
  for (const p of [{ width: 2, height: 2, radius: 50, bezel: 50 }, { width: 40, height: 10, radius: 999, bezel: 30 }, { width: 300, height: 300, radius: 0, bezel: 1 }]) {
    const m = computeLensMap(p); assert.ok(m.data.every((v) => v >= 0 && v <= 255)); assert.equal(m.data.length, m.width * m.height * 4);
  }
});
