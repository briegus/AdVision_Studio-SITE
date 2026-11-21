import { useState } from "react";
import { Clapperboard, Scissors, PenTool, MessagesSquare, Sparkles, Star, Camera, Music, Check, ArrowUpRight, type LucideIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import { useCatalogue, tr, type PublicService } from "@/lib/catalogue";
import Page from "@/components/Page";

const ICONS: Record<string, LucideIcon> = { video: Clapperboard, scissors: Scissors, pen: PenTool, discord: MessagesSquare, sparkles: Sparkles, star: Star, camera: Camera, music: Music };
const openForm = (formule: string, prestation?: string) => navigate("contact", `formule=${encodeURIComponent(formule)}${prestation ? `&prestation=${encodeURIComponent(prestation)}` : ""}`);

/** Page Services : tout vient du catalogue du bot (administration → Catalogue). Aucune prestation n'est écrite ici. */
export default function Services() {
  const { t, lang } = useI18n();
  const { catalogue } = useCatalogue();
  const [openKey, setOpenKey] = useState<string | null>(null);   // service dont les prestations détaillées sont dépliées

  // Bouton principal : la formule du service seul ; sinon la première formule qui le contient. Lien secondaire : une formule combinée qui commence par lui.
  const mainFormule = (s: PublicService) => catalogue.formules.find((f) => f.services.length === 1 && f.services[0] === s.key) ?? catalogue.formules.find((f) => f.services.includes(s.key));
  const comboFormule = (s: PublicService) => catalogue.formules.find((f) => f.services.length > 1 && f.services[0] === s.key);

  return (
    <Page title={t("services.title")} intro={t("services.intro", { n: String(catalogue.services.length) })} wide>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        {catalogue.services.map((s) => {
          const Icon = ICONS[s.icon] ?? Sparkles;
          const main = mainFormule(s), combo = comboFormule(s);
          return (
            <article key={s.key} className="liquid-glass rounded-2xl p-5 text-left flex flex-col">
              <Icon className="h-5 w-5 text-white/70" aria-hidden="true" />
              <h2 className="mt-3 font-heading italic text-2xl text-white leading-none">{tr(s.nom, lang)}</h2>
              {tr(s.description, lang) && <p className="mt-2 text-white/55 font-body font-light text-sm leading-relaxed">{tr(s.description, lang)}</p>}
              {s.points.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {s.points.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs font-body font-light text-white/75">
                      <Check className="h-3.5 w-3.5 mt-0.5 text-white shrink-0" aria-hidden="true" />
                      {tr(p, lang)}
                    </li>
                  ))}
                </ul>
              )}
              {s.prestations.length > 0 && (
                <div className="mt-4">
                  <button type="button" aria-expanded={openKey === s.key} aria-controls={`presta-${s.key}`} onClick={() => setOpenKey(openKey === s.key ? null : s.key)}
                    className="text-xs font-body text-white/70 hover:text-white underline underline-offset-4 transition-colors">
                    {openKey === s.key ? t("presta.hide") : t("presta.show", { n: String(s.prestations.length) })}
                  </button>
                  {openKey === s.key && (
                    <ul id={`presta-${s.key}`} className="mt-3 space-y-3">
                      {s.prestations.map((p) => (
                        <li key={p.id} data-testid="presta-item" className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <p className="font-body text-sm font-medium text-white">{tr(p.nom, lang)}{p.tarif && <span className="ml-2 text-xs font-normal text-white/70 whitespace-nowrap">{tr(p.tarif, lang)}</span>}</p>
                          {tr(p.description, lang) && <p className="mt-1 text-xs text-white/55 font-body font-light">{tr(p.description, lang)}</p>}
                          <dl className="mt-2 space-y-0.5 text-xs font-body text-white/60">
                            {p.delai && <div><dt className="inline text-white/40">{t("presta.delai")} : </dt><dd className="inline text-white/80">{tr(p.delai, lang)}</dd></div>}
                            {p.formatDuree && <div><dt className="inline text-white/40">{t("presta.format")} : </dt><dd className="inline text-white/80">{tr(p.formatDuree, lang)}</dd></div>}
                            {p.options.length > 0 && <div><dt className="inline text-white/40">{t("presta.options")} : </dt><dd className="inline text-white/80">{p.options.map((o) => `${tr(o.nom, lang)}${o.prix ? ` (${o.prix})` : ""}${o.mode === "select" ? "" : ""}`).join(", ")}</dd></div>}
                            {p.conditions && <div><dt className="inline text-white/40">{t("presta.conditions")} : </dt><dd className="inline text-white/80">{tr(p.conditions, lang)}</dd></div>}
                          </dl>
                          {main && (
                            <button type="button" onClick={() => openForm(main.key, p.id)} className="mt-2 text-xs font-medium font-body text-white flex items-center gap-1 hover:text-white/80 transition-colors">
                              {t("presta.request")}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </li>
                      ))}
                      <li className="text-[11px] text-white/40 font-body font-light list-none">{t("presta.note")}</li>
                    </ul>
                  )}
                </div>
              )}
              <div className="mt-auto pt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                {main && (
                  <button onClick={() => openForm(main.key)} className="text-sm font-medium font-body text-white flex items-center gap-1.5 hover:text-white/80 transition-colors">
                    {t("services.card.cta")}
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
                {combo && (
                  <button onClick={() => openForm(combo.key)} className="text-xs font-body text-white/60 hover:text-white underline underline-offset-4 transition-colors">
                    {tr(combo.nom, lang)}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-4 liquid-glass rounded-2xl px-5 py-4">
        <p className="font-body text-sm font-medium text-white">{t("services.formules")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {catalogue.formules.map((f) => (
            <button
              key={f.key}
              onClick={() => openForm(f.key)}
              className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-body text-white/85 hover:bg-white/10 transition-colors"
            >
              {tr(f.nom, lang)}
            </button>
          ))}
        </div>
      </div>
    </Page>
  );
}
