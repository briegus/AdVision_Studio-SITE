import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { navigate, useRoute, type Route } from "@/lib/router";
import { LogoInline } from "@/components/Logo";
import { cn } from "@/utils/cn";

const ITEMS: { route: Route; key: string }[] = [
  { route: "home", key: "nav.home" },
  { route: "services", key: "nav.services" },
  { route: "work", key: "nav.work" },
  { route: "process", key: "nav.process" },
  { route: "pricing", key: "nav.pricing" },
  { route: "reviews", key: "nav.reviews" },
  { route: "contact", key: "nav.contact" },
];

export default function Navbar() {
  const { t, lang, setLang } = useI18n();
  const route = useRoute();
  const [open, setOpen] = useState(false);

  const go = (r: Route) => {
    navigate(r);
    setOpen(false);
  };

  return (
    <header className="relative z-30 shrink-0">
      <div className="flex items-center justify-between gap-3 px-4 md:px-8 py-3.5">
        <button
          onClick={() => go("home")}
          aria-label="AdVision Studio — Home"
          className="hover:opacity-80 transition-opacity"
        >
          <LogoInline />
        </button>

        {/* Desktop nav */}
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="liquid-glass rounded-full px-2 py-1.5 flex items-center gap-0.5">
            {ITEMS.map(({ route: r, key }) => (
              <li key={r}>
                <button
                  onClick={() => go(r)}
                  aria-current={route === r ? "page" : undefined}
                  className={cn(
                    "px-2.5 xl:px-3.5 py-1.5 rounded-full text-xs xl:text-[13px] font-body transition-colors whitespace-nowrap",
                    route === r
                      ? "bg-white text-black font-medium"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  )}
                >
                  {t(key)}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <div
            className="liquid-glass rounded-full p-1 flex items-center"
            role="group"
            aria-label="Language"
          >
            {(["en", "fr"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-body font-medium uppercase tracking-wider transition-colors",
                  lang === l ? "bg-white text-black" : "text-white/60 hover:text-white"
                )}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={t("nav.menu")}
            className="lg:hidden liquid-glass rounded-full p-2.5 text-white hover:bg-white/10 transition-colors"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav
          aria-label="Main mobile"
          className="lg:hidden absolute left-4 right-4 top-full liquid-glass-strong rounded-2xl p-2 bg-black/70"
        >
          <ul>
            {ITEMS.map(({ route: r, key }) => (
              <li key={r}>
                <button
                  onClick={() => go(r)}
                  aria-current={route === r ? "page" : undefined}
                  className={cn(
                    "w-full text-left px-4 py-2.5 rounded-xl text-sm font-body transition-colors",
                    route === r ? "bg-white text-black font-medium" : "text-white/80 hover:bg-white/10"
                  )}
                >
                  {t(key)}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
