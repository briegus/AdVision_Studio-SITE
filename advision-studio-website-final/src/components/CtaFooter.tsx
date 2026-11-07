import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import FooterLinks from "@/components/FooterLinks";
import { startHeroVideo, startWhenVisible, RESPECT_REDUCED_MOTION, type HlsCtor } from "@/lib/heroVideo";

const HLS_SRC = "https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8";

/** Section finale de l'accueil : vidéo HLS cinématique + appel à l'action + barre de pied de page (remplace le Footer global sur l'accueil). */
export default function CtaFooter() {
  const { t } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // La vidéo ne démarre que lorsque la section approche de l'écran : le Hero garde toute la bande passante au chargement.
  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;
    const reduceMotion = RESPECT_REDUCED_MOTION && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const IO = typeof IntersectionObserver === "undefined" ? null : (IntersectionObserver as never);
    return startWhenVisible(section, () => startHeroVideo(video, HLS_SRC, Hls as unknown as HlsCtor, { reduceMotion }), IO);
  }, []);

  return (
    <section ref={sectionRef} className="relative shrink-0 py-28 md:py-32 px-6 md:px-16 lg:px-24 text-center overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

      <div className="absolute top-0 left-0 right-0 z-[1] pointer-events-none" style={{ height: "200px", background: "linear-gradient(to bottom, black, transparent)" }} />
      <div className="absolute bottom-0 left-0 right-0 z-[1] pointer-events-none" style={{ height: "200px", background: "linear-gradient(to top, black, transparent)" }} />

      <div className="relative z-10">
        <h2 className="text-5xl md:text-6xl lg:text-7xl font-heading italic text-white tracking-tight leading-[0.85] max-w-3xl mx-auto mb-4">
          {t("cta.title")}
        </h2>
        <p className="text-white/60 font-body font-light text-sm md:text-base max-w-xl mx-auto mb-8">{t("cta.desc")}</p>
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
          <button
            onClick={() => navigate("contact")}
            className="liquid-glass-strong rounded-full px-6 py-3 text-sm font-medium text-white flex items-center gap-2 hover:bg-white/10 transition-all font-body"
          >
            {t("cta.btn1")}
            <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            onClick={() => navigate("pricing")}
            className="bg-white text-black rounded-full px-6 py-3 text-sm font-medium flex items-center gap-2 hover:bg-white/90 transition-colors font-body"
          >
            {t("cta.btn2")}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <footer className="mt-28 md:mt-32 pt-8 pb-14 md:pb-0 md:pr-56 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/40 font-body font-light text-xs">
            &copy; {new Date().getFullYear()} AdVision Studio. {t("footer.rights")}
          </p>
          <FooterLinks />
        </footer>
      </div>
    </section>
  );
}
