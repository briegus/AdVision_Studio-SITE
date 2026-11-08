/**
 * Lecture de la vidéo d'arrière-plan du Hero — LOGIQUE D'ORIGINE, volontairement inchangée :
 *   1) hls.js d'abord (Hls.isSupported()), avec sa configuration par défaut ;
 *   2) sinon lecteur natif (Safari / iOS) ;
 *   3) sinon rien (le fond noir d'origine reste, le Hero s'affiche quand même).
 * Aucun appel à play() : l'attribut `autoPlay` de la balise <video> s'en charge, comme avant.
 * Seul ajout sans risque : la reprise automatique après une erreur fatale de hls.js (réseau / média).
 * (Une version précédente préférait le lecteur natif, chargeait hls.js à part et mettait la vidéo en pause hors écran :
 *  trop risqué — le fond animé pouvait ne plus s'afficher. Elle a été retirée.)
 */
export interface HlsLike {
  on(event: string, cb: (event: string, data: { fatal?: boolean; type?: string }) => void): void;
  loadSource(src: string): void;
  attachMedia(video: unknown): void;
  destroy(): void;
  startLoad(): void;
  recoverMediaError(): void;
}
export interface HlsCtor {
  new (config?: object): HlsLike;
  isSupported(): boolean;
  Events: { ERROR: string };
  ErrorTypes: { NETWORK_ERROR: string; MEDIA_ERROR: string };
}
export interface VideoLike {
  src: string;
  canPlayType(type: string): string;
  pause(): void;
  addEventListener(type: string, cb: () => void, opts?: { once?: boolean }): void;
}

/**
 * Faux = la vidéo tourne TOUJOURS en boucle (choix du propriétaire : le fond doit être une vraie vidéo, pas une image fixe).
 * Mettre `true` pour figer la vidéo sur sa première image chez les personnes ayant activé « réduire les animations » dans leur système.
 */
export const RESPECT_REDUCED_MOTION = false;
export function startHeroVideo(video: VideoLike, src: string, Hls: HlsCtor | null, o: { reduceMotion?: boolean } = {}): () => void {
  let cleanup: () => void = () => {};

  if (Hls && Hls.isSupported()) {
    const hls = new Hls();                                   // configuration par défaut : comme à l'origine
    let retry: ReturnType<typeof setTimeout> | null = null;
    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (!data?.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) { retry = setTimeout(() => hls.startLoad(), 2000); }
      else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
      else hls.destroy();                                    // irrécupérable : le fond noir d'origine reste
    });
    hls.loadSource(src);
    hls.attachMedia(video);
    cleanup = () => { if (retry) clearTimeout(retry); hls.destroy(); };
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = src;
  }

  // « Réduire les animations » : on laisse charger la première image puis on fige (l'image reste visible)
  if (o.reduceMotion) video.addEventListener("loadeddata", () => video.pause(), { once: true });
  return cleanup;
}
