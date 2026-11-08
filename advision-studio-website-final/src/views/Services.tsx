import { Clapperboard, Smartphone, Wand2, ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import Page from "@/components/Page";

export default function Services() {
  const { t } = useI18n();

  const cards = [
    { icon: Clapperboard, title: t("services.s1.title"), desc: t("services.s1.desc") },
    { icon: Smartphone, title: t("services.s2.title"), desc: t("services.s2.desc") },
    { icon: Wand2, title: t("services.s3.title"), desc: t("services.s3.desc") },
  ];

  const specs = [
    { label: t("services.spec.duration"), values: ["4s", "6s", "8s", "10s"] },
    { label: t("services.spec.resolution"), values: ["360p", "720p"] },
    { label: t("services.spec.aspect"), values: ["16:9", "9:16"] },
  ];

  return (
    <Page title={t("services.title")} intro={t("services.intro")} wide>
      <div className="grid md:grid-cols-3 gap-3 md:gap-4">
        {cards.map(({ icon: Icon, title, desc }) => (
          <article key={title} className="liquid-glass rounded-2xl p-5 text-left">
            <Icon className="h-5 w-5 text-white/70" aria-hidden="true" />
            <h2 className="mt-3 font-heading italic text-2xl text-white leading-none">{title}</h2>
            <p className="mt-2 text-white/55 font-body font-light text-sm leading-relaxed">{desc}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 liquid-glass rounded-2xl px-5 py-4 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
        <p className="font-body text-sm font-medium text-white shrink-0">{t("services.specs")}</p>
        <div className="flex flex-wrap gap-x-8 gap-y-3 flex-1">
          {specs.map(({ label, values }) => (
            <div key={label}>
              <p className="text-[11px] uppercase tracking-widest text-white/40 font-body">{label}</p>
              <div className="mt-1.5 flex gap-1.5">
                {values.map((v) => (
                  <span
                    key={v}
                    className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs font-body text-white/85"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => navigate("contact")}
          className="bg-white text-black rounded-full px-5 py-2.5 text-sm font-medium font-body flex items-center gap-2 hover:bg-white/90 transition-colors self-start md:self-center shrink-0"
        >
          {t("services.cta")}
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </Page>
  );
}
