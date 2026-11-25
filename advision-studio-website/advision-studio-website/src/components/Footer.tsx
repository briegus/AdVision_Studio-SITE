import { useI18n } from "@/lib/i18n";
import FooterLinks from "@/components/FooterLinks";

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="relative z-10 shrink-0 px-5 md:px-10 pt-3.5 pb-16 md:pb-3.5 md:pr-64 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-2">
      <p className="text-white/40 font-body font-light text-xs">
        &copy; {new Date().getFullYear()} AdVision Studio. {t("footer.rights")}
      </p>
      <FooterLinks />
    </footer>
  );
}
