import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, MailCheck, ShieldCheck, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import Page from "@/components/Page";
import { cn } from "@/utils/cn";
import { DISCORD_URL, CONTACT_EMAIL } from "@/lib/mail";
import { requestCode, verifyCode, submitInquiryAsUser, ApiError } from "@/lib/api";
import { useCatalogue, tr, legacyFormuleKey, defaultDetailsFor, missingFor, isSegmented, optionLabel, prestationsForFormule, type QuestionCfg } from "@/lib/catalogue";
import DurationSlider from "@/components/DurationSlider";
import Segmented from "@/components/Segmented";
import { explainError } from "@/lib/errors";
import { useCooldown } from "@/lib/useCooldown";
import { useAuth, logoutAccount } from "@/lib/auth";
import { navigate } from "@/lib/router";

type Step = "form" | "verify" | "done";

/** Formule demandée : lue dans l'adresse (#/contact?formule=pub_logo ; anciens liens : ?service=pub&logo=1). */
function formuleFromHash(): string | null {
  const q = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
  return q.get("formule") ?? (q.get("service") ? legacyFormuleKey(q.get("service"), q.get("logo") === "1") : null);
}

/** Prestation demandée : #/contact?formule=pub&prestation=<id> (lien du bouton « Demander cette prestation » de la page Services). */
function prestationFromHash(): string | null {
  return new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("prestation");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Contact() {
  const { t, lang } = useI18n();
  const session = useAuth();
  const account = session?.user ?? null;                                   // client connecté (Google, Discord ou e-mail)
  const verifiedUser = account && account.emailVerified && account.email ? account : null;   // e-mail déjà vérifié : envoi sans code
  const emailLocked = !!(account && account.email);                        // l'adresse du compte est utilisée telle quelle
  const [step, setStep] = useState<Step>("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const { catalogue } = useCatalogue();
  const [wanted, setWanted] = useState<string | null>(formuleFromHash);
  const [wantedPresta, setWantedPresta] = useState<string | null>(prestationFromHash);
  const [optIds, setOptIds] = useState<string[]>([]);          // options « au choix » cochées (identifiants)
  // Lien vers une autre formule pendant que le formulaire est déjà ouvert (#/contact?formule=…) : la sélection suit l'adresse
  useEffect(() => {
    const onHash = () => { const k = formuleFromHash(); if (k) setWanted(k); const p = prestationFromHash(); if (p) setWantedPresta(p); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const formule = catalogue.formules.find((f) => f.key === wanted) ?? catalogue.formules[0];   // formule disparue du catalogue → la première
  // Prestations proposées pour cette formule (celles de ses services) ; une prestation absente de la liste (retirée du catalogue, autre formule) est ignorée
  const prestaGroups = prestationsForFormule(catalogue, formule);
  const selectedPresta = prestaGroups.flatMap((g) => g.prestations).find((p) => p.id === wantedPresta) ?? null;
  // seules les options sélectionnables de la prestation choisie comptent (un identifiant périmé est ignoré)
  const chosenOptions = selectedPresta ? selectedPresta.options.filter((o) => o.mode === "select" && optIds.includes(o.id)) : [];
  const [details, setDetails] = useState<Record<string, string>>(() => defaultDetailsFor(formule));
  const touched = useRef(new Set<string>());                                     // champs réellement modifiés par le client
  const [sent, setSent] = useState<{ formule: string; prefs: { label: string; value: string }[]; prestation: string | null; options: string[] } | null>(null);
  const questions = formule?.questions ?? [];
  const [form, setForm] = useState({
    name: account?.name ?? "",
    email: account?.email ?? "",
    company: "",
    message: "",
  });
  const [verifId, setVerifId] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [ref, setRef] = useState("");
  const [slow, setSlow] = useState(false);

  // Connexion / changement de compte pendant que le formulaire est ouvert : l'adresse suit le compte (jamais l'inverse)
  useEffect(() => {
    if (!account) return;
    setForm((f) => ({ ...f, name: f.name || account.name, email: account.email ?? f.email }));
  }, [account]);

  // Si le serveur met plus de 6 s à répondre (réveil), on rassure le visiteur.
  useEffect(() => {
    if (!busy) { setSlow(false); return; }
    const id = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(id);
  }, [busy]);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const explain = (e: unknown) => explainError(e, t);
  const [cooldown, startCooldown] = useCooldown();

  const setDetailValue = (k: string, v: string) => { touched.current.add(k); setDetails((d) => ({ ...d, [k]: v })); };
  const setDetail = (k: string) => (e: { target: { value: string } }) => setDetailValue(k, e.target.value);

  // Changement de formule (ou mise à jour du catalogue) : valeurs de départ de la formule + ce que le client a déjà modifié
  useEffect(() => {
    setDetails((d) => ({ ...defaultDetailsFor(formule), ...Object.fromEntries(Object.entries(d).filter(([k]) => touched.current.has(k))) }));
  }, [formule]);

  const payload = () => ({
    formule: formule?.key ?? "",
    prestationId: selectedPresta?.id,
    ...(selectedPresta ? { options: chosenOptions.map((o) => o.id) } : {}),
    // uniquement les réponses aux questions de la formule choisie (pas de reste d'un autre choix)
    details: Object.fromEntries(questions.map((q) => [q.name, (details[q.name] ?? "").trim()]).filter(([, v]) => v)) as Record<string, string>,
    name: form.name.trim(),
    email: form.email.trim(),
    company: form.company.trim(),
    message: form.message.trim(),
    lang,
  });

  /** Récapitulatif affiché après l'envoi : formule + préférences (durée, résolution, format) quand la formule en contient. */
  const snapshot = () => {
    const d = payload().details;
    const prefs = questions.filter((q) => q.role && d[q.name]).map((q) => ({ label: tr(q.label, lang), value: optionLabel(q, d[q.name]!, lang) }));
    return { formule: tr(formule?.nom, lang), prefs, prestation: selectedPresta ? tr(selectedPresta.nom, lang) : null, options: chosenOptions.map((o) => `${tr(o.nom, lang)}${o.prix ? ` (${o.prix})` : ""}`) };
  };

  const sendCode = async (): Promise<boolean> => {
    try {
      const r = await requestCode(payload());
      setVerifId(r.id);
      startCooldown(r.cooldownSec);
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.data.code === "cooldown" && typeof e.data.retryAfterSec === "number") startCooldown(e.data.retryAfterSec);
      if (e instanceof ApiError && e.data.code === "invalid_prestation") { setWantedPresta(null); setOptIds([]); }
      if (e instanceof ApiError && e.data.code === "invalid_option") setOptIds([]);
      setError(explain(e));
      return false;
    }
  };

  const submitForm = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!form.name.trim() || !EMAIL_RE.test(form.email) || missingFor(formule, payload().details, form.company).length) {
      setError(t("contact.required"));
      return;
    }
    setBusy(true);
    if (verifiedUser) {
      // Compte connecté dont l'e-mail est déjà vérifié : envoi direct, sans code
      try {
        const snap = snapshot();
        const r = await submitInquiryAsUser(payload());
        setRef(r.ref);
        setSent(snap);
        setStep("done");
      } catch (x) {
        if (x instanceof ApiError && x.data.code === "invalid_prestation") { setWantedPresta(null); setOptIds([]); }
        if (x instanceof ApiError && x.data.code === "invalid_option") setOptIds([]);
        setError(explain(x));
      }
    } else if (await sendCode()) {
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
      setSent(snapshot());
      setStep("done");
    } catch (err) {
      setError(explain(err));
      if (err instanceof ApiError && err.data.code === "wrong_code") setCodeInput("");
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
        <div><div className="liquid-glass-strong rounded-2xl p-5 md:p-6">
          {step === "form" && (
            <form onSubmit={submitForm}>
              <div className="mb-3" role="group" aria-label={t("contact.formule.label")}>
                <span className="text-xs font-medium tracking-wide text-white/75 font-body">{t("contact.formule.label")}</span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {catalogue.formules.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      aria-pressed={formule?.key === f.key}
                      onClick={() => setWanted(f.key)}
                      className={cn("rounded-full border px-3.5 py-1.5 text-xs font-body transition-colors", formule?.key === f.key ? "border-white bg-white text-black font-medium" : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10")}
                    >
                      {tr(f.nom, lang)}
                    </button>
                  ))}
                </div>
                {formule && tr(formule.description, lang) && <p className="mt-2 text-xs text-white/45 font-body font-light">{tr(formule.description, lang)}</p>}
              </div>
              {prestaGroups.length > 0 && (
                <div className="mb-3">
                  <label className="block">
                    <span className="text-xs font-medium tracking-wide text-white/75 font-body">{t("contact.presta.label")}</span>
                    <select className="glass-field mt-1.5" value={selectedPresta?.id ?? ""} onChange={(e) => { setWantedPresta(e.target.value || null); setOptIds([]); }} aria-label={t("contact.presta.label")}>
                      <option value="">{t("contact.presta.none")}</option>
                      {prestaGroups.map((g) => (
                        <optgroup key={g.service.key} label={tr(g.service.nom, lang)}>
                          {g.prestations.map((p) => <option key={p.id} value={p.id}>{tr(p.nom, lang)}{p.tarif ? ` — ${tr(p.tarif, lang)}` : ""}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                  {selectedPresta && (
                    <div className="mt-2 text-xs text-white/55 font-body font-light space-y-0.5" data-testid="presta-detail">
                      {tr(selectedPresta.description, lang) && <p>{tr(selectedPresta.description, lang)}</p>}
                      {selectedPresta.tarif && <p>{t("presta.tarif")} : <span className="text-white/85">{tr(selectedPresta.tarif, lang)}</span></p>}
                      {selectedPresta.delai && <p>{t("presta.delai")} : <span className="text-white/85">{tr(selectedPresta.delai, lang)}</span></p>}
                      {selectedPresta.formatDuree && <p>{t("presta.format")} : <span className="text-white/85">{tr(selectedPresta.formatDuree, lang)}</span></p>}
                      {selectedPresta.options.some((o) => o.mode === "info") && <p>{t("presta.options.info")} : <span className="text-white/85">{selectedPresta.options.filter((o) => o.mode === "info").map((o) => `${tr(o.nom, lang)}${o.prix ? ` (${o.prix})` : ""}`).join(", ")}</span></p>}
                      {selectedPresta.options.some((o) => o.mode === "select") && (
                        <fieldset className="pt-2" data-testid="presta-options">
                          <legend className="text-xs font-medium tracking-wide text-white/75 font-body">{t("presta.options.choose")}</legend>
                          {selectedPresta.options.filter((o) => o.mode === "select").map((o) => (
                            <label key={o.id} className="mt-1.5 flex items-start gap-2 text-sm text-white/80 font-body">
                              <input type="checkbox" className="mt-1" checked={optIds.includes(o.id)} onChange={(e) => setOptIds((cur) => (e.target.checked ? [...cur, o.id] : cur.filter((x) => x !== o.id)))} />
                              <span>{tr(o.nom, lang)}{o.prix && <span className="text-white/60"> ({o.prix})</span>}{o.description && <span className="block text-xs text-white/45">{tr(o.description, lang)}</span>}{o.conditions && <span className="block text-[11px] text-white/35">{tr(o.conditions, lang)}</span>}</span>
                            </label>
                          ))}
                        </fieldset>
                      )}
                      {selectedPresta.conditions && <p className="pt-1">{t("presta.conditions")} : <span className="text-white/70">{tr(selectedPresta.conditions, lang)}</span></p>}
                      <p className="pt-1 text-white/40">{t("contact.presta.note")}</p>
                    </div>
                  )}
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium tracking-wide text-white/75 font-body">{t("contact.name")} *</span>
                  <input className="glass-field mt-1" placeholder={t("contact.name")} value={form.name} onChange={set("name")} required autoComplete="name" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium tracking-wide text-white/75 font-body">{t("contact.email")} *</span>
                  <input
                    className={cn("glass-field mt-1", emailLocked && "opacity-70 cursor-not-allowed")}
                    type="email" placeholder={t("contact.email")} value={form.email} onChange={set("email")} required
                    readOnly={emailLocked} aria-readonly={emailLocked} autoComplete="email"
                  />
                </label>
              </div>
              <label className="block mt-3">
                <span className="text-xs font-medium tracking-wide text-white/75 font-body">{t("contact.brand")}{formule?.requiresBrand ? " *" : ""}</span>
                <input
                  className="glass-field mt-1"
                  placeholder={t("contact.brand")}
                  value={form.company}
                  onChange={set("company")}
                  required={!!formule?.requiresBrand}
                  maxLength={120}
                />
              </label>
              {questions.map((q: QuestionCfg, idx: number) => {
                const label = tr(q.label, lang);
                let field;
                if (q.kind === "slider" && q.slider) {
                  field = (
                    <DurationSlider
                      label={label} min={q.slider.min} max={q.slider.max} step={q.slider.step}
                      value={Number(details[q.name] ?? q.slider.default)} onChange={(v) => setDetailValue(q.name, String(v))} ariaLabel={label}
                    />
                  );
                } else if (isSegmented(q)) {
                  field = (
                    <Segmented
                      label={label} value={details[q.name] ?? ""} required={q.required} onChange={(v) => setDetailValue(q.name, v)}
                      options={(q.options ?? []).map((o) => ({ value: o.value, label: tr(o.label, lang) }))}
                    />
                  );
                } else {
                  field = (
                    <label className="block mt-3">
                      <span className="text-xs font-medium tracking-wide text-white/75 font-body">{label}{q.required ? " *" : ""}</span>
                      {q.kind === "select" ? (
                        <select className="glass-field mt-1" value={details[q.name] ?? ""} onChange={setDetail(q.name)} required={q.required}>
                          <option value="">{t("contact.choose")}</option>
                          {(q.options ?? []).map((o) => <option key={o.value} value={o.value}>{tr(o.label, lang)}</option>)}
                        </select>
                      ) : q.kind === "long" ? (
                        <textarea className="glass-field mt-1 min-h-20 resize-none" placeholder={tr(q.placeholder, lang)} value={details[q.name] ?? ""} onChange={setDetail(q.name)} required={q.required} maxLength={1000} />
                      ) : (
                        <input className="glass-field mt-1" placeholder={tr(q.placeholder, lang)} value={details[q.name] ?? ""} onChange={setDetail(q.name)} required={q.required} maxLength={200} />
                      )}
                    </label>
                  );
                }
                return (
                  <div key={q.name}>
                    {field}
                    {idx === questions.reduce((acc, x, i) => (x.role ? i : acc), -1) && <p className="mt-2 text-xs text-white/45 font-body font-light leading-relaxed">{t("contact.duree.note")}</p>}
                  </div>
                );
              })}
              <label className="block mt-3">
                <span className="text-xs font-medium tracking-wide text-white/75 font-body">{t("contact.extra")}</span>
                <textarea className="glass-field mt-1 min-h-20 resize-none" value={form.message} onChange={set("message")} maxLength={3000} />
              </label>
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
                <button type="button" onClick={resend} disabled={busy || cooldown > 0} className="text-xs text-white/50 hover:text-white font-body transition-colors disabled:opacity-50">
                  {cooldown > 0 ? t("contact.verify.resend.wait", { s: String(cooldown) }) : t("contact.verify.resend")}
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
              <p className="mt-3 text-sm text-white/55 font-body font-light max-w-md mx-auto">{verifiedUser ? t("contact.done.account") : t("contact.done.desc")}</p>
              {ref && <p className="mt-3 text-xs text-white/70 font-body">Ref : <span className="font-medium text-white">{ref}</span></p>}
              {sent && (
                <div className="mt-4 mx-auto max-w-sm liquid-glass rounded-2xl p-4 text-left text-xs font-body text-white/65 space-y-1">
                  <p className="text-sm font-medium text-white">{t("contact.recap.title")}</p>
                  <p>{t("contact.formule.label")} : <span className="text-white">{sent.formule}</span></p>
                  {sent.prestation && <p>{t("contact.recap.presta")} : <span className="text-white">{sent.prestation}</span></p>}
                  {sent.options.length > 0 && <p>{t("contact.recap.options")} : <span className="text-white">{sent.options.join(", ")}</span></p>}
                  {sent.prefs.map((p) => <p key={p.label}>{p.label} : <span className="text-white">{p.value}</span></p>)}
                  {sent.prefs.length > 0 && <p className="pt-1 text-white/40 font-light">{t("contact.duree.note")}</p>}
                </div>
              )}
              <button
                onClick={() => { setStep("form"); setForm((f) => ({ ...f, message: "" })); touched.current.clear(); setDetails(defaultDetailsFor(formule)); setSent(null); setCodeInput(""); }}
                className="mt-5 liquid-glass rounded-full px-6 py-2.5 text-sm font-medium text-white font-body hover:bg-white/10 transition-colors"
              >
                {t("contact.done.again")}
              </button>
            </div>
          )}

          <div aria-live="polite">
            {account && step === "form" && (
              <p className="mt-3 text-xs text-white/55 font-body text-center">
                {t("contact.account.note", { name: account.name })}{" "}
                <button type="button" className="underline hover:text-white" onClick={() => void logoutAccount().then(() => navigate("login"))}>{t("contact.account.switch")}</button>
              </p>
            )}
            {error && (
              <p className="mt-3 text-xs text-red-300 font-body text-center">
                {error}{" "}
                <button type="button" className="underline hover:text-red-200" onClick={() => navigate("diagnostic")}>{t("diag.link")}</button>
              </p>
            )}
            {info && <p className="mt-3 text-xs text-emerald-300/90 font-body text-center">{info}</p>}
            {verifiedUser && step === "form" && <p className="mt-3 text-xs text-emerald-300/90 font-body text-center">{t("contact.signedin")}</p>}
            {busy && slow && <p className="mt-3 text-xs text-white/55 font-body text-center">{t("contact.waking")}</p>}
          </div>
        </div>
        </div>
      </div>
    </Page>
  );
}
