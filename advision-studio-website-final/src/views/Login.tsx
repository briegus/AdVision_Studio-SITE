import { useEffect, useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import Page from "@/components/Page";
import { useI18n } from "@/lib/i18n";
import { API_URL, ApiError } from "@/lib/api";
import { explainError } from "@/lib/errors";
import { useCooldown } from "@/lib/useCooldown";
import { emailRequest, emailVerify, loadProviders, startOAuth, useAuth, type Provider } from "@/lib/auth";
import { hashParam, navigate } from "@/lib/router";

const ERRORS = ["denied", "state", "failed", "provider_off", "rate"];

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="currentColor" d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.6 4.1-5.35 4.1a5.88 5.88 0 0 1 0-11.76c1.86 0 3.1.8 3.8 1.46l2.58-2.5A9.2 9.2 0 0 0 12 3.2a9.3 9.3 0 1 0 0 18.6c5.37 0 8.93-3.77 8.93-9.08 0-.6-.07-1.06-.15-1.62z" />
    </svg>
  );
}
function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="currentColor" d="M19.6 5.3A16.5 16.5 0 0 0 15.5 4l-.2.4c1.5.4 2.2.9 3 1.5a11 11 0 0 0-9.6 0c.8-.6 1.6-1.1 3.1-1.5L11.5 4A16.5 16.5 0 0 0 7.4 5.3C4.8 9.2 4.1 13 4.4 16.7a16.6 16.6 0 0 0 5 2.5l1.1-1.7c-.6-.2-1.2-.5-1.7-.9l.4-.3a11.8 11.8 0 0 0 10.2 0l.4.3c-.5.4-1.1.7-1.7.9l1.1 1.7a16.6 16.6 0 0 0 5-2.5c.4-4.3-.7-8.1-3.6-11.4zM9.7 14.4c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2zm4.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2z" />
    </svg>
  );
}

export default function Login() {
  const { t, lang } = useI18n();
  const session = useAuth();
  const [prov, setProv] = useState<{ google: boolean; discord: boolean; email: boolean } | null>(null);
  const [step, setStep] = useState<"choose" | "code">("choose");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [verifId, setVerifId] = useState("");
  const [website, setWebsite] = useState(""); // pot de miel anti-spam
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() => {
    const e = hashParam("error");
    return e && ERRORS.includes(e) ? t(`login.err.${e}`) : "";
  });
  const [info, setInfo] = useState("");
  const [cooldown, startCooldown] = useCooldown();

  useEffect(() => {
    if (session) navigate("account");
  }, [session]);

  useEffect(() => {
    if (!API_URL) return;
    loadProviders().then(setProv).catch(() => setProv({ google: false, discord: false, email: true }));
  }, []);

  const oauth = (p: Provider) => {
    setError("");
    startOAuth(p);
  };

  const requestCode = async (e: FormEvent) => {
    e.preventDefault();
    if (website) return;
    setBusy(true);
    setError("");
    try {
      const r = await emailRequest(email.trim(), name.trim(), lang);
      setVerifId(r.id);
      setCode("");
      setInfo(t("login.sent"));
      startCooldown(r.cooldownSec);
      setStep("code");
    } catch (x) {
      if (x instanceof ApiError && x.data.code === "cooldown" && typeof x.data.retryAfterSec === "number") startCooldown(x.data.retryAfterSec);
      setError(explainError(x, t));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await emailVerify(verifId, code.trim());
      navigate("account");
    } catch (x) {
      setError(explainError(x, t));
      if (x instanceof ApiError && x.data.code === "wrong_code") setCode("");
    } finally {
      setBusy(false);
    }
  };

  const btn =
    "w-full liquid-glass rounded-full px-6 py-3 text-sm font-medium font-body text-white inline-flex items-center justify-center gap-2.5 hover:bg-white/10 transition-colors";

  return (
    <Page title={t("login.title")}>
      <div className="flex-1 flex items-start justify-center">
        <div className="liquid-glass-strong rounded-3xl p-6 md:p-8 w-full max-w-md">
          <p className="text-sm text-white/55 font-body font-light text-center">{t("login.subtitle")}</p>

          {!API_URL ? (
            <p role="alert" className="mt-5 text-xs text-red-300 font-body text-center">VITE_API_URL is not configured.</p>
          ) : step === "choose" ? (
            <>
              <div className="mt-6 space-y-3">
                {prov?.google && (
                  <button type="button" onClick={() => oauth("google")} className={btn}>
                    <GoogleIcon /> {t("login.google")}
                  </button>
                )}
                {prov?.discord && (
                  <button type="button" onClick={() => oauth("discord")} className={btn}>
                    <DiscordIcon /> {t("login.discord")}
                  </button>
                )}
                {prov && !prov.google && !prov.discord && (
                  <p className="text-xs text-white/45 font-body text-center">{t("login.noprovider")}</p>
                )}
              </div>

              {prov?.email !== false && (
                <form onSubmit={requestCode} className="mt-6">
                  <p className="text-[11px] uppercase tracking-widest text-white/35 font-body text-center mb-3">{t("login.or")}</p>
                  <input className="glass-field" type="email" autoComplete="email" required placeholder={t("login.email")} aria-label={t("login.email")} value={email} onChange={(e) => setEmail(e.target.value)} />
                  <input className="glass-field mt-3" autoComplete="name" placeholder={t("login.name")} aria-label={t("login.name")} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
                  <input className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" />
                  <button type="submit" disabled={busy} className="mt-4 w-full bg-white text-black rounded-full px-6 py-3 text-sm font-medium font-body hover:bg-white/90 transition-colors disabled:opacity-50">
                    {busy ? t("login.sending") : t("login.send")}
                  </button>
                </form>
              )}
            </>
          ) : (
            <form onSubmit={verify} className="mt-6">
              <div className="flex items-center justify-center gap-2 text-white/70">
                <MailCheck className="h-5 w-5" aria-hidden="true" />
                <p className="text-sm font-body font-light">{info}</p>
              </div>
              <input
                className="glass-field mt-4 text-center tracking-[0.5em] text-lg"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                placeholder="••••••"
                aria-label={t("login.code")}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
              <button type="submit" disabled={busy || code.length !== 6} className="mt-4 w-full bg-white text-black rounded-full px-6 py-3 text-sm font-medium font-body hover:bg-white/90 transition-colors disabled:opacity-50">
                {t("login.verify")}
              </button>
              <button type="button" disabled={busy || cooldown > 0} onClick={(e) => void requestCode(e as unknown as FormEvent)} className="mt-3 w-full text-xs text-white/50 hover:text-white/80 font-body disabled:opacity-50">
                {cooldown > 0 ? t("contact.verify.resend.wait", { s: String(cooldown) }) : t("contact.verify.resend")}
              </button>
              <button type="button" onClick={() => { setStep("choose"); setError(""); }} className="mt-1 w-full text-xs text-white/50 hover:text-white/80 font-body">
                {t("login.back")}
              </button>
            </form>
          )}

          <div aria-live="polite">
            {error && (
              <p role="alert" className="mt-4 text-xs text-red-300 font-body text-center">
                {error}{" "}
                <button type="button" className="underline hover:text-red-200" onClick={() => navigate("diagnostic")}>{t("diag.link")}</button>
              </p>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
