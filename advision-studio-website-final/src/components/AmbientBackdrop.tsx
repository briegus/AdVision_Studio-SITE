// Fond d'ambiance : halos argentés, anneaux et lignes fines. Sans détail derrière lui, le verre n'aurait rien à réfracter :
// ce sont ces lignes et ces lumières que la lentille courbe sur ses bords. Transformations CSS uniquement (aucun canvas, aucun JS par image).
export default function AmbientBackdrop() {
  return (
    <div className="ambient" aria-hidden="true">
      <div className="ambient-layer ambient-far">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>
      <div className="ambient-layer ambient-near">
        <svg className="rings" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" focusable="false">
          <g fill="none" stroke="currentColor" strokeWidth="1">
            {[90, 170, 260, 360, 470, 590, 720].map((r) => <circle key={r} cx="880" cy="250" r={r} opacity={Math.max(0.25, 1 - r / 900)} />)}
            {[70, 150, 240, 340, 450].map((r) => <circle key={`b${r}`} cx="200" cy="640" r={r} opacity={Math.max(0.2, 0.9 - r / 700)} />)}
          </g>
          <g fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2">
            <circle cx="880" cy="250" r="420" opacity="0.6" />
            <circle cx="200" cy="640" r="300" opacity="0.5" />
          </g>
        </svg>
        <div className="lines" />
      </div>
      <div className="grain" />
    </div>
  );
}
