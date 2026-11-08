import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { navigate } from "@/lib/router";
import { startHeroVideo, RESPECT_REDUCED_MOTION, type HlsCtor } from "@/lib/heroVideo";
import { LogoLockup } from "@/components/Logo";

const HLS_SRC = "https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Vidéo HLS du Hero : logique d'origine (hls.js d'abord, sinon lecteur natif) — voir lib/heroVideo.ts
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reduceMotion = RESPECT_REDUCED_MOTION && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return startHeroVideo(video, HLS_SRC, Hls as unknown as HlsCtor, { reduceMotion });
  }, []);

  return (
    <section className="relative flex-1 flex flex-col overflow-hidden text-center">
      {/* Background HLS video — the only media background on the site */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-60"
      />

      {/* Top fade */}
      <div
        className="absolute top-0 left-0 right-0 z-[1] pointer-events-none"
        style={{ height: "180px", background: "linear-gradient(to bottom, black, transparent)" }}
      />
      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 z-[1] pointer-events-none"
        style={{ height: "180px", background: "linear-gradient(to top, black, transparent)" }}
      />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-6 gap-0">
        <LogoLockup />

        <h1 className="mt-7 md:mt-9 font-heading italic text-4xl md:text-6xl lg:text-7xl text-white tracking-tight leading-[0.85] max-w-3xl">
          <TaglineText />
        </h1>
        <p className="mt-4 text-white/60 font-body font-light text-sm md:text-base max-w-xl">
          <DescText />
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 md:gap-6">
          <Cta1 />
          <Cta2 />
        </div>
      </div>
      <AiNote />
    </section>
  );
}

function TaglineText() {
  const { t } = useI18n();
  return <>{t("home.tagline")}</>;
}

function DescText() {
  const { t } = useI18n();
  return <>{t("home.desc")}</>;
}

function Cta1() {
  const { t } = useI18n();
  return (
    <button
      onClick={() => navigate("contact")}
      className="liquid-glass-strong rounded-full px-6 py-3 text-sm font-medium text-white flex items-center gap-2 hover:bg-white/10 transition-all font-body"
    >
      {t("home.cta1")}
      <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

function Cta2() {
  const { t } = useI18n();
  return (
    <button
      onClick={() => navigate("services")}
      className="bg-white text-black rounded-full px-6 py-3 text-sm font-medium flex items-center gap-2 hover:bg-white/90 transition-colors font-body"
    >
      {t("home.cta2")}
      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function AiNote() {
  const { t } = useI18n();
  return (
    <p className="relative z-10 pb-3 text-center text-[11px] font-body font-light text-white/35">{t("ai.note")}</p>
  );
}
