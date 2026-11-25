import { useEffect, useRef } from "react";
import Hls from "hls.js";
import Footer from "@/components/Footer";
import { startHeroVideo, RESPECT_REDUCED_MOTION, type HlsCtor } from "@/lib/heroVideo";
import { playWhenVisible } from "@/lib/videoVisibility";

/**
 * Bas de la page d'ACCUEIL uniquement : le pied de page sur la vidéo Mux (même source que le héros).
 * Fond repris du bloc fourni : <video> plein cadre (autoPlay, loop, muted, playsInline), dégradés noirs de 200 px en haut et en bas,
 * parent noir. Sans vidéo (flux indisponible) : fond noir uni, rien n'est ajouté. Les autres pages gardent le pied de page noir habituel.
 */
export default function HomeBottom({ src }: { src: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current, section = sectionRef.current;
    if (!video || !section) return;
    let stopVideo: () => void = () => {};
    // La vidéo n'est chargée que lorsque le bas de page approche de l'écran (pas de second flux au chargement), puis en pause hors écran.
    const stopObserver = playWhenVisible(video, section, () => {
      const reduceMotion = RESPECT_REDUCED_MOTION && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      stopVideo = startHeroVideo(video, src, Hls as unknown as HlsCtor, { reduceMotion });
    });
    return () => { stopObserver(); stopVideo(); };
  }, [src]);

  return (
    <section ref={sectionRef} data-bottom className="relative shrink-0 flex flex-col justify-end min-h-[26rem] md:min-h-[32rem] overflow-hidden bg-black text-center">
      {/* Background HLS video */}
      <video ref={videoRef} autoPlay loop muted playsInline aria-hidden="true" className="absolute inset-0 w-full h-full object-cover z-0" />
      {/* Top fade */}
      <div aria-hidden="true" className="absolute top-0 left-0 right-0 z-[1] pointer-events-none" style={{ height: "200px", background: "linear-gradient(to bottom, black, transparent)" }} />
      {/* Bottom fade */}
      <div aria-hidden="true" className="absolute bottom-0 left-0 right-0 z-[1] pointer-events-none" style={{ height: "200px", background: "linear-gradient(to top, black, transparent)" }} />
      <div className="relative z-10"><Footer /></div>
    </section>
  );
}
