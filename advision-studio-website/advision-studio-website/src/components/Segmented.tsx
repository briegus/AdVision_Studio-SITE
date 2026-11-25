import { cn } from "@/utils/cn";

/** Choix entre quelques options (ex. 360p / 720p, 16:9 / 9:16), présenté en boutons arrondis. */
export default function Segmented({ label, value, options, onChange, required }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <div className="mt-4" role="radiogroup" aria-label={label}>
      <span className="text-xs font-medium tracking-wide text-white/75 font-body">{label}{required ? " *" : ""}</span>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value} type="button" role="radio" aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn("rounded-full border px-4 py-1.5 text-sm font-body transition-colors",
              value === o.value ? "border-white bg-white text-black font-medium" : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10")}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
