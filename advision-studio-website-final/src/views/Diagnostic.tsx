import { useCallback, useEffect, useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import Page from "@/components/Page";
import { useI18n } from "@/lib/i18n";
import { API_URL } from "@/lib/api";
import { runDiagnostic, reportText, type DiagStep } from "@/lib/diagnostic";
import { cn } from "@/utils/cn";

/**
 * Diagnostic de connexion : explique pourquoi le formulaire de contact ou la connexion ne marche pas, sans ouvrir la console.
 * Accessible à tous (aucune donnée sensible : seulement des oui/non sur la configuration).
 */
export default function Diagnostic() {
  const { t } = useI18n();
  const [steps, setSteps] = useState<DiagStep[] | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setCopied(false);
    try {
      setSteps(await runDiagnostic({ apiUrl: API_URL, origin: window.location.origin, fetchImpl: window.fetch.bind(window) }));
    } finally {
      setRunning(false);
    }
  }, []);
  useEffect(() => { void run(); }, [run]);

  const failed = steps?.filter((s) => s.ok === false) ?? [];
  const copy = async () => {
    if (!steps) return;
    try { await navigator.clipboard.writeText(reportText(steps, window.location.origin)); setCopied(true); } catch { /* presse-papiers indisponible */ }
  };

  return (
    <Page title={t("diag.title")}>
      <div className="flex-1 flex items-start justify-center">
        <div className="liquid-glass-strong rounded-3xl p-6 md:p-8 w-full max-w-2xl">
          <p className="text-sm text-white/55 font-body font-light">{t("diag.intro")}</p>

          <div aria-live="polite" className="mt-5">
            {running && <p className="text-sm text-white/60 font-body" role="status">{t("diag.running")}</p>}
            {!running && steps && (
              <p className={cn("text-sm font-body font-medium", failed.length ? "text-amber-200" : "text-emerald-300")}>
                {failed.length ? t("diag.problem", { n: String(failed.length) }) : t("diag.allok")}
              </p>
            )}
          </div>

          {steps && (
            <ul className="mt-4 space-y-3">
              {steps.map((s) => (
                <li key={s.id} className="flex items-start gap-3">
                  <span className={cn("mt-0.5 text-sm", s.ok === null ? "text-white/40" : s.ok ? "text-emerald-300" : "text-red-300")} aria-hidden="true">
                    {s.ok === null ? "●" : s.ok ? "✓" : "✗"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-white font-body"><span className="font-medium">{s.label}</span> <span className="text-white/55 font-light">— {s.detail}</span></p>
                    {s.ok === false && s.fix && <p className="mt-1 text-xs text-amber-200/85 font-body leading-relaxed">→ {s.fix}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <button onClick={() => void run()} disabled={running} className="bg-white text-black rounded-full px-5 py-2 text-sm font-medium font-body hover:bg-white/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2">
              <RefreshCw className={cn("h-4 w-4", running && "animate-spin")} aria-hidden="true" /> {t("diag.rerun")}
            </button>
            {steps && (
              <button onClick={() => void copy()} className="liquid-glass rounded-full px-5 py-2 text-sm text-white/80 font-body hover:bg-white/10 inline-flex items-center gap-2">
                {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />} {copied ? t("diag.copied") : t("diag.copy")}
              </button>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
