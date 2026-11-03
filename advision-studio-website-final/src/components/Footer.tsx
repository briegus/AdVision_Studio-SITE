import { useI18n } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import { CONTACT_EMAIL, DISCORD_URL } from "@/lib/mail";

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="relative z-10 shrink-0 px-5 md:px-10 py-3.5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2">
      <p className="text-white/40 font-body font-light text-xs">
        &copy; {new Date().getFullYear()} AdVision Studio. {t("footer.rights")}
      </p>
      <div className="flex items-center gap-5">
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/40 hover:text-white/80 font-body font-light text-xs transition-colors"
        >
          {t("footer.discord")}
        </a>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-white/40 hover:text-white/80 font-body font-light text-xs transition-colors"
        >
          {t("footer.email")}
        </a>
        <button
          onClick={() => navigate("admin")}
          className="text-white/40 hover:text-white/80 font-body font-light text-xs transition-colors"
        >
          {t("footer.admin")}
        </button>
      </div>
    </footer>
  );
}
