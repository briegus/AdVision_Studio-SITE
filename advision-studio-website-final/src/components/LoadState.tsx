import { useI18n } from "@/lib/i18n";

/** Chargement / erreur réseau avec bouton « Réessayer » — évite d'afficher « aucun avis » quand le serveur ne répond pas. */
export default function LoadState({ state, onRetry }: { state: "loading" | "error"; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="liquid-glass rounded-2xl p-6 text-center" role={state === "error" ? "alert" : "status"} aria-live="polite">
      <p className="text-white/55 font-body font-light text-sm leading-relaxed">
        {state === "loading" ? t("state.loading") : t("state.loadError")}
      </p>
      {state === "error" && (
        <button
          onClick={onRetry}
          className="mt-4 bg-white text-black rounded-full px-5 py-2 text-sm font-medium font-body hover:bg-white/90 transition-colors"
        >
          {t("state.retry")}
        </button>
      )}
    </div>
  );
}
