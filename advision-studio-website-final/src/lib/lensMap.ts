// Carte de déplacement d'une « lentille » en verre (rectangle à coins arrondis), pour feDisplacementMap.
// Pur : aucune dépendance au navigateur, donc testable. Chaque pixel encode, dans R et G, le décalage d'échantillonnage du fond :
//   R,G = 128 + 127·m·n   avec n = normale INTÉRIEURE du bord et m = intensité de la courbure (maximale au bord, nulle au centre).
// Le centre du verre reste donc net et plat, et la lumière se courbe progressivement sur la « tranche » (biseau), comme sur une
// goutte de verre épais : le fond situé derrière le bord est rapatrié depuis l'intérieur, ce qui déforme visiblement les lignes.
export interface LensParams { width: number; height: number; radius: number; bezel: number }
export interface LensMap { width: number; height: number; data: Uint8ClampedArray<ArrayBuffer>; bezel: number }

/** Profil de surface convexe « squircle » : h(t) de 0 (bord) à 1 (fin du biseau). */
export const surface = (t: number): number => Math.pow(1 - Math.pow(1 - t, 4), 1 / 4);
/** Intensité de la déformation : 1 au bord extrême, 0 à la fin du biseau. */
export const bend = (t: number): number => 1 - surface(Math.min(1, Math.max(0, t)));

export function computeLensMap(p: LensParams): LensMap {
  const w = Math.max(2, Math.round(p.width)), h = Math.max(2, Math.round(p.height));
  const r = Math.min(Math.max(0, p.radius), w / 2, h / 2);
  const bezel = Math.max(1, Math.min(p.bezel, Math.min(w, h) / 2));
  const data = new Uint8ClampedArray(new ArrayBuffer(w * h * 4));
  const hw = w / 2, hh = h / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hw, py = y + 0.5 - hh;
      const qx = Math.abs(px) - (hw - r), qy = Math.abs(py) - (hh - r);
      let nx: number, ny: number, dist: number;     // dist = distance au bord, vers l'intérieur
      if (qx > 0 && qy > 0) {                        // coin arrondi
        const len = Math.hypot(qx, qy) || 1;
        nx = -Math.sign(px) * qx / len; ny = -Math.sign(py) * qy / len; dist = r - len;
      } else if (qx > qy) { nx = -Math.sign(px) || -1; ny = 0; dist = hw - Math.abs(px); }
      else { nx = 0; ny = -Math.sign(py) || -1; dist = hh - Math.abs(py); }
      const i = (y * w + x) * 4;
      let m = 0;
      if (dist >= 0 && dist < bezel) m = bend(dist / bezel);
      data[i] = Math.round(128 + 127 * m * nx);
      data[i + 1] = Math.round(128 + 127 * m * ny);
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }
  return { width: w, height: h, data, bezel };
}
