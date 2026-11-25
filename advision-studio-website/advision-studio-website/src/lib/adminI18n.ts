// Traduction de l'ADMINISTRATION (FR ↔ EN). Le français est la langue source : ta("texte français") renvoie l'anglais quand la langue choisie est EN
// et que la traduction existe ; sinon il renvoie le français (repli propre, jamais de traduction automatique ni de texte inventé).
import { EN } from "./adminI18n.en";

export type AdminLang = "fr" | "en";
const KEY = "advision.admin.lang";
const read = (): AdminLang => { try { return localStorage.getItem(KEY) === "en" ? "en" : "fr"; } catch { return "fr"; } };
let current: AdminLang = read();

export const getAdminLang = (): AdminLang => current;
/** Change la langue (conservée entre les connexions dans ce navigateur). L'appelant relance un rendu : l'état des formulaires n'est pas touché. */
export function setAdminLang(l: AdminLang): void { current = l; try { localStorage.setItem(KEY, l); } catch { /* stockage indisponible : la langue vaut pour la session */ } }

/** ta("Texte {0} en français", [valeur]) — les {n} sont remplacés par les valeurs, dans les deux langues. */
export function ta(fr: string, args?: ReadonlyArray<string | number>): string {
  const raw = current === "en" ? EN[fr] ?? fr : fr;
  return args ? raw.replace(/\{(\d+)\}/g, (_, i: string) => String(args[Number(i)] ?? "")) : raw;
}
/** Messages d'erreur du serveur (en français) : traduits quand ils sont connus, sinon affichés tels quels. */
export const taServer = (msg: string): string => (current === "en" ? EN[msg] ?? msg : msg);
