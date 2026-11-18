import { test } from "node:test";
import assert from "node:assert/strict";
import { runDiagnostic, reportText } from "./diagnostic.ts";

const ORIGIN = "https://advision.netlify.app";
const API = "https://bot.onrender.com";
const json = (o: unknown) => ({ json: async () => o }) as Response;

/** Faux fetch : route par route, avec la possibilité de refuser le mode « cors » (comme un navigateur bloqué par CORS). */
function fakeFetch(o: { reach?: boolean; cors?: boolean; status?: Record<string, unknown>; providers?: Record<string, unknown> }) {
  return (async (url: string, init?: RequestInit) => {
    const u = String(url);
    if (u.endsWith("/health")) { if (o.reach === false) throw new TypeError("Failed to fetch"); return {} as Response; }
    if (o.cors === false) throw new TypeError("Failed to fetch");   // le navigateur bloque la lecture : TypeError, comme en vrai
    if (u.endsWith("/api/public/status")) return json(o.status ?? { ok: true, db: true, discord: true, mail: true, originAllowed: true });
    if (u.endsWith("/api/auth/providers")) return json(o.providers ?? { google: false, discord: false, email: true });
    void init; throw new Error("URL inattendue " + u);
  }) as typeof fetch;
}
const run = (apiUrl: string, o = {}, origin = ORIGIN) => runDiagnostic({ apiUrl, origin, fetchImpl: fakeFetch(o), timeoutMs: 1000 });
const failing = (steps: Awaited<ReturnType<typeof run>>) => steps.filter((s) => s.ok === false).map((s) => s.id);

test("VITE_API_URL absente → cause explicite + procédure Netlify, et rien d'autre n'est testé", async () => {
  const s = await run("");
  assert.deepEqual(failing(s), ["config"]);
  assert.equal(s.length, 1);
  assert.match(s[0]!.fix!, /Clear cache and deploy/);
});

test("adresse invalide ou http depuis un site https (contenu mixte) → détecté", async () => {
  assert.deepEqual(failing(await run("pas une url")), ["url"]);
  assert.deepEqual(failing(await run("http://bot.onrender.com")), ["url"]);
  assert.ok(!failing(await run("http://localhost:3000", {}, "http://localhost:5173")).includes("url"));
});

test("serveur injoignable (endormi / mauvaise adresse) → « le serveur répond » en échec, avec le conseil d'attendre", async () => {
  const s = await run(API, { reach: false });
  assert.deepEqual(failing(s), ["reach"]);
  assert.match(s.find((x) => x.id === "reach")!.fix!, /1 minute/);
});

test("CORS : serveur joignable MAIS lecture refusée → diagnostic CORS avec l'adresse exacte à mettre dans ALLOWED_ORIGINS", async () => {
  const s = await run(API, { cors: false });
  assert.deepEqual(failing(s), ["cors"]);
  assert.ok(s.find((x) => x.id === "cors")!.fix!.includes(`ALLOWED_ORIGINS = ${ORIGIN}`));
});

test("tout fonctionne → aucune étape en échec, adresses de connexion listées", async () => {
  const s = await run(API, { providers: { google: true, discord: false, email: true } });
  assert.deepEqual(failing(s), []);
  assert.match(s.find((x) => x.id === "providers")!.detail, /Google : oui · Discord : non · E-mail : oui/);
});

test("e-mails non configurés → c'est LA cause de « le code ne part pas » et le correctif nomme les variables", async () => {
  const s = await run(API, { status: { ok: true, db: true, discord: true, mail: false, originAllowed: true } });
  assert.deepEqual(failing(s), ["mail"]);
  const fix = s.find((x) => x.id === "mail")!.fix!;
  assert.ok(fix.includes("BREVO_API_KEY") && fix.includes("MAIL_FROM_EMAIL"));
});

test("base injoignable et bot hors ligne → les deux sont signalés", async () => {
  const s = await run(API, { status: { ok: true, db: false, discord: false, mail: true, originAllowed: true } });
  assert.deepEqual(failing(s).sort(), ["db", "discord"]);
});

test("origine absente de ALLOWED_ORIGINS (le serveur le dit) → signalé", async () => {
  const s = await run(API, { status: { ok: true, db: true, discord: true, mail: true, originAllowed: false } });
  assert.deepEqual(failing(s), ["origin"]);
});

test("rapport à copier : lisible, avec les corrections, sans aucune donnée sensible", async () => {
  const txt = reportText(await run(API, { status: { ok: true, db: true, discord: true, mail: false, originAllowed: true } }), ORIGIN);
  assert.match(txt, /^Diagnostic AdVision — site : https:\/\/advision\.netlify\.app/);
  assert.match(txt, /KO\s+Envoi d'e-mails/);
  assert.ok(!/password|token|secret|apikey/i.test(txt));
});
