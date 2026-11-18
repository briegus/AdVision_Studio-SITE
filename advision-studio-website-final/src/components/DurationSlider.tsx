import type { CSSProperties } from "react";

/**
 * Curseur rond (ex. durée souhaitée d'une pub : 10 à 30 s par pas de 5). La valeur est affichée au-dessus du curseur.
 * Les bornes viennent du catalogue. C'est une PRÉFÉRENCE du client, à confirmer par le studio (jamais une promesse).
 */
export default function DurationSlider({ label, value, min, max, step, unit = "s", onChange, ariaLabel }: {
  label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void; ariaLabel: string;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const ticks: number[] = [];
  for (let v = min; v <= max && ticks.length < 12; v += step) ticks.push(v);
  return (
    <div className="mt-4">
      <div className="flex items-end justify-between gap-4">
        <span className="text-[11px] uppercase tracking-widest text-white/40 font-body">{label}</span>
        <output className="font-heading italic text-4xl text-white leading-none tabular-nums" aria-live="polite">
          {value}<span className="ml-1 text-lg text-white/55 not-italic font-body">{unit}</span>
        </output>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel} aria-valuetext={`${value} ${unit}`}
        className="duration-slider mt-4"
        style={{ "--p": `${pct}%` } as CSSProperties}
      />
      <div className="mt-2 flex justify-between text-[11px] text-white/35 font-body tabular-nums" aria-hidden="true">
        {ticks.map((v) => <span key={v} className={v === value ? "text-white" : undefined}>{v}</span>)}
      </div>
    </div>
  );
}
