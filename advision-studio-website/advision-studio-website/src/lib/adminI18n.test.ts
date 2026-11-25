// Couverture de la traduction de l'administration : chaque ta("…") du code a sa traduction anglaise, avec les mêmes {n} ; aucun texte visible laissé hors ta().
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { EN } from "./adminI18n.en.ts";
import { ta, taServer, setAdminLang, getAdminLang } from "./adminI18n.ts";

const FILES = ["Admin", "AdminCatalogue", "AdminChannels", "AdminPrestations", "AdminProjets", "AdminAccess"].map((n) => new URL(`../views/${n}.tsx`, import.meta.url)).concat(["admin.ts", "prestationForm.ts"].map((n) => new URL(`./${n}`, import.meta.url)));

function scan() {
  const keys = new Set<string>(); const raw: string[] = [];
  for (const f of FILES) {
    const src = ts.createSourceFile(f.pathname, readFileSync(f, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    (function v(n: ts.Node) {
      if (ts.isCallExpression(n) && n.expression.getText() === "ta" && n.arguments[0] && (ts.isStringLiteral(n.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(n.arguments[0]))) keys.add(n.arguments[0].text);
      // texte JSX visible resté hors ta()
      if (ts.isJsxText(n) && /[A-Za-zÀ-ÿ]{3,}/.test(n.text) && n.text.trim()) raw.push(`${f.pathname.split("/").pop()}: ${n.text.trim().slice(0, 50)}`);
      ts.forEachChild(n, v);
    })(src);
  }
  return { keys, raw };
}
const ph = (s: string) => [...s.matchAll(/\{(\d+)\}/g)].map((m) => m[1]).sort().join(",");

test("chaque ta(\"…\") du code a une traduction anglaise avec les mêmes paramètres {n}", () => {
  const { keys } = scan(); assert.ok(keys.size > 400, `clés trouvées : ${keys.size}`);
  const missing = [...keys].filter((k) => !(k in EN)); assert.deepEqual(missing, [], "traductions manquantes");
  for (const k of keys) { assert.ok(EN[k]!.trim(), `vide : ${k}`); assert.equal(ph(EN[k]!), ph(k), `paramètres différents : ${k}`); }
});

test("aucun texte JSX visible de l'administration n'est resté hors de ta()", () => {
  const { raw } = scan(); assert.deepEqual(raw, []);
});

test("ta() : français par défaut, anglais sur demande, paramètres remplacés, repli sur le français sans traduction ; taServer pour les messages du serveur", () => {
  setAdminLang("fr"); assert.equal(ta("Annuler"), "Annuler"); assert.equal(ta("Descendre {0}", ["X"]), "Descendre X");
  setAdminLang("en"); assert.equal(getAdminLang(), "en");
  assert.equal(ta("Annuler"), "Cancel"); assert.equal(ta("Descendre {0}", ["X"]), "Move X down"); assert.equal(ta("Texte inconnu {0}", [1]), "Texte inconnu 1", "repli propre : jamais de texte inventé");
  assert.equal(taServer("Code incorrect."), "Incorrect code."); assert.equal(taServer("Message inconnu du serveur"), "Message inconnu du serveur");
  setAdminLang("fr");
});

test("en anglais, deux onglets de l'administration n'ont jamais le même nom (régression : « Réalisations » et « Projets » s'appelaient tous deux « Projects »)", async () => {
  const tabs = ["Demandes", "Réalisations", "Avis", "Absences", "Catalogue", "Prestations", "Projets", "Salons", "Sécurité", "Accès et données", "Réglages", "État"].map((k) => EN[k] ?? k);
  assert.equal(new Set(tabs).size, tabs.length, `onglets en double : ${tabs.join(", ")}`);
});
