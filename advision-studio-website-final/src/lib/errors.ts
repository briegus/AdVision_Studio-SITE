import { ApiError } from "./api";

type T = (key: string, vars?: Record<string, string>) => string;

/**
 * Message affiché au visiteur pour une erreur d'API. Le serveur renvoie un `code` stable (wrong_code, expired, cooldown…) :
 * le site le traduit (FR/EN) ; à défaut, il affiche le message du serveur pour les erreurs de validation, sinon un message générique.
 */
export function explainError(e: unknown, t: T): string {
  if (!(e instanceof ApiError)) return t("contact.error");
  if (e.status === 0) return e.message.includes("VITE_API_URL") ? t("contact.notconfigured") : t("contact.network");

  const code = typeof e.data.code === "string" ? e.data.code : "";
  if (code) {
    const key = `err.${code}`;
    const remaining = typeof e.data.remaining === "number" ? e.data.remaining : null;
    const retry = typeof e.data.retryAfterSec === "number" ? String(e.data.retryAfterSec) : "30";
    const base = t(key, { s: retry });
    if (base !== key) {
      if (code === "wrong_code" && remaining !== null) return `${base} ${remaining > 0 ? t("err.remaining", { n: String(remaining) }) : t("err.nomore")}`;
      return base;
    }
  }
  return e.status === 400 || e.status === 429 || e.status === 503 ? e.message : t("contact.error");
}
