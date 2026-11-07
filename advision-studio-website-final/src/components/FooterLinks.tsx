import { useI18n } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import { DISCORD_URL } from "@/lib/mail";
import EmailChooser from "@/components/EmailChooser";

const LINK = "text-white/40 hover:text-white/80 font-body font-light text-xs transition-colors";

/** Liens du pied de page (partagés entre le Footer des pages et la section finale de l'accueil). */
export default function FooterLinks() {
  const { t } = useI18n();
  return (
    <nav aria-label="Footer" className="flex flex-wrap items-center justify-center md:justify-end gap-x-5 gap-y-1.5">
      <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className={LINK}>{t("footer.discord")}</a>
      <EmailChooser className={LINK} />
      <button onClick={() => navigate("legal")} className={LINK}>{t("footer.legal")}</button>
      <button onClick={() => navigate("privacy")} className={LINK}>{t("footer.privacy")}</button>
      <button onClick={() => navigate("terms")} className={LINK}>{t("footer.terms")}</button>
      <button onClick={() => navigate("admin")} className={LINK}>{t("footer.admin")}</button>
    </nav>
  );
}
