import { Check, ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import Page from "@/components/Page";

export default function Pricing() {
  const { t } = useI18n();
  const features = ["pricing.f1", "pricing.f2", "pricing.f3", "pricing.f4", "pricing.f5"];

  return (
    <Page title={t("pricing.title")} intro={t("pricing.desc")}>
      <div className="flex-1 flex items-start justify-center">
        <div className="liquid-glass-strong rounded-3xl p-6 md:p-8 w-full max-w-lg">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-heading italic text-5xl md:text-6xl text-white leading-none">
              {t("pricing.free")}
            </h2>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-widest font-body text-white/80">
              {t("pricing.launch")}
            </span>
          </div>

          <ul className="mt-6 space-y-2.5">
            {features.map((k) => (
              <li key={k} className="flex items-start gap-2.5 text-sm font-body font-light text-white/80">
                <Check className="h-4 w-4 mt-0.5 text-white shrink-0" aria-hidden="true" />
                {t(k)}
              </li>
            ))}
          </ul>

          <p className="mt-5 text-xs text-white/40 font-body font-light">{t("pricing.note")}</p>

          <button
            onClick={() => navigate("contact")}
            className="mt-6 w-full bg-white text-black rounded-full px-6 py-3 text-sm font-medium font-body flex items-center justify-center gap-2 hover:bg-white/90 transition-colors"
          >
            {t("pricing.cta")}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </Page>
  );
}
