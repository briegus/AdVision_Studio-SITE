import { useEffect, useState } from "react";
import { Film, ArrowUpRight, Play } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import { listWork, type PublicWork } from "@/lib/api";
import Page from "@/components/Page";
import LoadState from "@/components/LoadState";

const isDirectVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);

export default function Work() {
  const { t } = useI18n();
  const [projects, setProjects] = useState<PublicWork[]>([]);
  const [load, setLoad] = useState<"loading" | "ok" | "error">("loading");
  const fetchWork = (silent = false) => {
    if (!silent) setLoad("loading");
    // Réalisations publiées via Discord, le dashboard ou l'admin du site (base Neon commune).
    listWork()
      .then((r) => { setProjects(r); setLoad("ok"); })
      .catch(() => { if (!silent) setLoad("error"); });
  };
  useEffect(() => {
    fetchWork();
    // Une réalisation ajoutée sur Discord apparaît ici sans recharger la page (actualisation discrète toutes les 30 s).
    const id = setInterval(() => {
      if (!document.hidden) fetchWork(true);
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Page title={t("work.title")} wide>
      {load !== "ok" ? (
        <LoadState state={load} onRetry={() => fetchWork()} />
      ) : projects.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="liquid-glass rounded-3xl p-8 md:p-10 max-w-lg text-center">
            <Film className="h-7 w-7 text-white/50 mx-auto" aria-hidden="true" />
            <h2 className="mt-4 font-heading italic text-3xl text-white leading-none">
              {t("work.empty.title")}
            </h2>
            <p className="mt-3 text-white/55 font-body font-light text-sm leading-relaxed">
              {t("work.empty.desc")}
            </p>
            <button
              onClick={() => navigate("contact")}
              className="mt-6 bg-white text-black rounded-full px-6 py-3 text-sm font-medium font-body inline-flex items-center gap-2 hover:bg-white/90 transition-colors"
            >
              {t("work.empty.cta")}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 overflow-y-auto scrollbar-slim pr-1">
          {projects.map((p) => (
            <article key={p.id} className="liquid-glass rounded-2xl p-4 flex flex-col">
              {p.videoUrl && isDirectVideo(p.videoUrl) && (
                <video
                  src={p.videoUrl}
                  controls
                  preload="metadata"
                  playsInline
                  className={`w-full rounded-xl bg-black/60 mb-3 ${
                    p.format?.includes("9:16") ? "aspect-[9/16] max-h-56 mx-auto" : "aspect-video"
                  }`}
                />
              )}
              <h2 className="font-heading italic text-2xl text-white leading-none">{p.titre}</h2>
              {p.marque && <p className="mt-1 text-xs text-white/50 font-body">{p.marque}</p>}
              {p.description && (
                <p className="mt-2 text-sm text-white/60 font-body font-light leading-relaxed">
                  {p.description}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[p.duree, p.format].filter((v): v is string => Boolean(v)).map((v) => (
                  <span
                    key={v}
                    className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-body text-white/70"
                  >
                    {v}
                  </span>
                ))}
              </div>
              {p.videoUrl && !isDirectVideo(p.videoUrl) && (
                <a
                  href={p.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-body text-white hover:text-white/70 transition-colors"
                >
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("work.watch")}
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </Page>
  );
}
