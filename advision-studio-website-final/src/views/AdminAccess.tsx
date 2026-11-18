import { useCallback, useEffect, useState } from "react";
import LoadState from "@/components/LoadState";
import { ApiError } from "@/lib/api";
import {
  anonymizePerson, disable2fa, enable2fa, exportPersonData, get2fa, getRgpdPolicy, listAdminSessions, regenerateRecoveryCodes, revokeAdminSession, revokeOtherSessions, setup2fa,
  type AdminSessionRow,
} from "@/lib/admin";
import { cn } from "@/utils/cn";
import { ta, taServer } from "@/lib/adminI18n";

/**
 * Onglet « Accès et données » (Phase 5) : double authentification (TOTP + codes de récupération), sessions actives (révocation), données personnelles (export / anonymisation).
 * Le serveur contrôle tout (codes, verrouillage, journal d'audit) : cet écran ne fait que présenter.
 */
const btn = "rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-body text-white/80 hover:bg-white/10 transition-colors disabled:opacity-40";
const lab = "block text-[11px] uppercase tracking-widest text-white/40 font-body";
const card = "liquid-glass-strong rounded-2xl p-5 space-y-3";
const group = (s: string) => s.replace(/(.{4})/g, "$1 ").trim();
const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

function downloadJson(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

export default function AccessTab({ onExpired, forceSetup }: { onExpired: () => void; forceSetup: boolean }) {
  const [st, setSt] = useState<{ enabled: boolean; recoveryLeft: number; required: boolean } | null>(null);
  const [sessions, setSessions] = useState<AdminSessionRow[]>([]);
  const [retention, setRetention] = useState<number>(0);
  const [load, setLoad] = useState<"loading" | "ok" | "error">("loading");
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState(""); const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const [email, setEmail] = useState(""); const [anonRes, setAnonRes] = useState("");

  const fail = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) { onExpired(); return; }
    setErr(e instanceof ApiError && e.status ? taServer(e.message) : ta("Serveur injoignable, réessayez."));
  }, [onExpired]);
  const refresh = useCallback(async () => {
    try { const [a, b, c] = await Promise.all([get2fa(), listAdminSessions(), getRgpdPolicy()]); setSt(a); setSessions(b); setRetention(c.retentionMonths); setLoad("ok"); }
    catch (e) { fail(e); setLoad((l) => (l === "ok" ? "ok" : "error")); }
  }, [fail]);
  useEffect(() => { void refresh(); }, [refresh]);

  const act = async (fn: () => Promise<void>) => { setBusy(true); setErr(""); setMsg(""); try { await fn(); } catch (e) { fail(e); } finally { setBusy(false); } };
  if (load !== "ok" || !st) return <LoadState state={load === "ok" ? "loading" : load} onRetry={() => { setLoad("loading"); void refresh(); }} />;

  return (
    <div className="max-w-3xl space-y-5">
      {forceSetup && <p role="alert" className="rounded-xl border border-amber-300/40 bg-amber-300/10 p-3 text-sm text-amber-200 font-body">{ta("La double authentification est obligatoire sur ce serveur : activez-la ci-dessous pour accéder au reste de l'administration.")}</p>}

      <section className={card} aria-label={ta("Double authentification")}>
        <h2 className="font-heading italic text-2xl text-white leading-none">{ta("Double authentification")}</h2>
        {!st.enabled && !setup && !codes && (
          <>
            <p className="text-sm text-white/65 font-body">{ta("Ajoute un code à 6 chiffres (application d'authentification : Google Authenticator, Microsoft Authenticator, Aegis, 1Password…) à votre mot de passe. Statut :")} <b className="text-amber-300">{ta("désactivée")}</b>.</p>
            <button type="button" className={btn} disabled={busy} onClick={() => void act(async () => { setSetup(await setup2fa()); setCode(""); })}>{ta("Activer la double authentification")}</button>
          </>
        )}
        {setup && (
          <div className="space-y-2">
            <p className="text-sm text-white/70 font-body">{ta("1. Dans votre application, ajoutez un compte")} <b>{ta("par saisie manuelle")}</b> {ta("avec cette clé (ou ouvrez le lien depuis votre téléphone) :")}</p>
            <p className="font-mono text-lg text-white tracking-wider select-all" data-testid="totp-secret">{group(setup.secret)}</p>
            <a href={setup.uri} className="text-xs text-white/60 underline underline-offset-4">{ta("Ouvrir dans l'application d'authentification")}</a>
            <label className="block"><span className={lab}>{ta("2. Code à 6 chiffres affiché par l'application")}</span>
              <input className="glass-field mt-1 max-w-[12rem]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label={ta("Code de vérification")} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></label>
            <div className="flex gap-2">
              <button type="button" className={btn} disabled={busy || code.length !== 6} onClick={() => void act(async () => { const r = await enable2fa(code); setCodes(r.recoveryCodes); setSetup(null); setCode(""); setMsg(ta("Double authentification activée.")); await refresh(); })}>{ta("Confirmer et activer")}</button>
              <button type="button" className={btn} onClick={() => { setSetup(null); setCode(""); }}>{ta("Annuler")}</button>
            </div>
          </div>
        )}
        {codes && (
          <div className="rounded-xl border border-emerald-300/30 bg-emerald-300/5 p-3 space-y-2" data-testid="recovery-codes">
            <p className="text-sm text-emerald-200 font-body">{ta("Codes de récupération —")} <b>{ta("affichés une seule fois")}</b>{ta(". Conservez-les hors de cet appareil (gestionnaire de mots de passe, papier) : chacun ne sert qu'une fois si vous perdez votre téléphone.")}</p>
            <ul className="grid grid-cols-2 gap-x-6 font-mono text-sm text-white">{codes.map((c) => <li key={c}>{c}</li>)}</ul>
            <div className="flex gap-2">
              <button type="button" className={btn} onClick={() => void navigator.clipboard?.writeText(codes.join("\n"))}>{ta("Copier")}</button>
              <button type="button" className={btn} onClick={() => downloadJson("codes-de-recuperation.json", { codes })}>{ta("Télécharger")}</button>
              <button type="button" className={btn} onClick={() => setCodes(null)}>{ta("J'ai conservé ces codes")}</button>
            </div>
          </div>
        )}
        {st.enabled && !setup && (
          <div className="space-y-2">
            <p className="text-sm text-white/65 font-body">{ta("Statut :")} <b className="text-emerald-300">{ta("activée")}</b> · {st.recoveryLeft} {ta("code(s) de récupération restant(s)")}{st.required ? ta(" · obligatoire sur ce serveur") : ""}.</p>
            <label className="block"><span className={lab}>{ta("Code à 6 chiffres actuel (pour régénérer les codes")}{st.required ? "" : ta(" ou désactiver")})</span>
              <input className="glass-field mt-1 max-w-[12rem]" inputMode="numeric" maxLength={6} aria-label={ta("Code actuel")} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btn} disabled={busy || code.length !== 6} onClick={() => void act(async () => { const r = await regenerateRecoveryCodes(code); setCodes(r.recoveryCodes); setCode(""); await refresh(); })}>{ta("Régénérer les codes de récupération")}</button>
              {!st.required && <button type="button" className={cn(btn, "text-red-300")} disabled={busy || code.length !== 6} onClick={() => { if (window.confirm(ta("Désactiver la double authentification ?"))) void act(async () => { await disable2fa(code); setCode(""); setMsg(ta("Double authentification désactivée.")); await refresh(); }); }}>{ta("Désactiver")}</button>}
            </div>
            <p className="text-[11px] text-white/40 font-body">{ta("Téléphone perdu et plus de codes ? Ajoutez votre identifiant dans la variable ADMIN_2FA_RESET de Render, redémarrez, puis retirez-la (voir le guide de déploiement).")}</p>
          </div>
        )}
      </section>

      <section className={card} aria-label={ta("Sessions actives")}>
        <h2 className="font-heading italic text-2xl text-white leading-none">{ta("Sessions actives")}</h2>
        <ul className="space-y-1.5 text-sm font-body text-white/75">
          {sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2" data-testid="session-row">
              <span className="flex-1 min-w-40">{s.user}{s.current && <b className="ml-2 text-emerald-300 text-xs">{ta("cette session")}</b>}<span className="block text-[11px] text-white/40">{ta("connecté")} {when(s.createdAt)} {ta("· actif")} {when(s.lastSeenAt)}{s.twoFactor ? " · 2FA" : ""}{s.ip ? ` · ${s.ip}` : ""}</span></span>
              {!s.current && <button type="button" className={cn(btn, "text-red-300")} disabled={busy} onClick={() => void act(async () => { await revokeAdminSession(s.id); setMsg(ta("Session fermée.")); await refresh(); })}>{ta("Fermer")}</button>}
            </li>
          ))}
        </ul>
        {sessions.length > 1 && <button type="button" className={btn} disabled={busy} onClick={() => void act(async () => { const r = await revokeOtherSessions(); setMsg(ta("{0} autre(s) session(s) fermée(s).", [r.revoked])); await refresh(); })}>{ta("Fermer toutes les autres sessions")}</button>}
        <p className="text-[11px] text-white/40 font-body">{ta("Les sessions durent 12 h d'inactivité et survivent aux redémarrages du serveur ; fermer une session est immédiat (≤ 10 s sur toutes les instances).")}</p>
      </section>

      <section className={card} aria-label={ta("Données personnelles")}>
        <h2 className="font-heading italic text-2xl text-white leading-none">{ta("Données personnelles (RGPD)")}</h2>
        <p className="text-xs text-white/55 font-body">{ta("Exporter ou anonymiser les données d'une personne à partir de son adresse e-mail. L'anonymisation efface son identité (nom, contact, compte, codes) ; les demandes et projets sont conservés sans identité (archivage). Les messages déjà échangés dans les tickets Discord ne sont pas modifiés.")}</p>
        <p className="text-xs text-white/45 font-body">{ta("Conservation automatique : codes et sessions périmés purgés en continu ; demandes traitées anonymisées après")} {retention ? `${retention} mois` : ta("— (aucune durée définie : variable RETENTION_DEMANDES_MONTHS)")}.</p>
        <input className="glass-field max-w-sm" type="email" placeholder={ta("adresse e-mail de la personne")} aria-label={ta("E-mail de la personne")} value={email} onChange={(e) => { setEmail(e.target.value); setAnonRes(""); }} />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} disabled={busy || !email.includes("@")} onClick={() => void act(async () => { downloadJson("export-donnees.json", await exportPersonData(email.trim())); setMsg(ta("Export téléchargé.")); })}>{ta("Exporter ses données")}</button>
          <button type="button" className={cn(btn, "text-red-300")} disabled={busy || !email.includes("@")} onClick={() => { if (window.confirm(ta("Anonymiser l'identité de {0} (demandes, avis, compte, codes) ? Irréversible.", [email]))) void act(async () => { const r = await anonymizePerson(email.trim(), "identite"); setAnonRes(ta("{0} demande(s) et {1} avis anonymisé(s){2}.", [r.demandes, r.avis, r.accountDeleted ? ta(", compte supprimé") : ""])); }); }}>{ta("Anonymiser l'identité")}</button>
          <button type="button" className={cn(btn, "text-red-300")} disabled={busy || !email.includes("@")} onClick={() => { if (window.confirm(ta("Anonymisation COMPLÈTE pour {0} : l'identité ET le texte libre des demandes sont effacés. Irréversible.", [email]))) void act(async () => { const r = await anonymizePerson(email.trim(), "complet"); setAnonRes(ta("{0} demande(s) et {1} avis anonymisé(s) (complet){2}.", [r.demandes, r.avis, r.accountDeleted ? ta(", compte supprimé") : ""])); }); }}>{ta("Anonymisation complète")}</button>
        </div>
        {anonRes && <p className="text-xs text-emerald-300/90 font-body" data-testid="anon-result">{anonRes}</p>}
      </section>

      <div aria-live="polite">
        {msg && <p className="text-xs text-emerald-300/90 font-body">{msg}</p>}
        {err && <p role="alert" className="text-xs text-red-300 font-body">{err}</p>}
      </div>
    </div>
  );
}
