import type { APrestation, POption, PrestationInput, PrixMode } from "./admin";
import { ta } from "./adminI18n";

/** Formulaire de prestation (administration) : brouillon de saisie ↔ données envoyées au serveur, avec la validation côté navigateur.
 * Le serveur revalide tout : ces contrôles ne servent qu'à répondre vite et clairement à l'administrateur. */
export interface Draft {
  id: string | null; nom: string; description: string; cat: string; imageUrl: string; prixMode: PrixMode; prixMin: string; prixMax: string; devise: string;
  formatDuree: string; delai: string; conditions: string; options: POption[]; actif: boolean; visibleSite: boolean; visibleDiscord: boolean;
  /** traductions anglaises (vide = absente : le site retombe sur le français, rien n'est traduit automatiquement) */
  nomEn: string; descriptionEn: string; delaiEn: string; formatDureeEn: string; conditionsEn: string;
}
export const emptyDraft = (cat = ""): Draft => ({ id: null, nom: "", description: "", cat, imageUrl: "", prixMode: "devis", prixMin: "", prixMax: "", devise: "EUR", formatDuree: "", delai: "", conditions: "", options: [], actif: true, visibleSite: true, visibleDiscord: true, nomEn: "", descriptionEn: "", delaiEn: "", formatDureeEn: "", conditionsEn: "" });
export const draftOf = (p: APrestation): Draft => ({
  id: p.id, nom: p.nom, description: p.description, cat: p.categorieId ?? "", imageUrl: p.imageUrl ?? "", prixMode: p.prixMode, prixMin: p.prixMin == null ? "" : String(p.prixMin), prixMax: p.prixMax == null ? "" : String(p.prixMax),
  devise: p.devise, formatDuree: p.formatDuree ?? "", delai: p.delai ?? "", conditions: p.conditions ?? "", options: p.options.map((o) => ({ ...o })), actif: p.actif, visibleSite: p.visibleSite, visibleDiscord: p.visibleDiscord,
  nomEn: p.nomEn ?? "", descriptionEn: p.descriptionEn ?? "", delaiEn: p.delaiEn ?? "", formatDureeEn: p.formatDureeEn ?? "", conditionsEn: p.conditionsEn ?? "",
});
const toNumber = (s: string): number | null => { const n = Number(s.trim().replace(",", ".")); return s.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : null; };

/** Brouillon → données envoyées au serveur (categorieId fourni à part : peut devoir être créée d'abord). Renvoie la liste des erreurs de saisie. */
export function buildInput(d: Draft, categorieId: string | null): { input?: PrestationInput; errors: string[] } {
  const errors: string[] = [];
  if (!d.nom.trim()) errors.push("Le nom est requis.");
  if (!d.description.trim()) errors.push("La description est requise.");
  let min: number | null = null, max: number | null = null;
  if (d.prixMode === "fixe" || d.prixMode === "a_partir") { min = toNumber(d.prixMin); if (min === null) errors.push("Ce mode de tarif exige un montant valide (nombre positif)."); }
  if (d.prixMode === "fourchette") {
    min = toNumber(d.prixMin); max = toNumber(d.prixMax);
    if (min === null || max === null) errors.push(ta("La fourchette exige un minimum et un maximum valides.")); else if (min > max) errors.push(ta("Le minimum dépasse le maximum."));
  }
  if (d.imageUrl.trim() && !/^https:\/\/\S{3,500}$/i.test(d.imageUrl.trim())) errors.push(ta("L'image doit être un lien commençant par https://"));
  if (errors.length) return { errors };
  return {
    errors,
    input: {
      nom: d.nom.trim(), description: d.description.trim(), categorieId, imageUrl: d.imageUrl.trim() || null, prixMode: d.prixMode, prixMin: min, prixMax: max, devise: (d.devise.trim() || "EUR").toUpperCase().slice(0, 5),
      formatDuree: d.formatDuree.trim() || null, delai: d.delai.trim() || null, conditions: d.conditions.trim() || null,
      options: d.options.filter((o) => o.nom.trim()).map((o, i) => {
        const t = (v?: string) => v?.trim() || undefined;
        return { ...(o.id ? { id: o.id } : {}), nom: o.nom.trim(), mode: o.mode === "select" ? "select" as const : "info" as const, actif: o.actif !== false, ordre: i,
          ...(t(o.nomEn) ? { nomEn: t(o.nomEn)! } : {}), ...(t(o.description) ? { description: t(o.description)! } : {}), ...(t(o.descriptionEn) ? { descriptionEn: t(o.descriptionEn)! } : {}),
          ...(t(o.prix) ? { prix: t(o.prix)! } : {}), ...(t(o.conditions) ? { conditions: t(o.conditions)! } : {}), ...(t(o.conditionsEn) ? { conditionsEn: t(o.conditionsEn)! } : {}) };
      }),
      nomEn: d.nomEn.trim() || null, descriptionEn: d.descriptionEn.trim() || null, delaiEn: d.delaiEn.trim() || null, formatDureeEn: d.formatDureeEn.trim() || null, conditionsEn: d.conditionsEn.trim() || null,
      actif: d.actif, visibleDiscord: d.visibleDiscord, visibleSite: d.visibleSite,
    },
  };
}

