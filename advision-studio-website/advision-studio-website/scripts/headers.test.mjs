import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { apiOrigin, renderHeaders } from "./headers.mjs";
const tpl = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");
test("en-têtes : l'adresse du bot est injectée partout, aucun marqueur ne reste", () => {
  const out = renderHeaders(tpl, "https://bot.example.com");
  assert.doesNotMatch(out, /__API_ORIGIN__/);
  assert.match(out, /report-uri https:\/\/bot\.example\.com\/api\/csp-report/);
  assert.match(out, /Reporting-Endpoints: csp="https:\/\/bot\.example\.com\/api\/csp-report"/);
});
test("en-têtes : sans adresse valide, les directives de rapport sont retirées proprement", () => {
  const out = renderHeaders(tpl, "");
  assert.doesNotMatch(out, /__API_ORIGIN__|report-uri|report-to|Reporting-Endpoints/);
  assert.match(out, /Content-Security-Policy-Report-Only: default-src 'self'/);
  assert.match(out, /frame-ancestors 'none'/);
});
test("adresse du bot : https seulement (http uniquement en local), chemin et requête ignorés", () => {
  assert.equal(apiOrigin("https://bot.example.com/api?x=1"), "https://bot.example.com");
  assert.equal(apiOrigin("http://127.0.0.1:4317"), "http://127.0.0.1:4317");
  for (const bad of ["", undefined, "http://evil.example.com", "javascript:alert(1)", "pas une adresse"]) assert.equal(apiOrigin(bad), "");
});
