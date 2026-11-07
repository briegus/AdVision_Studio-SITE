import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { navigate } from "@/lib/router";

const KEY = "advision_notice";

/**
 * Bandeau d'INFORMATION (pas de consentement) : le site n'utilise aucun cookie publicitaire ni outil de suivi,
 * seulement du stockage strictement nécessaire (langue, session). Placé à GAUCHE pour ne pas être masqué par le badge Netlify.
 * Si un outil de mesure d'audience ou de publicité est ajouté un jour, il faudra un vrai choix « accepter / refuser » avant son activation.
 */
export default function StorageNotice() {
  const { t } = useI18n();
  const [shown, setShown] = useState(() => { try { return !localStorage.getItem(KEY); } catch { return true; } });
  if (!shown) return null;
  const close = () => { try { localStorage.setItem(KEY, "1"); } catch { /* ignoré */ } setShown(false); };
  return (
    <div role="region" aria-label={t("notice.label")} className="fixed z-40 bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm liquid-glass-strong rounded-2xl p-4 bg-black/60">
      <p className="text-xs text-white/75 font-body font-light leading-relaxed">{t("notice.text")}</p>
      <div className="mt-3 flex items-center gap-4">
        <button onClick={close} className="rounded-full bg-white text-black px-4 py-1.5 text-xs font-medium font-body hover:bg-white/90 transition-colors">{t("notice.ok")}</button>
        <button onClick={() => { navigate("privacy"); close(); }} className="text-xs text-white/60 hover:text-white font-body underline underline-offset-4 transition-colors">{t("notice.more")}</button>
      </div>
    </div>
  );
}
