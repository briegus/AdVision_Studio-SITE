import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { explainError } from "./errors.ts";
import { ApiError } from "./api.ts";

// ── Dictionnaire : parité FR/EN et clés utilisées dans le code ──────────────────
const src = readFileSync(new URL("./i18n.tsx", import.meta.url), "utf8");
const [enBlock, frBlock] = [src.slice(src.indexOf("  en: {"), src.indexOf("  fr: {")), src.slice(src.indexOf("  fr: {"))];
const keys = (b: string) => new Set([...b.matchAll(/^\s+"([^"]+)":/gm)].map((m) => m[1]!));
const EN = keys(enBlock), FR = keys(frBlock);

// Imite le vrai t() : renvoie la clé telle quelle quand elle n'existe pas
const t = (k: string, v?: Record<string, string>) => (EN.has(k) ? `[${k}${v ? JSON.stringify(v) : ""}]` : k);


test("code inconnu du dictionnaire → message de repli du serveur pour les erreurs de validation", () => {
  assert.equal(explainError(new ApiError(400, "Message serveur", { code: "zzz" }), t), "Message serveur");
});

test("mauvais code : message + nombre d'essais restants", () => {
  assert.equal(explainError(new ApiError(401, "x", { code: "wrong_code", remaining: 3 }), t), '[err.wrong_code{"s":"30"}] [err.remaining{"n":"3"}]');
  assert.ok(explainError(new ApiError(401, "x", { code: "wrong_code", remaining: 0 }), t).includes("err.nomore"));
});

test("renvoi trop rapide : délai restant transmis", () => {
  assert.equal(explainError(new ApiError(429, "x", { code: "cooldown", retryAfterSec: 12 }), t), '[err.cooldown{"s":"12"}]');
});

test("réseau coupé / serveur absent / site non configuré", () => {
  assert.equal(explainError(new ApiError(0, "network"), t), "[contact.network]");
  assert.equal(explainError(new ApiError(0, "VITE_API_URL is not configured"), t), "[contact.notconfigured]");
  assert.equal(explainError(new Error("boom"), t), "[contact.error]");
  assert.equal(explainError(new ApiError(500, "interne"), t), "[contact.error]");
});


test("dictionnaire : chaque clé existe en français ET en anglais", () => {
  const missingFr = [...EN].filter((k) => !FR.has(k));
  const missingEn = [...FR].filter((k) => !EN.has(k));
  assert.deepEqual({ missingFr, missingEn }, { missingFr: [], missingEn: [] });
});

test("dictionnaire : toutes les clés t(\"…\") utilisées dans le code existent", () => {
  const files: string[] = [];
  const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) && !/\.test\./.test(f) && files.push(p); } };
  walk(new URL("..", import.meta.url).pathname);
  const used = new Set<string>();
  for (const f of files) for (const m of readFileSync(f, "utf8").matchAll(/\bt\(\s*"([a-zA-Z0-9_.]+)"/g)) used.add(m[1]!);
  const unknown = [...used].filter((k) => !EN.has(k) || !FR.has(k));
  assert.deepEqual(unknown, []);
});
