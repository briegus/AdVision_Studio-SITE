// Remplace __API_ORIGIN__ (adresse du bot, VITE_API_URL) dans dist/_headers après le build, pour que les rapports CSP aillent au bot.
// Sans VITE_API_URL valide : les directives de rapport sont retirées (la politique reste en mode « rapport seul », sans collecte).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function apiOrigin(raw) {
  try { const u = new URL(String(raw ?? "").trim()); return u.protocol === "https:" || (u.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(u.hostname)) ? u.origin : ""; } catch { return ""; }
}
export function renderHeaders(template, origin) {
  if (origin) return template.replaceAll("__API_ORIGIN__", origin);
  return template.split("\n").filter((l) => !l.includes("Reporting-Endpoints")).map((l) => l.replace(/;\s*report-uri __API_ORIGIN__[^;\s]*/g, "").replace(/;\s*report-to csp/g, "")).join("\n");
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL("../dist/_headers", import.meta.url);
  if (!existsSync(file)) { console.error("dist/_headers introuvable : lancer après `vite build`."); process.exit(1); }
  const origin = apiOrigin(process.env.VITE_API_URL);
  writeFileSync(file, renderHeaders(readFileSync(file, "utf8"), origin));
  console.log(origin ? `[headers] rapports CSP → ${origin}/api/csp-report` : "[headers] VITE_API_URL absente ou invalide : CSP en rapport seul, SANS collecte");
}
