import { ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import Page from "@/components/Page";

export default function Process() {
  const { t } = useI18n();
  const steps = [1, 2, 3, 4].map((n) => ({
    n,
    title: t(`process.p${n}.title`),
    desc: t(`process.p${n}.desc`),
  }));

  return (
    <Page title={t("process.title")} wide>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {steps.map(({ n, title, desc }) => (
          <article key={n} className="liquid-glass rounded-2xl p-5">
            <span className="font-heading italic text-4xl text-white/25 leading-none">0{n}</span>
            <h2 className="mt-2 font-heading italic text-2xl text-white leading-none">{title}</h2>
            <p className="mt-2 text-white/55 font-body font-light text-sm leading-relaxed">{desc}</p>
          </article>
        ))}
      </div>
      <div className="mt-6 flex justify-center">
        <button
          onClick={() => navigate("contact")}
          className="liquid-glass-strong rounded-full px-6 py-3 text-sm font-medium text-white flex items-center gap-2 hover:bg-white/10 transition-all font-body"
        >
          {t("process.cta")}
          <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </Page>
  );
}
