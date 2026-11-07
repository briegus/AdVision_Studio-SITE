import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getLegalDoc, type LegalKind } from "./legalContent.ts";

const KINDS: LegalKind[] = ["legal", "privacy", "terms"];

test("pages légales : FR et EN ont les mêmes sections, aucun marqueur {…} non remplacé, adresse de contact présente", () => {
  for (const k of KINDS) {
    const fr = getLegalDoc(k, "fr"), en = getLegalDoc(k, "en");
    assert.equal(fr.sections.length, en.sections.length, k);
    for (const d of [fr, en]) {
      const txt = d.sections.flatMap((s) => [s.h, ...s.p]).join("\n");
      assert.doesNotMatch(txt, /\{[A-Z]+\}/, `${k} : marqueur non remplacé`);
      assert.ok(d.title && d.intro);
    }
  }
  assert.match(getLegalDoc("privacy", "fr").sections.map((s) => s.p.join(" ")).join(" "), /contact@advisionstudio/);
});

test("la politique de confidentialité liste les éléments de stockage réellement utilisés par le code", () => {
  const txt = getLegalDoc("privacy", "fr").sections.flatMap((s) => s.p).join(" ");
  for (const key of ["advision_lang", "advision_account", "advision_notice"]) assert.ok(txt.includes(key), key);
  const src = ["session.ts", "i18n.tsx"].map((f) => readFileSync(new URL(`./${f}`, import.meta.url), "utf8")).join("\n");
  assert.match(src, /advision_account/); assert.match(src, /advision_lang/);
});

test("aucun cookie ni outil de suivi dans le code du site (document.cookie, gtag, analytics)", () => {
  const dir = new URL("../", import.meta.url);
  const files = ["App.tsx", "main.tsx", "components/StorageNotice.tsx", "components/EmailChooser.tsx", "lib/session.ts", "lib/admin.ts", "lib/api.ts"];
  for (const f of files) assert.doesNotMatch(readFileSync(new URL(f, dir), "utf8"), /document\.cookie|gtag\(|google-analytics|googletagmanager/, f);
});

test("routes légales déclarées dans le routeur", () => {
  const r = readFileSync(new URL("./router.ts", import.meta.url), "utf8");
  for (const k of KINDS) assert.match(r, new RegExp(`"${k}"`));
});

import { stepIndex, STEPS } from "./progress.ts";
test("progression d'une demande : Reçue → En cours → Traitée ; refusée et inconnu hors barre", () => {
  assert.deepEqual(STEPS.map(stepIndex), [0, 1, 2]);
  assert.equal(stepIndex("refusee"), -1); assert.equal(stepIndex("autre"), -1);
});

test("mention discrète « publicités générées par IA » : présente en FR et EN, sur l'accueil, les réalisations et les mentions légales", () => {
  const i18n = readFileSync(new URL("./i18n.tsx", import.meta.url), "utf8");
  assert.equal((i18n.match(/"ai\.note":/g) ?? []).length, 2);
  for (const f of ["../views/Home.tsx", "../views/Work.tsx"]) assert.match(readFileSync(new URL(f, import.meta.url), "utf8"), /ai\.note/, f);
  assert.match(getLegalDoc("legal", "fr").sections.map((s) => s.p.join(" ")).join(" "), /générées par intelligence artificielle/);
  assert.match(getLegalDoc("legal", "en").sections.map((s) => s.p.join(" ")).join(" "), /generated with artificial intelligence/);
});
