import { cn } from "@/utils/cn";

/** AV monogram — vector reproduction of the AdVision Studio mark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 126 64"
      fill="currentColor"
      aria-hidden="true"
      className={cn("block", className)}
    >
      <path d="M36 0 H50 L82 64 H68 L43 13 L18 64 H4 Z" />
      <path d="M58 0 H72 L90 36 L108 0 H122 L97 64 H83 Z" />
    </svg>
  );
}

/** Full lockup: monogram + ADVISION / — STUDIO — */
export function LogoLockup({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center select-none", className)}>
      <LogoMark className="w-24 md:w-32 text-white" />
      <div className="mt-4 text-white font-body font-light text-3xl md:text-4xl tracking-[0.42em] indent-[0.42em] leading-none">
        ADVISION
      </div>
      <div className="mt-3 flex items-center gap-4 w-full justify-center">
        <span className="h-px flex-1 max-w-16 bg-white/80" aria-hidden="true" />
        <span className="text-white font-body font-light text-sm md:text-base tracking-[0.6em] indent-[0.6em] leading-none">
          STUDIO
        </span>
        <span className="h-px flex-1 max-w-16 bg-white/80" aria-hidden="true" />
      </div>
    </div>
  );
}

/** Compact horizontal logo for the navbar. */
export function LogoInline({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5 select-none", className)}>
      <LogoMark className="w-8 shrink-0 text-white" />
      <span className="hidden sm:flex flex-col leading-none">
        <span className="font-body font-light text-[13px] tracking-[0.3em] text-white">ADVISION</span>
        <span className="font-body font-light text-[8px] tracking-[0.52em] text-white/60 mt-1">STUDIO</span>
      </span>
    </span>
  );
}
