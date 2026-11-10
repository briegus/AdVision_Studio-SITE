import { useEffect, useRef, useState } from "react";
import { Copy, Check, Mail } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { CONTACT_EMAIL } from "@/lib/mail";

/** Bouton « Email » : au lieu d'ouvrir d'office l'application par défaut, laisse choisir Gmail, Outlook, Yahoo, l'application installée, ou copier l'adresse. */
export default function EmailChooser({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const to = encodeURIComponent(CONTACT_EMAIL);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  async function copy() {
    try { await navigator.clipboard.writeText(CONTACT_EMAIL); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt(t("mail.copy"), CONTACT_EMAIL); }
  }

  const item = "flex items-center gap-2 w-full text-left rounded-lg px-3 py-2 text-xs font-body text-white/80 hover:bg-white/10 hover:text-white transition-colors";
  const links = [
    { label: "Gmail", href: `https://mail.google.com/mail/?view=cm&fs=1&to=${to}` },
    { label: "Outlook", href: `https://outlook.live.com/mail/0/deeplink/compose?to=${to}` },
    { label: "Yahoo Mail", href: `https://compose.mail.yahoo.com/?to=${to}` },
  ];

  return (
    <span ref={box} className="relative inline-block">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true" className={className}>
        {t("footer.email")}
      </button>
      {open && (
        <div
          role="group"
          aria-label={t("mail.title")}
          className="absolute bottom-full mb-3 z-50 w-64 left-1/2 -translate-x-1/2 md:left-auto md:right-0 md:translate-x-0 rounded-2xl border border-white/15 bg-black/90 backdrop-blur-xl p-2 text-left shadow-2xl"
        >
          <p className="px-3 pt-1.5 pb-1 text-[11px] uppercase tracking-widest text-white/40 font-body">{t("mail.title")}</p>
          {links.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={item}>
              <Mail className="h-3.5 w-3.5" aria-hidden="true" /> {l.label}
            </a>
          ))}
          <a href={`mailto:${CONTACT_EMAIL}`} onClick={() => setOpen(false)} className={item}>
            <Mail className="h-3.5 w-3.5" aria-hidden="true" /> {t("mail.default")}
          </a>
          <button type="button" onClick={copy} className={item}>
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
            {copied ? t("mail.copied") : t("mail.copy")}
          </button>
          <p className="px-3 pt-1 pb-1.5 text-[11px] text-white/35 font-body break-all">{CONTACT_EMAIL}</p>
        </div>
      )}
    </span>
  );
}
