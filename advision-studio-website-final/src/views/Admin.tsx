import { useCallback, useEffect, useState, type FormEvent, type ReactNode, useReducer } from "react";
import { Eye, EyeOff, LogOut, Pencil, Plus, ShieldCheck, Star } from "lucide-react";
import Page from "@/components/Page";
import LoadState from "@/components/LoadState";
import { useI18n } from "@/lib/i18n";
import { API_URL, ApiError } from "@/lib/api";
import {
  getToken, login, loginSecondFactor, logout, clearToken, getSessionInfo, listAdminWork, createWork, updateWork,
  listAdminReviews, moderateReview,
  listRequests, updateRequest, REQUEST_STATUTS, getSettings, getChoices, saveSettings, getSystem, testNotify, testEmail,
  listAbsences, updateAbsence, ABSENCE_STATUTS, getConfig, saveConfig,
  type AdminWork, type AdminReview, type WorkInput, type ReviewAction, type AdminRequest, type StudioSettings, type DiscordChoices, type SystemStatus, type AdminAbsence,
} from "@/lib/admin";
import { cn } from "@/utils/cn";
import ChannelsTab from "@/views/AdminChannels";
import CatalogueTab from "@/views/AdminCatalogue";
import PrestationsTab from "@/views/AdminPrestations";
import ProjetsTab from "@/views/AdminProjets";
import AccessTab from "@/views/AdminAccess";
import { useCatalogue } from "@/lib/catalogue";
import { ta, taServer, getAdminLang, setAdminLang } from "@/lib/adminI18n";

/**
 * Administration du site — réservée à l'équipe. Les deux onglets agissent sur la MÊME base que Discord :
 *  • réalisation ajoutée/modifiée/masquée ici → l'embed du salon Discord est posté/modifié/retiré automatiquement (aucune suppression définitive)
 *  • avis → modération ici = modération Discord (et inversement), publication dans le salon des avis à l'approbation
 */

// Types HISTORIQUES de réalisations : conservés pour afficher les anciennes. Les nouvelles se rattachent à un service du catalogue (svc:<clé>).
const types = () => [
  ["produit", ta("Publicité produit")], ["marque", ta("Publicité de marque")], ["promo", ta("Vidéo promotionnelle")],
  ["concept", ta("Concept créatif")], ["social", ta("Format réseaux sociaux")], ["autre", ta("Autre")],
] as const;

type Tab = "requests" | "work" | "reviews" | "absences" | "catalogue" | "prestations" | "projets" | "access" | "channels" | "security" | "settings" | "status";

const EMPTY: WorkInput = {
  titre: "", type: "produit", marque: "", description: "", videoUrl: "", imageUrl: "",
  format: "", duree: "", origine: "client", featured: false, postDiscord: true,
};

const discordLabel = (k: string): string => ({
  posted: ta("✅ Publiée dans Discord"), updated: ta("✅ Message Discord mis à jour"), removed: ta("✅ Retirée de Discord"),
  failed: ta("⚠️ Enregistrée, mais Discord n'a pas pu être mis à jour (salon introuvable ou permissions)"), none: "",
} as Record<string, string>)[k] ?? "";

/** Sélecteur de langue de l'administration (FR/EN) : conservé dans ce navigateur ; ne réinitialise aucun formulaire (simple nouveau rendu). */
function AdminLangSwitch({ onChange }: { onChange: () => void }) {
  const cur = getAdminLang();
  return (
    <div className="inline-flex rounded-full border border-white/15 p-0.5" role="group" aria-label="Language / Langue">
      {(["fr", "en"] as const).map((l) => (
        <button key={l} type="button" aria-pressed={cur === l} onClick={() => { setAdminLang(l); onChange(); }}
          className={"rounded-full px-3 py-1 text-xs font-body transition-colors " + (cur === l ? "bg-white text-black font-medium" : "text-white/70 hover:text-white")}>{l.toUpperCase()}</button>
      ))}
    </div>
  );
}

export default function Admin() {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const { t } = useI18n();
  const [authed, setAuthed] = useState<boolean>(() => !!getToken());
  const [mustSetup, setMustSetup] = useState(false);
  // Callbacks stables : évitent de relancer les chargements à chaque rendu du parent
  const onLogout = useCallback(() => { void logout(); setAuthed(false); }, []);
  const onExpired = useCallback(() => { clearToken(); setAuthed(false); }, []);

  return (
    <Page title={t("admin.title")} wide>
      <div className="flex justify-end -mt-2 mb-3"><AdminLangSwitch onChange={rerender} /></div>
      {!API_URL ? (
        <p className="text-sm text-red-300 font-body">{ta("VITE_API_URL n'est pas configuré.")}</p>
      ) : authed ? (
        <Panel onLogout={onLogout} onExpired={onExpired} mustSetup={mustSetup} />
      ) : (
        <Login onDone={(must) => { setMustSetup(must); setAuthed(true); }} />
      )}
    </Page>
  );
}

function Login({ onDone }: { onDone: (mustSetup2fa: boolean) => void }) {
  const [pwd, setPwd] = useState("");
  const [user, setUser] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<string | null>(null);   // étape 2 : code de double authentification attendu
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  const explain = (x: unknown) => (x instanceof ApiError && x.status ? taServer(x.message) : ta("Serveur injoignable — il se réveille peut-être, réessayez dans quelques secondes."));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(""); setNote("");
    try {
      if (challenge) {
        const r = await loginSecondFactor(challenge, code.trim());
        if (r.recoveryUsed) setNote(ta("Code de récupération utilisé : {0} restant(s).", [r.recoveryLeft ?? 0]));
        onDone(false);
      } else {
        const r = await login(pwd, user);
        if (r.twoFactorRequired) { setChallenge(r.challenge ?? null); setPwd(""); }
        else onDone(!!r.mustSetup2fa);
      }
    } catch (x) {
      if (x instanceof ApiError && challenge && (x.data["code"] === "expired" || x.data["code"] === "locked")) { setChallenge(null); setCode(""); }
      setErr(explain(x));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 flex items-start justify-center">
      <form onSubmit={submit} className="liquid-glass-strong rounded-3xl p-6 md:p-8 w-full max-w-sm text-center">
        <ShieldCheck className="h-6 w-6 text-white/60 mx-auto" aria-hidden="true" />
        <p className="mt-3 text-sm text-white/55 font-body font-light">{challenge ? ta("Double authentification : saisissez le code à 6 chiffres de votre application (ou un code de récupération).") : ta("Espace équipe · connexion vérifiée par le serveur.")}</p>
        {!challenge ? (
          <>
            <input
              type="text"
              autoComplete="username"
              className="glass-field mt-5"
              placeholder={ta("Identifiant (si votre équipe en utilise)")}
              aria-label={ta("Identifiant (facultatif)")}
              value={user}
              onChange={(e) => setUser(e.target.value)}
              maxLength={30}
            />
            <input
              type="password"
              autoComplete="current-password"
              className="glass-field mt-3"
              placeholder={ta("Mot de passe")}
              aria-label={ta("Mot de passe")}
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              required
            />
          </>
        ) : (
          <input
            type="text"
            inputMode="text"
            autoComplete="one-time-code"
            className="glass-field mt-5 text-center tracking-widest"
            placeholder="123456"
            aria-label={ta("Code de double authentification")}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={20}
            required
            autoFocus
          />
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full bg-white text-black rounded-full px-6 py-2.5 text-sm font-medium font-body hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          {busy ? ta("Connexion…") : challenge ? ta("Valider le code") : "Se connecter"}
        </button>
        {challenge && <button type="button" onClick={() => { setChallenge(null); setCode(""); setErr(""); }} className="mt-2 text-xs text-white/50 underline underline-offset-4">{ta("Recommencer")}</button>}
        {note && <p className="mt-3 text-xs text-emerald-300 font-body">{note}</p>}
        {err && <p role="alert" className="mt-3 text-xs text-red-300 font-body">{err}</p>}
      </form>
    </div>
  );
}

function Panel({ onLogout, onExpired, mustSetup }: { onLogout: () => void; onExpired: () => void; mustSetup: boolean }) {
  const [tab, setTab] = useState<Tab>(mustSetup ? "access" : "requests");
  const [locked, setLocked] = useState(mustSetup);        // 2FA obligatoire et pas encore activée : seul l'onglet « Accès » est ouvert
  useEffect(() => { void getSessionInfo().then((s) => { setLocked(s.mustSetup2fa); if (s.mustSetup2fa) setTab("access"); }).catch(() => {}); }, []);
  const tabBtn = (id: Tab, label: string) => (
    <button
      disabled={locked && id !== "access"}
      onClick={() => setTab(id)}
      aria-pressed={tab === id}
      className={cn(
        "px-4 py-1.5 rounded-full text-sm font-body transition-colors",
        tab === id ? "bg-white text-black font-medium" : "text-white/70 hover:text-white hover:bg-white/10"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="liquid-glass rounded-full p-1 flex gap-1">
          {tabBtn("requests", ta("Demandes"))}
          {tabBtn("work", ta("Réalisations"))}
          {tabBtn("reviews", ta("Avis"))}
          {tabBtn("absences", ta("Absences"))}
          {tabBtn("catalogue", ta("Catalogue"))}
          {tabBtn("prestations", ta("Prestations"))}
          {tabBtn("projets", ta("Projets"))}
          {tabBtn("channels", ta("Salons"))}
          {tabBtn("security", ta("Sécurité"))}
          {tabBtn("access", ta("Accès et données"))}
          {tabBtn("settings", ta("Réglages"))}
          {tabBtn("status", ta("État"))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onLogout} className="liquid-glass rounded-full px-4 py-1.5 text-xs text-white/80 font-body inline-flex items-center gap-1.5 hover:bg-white/10">
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> {ta("Déconnexion")}
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-slim pr-1">
        {tab === "requests" && <RequestsTab onExpired={onExpired} />}
        {tab === "work" && <WorkTab onExpired={onExpired} />}
        {tab === "reviews" && <ReviewsTab onExpired={onExpired} />}
        {tab === "absences" && <AbsencesTab onExpired={onExpired} />}
        {tab === "catalogue" && <CatalogueTab onExpired={onExpired} />}
        {tab === "prestations" && <PrestationsTab onExpired={onExpired} />}
        {tab === "projets" && <ProjetsTab onExpired={onExpired} />}
        {tab === "access" && <AccessTab onExpired={onExpired} forceSetup={locked} />}
        {tab === "channels" && <ChannelsTab onExpired={onExpired} />}
        {tab === "security" && <SecurityTab onExpired={onExpired} />}
        {tab === "settings" && <SettingsTab onExpired={onExpired} />}
        {tab === "status" && <StatusTab onExpired={onExpired} />}
      </div>
    </div>
  );
}

/** Message lisible pour une erreur d'API ; déclenche la déconnexion si le jeton a expiré. */
function useFail(onExpired: () => void, setMsg: (m: string) => void) {
  return useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) { onExpired(); return; }
    setMsg(e instanceof ApiError && e.status ? taServer(e.message) : ta("Serveur injoignable, réessayez."));
  }, [onExpired, setMsg]);
}

function WorkTab({ onExpired }: { onExpired: () => void }) {
  const { catalogue } = useCatalogue();
  const [items, setItems] = useState<AdminWork[]>([]);
  const [load, setLoad] = useState<"loading" | "ok" | "error">("loading");
  const [form, setForm] = useState<WorkInput>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const fail = useFail(onExpired, setErr);

  const refresh = useCallback(() => {
    setLoad("loading");
    listAdminWork().then((r) => { setItems(r); setLoad("ok"); }).catch((e) => { fail(e); setLoad("error"); });
  }, [fail]);
  useEffect(refresh, [refresh]);

  const set = <K extends keyof WorkInput>(k: K, v: WorkInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const reset = () => { setForm(EMPTY); setEditing(null); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(""); setErr("");
    try {
      const r = editing ? await updateWork(editing, form) : await createWork(form);
      setMsg(editing ? ta("Modifiée. {0}", [discordLabel(r.discord ?? "none")]) : ta("Ajoutée et visible sur le site. {0}", [discordLabel(r.discord ?? "none")]));
      reset();
      refresh();
    } catch (x) { fail(x); } finally { setBusy(false); }
  };

  const edit = (w: AdminWork) => {
    setEditing(w.id);
    setForm({
      titre: w.titre, type: w.type, marque: w.marque ?? "", description: w.description ?? "", videoUrl: w.videoUrl ?? "",
      imageUrl: w.imageUrl ?? "", format: w.format ?? "", duree: w.duree ?? "", origine: w.origine, featured: w.featured, postDiscord: true,
    });
  };

  const patch = async (id: string, body: { published?: boolean; featured?: boolean }) => {
    setMsg(""); setErr("");
    try {
      const r = await updateWork(id, body);
      setMsg(discordLabel(r.discord ?? "none") || ta("Mise à jour effectuée."));
      refresh();
    } catch (x) { fail(x); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
      <form onSubmit={submit} className="liquid-glass-strong rounded-2xl p-5 md:p-6 self-start">
        <h2 className="font-heading italic text-2xl text-white leading-none">{editing ? ta("Modifier la réalisation") : ta("Ajouter une réalisation")}</h2>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <input className="glass-field sm:col-span-2" placeholder={ta("Titre *")} aria-label={ta("Titre")} value={form.titre} onChange={(e) => set("titre", e.target.value)} required maxLength={120} />
          <select className="glass-field" aria-label={ta("Type")} value={form.type} onChange={(e) => set("type", e.target.value)}>
            <optgroup label={ta("Service du catalogue")}>
                {catalogue.services.map((s) => <option key={s.key} value={`svc:${s.key}`}>{s.nom.fr}</option>)}
              </optgroup>
              <optgroup label={ta("Autre type")}>
                {types().map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </optgroup>
          </select>
          <input className="glass-field" placeholder={ta("Marque / client")} aria-label={ta("Marque")} value={form.marque} onChange={(e) => set("marque", e.target.value)} maxLength={120} />
          <textarea className="glass-field sm:col-span-2 min-h-20 resize-none" placeholder={ta("Description courte")} aria-label={ta("Description")} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={600} />
          <input className="glass-field" type="url" placeholder={ta("Lien vidéo https://…")} aria-label={ta("Lien vidéo")} value={form.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} />
          <input className="glass-field" type="url" placeholder={ta("Miniature https://…")} aria-label={ta("Miniature")} value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
          <select className="glass-field" aria-label={ta("Format")} value={form.format} onChange={(e) => set("format", e.target.value)}>
            <option value="">{ta("Format (facultatif)")}</option>
            <option value="vertical">{ta("Vertical")}</option>
            <option value="horizontal">{ta("Horizontal")}</option>
            <option value="carre">{ta("Carré")}</option>
          </select>
          <input className="glass-field" placeholder={ta("Durée (ex : 15 s)")} aria-label={ta("Durée")} value={form.duree} onChange={(e) => set("duree", e.target.value)} maxLength={20} />
          <select className="glass-field" aria-label={ta("Nature")} value={form.origine} onChange={(e) => set("origine", e.target.value)}>
            <option value="client">{ta("Projet client réel")}</option>
            <option value="demo">{ta("Démonstration interne")}</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70 font-body">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} /> {ta("En vedette")}</label>
          {!editing && <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.postDiscord} onChange={(e) => set("postDiscord", e.target.checked)} /> {ta("Poster aussi sur Discord")}</label>}
        </div>
        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={busy} className="flex-1 bg-white text-black rounded-full px-6 py-2.5 text-sm font-medium font-body hover:bg-white/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" /> {busy ? ta("Envoi…") : editing ? ta("Enregistrer") : ta("Ajouter")}
          </button>
          {editing && <button type="button" onClick={reset} className="liquid-glass rounded-full px-5 text-sm text-white/80 font-body hover:bg-white/10">{ta("Annuler")}</button>}
        </div>
        <div aria-live="polite">
          {msg && <p className="mt-3 text-xs text-emerald-300/90 font-body">{msg}</p>}
          {err && <p role="alert" className="mt-3 text-xs text-red-300 font-body">{err}</p>}
        </div>
      </form>

      <div>
        {load !== "ok" ? (
          <LoadState state={load} onRetry={refresh} />
        ) : items.length === 0 ? (
          <div className="liquid-glass rounded-2xl p-6 text-center text-sm text-white/55 font-body font-light">{ta("Aucune réalisation pour le moment.")}</div>
        ) : (
          <ul className="space-y-3">
            {items.map((w) => (
              <li key={w.id} className="liquid-glass rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-body font-medium text-sm text-white truncate">{w.featured && "⭐ "}{w.titre}</p>
                    <p className="mt-0.5 text-xs text-white/45 font-body">
                      {[w.marque, w.duree, w.format].filter(Boolean).join(" · ") || "—"} · {w.published ? "visible" : ta("masquée")} {ta("· via")} {w.source}
                      {w.discordMessageId ? ta(" · sur Discord") : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <IconBtn label={ta("Modifier")} onClick={() => edit(w)}><Pencil className="h-4 w-4" /></IconBtn>
                    <IconBtn label={w.published ? ta("Masquer") : ta("Afficher")} onClick={() => void patch(w.id, { published: !w.published })}>
                      {w.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </IconBtn>
                    <IconBtn label={w.featured ? ta("Retirer la vedette") : ta("Mettre en vedette")} onClick={() => void patch(w.id, { featured: !w.featured })}>
                      <Star className={cn("h-4 w-4", w.featured && "fill-white")} />
                    </IconBtn>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ReviewsTab({ onExpired }: { onExpired: () => void }) {
  const [items, setItems] = useState<AdminReview[]>([]);
  const [load, setLoad] = useState<"loading" | "ok" | "error">("loading");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const fail = useFail(onExpired, setErr);

  const refresh = useCallback(() => {
    setLoad("loading");
    listAdminReviews().then((r) => { setItems(r); setLoad("ok"); }).catch((e) => { fail(e); setLoad("error"); });
  }, [fail]);
  useEffect(refresh, [refresh]);

  const act = async (id: string, a: ReviewAction) => {
    setMsg(""); setErr("");
    try {
      const r = await moderateReview(id, a);
      setMsg(a === "approve" ? (r.publishedOnDiscord === false ? ta("Approuvé (visible sur le site) — mais Discord a refusé la publication.") : ta("Approuvé : visible sur le site et publié dans Discord.")) : ta("Mis à jour."));
      refresh();
    } catch (x) { fail(x); }
  };

  const pending = items.filter((a) => a.status === "pending");
  const others = items.filter((a) => a.status !== "pending");

  const card = (a: AdminReview) => (
    <li key={a.id} className="liquid-glass rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-body font-medium text-sm text-white">
          {"★".repeat(a.note)}<span className="text-white/25">{"★".repeat(5 - a.note)}</span>{" "}
          <span className="text-white/60 font-light">{a.auteur}</span>
        </p>
        <span className="text-[11px] uppercase tracking-wider text-white/40 font-body">
          {a.source === "site" ? "site" : "discord"} · {a.status === "pending" ? ta("à modérer") : a.status === "approved" ? (a.hidden ? ta("masqué") : ta("publié")) : ta("refusé")}
        </span>
      </div>
      <p className="mt-2 text-sm text-white/65 font-body font-light leading-relaxed">{a.commentaire || "(sans commentaire)"}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {a.status !== "approved" && <SmallBtn onClick={() => void act(a.id, "approve")}>{ta("Approuver et publier")}</SmallBtn>}
        {a.status === "pending" && <SmallBtn onClick={() => void act(a.id, "reject")}>{ta("Refuser")}</SmallBtn>}
        {a.status === "approved" && <SmallBtn onClick={() => void act(a.id, a.hidden ? "show" : "hide")}>{a.hidden ? ta("Afficher") : ta("Masquer")}</SmallBtn>}
        {a.status === "approved" && <SmallBtn onClick={() => void act(a.id, a.featured ? "unfeature" : "feature")}>{a.featured ? ta("Retirer la vedette") : ta("Mettre en vedette")}</SmallBtn>}
        {a.status === "approved" && <SmallBtn onClick={() => void act(a.id, "unpublish")}>{ta("Dépublier")}</SmallBtn>}
      </div>
    </li>
  );

  if (load !== "ok") return <LoadState state={load} onRetry={refresh} />;
  return (
    <div className="space-y-5 max-w-3xl">
      <div aria-live="polite">
        {msg && <p className="text-xs text-emerald-300/90 font-body">{msg}</p>}
        {err && <p role="alert" className="text-xs text-red-300 font-body">{err}</p>}
      </div>
      <section>
        <h2 className="font-heading italic text-2xl text-white leading-none">{ta("À modérer (")}{pending.length})</h2>
        {pending.length === 0 ? <p className="mt-3 text-sm text-white/50 font-body font-light">{ta("Aucun avis en attente.")}</p> : <ul className="mt-3 space-y-3">{pending.map(card)}</ul>}
      </section>
      <section>
        <h2 className="font-heading italic text-2xl text-white leading-none">{ta("Historique")}</h2>
        {others.length === 0 ? <p className="mt-3 text-sm text-white/50 font-body font-light">{ta("Rien pour le moment.")}</p> : <ul className="mt-3 space-y-3">{others.map(card)}</ul>}
      </section>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors">
      {children}
    </button>
  );
}

function SmallBtn({ onClick, children, danger = false }: { onClick: () => void; children: ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("rounded-full px-3.5 py-1.5 text-xs font-body transition-colors", danger ? "bg-red-500/80 text-white hover:bg-red-500" : "liquid-glass text-white/80 hover:bg-white/10")}
    >
      {children}
    </button>
  );
}

const statutLabel = (k: string): string => ({ nouvelle: ta("Nouvelle"), en_cours: ta("En cours"), traitee: ta("Traitée"), refusee: ta("Refusée") } as Record<string, string>)[k] ?? k;

function RequestsTab({ onExpired }: { onExpired: () => void }) {
  const [items, setItems] = useState<AdminRequest[]>([]);
  const [load, setLoad] = useState<"loading" | "ok" | "error">("loading");
  const [statut, setStatut] = useState("");
  const [q, setQ] = useState("");
  const [archived, setArchived] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const fail = useFail(onExpired, setErr);

  const refresh = useCallback(() => {
    setLoad("loading");
    listRequests({ statut, q: q.trim(), archived })
      .then((r) => { setItems(r); setLoad("ok"); })
      .catch((e) => { fail(e); setLoad("error"); });
  }, [statut, q, archived, fail]);
  useEffect(() => {
    const id = setTimeout(refresh, q ? 300 : 0); // petite attente pendant la frappe
    return () => clearTimeout(id);
  }, [refresh, q]);

  const patch = async (id: string, b: { statut?: string; archived?: boolean }) => {
    setErr("");
    try { await updateRequest(id, b); refresh(); } catch (x) { fail(x); }
  };

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex flex-wrap gap-2">
        <input className="glass-field flex-1 min-w-48" placeholder={ta("Rechercher (réf., nom, marque…)")} aria-label={ta("Rechercher")} value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="glass-field w-auto" aria-label={ta("Statut")} value={statut} onChange={(e) => setStatut(e.target.value)}>
          <option value="">{ta("Tous les statuts")}</option>
          {REQUEST_STATUTS.map((s) => <option key={s} value={s}>{statutLabel(s)}</option>)}
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-white/70 font-body px-2">
          <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} /> {ta("Archivées")}
        </label>
      </div>
      <div aria-live="polite">{err && <p role="alert" className="text-xs text-red-300 font-body">{err}</p>}</div>
      {load !== "ok" ? (
        <LoadState state={load} onRetry={refresh} />
      ) : items.length === 0 ? (
        <div className="liquid-glass rounded-2xl p-6 text-center text-sm text-white/55 font-body font-light">{ta("Aucune demande.")}</div>
      ) : (
        <ul className="space-y-3">
          {items.map((d) => (
            <li key={d.id} className="liquid-glass rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button onClick={() => setOpen(open === d.id ? null : d.id)} className="text-left min-w-0" aria-expanded={open === d.id}>
                  <p className="font-body font-medium text-sm text-white truncate">{d.ref} · {d.demandeur ?? "—"}{d.marque ? ` · ${d.marque}` : ""}</p>
                  <p className="text-xs text-white/45 font-body">{new Date(d.createdAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })} {ta("· via")} {d.source}</p>
                </button>
                <div className="flex items-center gap-2">
                  <select className="glass-field w-auto py-1.5 text-xs" aria-label={ta("Statut de {0}", [d.ref])} value={d.statut} onChange={(e) => void patch(d.id, { statut: e.target.value })}>
                    {REQUEST_STATUTS.map((s) => <option key={s} value={s}>{statutLabel(s)}</option>)}
                  </select>
                  <SmallBtn onClick={() => void patch(d.id, { archived: !d.archived })}>{d.archived ? ta("Désarchiver") : ta("Archiver")}</SmallBtn>
                </div>
              </div>
              {open === d.id && (
                <dl className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm font-body">
                  <div><dt className="text-white/40 text-xs">{ta("Contact")}</dt><dd className="text-white/80 break-all">{d.contact ?? "—"}</dd></div>
                  <div><dt className="text-white/40 text-xs">{ta("Format · durée · budget")}</dt><dd className="text-white/80">{[d.format, d.duree, d.budget].filter(Boolean).join(" · ") || "—"}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-white/40 text-xs">{ta("Message")}</dt><dd className="text-white/70 font-light whitespace-pre-wrap">{d.description ?? "—"}</dd></div>
                </dl>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SettingsTab({ onExpired }: { onExpired: () => void }) {
  const [settings, setSettings] = useState<StudioSettings | null>(null);
  const [events, setEvents] = useState<Record<string, string>>({});
  const [load, setLoad] = useState<"loading" | "ok" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const fail = useFail(onExpired, setErr);

  const refresh = useCallback(() => {
    setLoad("loading");
    getSettings()
      .then((s) => { setSettings(s.settings); setEvents(s.events); setLoad("ok"); })
      .catch((e) => { fail(e); setLoad("error"); });
  }, [fail]);
  useEffect(refresh, [refresh]);

  if (load !== "ok" || !settings) return <LoadState state={load === "ok" ? "loading" : load} onRetry={refresh} />;
  const set = <K extends keyof StudioSettings>(k: K, v: StudioSettings[K]) => setSettings((s) => (s ? { ...s, [k]: v } : s));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(""); setErr("");
    try { const r = await saveSettings(settings); setSettings(r.settings); setMsg(ta("Réglages enregistrés.")); } catch (x) { fail(x); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="liquid-glass-strong rounded-2xl p-5 md:p-6 max-w-2xl space-y-4">
      <p className="text-xs text-white/50 font-body font-light">{ta("Les salons Discord (notifications, annonces, avis, réalisations, absences, tickets, logs) et les rôles du staff se règlent dans l'onglet")} <strong className="text-white/80">{ta("Salons")}</strong>.</p>

      <h2 className="font-heading italic text-2xl text-white leading-none">{ta("Notifications")}</h2>
      <div className="grid sm:grid-cols-2 gap-2">
        {Object.entries(events).map(([k, label]) => (
          <label key={k} className="inline-flex items-center gap-2 text-sm text-white/75 font-body">
            <input type="checkbox" checked={settings.notifyEvents[k] !== false} onChange={(e) => set("notifyEvents", { ...settings.notifyEvents, [k]: e.target.checked })} /> {label}
          </label>
        ))}
      </div>

      <h2 className="font-heading italic text-2xl text-white leading-none pt-2">{ta("Liens")}</h2>
      <div className="grid sm:grid-cols-3 gap-3">
        <input className="glass-field" type="url" placeholder={ta("URL du site https://…")} aria-label={ta("URL du site")} value={settings.siteUrl ?? ""} onChange={(e) => set("siteUrl", e.target.value || null)} />
        <input className="glass-field" type="url" placeholder={ta("Invitation Discord https://…")} aria-label={ta("Invitation Discord")} value={settings.discordInviteUrl ?? ""} onChange={(e) => set("discordInviteUrl", e.target.value || null)} />
        <input className="glass-field" placeholder={ta("Contact (https:// ou mailto:)")} aria-label={ta("Contact")} value={settings.contactUrl ?? ""} onChange={(e) => set("contactUrl", e.target.value || null)} />
      </div>

      <button type="submit" disabled={busy} className="w-full bg-white text-black rounded-full px-6 py-2.5 text-sm font-medium font-body hover:bg-white/90 transition-colors disabled:opacity-50">
        {busy ? ta("Enregistrement…") : ta("Enregistrer")}
      </button>
      <div aria-live="polite">
        {msg && <p className="text-xs text-emerald-300/90 font-body">{msg}</p>}
        {err && <p role="alert" className="text-xs text-red-300 font-body">{err}</p>}
      </div>
    </form>
  );
}

function StatusTab({ onExpired }: { onExpired: () => void }) {
  const [s, setS] = useState<SystemStatus | null>(null);
  const [load, setLoad] = useState<"loading" | "ok" | "error">("loading");
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const fail = useFail(onExpired, setErr);

  const refresh = useCallback(() => {
    setLoad("loading");
    getSystem().then((r) => { setS(r); setLoad("ok"); }).catch((e) => { fail(e); setLoad("error"); });
  }, [fail]);
  useEffect(refresh, [refresh]);

  if (load !== "ok" || !s) return <LoadState state={load === "ok" ? "loading" : load} onRetry={refresh} />;

  const row = (ok: boolean, label: string, detail: string, fix?: string) => (
    <li className="flex items-start gap-3">
      <span className={cn("mt-0.5 text-sm", ok ? "text-emerald-300" : "text-red-300")} aria-hidden="true">{ok ? "●" : "○"}</span>
      <div className="min-w-0">
        <p className="text-sm text-white font-body"><span className="font-medium">{label}</span> <span className="text-white/55 font-light">{detail}</span></p>
        {!ok && fix && <p className="text-xs text-amber-200/80 font-body mt-0.5">{fix}</p>}
      </div>
    </li>
  );

  const run = async (name: string, fn: () => Promise<string>) => {
    setBusy(name); setMsg(""); setErr("");
    try { setMsg(await fn()); } catch (x) { fail(x); } finally { setBusy(""); }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="liquid-glass-strong rounded-2xl p-5 md:p-6">
        <h2 className="font-heading italic text-2xl text-white leading-none">{ta("État des services")}</h2>
        <ul className="mt-4 space-y-3">
          {row(s.bot.ok, ta("Bot Discord"), s.bot.ok ? ta("connecté · {0} ms · actif depuis {1} min", [s.bot.ws, s.bot.uptimeMin]) : "hors ligne", ta("Vérifiez DISCORD_TOKEN et les logs Render."))}
          {row(s.db.ok, ta("Base Neon"), s.db.ok ? `${s.db.ms} ms` : "injoignable", ta("Vérifiez DATABASE_URL sur Render."))}
          {row(s.email.ok, "E-mails", s.email.ok ? ta("fournisseur configuré") : ta("NON configurés"), "Renseignez BREVO_API_KEY (ou RESEND_API_KEY) et MAIL_FROM_EMAIL sur Render.")}
          {row(s.notify.ok, ta("Notifications Discord"), s.notify.ok ? `${s.notify.channel} (${s.notify.via})` : "aucun salon", ta("Choisissez un salon dans l'onglet Réglages."))}
          {row(s.realisations.ok, ta("Réalisations Discord"), s.realisations.ok ? `${s.realisations.kind === "forum" ? "forum" : "salon texte"} ${s.realisations.channel} (${s.realisations.via})` : "aucun forum/salon", ta("Créez un forum « réalisations » dans Discord ou choisissez-le dans Réglages."))}
          {s.protection && row(s.protection.perms.manageMessages && s.protection.perms.moderateMembers, ta("Permissions anti-spam / anti-raid"), ta("Gérer les messages {0} · Mettre en sourdine {1} · Expulser {2}", [s.protection.perms.manageMessages ? "✅" : "❌", s.protection.perms.moderateMembers ? "✅" : "❌", s.protection.perms.kickMembers ? "✅" : "❌"]), ta("Donnez ces permissions au bot et placez son rôle au-dessus des membres (Discord → Paramètres du serveur → Rôles)."))}
          {s.protection && row(s.protection.flags.automod && s.protection.flags.antiSpam && s.protection.flags.antiRaid, ta("Protection activée"), s.protection.raid.active ? `🚨 MODE RAID ACTIF (${s.protection.raid.remainingMin} min)` : ta("anti-spam {0} · anti-raid {1} · modération {2}", [s.protection.flags.antiSpam ? "ON" : "OFF", s.protection.flags.antiRaid ? "ON" : "OFF", s.protection.flags.automod ? "ON" : "OFF"]), ta("Onglet Sécurité → activez les interrupteurs, ou /protection activer sur Discord."))}
          {row(s.cors.restreint, ta("Sécurité CORS"), s.cors.restreint ? s.cors.origines.join(", ") : ta("ouvert à tous"), "Renseignez ALLOWED_ORIGINS (URL du site) sur Render.")}
          {row(!!s.proxy.ip, "IP vue par le serveur", ta("{0} — doit être VOTRE adresse publique (sinon toutes les limites anti-spam s'appliquent à tout le monde)", [s.proxy.ip ?? "?"]), ta("Ajustez TRUST_PROXY_HOPS sur Render (1 par défaut)."))}
          {row(s.oauth.google, ta("Connexion Google"), s.oauth.google ? "active" : ta("désactivée"), "Facultatif : GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET.")}
          {row(s.oauth.discord, ta("Connexion Discord"), s.oauth.discord ? "active" : ta("désactivée"), ta("Facultatif : DISCORD_CLIENT_SECRET (+ redirection OAuth2 déclarée)."))}
        </ul>
        <button onClick={refresh} className="mt-4 liquid-glass rounded-full px-4 py-1.5 text-xs text-white/80 font-body hover:bg-white/10">{ta("Actualiser")}</button>
      </div>

      <div className="liquid-glass-strong rounded-2xl p-5 md:p-6 space-y-4">
        <h2 className="font-heading italic text-2xl text-white leading-none">{ta("Tests réels")}</h2>
        <div>
          <button disabled={busy === "n"} onClick={() => void run("n", async () => { const r = await testNotify(); return ta("Message envoyé dans {0} ({1}).", [r.channel, r.via]); })} className="bg-white text-black rounded-full px-5 py-2 text-sm font-medium font-body hover:bg-white/90 disabled:opacity-50">
            {ta("Envoyer un message de test sur Discord")}
          </button>
        </div>
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void run("m", async () => { await testEmail(to.trim()); return ta("E-mail de test envoyé à {0}.", [to.trim()]); }); }}>
          <input className="glass-field flex-1 min-w-48" type="email" required placeholder={ta("Votre adresse e-mail")} aria-label={ta("Adresse de test")} value={to} onChange={(e) => setTo(e.target.value)} />
          <button type="submit" disabled={busy === "m"} className="bg-white text-black rounded-full px-5 py-2 text-sm font-medium font-body hover:bg-white/90 disabled:opacity-50">{ta("Envoyer un e-mail de test")}</button>
        </form>
        <div aria-live="polite">
          {msg && <p className="text-xs text-emerald-300/90 font-body">{msg}</p>}
          {err && <p role="alert" className="text-xs text-red-300 font-body">{err}</p>}
        </div>
      </div>
    </div>
  );
}

const absLabel = (k: string): string => ({ en_attente: ta("En attente"), acceptee: ta("Acceptée"), refusee: ta("Refusée"), prise_en_compte: ta("Prise en compte") } as Record<string, string>)[k] ?? k;

function AbsencesTab({ onExpired }: { onExpired: () => void }) {
  const [items, setItems] = useState<AdminAbsence[]>([]);
  const [load, setLoad] = useState<"loading" | "ok" | "error">("loading");
  const [statut, setStatut] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const fail = useFail(onExpired, setErr);

  const refresh = useCallback(() => {
    setLoad("loading");
    listAbsences(statut).then((r) => { setItems(r); setLoad("ok"); }).catch((e) => { fail(e); setLoad("error"); });
  }, [statut, fail]);
  useEffect(refresh, [refresh]);

  const patch = async (id: string, b: { statut?: string; terminee?: boolean }) => {
    setErr(""); setMsg("");
    try { await updateAbsence(id, b); setMsg(ta("Mis à jour — le post Discord et ses étiquettes suivent.")); refresh(); } catch (x) { fail(x); }
  };
  const day = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className="glass-field w-auto" aria-label={ta("Statut")} value={statut} onChange={(e) => setStatut(e.target.value)}>
          <option value="">{ta("Tous les statuts")}</option>
          {ABSENCE_STATUTS.map((s) => <option key={s} value={s}>{absLabel(s)}</option>)}
        </select>
        <p className="text-xs text-white/45 font-body">{ta("Chaque absence est un post étiqueté dans le forum des absences de Discord (statut + durée). Le motif n'est jamais publié.")}</p>
      </div>
      <div aria-live="polite">
        {msg && <p className="text-xs text-emerald-300/90 font-body">{msg}</p>}
        {err && <p role="alert" className="text-xs text-red-300 font-body">{err}</p>}
      </div>
      {load !== "ok" ? (
        <LoadState state={load} onRetry={refresh} />
      ) : items.length === 0 ? (
        <div className="liquid-glass rounded-2xl p-6 text-center text-sm text-white/55 font-body font-light">{ta("Aucune absence.")}</div>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="liquid-glass rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-body font-medium text-sm text-white truncate">{a.membre ?? a.userId} {a.terminee && <span className="text-white/40 font-light">{ta("· terminée")}</span>}</p>
                  <p className="text-xs text-white/45 font-body">{day(a.dateDebut)} → {day(a.dateRetourPrevue)}{a.threadId ? ta(" · post Discord") : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select className="glass-field w-auto py-1.5 text-xs" aria-label={ta("Statut de l'absence")} value={a.statut} onChange={(e) => void patch(a.id, { statut: e.target.value })}>
                    {ABSENCE_STATUTS.map((s) => <option key={s} value={s}>{absLabel(s)}</option>)}
                  </select>
                  {!a.terminee && <SmallBtn onClick={() => void patch(a.id, { terminee: true })}>{ta("Marquer terminée")}</SmallBtn>}
                </div>
              </div>
              <p className="mt-2 text-xs text-white/50 font-body font-light">{ta("Motif (privé) :")} {a.motif}{a.commentaire ? ` · ${a.commentaire}` : ""}{a.disponibilite ? ta(" · Dispo : {0}", [a.disponibilite]) : ""}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface SecForm {
  automodEnabled: boolean; antiSpam: boolean; antiLinks: boolean; antiCaps: boolean; antiMentions: boolean; antiRaid: boolean;
  spamThreshold: number; spamWindow: number; capsThreshold: number; maxMentions: number; raidThreshold: number; raidWindow: number;
  modRoles: string[]; adminRoles: string[]; automodExempt: string[];
  modLogChannel: string; logChannel: string; messageLogChannel: string; memberLogChannel: string;
}

const ids = (v: unknown): string[] => {
  try { const a = typeof v === "string" ? JSON.parse(v) : v; return Array.isArray(a) ? a.filter((x): x is string => typeof x === "string") : []; } catch { return []; }
};
const num = (v: unknown, d: number): number => (typeof v === "number" && Number.isFinite(v) ? v : d);

function toSecForm(c: Record<string, unknown>): SecForm {
  return {
    automodEnabled: c["automodEnabled"] === true, antiSpam: c["antiSpam"] === true, antiLinks: c["antiLinks"] === true,
    antiCaps: c["antiCaps"] === true, antiMentions: c["antiMentions"] === true, antiRaid: c["antiRaid"] === true,
    spamThreshold: num(c["spamThreshold"], 5), spamWindow: num(c["spamWindow"], 5), capsThreshold: num(c["capsThreshold"], 70),
    maxMentions: num(c["maxMentions"], 5), raidThreshold: num(c["raidThreshold"], 5), raidWindow: num(c["raidWindow"], 10),
    modRoles: ids(c["modRoles"]), adminRoles: ids(c["adminRoles"]), automodExempt: ids(c["automodExempt"]),
    modLogChannel: typeof c["modLogChannel"] === "string" ? c["modLogChannel"] : "", logChannel: typeof c["logChannel"] === "string" ? c["logChannel"] : "",
    messageLogChannel: typeof c["messageLogChannel"] === "string" ? c["messageLogChannel"] : "", memberLogChannel: typeof c["memberLogChannel"] === "string" ? c["memberLogChannel"] : "",
  };
}

function SecurityTab({ onExpired }: { onExpired: () => void }) {
  const [form, setForm] = useState<SecForm | null>(null);
  const [choices, setChoices] = useState<DiscordChoices>({ channels: [], forums: [], roles: [] });
  const [sys, setSys] = useState<SystemStatus | null>(null);
  const [load, setLoad] = useState<"loading" | "ok" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const fail = useFail(onExpired, setErr);

  const refresh = useCallback(() => {
    setLoad("loading");
    Promise.all([getConfig(), getChoices(), getSystem()])
      .then(([c, ch, s]) => { setForm(toSecForm(c)); setChoices(ch); setSys(s); setLoad("ok"); })
      .catch((e) => { fail(e); setLoad("error"); });
  }, [fail]);
  useEffect(refresh, [refresh]);

  if (load !== "ok" || !form) return <LoadState state={load === "ok" ? "loading" : load} onRetry={refresh} />;
  const set = <K extends keyof SecForm>(k: K, v: SecForm[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const toggleRole = (k: "modRoles" | "adminRoles" | "automodExempt", id: string) =>
    set(k, form[k].includes(id) ? form[k].filter((r) => r !== id) : [...form[k], id]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(""); setErr("");
    try {
      const body: Record<string, unknown> = { ...form };
      for (const k of ["modLogChannel", "logChannel", "messageLogChannel", "memberLogChannel"] as const) delete body[k];   // salons : onglet « Salons »
      const r = await saveConfig(body);
      setMsg(ta("Enregistré ({0} réglage{1}). Actif immédiatement.", [r.saved.length, r.saved.length > 1 ? "s" : ""]));
      refresh();
    } catch (x) { fail(x); } finally { setBusy(false); }
  };

  const toggle = (k: "automodEnabled" | "antiSpam" | "antiLinks" | "antiCaps" | "antiMentions" | "antiRaid", label: string, hint: string) => (
    <label className="flex items-start gap-3 text-sm text-white/80 font-body">
      <input type="checkbox" className="mt-1" checked={form[k]} onChange={(e) => set(k, e.target.checked)} />
      <span><span className="font-medium">{label}</span><span className="block text-xs text-white/45 font-light">{hint}</span></span>
    </label>
  );
  const numField = (k: "spamThreshold" | "spamWindow" | "capsThreshold" | "maxMentions" | "raidThreshold" | "raidWindow", label: string, min: number, max: number) => (
    <label className="block text-xs text-white/50 font-body">{label}
      <input className="glass-field mt-1" type="number" min={min} max={max} value={form[k]} onChange={(e) => set(k, Number(e.target.value))} />
    </label>
  );
  const roleBox = (k: "modRoles" | "adminRoles" | "automodExempt", title: string, hint: string) => (
    <fieldset>
      <legend className="text-xs text-white/50 font-body">{title} <span className="text-white/35">— {hint}</span></legend>
      <div className="mt-2 max-h-36 overflow-y-auto scrollbar-slim grid sm:grid-cols-2 gap-x-4 gap-y-1">
        {choices.roles.map((r) => (
          <label key={r.id} className="inline-flex items-center gap-2 text-sm text-white/75 font-body">
            <input type="checkbox" checked={form[k].includes(r.id)} onChange={() => toggleRole(k, r.id)} /> @{r.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
  const p = sys?.protection;

  return (
    <form onSubmit={save} className="max-w-3xl space-y-5">
      <div className="liquid-glass-strong rounded-2xl p-5 md:p-6">
        <h2 className="font-heading italic text-2xl text-white leading-none">{ta("État réel de la protection")}</h2>
        {p ? (
          <ul className="mt-3 space-y-1.5 text-sm font-body text-white/75">
            <li>{p.perms.manageMessages ? "✅" : "❌"} {ta("Gérer les messages (supprimer le spam)")}</li>
            <li>{p.perms.moderateMembers ? "✅" : "❌"} {ta("Mettre les membres en sourdine (sanctions)")}</li>
            <li>{p.perms.kickMembers ? "✅" : "❌"} {ta("Expulser des membres (bouton « Expulser les suspects »)")}</li>
            <li>{p.alertChannel ? "✅" : "❌"} {ta("Salon des alertes :")} {p.alertChannel ?? ta("aucun — choisissez un salon de logs dans l'onglet Salons")}</li>
            <li>{p.raid.active ? `🚨 MODE RAID ACTIF — ${p.raid.remainingMin} min, ${p.raid.suspects} suspect(s)` : ta("● Mode raid inactif")}</li>
          </ul>
        ) : <p className="mt-3 text-sm text-white/50 font-body">{ta("État indisponible (bot hors ligne ?).")}</p>}
        <p className="mt-3 text-xs text-amber-200/80 font-body">{ta("Pour tester : utilisez un")} <strong>{ta("compte normal")}</strong>{ta(". Les membres qui ont « Gérer les messages » (dont les administrateurs) et les rôles modérateurs/administrateurs ci-dessous sont")} <strong>{ta("exemptés")}</strong> {ta("de l'anti-spam. Le rôle du bot doit être")} <strong>{ta("au-dessus")}</strong> {ta("de celui du membre testé.")}</p>
      </div>

      <div className="liquid-glass-strong rounded-2xl p-5 md:p-6 space-y-4">
        <h2 className="font-heading italic text-2xl text-white leading-none">{ta("Protections")}</h2>
        {toggle("automodEnabled", ta("Modération automatique (interrupteur général)"), ta("Nécessaire pour l'anti-spam, les liens, les majuscules et les mentions."))}
        {toggle("antiSpam", ta("Anti-spam"), ta("Trop de messages trop vite, ou le même message répété : suppression + sourdine progressive (5 min, 30 min, 6 h)."))}
        {toggle("antiRaid", ta("Anti-raid"), ta("Arrivée massive de comptes : mode raid, sourdine 1 h des arrivants, alerte au staff avec boutons."))}
        {toggle("antiLinks", ta("Anti-liens"), ta("Supprime les liens postés par les membres non exemptés."))}
        {toggle("antiCaps", ta("Anti-majuscules"), ta("Supprime les messages écrits en majuscules."))}
        {toggle("antiMentions", ta("Anti-mentions de masse"), ta("Supprime les messages avec trop de mentions."))}
        <div className="grid sm:grid-cols-3 gap-3 pt-1">
          {numField("spamThreshold", ta("Anti-spam : messages (2–20)"), 2, 20)}
          {numField("spamWindow", ta("…en N secondes (2–60)"), 2, 60)}
          {numField("maxMentions", ta("Mentions max. (1–20)"), 1, 20)}
          {numField("raidThreshold", ta("Anti-raid : arrivées (2–50)"), 2, 50)}
          {numField("raidWindow", ta("…en N secondes (3–120)"), 3, 120)}
          {numField("capsThreshold", ta("Majuscules en % (30–100)"), 30, 100)}
        </div>
      </div>

      <div className="liquid-glass-strong rounded-2xl p-5 md:p-6 space-y-4">
        <h2 className="font-heading italic text-2xl text-white leading-none">{ta("Rôles et salons")}</h2>
        {roleBox("modRoles", ta("Rôles modérateurs"), ta("peuvent approuver les avis, utiliser /realisation…, exemptés de l'automod"))}
        {roleBox("adminRoles", ta("Rôles administrateurs"), "idem")}
        {roleBox("automodExempt", ta("Autres rôles exemptés de l'automod"), "ex. partenaires")}
        <div className="grid sm:grid-cols-2 gap-3">
        </div>
      </div>

      <button type="submit" disabled={busy} className="w-full bg-white text-black rounded-full px-6 py-2.5 text-sm font-medium font-body hover:bg-white/90 transition-colors disabled:opacity-50">
        {busy ? ta("Enregistrement…") : ta("Enregistrer la sécurité")}
      </button>
      <div aria-live="polite">
        {msg && <p className="text-xs text-emerald-300/90 font-body">{msg}</p>}
        {err && <p role="alert" className="text-xs text-red-300 font-body">{err}</p>}
      </div>
    </form>
  );
}
