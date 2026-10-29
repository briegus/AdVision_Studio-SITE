import { useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, MailCheck, ShieldCheck, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import Page from "@/components/Page";
import { DISCORD_URL, CONTACT_EMAIL } from "@/lib/mail";
import { requestCode, verifyCode, ApiError } from "@/lib/api";

type Step = "form" | "verify" | "done";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Contact() {
  const { t, lang } = useI18n();
  const [step, setStep] = useState<Step>("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    duration: "6",
    resolution: "720p",
    aspect: "16:9",
    message: "",
  });
  const [verifId, setVerifId] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [ref, setRef] = useState("");
  const [slow, setSlow] = useState(false);

  // Si le serveur met plus de 6 s à répondre (réveil), on rassure le visiteur.
  useEffect(() => {
    if (!busy) { setSlow(false); return; }
    const id = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(id);
  }, [busy]);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // Messages d'erreur : on affiche le message du serveur pour les limites (429) et l'e-mail indisponible (503).
  const explain = (e: unknown) => (e instanceof ApiError && (e.status === 429 || e.status === 503) ? e.message : t("contact.error"));

  const payload = () => ({
    name: form.name.trim(),
    email: form.email.trim(),
    company: form.company.trim(),
    duration: form.duration,
    resolution: form.resolution,
    aspect: form.aspect,
    message: form.message.trim(),
    lang,
  });

  const sendCode = async (): Promise<boolean> => {
    try {
      const r = await requestCode(payload());
      setVerifId(r.id);
      return true;
    } catch (e) {
      setError(explain(e));
      return false;
    }
  };

  const submitForm = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!form.name.trim() || !EMAIL_RE.test(form.email) || form.message.trim().length < 10) {
      setError(t("contact.required"));
      return;
    }
    setBusy(true);
    if (await sendCode()) {
      setStep("verify");
      setCodeInput("");
    }
    setBusy(false);
  };

  const resend = async () => {
    setError("");
    setInfo("");
    setBusy(true);
    if (await sendCode()) setInfo(t("contact.verify.resent"));
    setBusy(false);
  };

  const submitCode = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const r = await verifyCode(verifId, codeInput.trim());
      setRef(r.ref);
      setStep("done");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError(t("contact.verify.wrong"));
      else if (err instanceof ApiError && err.data.expired) setError(err.message);
      else setError(explain(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page title={t("contact.title")} intro={t("contact.intro")} wide>
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-4 md:gap-6">
        {/* Direct channels */}
        <div className="space-y-3 self-start">
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="liquid-glass-strong rounded-2xl p-5 flex items-center justify-between gap-3 hover:bg-white/10 transition-colors group"
          >
            <div>
              <p className="font-body font-medium text-white text-sm">{t("contact.discord")}</p>
              <p className="text-xs text-white/45 font-body font-light mt-0.5">discord.gg/CqFZTjEgRx</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-white/50 group-hover:text-white transition-colors" aria-hidden="true" />
          </a>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="liquid-glass rounded-2xl p-5 flex items-center justify-between gap-3 hover:bg-white/10 transition-colors group"
          >
            <div>
              <p className="font-body font-medium text-white text-sm">{t("footer.email")}</p>
              <p className="text-xs text-white/45 font-body font-light mt-0.5 break-all">{CONTACT_EMAIL}</p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-white/50 group-hover:text-white transition-colors" aria-hidden="true" />
          </a>
          <p className="text-xs text-white/35 font-body font-light px-1">{t("contact.or")}</p>
        </div>

        {/* Inquiry form — 3 steps */}
        <div className="liquid-glass-strong rounded-2xl p-5 md:p-6">
          {step === "form" && (
            <form onSubmit={submitForm}>
              <div className="grid sm:grid-cols-2 gap-3">
                <input className="glass-field" placeholder={t("contact.name")} value={form.name} onChange={set("name")} required aria-label={t("contact.name")} />
                <input className="glass-field" type="email" placeholder={t("contact.email")} value={form.email} onChange={set("email")} required aria-label={t("contact.email")} />
              </div>
              <input className="glass-field mt-3" placeholder={t("contact.company")} value={form.company} onChange={set("company")} aria-label={t("contact.company")} />
              <div className="mt-3 grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-widest text-white/40 font-body">{t("contact.duration")}</span>
                  <select className="glass-field mt-1" value={form.duration} onChange={set("duration")}>
                    {["4", "6", "8", "10"].map((d) => (
                      <option key={d} value={d}>{d}s</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-widest text-white/40 font-body">{t("contact.resolution")}</span>
                  <select className="glass-field mt-1" value={form.resolution} onChange={set("resolution")}>
                    <option value="360p">360p</option>
                    <option value="720p">720p</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-widest text-white/40 font-body">{t("contact.aspect")}</span>
                  <select className="glass-field mt-1" value={form.aspect} onChange={set("aspect")}>
                    <option value="16:9">16:9</option>
                    <option value="9:16">9:16</option>
                  </select>
                </label>
              </div>
              <textarea className="glass-field mt-3 min-h-20 resize-none" placeholder={t("contact.message")} value={form.message} onChange={set("message")} required aria-label={t("contact.message")} />
              <button
                type="submit"
                disabled={busy}
                className="mt-4 w-full bg-white text-black rounded-full px-6 py-3 text-sm font-medium font-body flex items-center justify-center gap-2 hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                {busy ? t("contact.sending") : t("contact.send")}
              </button>
            </form>
          )}

          {step === "verify" && (
            <form onSubmit={submitCode} className="text-center py-2">
              <MailCheck className="h-7 w-7 text-white/70 mx-auto" aria-hidden="true" />
              <h2 className="mt-3 font-heading italic text-3xl text-white leading-none">{t("contact.verify.title")}</h2>
              <p className="mt-3 text-sm text-white/55 font-body font-light max-w-md mx-auto">
                {t("contact.verify.desc", { email: form.email })}
              </p>
              <input
                className="glass-field mt-5 max-w-56 mx-auto text-center text-xl tracking-[0.4em] font-body"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••••"
                aria-label={t("contact.verify.placeholder")}
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ""))}
              />
              <p className="mt-2 text-xs text-white/35 font-body font-light">{t("contact.verify.spam")}</p>
              <button
                type="submit"
                disabled={busy || codeInput.length !== 6}
                className="mt-4 w-full max-w-sm mx-auto bg-white text-black rounded-full px-6 py-3 text-sm font-medium font-body flex items-center justify-center gap-2 hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                {busy ? t("contact.verify.checking") : t("contact.verify.confirm")}
              </button>
              <div className="mt-3 flex items-center justify-center gap-5">
                <button type="button" onClick={resend} disabled={busy} className="text-xs text-white/50 hover:text-white font-body transition-colors disabled:opacity-50">
                  {t("contact.verify.resend")}
                </button>
                <button type="button" onClick={() => { setStep("form"); setError(""); setInfo(""); }} className="text-xs text-white/50 hover:text-white font-body transition-colors">
                  {t("contact.verify.back")}
                </button>
              </div>
            </form>
          )}

          {step === "done" && (
            <div className="text-center py-6">
              <ShieldCheck className="h-8 w-8 text-emerald-300 mx-auto" aria-hidden="true" />
              <h2 className="mt-3 font-heading italic text-3xl text-white leading-none">{t("contact.done.title")}</h2>
              <p className="mt-3 text-sm text-white/55 font-body font-light max-w-md mx-auto">{t("contact.done.desc")}</p>
              {ref && <p className="mt-3 text-xs text-white/70 font-body">Ref : <span className="font-medium text-white">{ref}</span></p>}
              <button
                onClick={() => { setStep("form"); setForm((f) => ({ ...f, message: "" })); setCodeInput(""); }}
                className="mt-5 liquid-glass rounded-full px-6 py-2.5 text-sm font-medium text-white font-body hover:bg-white/10 transition-colors"
              >
                {t("contact.done.again")}
              </button>
            </div>
          )}

          <div aria-live="polite">
            {error && <p className="mt-3 text-xs text-red-300 font-body text-center">{error}</p>}
            {info && <p className="mt-3 text-xs text-emerald-300/90 font-body text-center">{info}</p>}
            {busy && slow && <p className="mt-3 text-xs text-white/55 font-body text-center">{t("contact.waking")}</p>}
          </div>
        </div>
      </div>
    </Page>
  );
}
