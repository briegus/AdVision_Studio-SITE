import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCatalogue, tr, legacyFormuleKey, defaultDetailsFor, missingFor, isSegmented, optionLabel, type PublicCatalogue, type QuestionCfg } from "./catalogue.ts";
import { DEFAULT_PUBLIC_CATALOGUE as NEW_D } from "./catalogueDefaults.ts";
import { LEGACY_PUBLIC_CATALOGUE as D } from "./fixtures/legacyCatalogue.ts";   // jeu de test « catalogue hérité » : le site doit toujours savoir le lire

const i18n = readFileSync(new URL("./i18n.tsx", import.meta.url), "utf8");
const view = (f: string) => readFileSync(new URL(`../views/${f}`, import.meta.url), "utf8");
const count = (key: string) => (i18n.match(new RegExp(`"${key.replace(/\./g, "\\.")}":`, "g")) ?? []).length;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const formule = (k: string) => D.formules.find((f) => f.key === k)!;

test("repli hors ligne : deux services (montage vidéo, serveurs Discord), deux formules, lisible par le site, aucun texte IA/logo/pub", () => {
  const p = parseCatalogue(clone(NEW_D));
  assert.ok(p);
  assert.deepEqual(NEW_D.services.map((s) => s.key), ["montage", "discord"]);
  assert.deepEqual(NEW_D.formules.map((f) => f.key), ["montage", "discord"]);
  assert.deepEqual(NEW_D.formules.map((f) => f.nom.fr), ["Montage vidéo", "Création de serveur Discord"]);
  assert.ok(NEW_D.services.every((s) => !s.aiNotice && !s.requiresBrand));
  assert.doesNotMatch(JSON.stringify(NEW_D), /logo|intelligence artificielle|\bIA\b|\bAI\b|artificial|publicit|video ad|identit[ée] visuelle|visual identity|pub_logo|discord_logo/i);
});

test("ancien catalogue (4 services, 6 formules) : toujours lisible par le site", () => {
  const p = parseCatalogue(clone(D));
  assert.ok(p);
  assert.deepEqual(D.services.map((s) => s.key), ["pub", "montage", "logo", "discord"]);
  assert.deepEqual(D.formules.map((f) => f.key), ["pub", "logo", "pub_logo", "montage", "discord", "discord_logo"]);
});

test("réponse de l'API illisible ou piégée : rejetée ou nettoyée, jamais d'exception", () => {
  for (const bad of [null, undefined, 12, "x", [], {}, { services: [], formules: [] }, { services: "x", formules: "y" }]) assert.equal(parseCatalogue(bad), null);
  const dirty = clone(D) as PublicCatalogue;
  (dirty.services as unknown[]).push({ key: 5 }, null, "x");
  (dirty.services[0]!.questions as unknown[]).push({ name: "x", kind: "select", label: { fr: "x" }, options: [] }, { kind: "inconnu" });
  const p = parseCatalogue(dirty)!;
  assert.equal(p.services.length, 4, "les services invalides sont ignorés");
  assert.equal(p.services[0]!.questions.length, D.services[0]!.questions.length, "les questions invalides sont ignorées");
});

test("textes du catalogue : tout existe en français ET en anglais", () => {
  for (const s of D.services) {
    for (const t of [s.nom, s.description, ...s.points, ...s.questions.flatMap((q) => [q.label, q.placeholder, ...(q.options ?? []).map((o) => o.label)])]) if (t) assert.ok(t.fr && t.en, `${s.key} : traduction manquante`);
  }
  for (const f of D.formules) assert.ok(f.nom.fr && f.nom.en && f.description.fr && f.description.en);
  assert.equal(tr({ fr: "Bonjour", en: "Hello" }, "en"), "Hello");
  assert.equal(tr({ fr: "Bonjour" }, "en"), "Bonjour", "anglais absent → français");
  assert.equal(tr(undefined, "fr"), "");
});

test("formules : questions sans doublon, champ obligatoire et marque obligatoire pour un logo", () => {
  for (const f of D.formules) { const n = f.questions.map((q) => q.name); assert.equal(new Set(n).size, n.length, f.key); }
  assert.ok(!formule("discord_logo").questions.some((q) => q.name === "besoins_graphiques"));
  assert.ok(formule("discord").questions.some((q) => q.name === "besoins_graphiques"));
  assert.deepEqual(missingFor(formule("pub"), {}, "").sort(), ["objectif", "produit"]);
  assert.deepEqual(missingFor(formule("logo"), {}, ""), ["marque"]);
  assert.deepEqual(missingFor(formule("logo"), {}, "Ma marque"), []);
  assert.deepEqual(missingFor(formule("pub_logo"), { objectif: "x", produit: "y" }, ""), ["marque"]);
  assert.deepEqual(missingFor(formule("montage"), { usage: "social" }, ""), ["resultat"]);
  assert.deepEqual(missingFor(undefined, {}, ""), ["formule"]);
});

test("curseur de durée 10-30 s par pas de 5, résolution 360p/720p, format 16:9 / 9:16 — réservés à la publicité", () => {
  const pub = D.services.find((s) => s.key === "pub")!;
  const dur = pub.questions.find((q) => q.name === "duree")!;
  assert.deepEqual([dur.kind, dur.slider], ["slider", { min: 10, max: 30, step: 5, default: 20 }]);
  assert.deepEqual(pub.questions.find((q) => q.name === "resolution")!.options!.map((o) => o.value), ["360p", "720p"]);
  assert.deepEqual(pub.questions.find((q) => q.name === "format")!.options!.map((o) => o.label.fr), ["16:9 (paysage)", "9:16 (portrait)"]);
  assert.deepEqual(defaultDetailsFor(formule("pub")), { duree: "20", resolution: "720p", format: "horizontal" });
  assert.deepEqual(defaultDetailsFor(formule("pub_logo")), { duree: "20", resolution: "720p", format: "horizontal" });
  for (const k of ["logo", "montage", "discord", "discord_logo"]) assert.ok(!formule(k).questions.some((q) => q.name === "duree"), k);
  assert.equal(optionLabel(dur, "25", "fr"), "25 s");
});

test("affichage des questions : liste courte en boutons, longue en menu", () => {
  const sel = (n: number): QuestionCfg => ({ name: "x", label: { fr: "x" }, kind: "select", required: false, options: Array.from({ length: n }, (_, i) => ({ value: `v${i}`, label: { fr: `v${i}` } })) });
  assert.equal(isSegmented(sel(2)), true); assert.equal(isSegmented(sel(3)), true); assert.equal(isSegmented(sel(4)), false);
  assert.equal(isSegmented({ name: "t", label: { fr: "t" }, kind: "text", required: false }), false);
});

test("anciens liens (?service=…&logo=1) → bonne formule", () => {
  assert.equal(legacyFormuleKey("pub", true), "pub_logo"); assert.equal(legacyFormuleKey("pub", false), "pub");
  assert.equal(legacyFormuleKey("discord", true), "discord_logo"); assert.equal(legacyFormuleKey("montage", true), "montage"); assert.equal(legacyFormuleKey(null, false), "pub");
});

test("règles commerciales : aucune promesse (prix, délai, garantie, « trois générations ») dans le catalogue ni les pages", () => {
  const all = JSON.stringify(D) + view("Services.tsx") + view("Contact.tsx");
  assert.doesNotMatch(all, /garanti|trois générations|3 générations|three generations|guarantee/i);
  assert.doesNotMatch(JSON.stringify(D), /\d+\s?(€|euros?|\$)/i);
  const note = (i18n.match(/"contact\.duree\.note": "([^"]*)"/g) ?? []);
  assert.equal(note.length, 2); assert.match(note[0]!, /to be confirmed/); assert.match(note[1]!, /à confirmer/); assert.match(note[1]!, /quantité de rushes à monter/);
  assert.equal(count("pricing.note"), 2);
});

test("aucune mention IA, logo ou publicité dans les textes du site (i18n) ni dans le repli ; l'ancienne mention officielle a disparu", () => {
  const txt = i18n + JSON.stringify(NEW_D);
  for (const bad of [/Plans vidéo générés par intelligence artificielle/i, /AI[- ]generated/i, /\bAI video ads?\b/i, /(Pub|Publicités?) vidéo/i, /vidéos? générées? par (IA|intelligence)/i, /création de logos?/i, /logo creation/i, /identit[ée] visuelle/i, /visual identity/i]) assert.doesNotMatch(txt, bad, String(bad));
});

test("la page Services et le formulaire n'écrivent AUCUNE prestation en dur : tout vient du catalogue", () => {
  for (const f of ["Services.tsx", "Contact.tsx"]) {
    const src = view(f);
    assert.match(src, /useCatalogue\(\)/, f);
    assert.doesNotMatch(src, /["'`][^"'`\n]*(Publicité vidéo|Montage vidéo|Création de logo|Création de serveur|Video ads|Video editing|Logo creation)[^"'`\n]*["'`]/, `${f} : prestation écrite en dur`);
    assert.doesNotMatch(src, /lib\/formules/, `${f} : ancien module de formules`);
  }
  assert.doesNotMatch(i18n, /"services\.(pub|montage|logo|discord)\./, "textes de prestations restés dans i18n");
});

test("réalisations : filtre par service issu du catalogue, aucune réalisation inventée", () => {
  const work = view("Work.tsx");
  assert.match(work, /useCatalogue\(\)/); assert.match(work, /svc:/);
  assert.doesNotMatch(work, /Café|Nike|client fictif|lorem/i);
  assert.match(view("Admin.tsx"), /svc:\$\{s\.key\}/, "l'administration propose les services du catalogue");
});

// ───────────── Phase 4 : prestations détaillées ─────────────
import { parsePrestations, prestationsForFormule } from "./catalogue.ts";
import { emptyDraft, draftOf, buildInput } from "./prestationForm.ts";
import type { APrestation } from "./admin.ts";

test("le repli hors ligne et une ancienne copie mémorisée n'ont pas de prestations : le champ est complété par une liste vide", () => {
  const p = parseCatalogue(clone(D))!;
  assert.ok(p.services.every((s) => Array.isArray(s.prestations) && s.prestations.length === 0));
});

test("prestations de l'API : lues dans les deux langues avec leurs options, éléments illisibles ignorés sans casser le reste", () => {
  const out = parsePrestations([
    { id: "a", nom: { fr: "Pub produit", en: "Product ad" }, description: { fr: "d" }, tarif: { fr: "À partir de 150 €", en: "From €150" }, formatDuree: null, delai: { fr: "5 jours" }, conditions: "", options: [
      { id: "o1", mode: "select", nom: { fr: "Sous-titres", en: "Subtitles" }, prix: "+20 €" }, { id: "o2", mode: "info", nom: { fr: "4K" } }, { nom: "" }, { nom: { fr: "" } }, 5, null] },
    { id: 3, nom: { fr: "mauvais id" } }, { id: "b" }, null, "x", { id: "c", nom: { fr: "   " } },
    { id: "old", nom: "Ancienne forme (chaîne)", tarif: "300 €" },
  ]);
  assert.equal(out.length, 2);
  assert.deepEqual(out[0]!.nom, { fr: "Pub produit", en: "Product ad" }); assert.deepEqual(out[0]!.tarif, { fr: "À partir de 150 €", en: "From €150" });
  assert.deepEqual(out[0]!.options.map((o) => [o.id, o.mode, o.nom.fr]), [["o1", "select", "Sous-titres"], ["o2", "info", "4K"]]);
  assert.equal(out[0]!.options[0]!.prix, "+20 €"); assert.equal(out[0]!.conditions, null, "chaîne vide → absent"); assert.equal(out[0]!.formatDuree, null);
  assert.deepEqual(out[1]!.nom, { fr: "Ancienne forme (chaîne)" }, "une copie en cache d'avant la Phase 5 reste lisible"); assert.deepEqual(out[1]!.tarif, { fr: "300 €" });
  assert.deepEqual(parsePrestations(undefined), []); assert.deepEqual(parsePrestations({}), []);
});

test("prestationsForFormule : prestations des services de la formule, dans l'ordre, services sans prestation omis", () => {
  const c = parseCatalogue(clone(D))!;
  const mk = (id: string, nom: string) => ({ id, nom: { fr: nom }, description: { fr: "" }, tarif: null, formatDuree: null, delai: null, options: [], conditions: null });
  c.services.find((s) => s.key === "pub")!.prestations = [mk("p1", "Pub")];
  c.services.find((s) => s.key === "logo")!.prestations = [mk("l1", "Logo")];
  const g = prestationsForFormule(c, c.formules.find((f) => f.key === "pub_logo"));
  assert.deepEqual(g.map((x) => x.service.key), ["pub", "logo"]);
  assert.deepEqual(prestationsForFormule(c, c.formules.find((f) => f.key === "montage")), []);
  assert.deepEqual(prestationsForFormule(c, undefined), []);
});

const base: APrestation = { id: "x", nom: "Pub", description: "Desc", categorieId: "c1", imageUrl: null, prixMode: "devis", prixMin: null, prixMax: null, devise: "EUR", formatDuree: null, options: [], conditions: null, delai: null, nomEn: null, descriptionEn: null, conditionsEn: null, delaiEn: null, formatDureeEn: null, actif: true, archived: false, ordre: 0, visibleDiscord: true, visibleSite: true, tarifAffiche: null };

test("formulaire de prestation : champs requis, tarif cohérent, image https, options vides ignorées, aucun montant inventé", () => {
  assert.deepEqual(buildInput(emptyDraft(), null).errors, ["Le nom est requis.", "La description est requise."]);
  const d = draftOf(base);
  assert.equal(buildInput({ ...d, prixMode: "fixe" }, "c1").errors.length, 1);
  assert.equal(buildInput({ ...d, prixMode: "fixe", prixMin: "-3" }, "c1").errors.length, 1);
  assert.equal(buildInput({ ...d, prixMode: "fourchette", prixMin: "10" }, "c1").errors.length, 1);
  assert.match(buildInput({ ...d, prixMode: "fourchette", prixMin: "50", prixMax: "10" }, "c1").errors[0]!, /dépasse/);
  assert.equal(buildInput({ ...d, imageUrl: "http://x.fr/a.png" }, "c1").errors.length, 1);
  const ok = buildInput({ ...d, prixMode: "fourchette", prixMin: "100,5", prixMax: "200", devise: "usd", options: [{ nom: " Sous-titres ", prix: "+20" }, { nom: "  " }] }, "c1");
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.input!.prixMin, 100.5); assert.equal(ok.input!.devise, "USD"); assert.deepEqual(ok.input!.options, [{ nom: "Sous-titres", mode: "info", actif: true, ordre: 0, prix: "+20" }]);
  const devis = buildInput({ ...d, prixMode: "devis", prixMin: "999", prixMax: "999" }, "c1");
  assert.equal(devis.input!.prixMin, null, "en mode devis, un ancien montant n'est jamais envoyé"); assert.equal(devis.input!.prixMax, null);
  assert.equal(buildInput(d, null).input!.categorieId, null);
});

test("administration : onglet Prestations branché, avec rattachement, archivage SANS suppression définitive et synchronisation Discord annoncée", () => {
  const admin = view("Admin.tsx"), tab = view("AdminPrestations.tsx");
  assert.match(admin, /tabBtn\("prestations", ta\("Prestations"\)\)/); assert.match(admin, /<PrestationsTab/);
  for (const needle of ["runAutoRattachement", "saveRattachement", "archivePrestation", "reorderPrestations", "syncDiscordCatalogue", "previewPrestation", "syncMessage"]) assert.ok(tab.includes(needle), needle);
  assert.doesNotMatch(tab, /Supprimer définitivement|deletePrestationForever/, "Phase 5 : plus aucune suppression définitive");
  assert.match(tab, /Archiver/); assert.match(tab, /Restaurer/);
});

test("site : la page Services affiche les prestations du catalogue et le formulaire propose le choix de prestation (clés FR et EN présentes une seule fois)", () => {
  assert.match(view("Services.tsx"), /s\.prestations\.length > 0/); assert.match(view("Services.tsx"), /prestation=/);
  const c = view("Contact.tsx");
  assert.match(c, /prestationId: selectedPresta\?\.id/); assert.match(c, /invalid_prestation/); assert.match(c, /prestationsForFormule/);
  for (const k of ["services.prestations", "presta.show", "presta.request", "presta.note", "contact.presta.label", "contact.presta.none", "contact.recap.presta", "err.invalid_prestation"]) assert.equal(count(k), 2, k);
});
