// Une vidéo ne tourne que lorsqu'elle est (presque) visible : moins de décodage et de batterie, surtout sur mobile.
// Utilisée UNIQUEMENT pour la vidéo du bas de page de l'accueil. Le héros garde sa logique d'origine (aucune pause hors écran : jugé trop risqué).
export function playWhenVisible(video: HTMLVideoElement, target: Element, onFirstVisible?: () => void): () => void {
  if (typeof IntersectionObserver === "undefined") { onFirstVisible?.(); return () => {}; }
  let started = false;
  const io = new IntersectionObserver((entries) => {
    const e = entries[entries.length - 1];   // notifications groupées : seule la plus récente compte
    const visible = !!e && e.isIntersecting && e.intersectionRatio > 0;   // un bloc qui touche seulement le bord de l'écran n'est pas visible
    if (visible && !started) { started = true; onFirstVisible?.(); }
    if (visible) void video.play().catch(() => {});   // lecture automatique refusée (économie d'énergie…) : on ne fait rien
    else video.pause();
  }, { rootMargin: "0px", threshold: [0, 0.01, 0.25] });   // seuils > 0 : un bloc posé « bord à bord » (surface nulle) notifie bien quand il entre vraiment
  io.observe(target);
  return () => io.disconnect();
}
