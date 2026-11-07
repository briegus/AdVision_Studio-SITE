import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Eye, EyeOff, LogOut, Pencil, Plus, ShieldCheck, Star, Trash2, X, Check } from "lucide-react";
import Page from "@/components/Page";
import LoadState from "@/components/LoadState";
import { useI18n } from "@/lib/i18n";
import { API_URL, ApiError } from "@/lib/api";
import {
  getToken, login, logout, clearToken, listAdminWork, createWork, updateWork, deleteWork,
  listAdminReviews, moderateReview, deleteReview,
  listRequests, updateRequest, REQUEST_STATUTS, getSettings, getChoices, saveSettings, getSystem, testNotify, testEmail,
  listAbsences, updateAbsence, ABSENCE_STATUTS, getConfig, saveConfig,
  type AdminWork, type AdminReview, type WorkInput, type ReviewAction, type AdminRequest, type StudioSettings, type DiscordChoices, type SystemStatus, type AdminAbsence,
} from "@/lib/admin";
import { cn } from "@/utils/cn";

/**
 * Administration du site — réservée à l'équipe. Les deux onglets agissent sur la MÊME base que Discord :
 *  • réalisation ajoutée/modifiée/supprimée ici → l'embed du salon Discord est posté/modifié/supprimé automatiquement
 *  • avis → modération ici = modération Discord (et inversement), publication dans le salon des avis à l'approbation
 */

const TYPES = [
  ["produit", "Publicité produit"], ["marque", "Publicité de marque"], ["promo", "Vidéo promotionnelle"],
  ["concept", "Concept créatif"], ["social", "Format réseaux sociaux"], ["autre", "Autre"],
] as const;

type Tab = "requests" | "work" | "reviews" | "absences" | "security" | "settings" | "status";

const EMPTY: WorkInput = {
  titre: "", type: "produit", marque: "", description: "", videoUrl: "", imageUrl: "",
  format: "", duree: "", origine: "client", featured: false, postDiscord: true,
};

const DISCORD_LABEL: Record<string, string> = {
  posted: "✅ Publiée dans Discord", updated: "✅ Message Discord mis à jour", removed: "✅ Retirée de Discord",
  failed: "⚠️ Enregistrée, mais Discord n'a pas pu être mis à jour (salon introuvable ou permissions)", none: "",
};

export default function Admin() {
  const { t } = useI18n();
  const [authed, setAuthed] = useState<boolean>(() => !!getToken());
  // Callbacks stables : évitent de relancer les chargements à chaque rendu du parent
  const onLogout = useCallback(() => { void logout(); setAuthed(false); }, []);
  const onExpired = useCallback(() => { clearToken(); setAuthed(false); }, []);

  return (
    <Page title={t("admin.title")} wide>
      {!API_URL ? (
        <p className="text-sm text-red-300 font-body">VITE_API_URL n'est pas configuré.</p>
      ) : authed ? (
        <Panel onLogout={onLogout} onExpired={onExpired} />
      ) : (
        <Login onDone={() => setAuthed(true)} />
      )}
    </Page>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await login(pwd);
      onDone();
    } catch (x) {
      setErr(x instanceof ApiError && x.status ? x.message : "Serveur injoignable — il se réveille peut-être, réessayez dans quelques secondes.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 flex items-start justify-center">
      <form onSubmit={submit} className="liquid-glass-strong rounded-3xl p-6 md:p-8 w-full max-w-sm text-center">
        <ShieldCheck className="h-6 w-6 text-white/60 mx-auto" aria-hidden="true" />
        <p className="mt-3 text-sm text-white/55 font-body font-light">Espace équipe · connexion vérifiée par le serveur.</p>
        <input
          type="password"
          autoComplete="current-password"
          className="glass-field mt-5"
          placeholder="Mot de passe"
          aria-label="Mot de passe"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full bg-white text-black rounded-full px-6 py-2.5 text-sm font-medium font-body hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          {busy ? "Connexion…" : "Se connecter"}
        </button>
        {err && <p role="alert" className="mt-3 text-xs text-red-300 font-body">{err}</p>}
      </form>
    </div>
  );
}

function Panel({ onLogout, onExpired }: { onLogout: () => void; onExpired: () => void }) {
  const [tab, setTab] = useState<Tab>("requests");
  const tabBtn = (id: Tab, label: string) => (
    <button
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
          {tabBtn("requests", "Demandes")}
          {tabBtn("work", "Réalisations")}
          {tabBtn("reviews", "Avis")}
          {tabBtn("absences", "Absences")}
          {tabBtn("security", "Sécurité")}
          {tabBtn("settings", "Réglages")}
          {tabBtn("status", "État")}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onLogout} className="liquid-glass rounded-full px-4 py-1.5 text-xs text-white/80 font-body inline-flex items-center gap-1.5 hover:bg-white/10">
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Déconnexion
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-slim pr-1">
        {tab === "requests" && <RequestsTab onExpired={onExpired} />}
        {tab === "work" && <WorkTab onExpired={onExpired} />}
        {tab === "reviews" && <ReviewsTab onExpired={onExpired} />}
        {tab === "absences" && <AbsencesTab onExpired={onExpired} />}
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
    setMsg(e instanceof ApiError && e.status ? e.message : "Serveur injoignable, réessayez.");
  }, [onExpired, setMsg]);
}

function WorkTab({ onExpired }: { onExpired: () => void }) {
  const [items, setItems] = useState<AdminWork[]>([]);
  const [load, setLoad] = useState<"loading" | "ok" | "error">("loading");
  const [form, setForm] = useState<WorkInput>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
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
      setMsg(editing ? `Modifiée. ${DISCORD_LABEL[r.discord ?? "none"]}` : `Ajoutée et visible sur le site. ${DISCORD_LABEL[r.discord ?? "none"]}`);
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
      setMsg(DISCORD_LABEL[r.discord ?? "none"] || "Mise à jour effectuée.");
      refresh();
    } catch (x) { fail(x); }
  };

  const remove = async (id: string) => {
    setConfirmDel(null); setMsg(""); setErr("");
    try { await deleteWork(id); setMsg("Réalisation supprimée (et retirée de Discord)."); refresh(); } catch (x) { fail(x); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
      <form onSubmit={submit} className="liquid-glass-strong rounded-2xl p-5 md:p-6 self-start">
        <h2 className="font-heading italic text-2xl text-white leading-none">{editing ? "Modifier la réalisation" : "Ajouter une réalisation"}</h2>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <input className="glass-field sm:col-span-2" placeholder="Titre *" aria-label="Titre" value={form.titre} onChange={(e) => set("titre", e.target.value)} required maxLength={120} />
          <select className="glass-field" aria-label="Type" value={form.type} onChange={(e) => set("type", e.target.value)}>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input className="glass-field" placeholder="Marque / client" aria-label="Marque" value={form.marque} onChange={(e) => set("marque", e.target.value)} maxLength={120} />
          <textarea className="glass-field sm:col-span-2 min-h-20 resize-none" placeholder="Description courte" aria-label="Description" value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={600} />
          <input className="glass-field" type="url" placeholder="Lien vidéo https://…" aria-label="Lien vidéo" value={form.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} />
          <input className="glass-field" type="url" placeholder="Miniature https://…" aria-label="Miniature" value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
          <select className="glass-field" aria-label="Format" value={form.format} onChange={(e) => set("format", e.target.value)}>
            <option value="">Format (facultatif)</option>
            <option value="vertical">Vertical</option>
            <option value="horizontal">Horizontal</option>
            <option value="carre">Carré</option>
          </select>
          <input className="glass-field" placeholder="Durée (ex : 15 s)" aria-label="Durée" value={form.duree} onChange={(e) => set("duree", e.target.value)} maxLength={20} />
          <select className="glass-field" aria-label="Nature" value={form.origine} onChange={(e) => set("origine", e.target.value)}>
            <option value="client">Projet client réel</option>
            <option value="demo">Démonstration interne</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70 font-body">
          <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} /> En vedette</label>
          {!editing && <label className="inline-flex items-center gap-2"><input type="checkbox" checked={form.postDiscord} onChange={(e) => set("postDiscord", e.target.checked)} /> Poster aussi sur Discord</label>}
        </div>
        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={busy} className="flex-1 bg-white text-black rounded-full px-6 py-2.5 text-sm font-medium font-body hover:bg-white/90 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" /> {busy ? "Envoi…" : editing ? "Enregistrer" : "Ajouter"}
          </button>
          {editing && <button type="button" onClick={reset} className="liquid-glass rounded-full px-5 text-sm text-white/80 font-body hover:bg-white/10">Annuler</button>}
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
          <div className="liquid-glass rounded-2xl p-6 text-center text-sm text-white/55 font-body font-light">Aucune réalisation pour le moment.</div>
        ) : (
          <ul className="space-y-3">
            {items.map((w) => (
              <li key={w.id} className="liquid-glass rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-body font-medium text-sm text-white truncate">{w.featured && "⭐ "}{w.titre}</p>
                    <p className="mt-0.5 text-xs text-white/45 font-body">
                      {[w.marque, w.duree, w.format].filter(Boolean).join(" · ") || "—"} · {w.published ? "visible" : "masquée"} · via {w.source}
                      {w.discordMessageId ? " · sur Discord" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <IconBtn label="Modifier" onClick={() => edit(w)}><Pencil className="h-4 w-4" /></IconBtn>
                    <IconBtn label={w.published ? "Masquer" : "Afficher"} onClick={() => void patch(w.id, { published: !w.published })}>
                      {w.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </IconBtn>
                    <IconBtn label={w.featured ? "Retirer la vedette" : "Mettre en vedette"} onClick={() => void patch(w.id, { featured: !w.featured })}>
                      <Star className={cn("h-4 w-4", w.featured && "fill-white")} />
                    </IconBtn>
                    {confirmDel === w.id ? (
                      <>
                        <IconBtn label="Confirmer la suppression" onClick={() => void remove(w.id)}><Check className="h-4 w-4 text-red-300" /></IconBtn>
                        <IconBtn label="Annuler" onClick={() => setConfirmDel(null)}><X className="h-4 w-4" /></IconBtn>
                      </>
                    ) : (
                      <IconBtn label="Supprimer" onClick={() => setConfirmDel(w.id)}><Trash2 className="h-4 w-4" /></IconBtn>
                    )}
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
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
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
      setMsg(a === "approve" ? (r.publishedOnDiscord === false ? "Approuvé (visible sur le site) — mais Discord a refusé la publication." : "Approuvé : visible sur le site et publié dans Discord.") : "Mis à jour.");
      refresh();
    } catch (x) { fail(x); }
  };

  const remove = async (id: string) => {
    setConfirmDel(null); setMsg(""); setErr("");
    try { await deleteReview(id); setMsg("Avis supprimé."); refresh(); } catch (x) { fail(x); }
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
          {a.source === "site" ? "site" : "discord"} · {a.status === "pending" ? "à modérer" : a.status === "approved" ? (a.hidden ? "masqué" : "publié") : "refusé"}
        </span>
      </div>
      <p className="mt-2 text-sm text-white/65 font-body font-light leading-relaxed">{a.commentaire || "(sans commentaire)"}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {a.status !== "approved" && <SmallBtn onClick={() => void act(a.id, "approve")}>Approuver et publier</SmallBtn>}
        {a.status === "pending" && <SmallBtn onClick={() => void act(a.id, "reject")}>Refuser</SmallBtn>}
        {a.status === "approved" && <SmallBtn onClick={() => void act(a.id, a.hidden ? "show" : "hide")}>{a.hidden ? "Afficher" : "Masquer"}</SmallBtn>}
        {a.status === "approved" && <SmallBtn onClick={() => void act(a.id, a.featured ? "unfeature" : "feature")}>{a.featured ? "Retirer la vedette" : "Mettre en vedette"}</SmallBtn>}
        {a.status === "approved" && <SmallBtn onClick={() => void act(a.id, "unpublish")}>Dépublier</SmallBtn>}
        {confirmDel === a.id ? (
          <>
            <SmallBtn danger onClick={() => void remove(a.id)}>Confirmer la suppression</SmallBtn>
            <SmallBtn onClick={() => setConfirmDel(null)}>Annuler</SmallBtn>
          </>
        ) : (
          <SmallBtn onClick={() => setConfirmDel(a.id)}>Supprimer</SmallBtn>
        )}
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
        <h2 className="font-heading italic text-2xl text-white leading-none">À modérer ({pending.length})</h2>
        {pending.length === 0 ? <p className="mt-3 text-sm text-white/50 font-body font-light">Aucun avis en attente.</p> : <ul className="mt-3 space-y-3">{pending.map(card)}</ul>}
      </section>
      <section>
        <h2 className="font-heading italic text-2xl text-white leading-none">Historique</h2>
        {others.length === 0 ? <p className="mt-3 text-sm text-white/50 font-body font-light">Rien pour le moment.</p> : <ul className="mt-3 space-y-3">{others.map(card)}</ul>}
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

const STATUT_LABEL: Record<string, string> = { nouvelle: "Nouvelle", en_cours: "En cours", traitee: "Traitée", refusee: "Refusée" };

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
        <input className="glass-field flex-1 min-w-48" placeholder="Rechercher (réf., nom, marque…)" aria-label="Rechercher" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="glass-field w-auto" aria-label="Statut" value={statut} onChange={(e) => setStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {REQUEST_STATUTS.map((s) => <option key={s} value={s}>{STATUT_LABEL[s]}</option>)}
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-white/70 font-body px-2">
          <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} /> Archivées
        </label>
      </div>
      <div aria-live="polite">{err && <p role="alert" className="text-xs text-red-300 font-body">{err}</p>}</div>
      {load !== "ok" ? (
        <LoadState state={load} onRetry={refresh} />
      ) : items.length === 0 ? (
        <div className="liquid-glass rounded-2xl p-6 text-center text-sm text-white/55 font-body font-light">Aucune demande.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((d) => (
            <li key={d.id} className="liquid-glass rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button onClick={() => setOpen(open === d.id ? null : d.id)} className="text-left min-w-0" aria-expanded={open === d.id}>
                  <p className="font-body font-medium text-sm text-white truncate">{d.ref} · {d.demandeur ?? "—"}{d.marque ? ` · ${d.marque}` : ""}</p>
                  <p className="text-xs text-white/45 font-body">{new Date(d.createdAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })} · via {d.source}</p>
                </button>
                <div className="flex items-center gap-2">
                  <select className="glass-field w-auto py-1.5 text-xs" aria-label={`Statut de ${d.ref}`} value={d.statut} onChange={(e) => void patch(d.id, { statut: e.target.value })}>
                    {REQUEST_STATUTS.map((s) => <option key={s} value={s}>{STATUT_LABEL[s]}</option>)}
                  </select>
                  <SmallBtn onClick={() => void patch(d.id, { archived: !d.archived })}>{d.archived ? "Désarchiver" : "Archiver"}</SmallBtn>
                </div>
              </div>
              {open === d.id && (
                <dl className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm font-body">
                  <div><dt className="text-white/40 text-xs">Contact</dt><dd className="text-white/80 break-all">{d.contact ?? "—"}</dd></div>
                  <div><dt className="text-white/40 text-xs">Format · durée · budget</dt><dd className="text-white/80">{[d.format, d.duree, d.budget].filter(Boolean).join(" · ") || "—"}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-white/40 text-xs">Message</dt><dd className="text-white/70 font-light whitespace-pre-wrap">{d.description ?? "—"}</dd></div>
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
  const [choices, setChoices] = useState<DiscordChoices>({ channels: [], forums: [], roles: [] });
  const [load, setLoad] = useState<"loading" | "ok" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const fail = useFail(onExpired, setErr);

  const refresh = useCallback(() => {
    setLoad("loading");
    Promise.all([getSettings(), getChoices()])
      .then(([s, c]) => { setSettings(s.settings); setEvents(s.events); setChoices(c); setLoad("ok"); })
      .catch((e) => { fail(e); setLoad("error"); });
  }, [fail]);
  useEffect(refresh, [refresh]);

  if (load !== "ok" || !settings) return <LoadState state={load === "ok" ? "loading" : load} onRetry={refresh} />;
  const set = <K extends keyof StudioSettings>(k: K, v: StudioSettings[K]) => setSettings((s) => (s ? { ...s, [k]: v } : s));
  const opt = (list: { id: string; name: string }[], prefix: string) => list.map((c) => <option key={c.id} value={c.id}>{prefix}{c.name}</option>);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(""); setErr("");
    try { const r = await saveSettings(settings); setSettings(r.settings); setMsg("Réglages enregistrés."); } catch (x) { fail(x); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="liquid-glass-strong rounded-2xl p-5 md:p-6 max-w-2xl space-y-4">
      <h2 className="font-heading italic text-2xl text-white leading-none">Salons Discord</h2>
      <label className="block text-xs text-white/50 font-body">Salon des notifications (nouvelles demandes, avis à modérer…)
        <select className="glass-field mt-1" value={settings.notifyChannelId ?? ""} onChange={(e) => set("notifyChannelId", e.target.value || null)}>
          <option value="">— détection automatique —</option>{opt(choices.channels, "#")}
        </select>
      </label>
      <label className="block text-xs text-white/50 font-body">Forum des réalisations (un post par réalisation)
        <select className="glass-field mt-1" value={settings.realisationsChannelId ?? ""} onChange={(e) => set("realisationsChannelId", e.target.value || null)}>
          <option value="">— détection automatique —</option>
          {choices.forums.length > 0 && <optgroup label="Forums">{opt(choices.forums, "# ")}</optgroup>}
          <optgroup label="Salons texte">{opt(choices.channels, "#")}</optgroup>
        </select>
      </label>
      <label className="block text-xs text-white/50 font-body">Forum des absences (un post étiqueté par absence)
        <select className="glass-field mt-1" value={settings.absencesChannelId ?? ""} onChange={(e) => set("absencesChannelId", e.target.value || null)}>
          <option value="">— détection automatique —</option>
          {choices.forums.length > 0 && <optgroup label="Forums">{opt(choices.forums, "# ")}</optgroup>}
        </select>
      </label>
      <label className="block text-xs text-white/50 font-body">Rôle mentionné pour les nouvelles demandes (facultatif)
        <select className="glass-field mt-1" value={settings.notifyRoleId ?? ""} onChange={(e) => set("notifyRoleId", e.target.value || null)}>
          <option value="">— aucun —</option>{opt(choices.roles, "@")}
        </select>
      </label>

      <h2 className="font-heading italic text-2xl text-white leading-none pt-2">Notifications</h2>
      <div className="grid sm:grid-cols-2 gap-2">
        {Object.entries(events).map(([k, label]) => (
          <label key={k} className="inline-flex items-center gap-2 text-sm text-white/75 font-body">
            <input type="checkbox" checked={settings.notifyEvents[k] !== false} onChange={(e) => set("notifyEvents", { ...settings.notifyEvents, [k]: e.target.checked })} /> {label}
          </label>
        ))}
      </div>

      <h2 className="font-heading italic text-2xl text-white leading-none pt-2">Liens</h2>
      <div className="grid sm:grid-cols-3 gap-3">
        <input className="glass-field" type="url" placeholder="URL du site https://…" aria-label="URL du site" value={settings.siteUrl ?? ""} onChange={(e) => set("siteUrl", e.target.value || null)} />
        <input className="glass-field" type="url" placeholder="Invitation Discord https://…" aria-label="Invitation Discord" value={settings.discordInviteUrl ?? ""} onChange={(e) => set("discordInviteUrl", e.target.value || null)} />
        <input className="glass-field" placeholder="Contact (https:// ou mailto:)" aria-label="Contact" value={settings.contactUrl ?? ""} onChange={(e) => set("contactUrl", e.target.value || null)} />
      </div>

      <button type="submit" disabled={busy} className="w-full bg-white text-black rounded-full px-6 py-2.5 text-sm font-medium font-body hover:bg-white/90 transition-colors disabled:opacity-50">
        {busy ? "Enregistrement…" : "Enregistrer"}
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
        <h2 className="font-heading italic text-2xl text-white leading-none">État des services</h2>
        <ul className="mt-4 space-y-3">
          {row(s.bot.ok, "Bot Discord", s.bot.ok ? `connecté · ${s.bot.ws} ms · actif depuis ${s.bot.uptimeMin} min` : "hors ligne", "Vérifiez DISCORD_TOKEN et les logs Render.")}
          {row(s.db.ok, "Base Neon", s.db.ok ? `${s.db.ms} ms` : "injoignable", "Vérifiez DATABASE_URL sur Render.")}
          {row(s.email.ok, "E-mails", s.email.ok ? "fournisseur configuré" : "NON configurés", "Renseignez BREVO_API_KEY (ou RESEND_API_KEY) et MAIL_FROM_EMAIL sur Render.")}
          {row(s.notify.ok, "Notifications Discord", s.notify.ok ? `${s.notify.channel} (${s.notify.via})` : "aucun salon", "Choisissez un salon dans l'onglet Réglages.")}
          {row(s.realisations.ok, "Réalisations Discord", s.realisations.ok ? `${s.realisations.kind === "forum" ? "forum" : "salon texte"} ${s.realisations.channel} (${s.realisations.via})` : "aucun forum/salon", "Créez un forum « réalisations » dans Discord ou choisissez-le dans Réglages.")}
          {s.protection && row(s.protection.perms.manageMessages && s.protection.perms.moderateMembers, "Permissions anti-spam / anti-raid", `Gérer les messages ${s.protection.perms.manageMessages ? "✅" : "❌"} · Mettre en sourdine ${s.protection.perms.moderateMembers ? "✅" : "❌"} · Expulser ${s.protection.perms.kickMembers ? "✅" : "❌"}`, "Donnez ces permissions au bot et placez son rôle au-dessus des membres (Discord → Paramètres du serveur → Rôles).")}
          {s.protection && row(s.protection.flags.automod && s.protection.flags.antiSpam && s.protection.flags.antiRaid, "Protection activée", s.protection.raid.active ? `🚨 MODE RAID ACTIF (${s.protection.raid.remainingMin} min)` : `anti-spam ${s.protection.flags.antiSpam ? "ON" : "OFF"} · anti-raid ${s.protection.flags.antiRaid ? "ON" : "OFF"} · modération ${s.protection.flags.automod ? "ON" : "OFF"}`, "Onglet Sécurité → activez les interrupteurs, ou /protection activer sur Discord.")}
          {row(s.cors.restreint, "Sécurité CORS", s.cors.restreint ? s.cors.origines.join(", ") : "ouvert à tous", "Renseignez ALLOWED_ORIGINS (URL du site) sur Render.")}
          {row(!!s.proxy.ip, "IP vue par le serveur", `${s.proxy.ip ?? "?"} — doit être VOTRE adresse publique (sinon toutes les limites anti-spam s'appliquent à tout le monde)`, "Ajustez TRUST_PROXY_HOPS sur Render (1 par défaut).")}
          {row(s.oauth.google, "Connexion Google", s.oauth.google ? "active" : "désactivée", "Facultatif : GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET.")}
          {row(s.oauth.discord, "Connexion Discord", s.oauth.discord ? "active" : "désactivée", "Facultatif : DISCORD_CLIENT_SECRET (+ redirection OAuth2 déclarée).")}
        </ul>
        <button onClick={refresh} className="mt-4 liquid-glass rounded-full px-4 py-1.5 text-xs text-white/80 font-body hover:bg-white/10">Actualiser</button>
      </div>

      <div className="liquid-glass-strong rounded-2xl p-5 md:p-6 space-y-4">
        <h2 className="font-heading italic text-2xl text-white leading-none">Tests réels</h2>
        <div>
          <button disabled={busy === "n"} onClick={() => void run("n", async () => { const r = await testNotify(); return `Message envoyé dans ${r.channel} (${r.via}).`; })} className="bg-white text-black rounded-full px-5 py-2 text-sm font-medium font-body hover:bg-white/90 disabled:opacity-50">
            Envoyer un message de test sur Discord
          </button>
        </div>
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void run("m", async () => { await testEmail(to.trim()); return `E-mail de test envoyé à ${to.trim()}.`; }); }}>
          <input className="glass-field flex-1 min-w-48" type="email" required placeholder="Votre adresse e-mail" aria-label="Adresse de test" value={to} onChange={(e) => setTo(e.target.value)} />
          <button type="submit" disabled={busy === "m"} className="bg-white text-black rounded-full px-5 py-2 text-sm font-medium font-body hover:bg-white/90 disabled:opacity-50">Envoyer un e-mail de test</button>
        </form>
        <div aria-live="polite">
          {msg && <p className="text-xs text-emerald-300/90 font-body">{msg}</p>}
          {err && <p role="alert" className="text-xs text-red-300 font-body">{err}</p>}
        </div>
      </div>
    </div>
  );
}

const ABS_LABEL: Record<string, string> = { en_attente: "En attente", acceptee: "Acceptée", refusee: "Refusée", prise_en_compte: "Prise en compte" };

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
    try { await updateAbsence(id, b); setMsg("Mis à jour — le post Discord et ses étiquettes suivent."); refresh(); } catch (x) { fail(x); }
  };
  const day = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className="glass-field w-auto" aria-label="Statut" value={statut} onChange={(e) => setStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {ABSENCE_STATUTS.map((s) => <option key={s} value={s}>{ABS_LABEL[s]}</option>)}
        </select>
        <p className="text-xs text-white/45 font-body">Chaque absence est un post étiqueté dans le forum des absences de Discord (statut + durée). Le motif n'est jamais publié.</p>
      </div>
      <div aria-live="polite">
        {msg && <p className="text-xs text-emerald-300/90 font-body">{msg}</p>}
        {err && <p role="alert" className="text-xs text-red-300 font-body">{err}</p>}
      </div>
      {load !== "ok" ? (
        <LoadState state={load} onRetry={refresh} />
      ) : items.length === 0 ? (
        <div className="liquid-glass rounded-2xl p-6 text-center text-sm text-white/55 font-body font-light">Aucune absence.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="liquid-glass rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-body font-medium text-sm text-white truncate">{a.membre ?? a.userId} {a.terminee && <span className="text-white/40 font-light">· terminée</span>}</p>
                  <p className="text-xs text-white/45 font-body">{day(a.dateDebut)} → {day(a.dateRetourPrevue)}{a.threadId ? " · post Discord" : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select className="glass-field w-auto py-1.5 text-xs" aria-label="Statut de l'absence" value={a.statut} onChange={(e) => void patch(a.id, { statut: e.target.value })}>
                    {ABSENCE_STATUTS.map((s) => <option key={s} value={s}>{ABS_LABEL[s]}</option>)}
                  </select>
                  {!a.terminee && <SmallBtn onClick={() => void patch(a.id, { terminee: true })}>Marquer terminée</SmallBtn>}
                </div>
              </div>
              <p className="mt-2 text-xs text-white/50 font-body font-light">Motif (privé) : {a.motif}{a.commentaire ? ` · ${a.commentaire}` : ""}{a.disponibilite ? ` · Dispo : ${a.disponibilite}` : ""}</p>
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
      for (const k of ["modLogChannel", "logChannel", "messageLogChannel", "memberLogChannel"] as const) body[k] = form[k] || null;
      const r = await saveConfig(body);
      setMsg(`Enregistré (${r.saved.length} réglage${r.saved.length > 1 ? "s" : ""}). Actif immédiatement.`);
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
  const chanSel = (k: "modLogChannel" | "logChannel" | "messageLogChannel" | "memberLogChannel", label: string) => (
    <label className="block text-xs text-white/50 font-body">{label}
      <select className="glass-field mt-1" value={form[k]} onChange={(e) => set(k, e.target.value)}>
        <option value="">— aucun —</option>
        {choices.channels.map((c) => <option key={c.id} value={c.id}>#{c.name}</option>)}
      </select>
    </label>
  );
  const p = sys?.protection;

  return (
    <form onSubmit={save} className="max-w-3xl space-y-5">
      <div className="liquid-glass-strong rounded-2xl p-5 md:p-6">
        <h2 className="font-heading italic text-2xl text-white leading-none">État réel de la protection</h2>
        {p ? (
          <ul className="mt-3 space-y-1.5 text-sm font-body text-white/75">
            <li>{p.perms.manageMessages ? "✅" : "❌"} Gérer les messages (supprimer le spam)</li>
            <li>{p.perms.moderateMembers ? "✅" : "❌"} Mettre les membres en sourdine (sanctions)</li>
            <li>{p.perms.kickMembers ? "✅" : "❌"} Expulser des membres (bouton « Expulser les suspects »)</li>
            <li>{p.alertChannel ? "✅" : "❌"} Salon des alertes : {p.alertChannel ?? "aucun — choisissez un salon de logs ci-dessous"}</li>
            <li>{p.raid.active ? `🚨 MODE RAID ACTIF — ${p.raid.remainingMin} min, ${p.raid.suspects} suspect(s)` : "● Mode raid inactif"}</li>
          </ul>
        ) : <p className="mt-3 text-sm text-white/50 font-body">État indisponible (bot hors ligne ?).</p>}
        <p className="mt-3 text-xs text-amber-200/80 font-body">Pour tester : utilisez un <strong>compte normal</strong>. Les membres qui ont « Gérer les messages » (dont les administrateurs) et les rôles modérateurs/administrateurs ci-dessous sont <strong>exemptés</strong> de l'anti-spam. Le rôle du bot doit être <strong>au-dessus</strong> de celui du membre testé.</p>
      </div>

      <div className="liquid-glass-strong rounded-2xl p-5 md:p-6 space-y-4">
        <h2 className="font-heading italic text-2xl text-white leading-none">Protections</h2>
        {toggle("automodEnabled", "Modération automatique (interrupteur général)", "Nécessaire pour l'anti-spam, les liens, les majuscules et les mentions.")}
        {toggle("antiSpam", "Anti-spam", "Trop de messages trop vite, ou le même message répété : suppression + sourdine progressive (5 min, 30 min, 6 h).")}
        {toggle("antiRaid", "Anti-raid", "Arrivée massive de comptes : mode raid, sourdine 1 h des arrivants, alerte au staff avec boutons.")}
        {toggle("antiLinks", "Anti-liens", "Supprime les liens postés par les membres non exemptés.")}
        {toggle("antiCaps", "Anti-majuscules", "Supprime les messages écrits en majuscules.")}
        {toggle("antiMentions", "Anti-mentions de masse", "Supprime les messages avec trop de mentions.")}
        <div className="grid sm:grid-cols-3 gap-3 pt-1">
          {numField("spamThreshold", "Anti-spam : messages (2–20)", 2, 20)}
          {numField("spamWindow", "…en N secondes (2–60)", 2, 60)}
          {numField("maxMentions", "Mentions max. (1–20)", 1, 20)}
          {numField("raidThreshold", "Anti-raid : arrivées (2–50)", 2, 50)}
          {numField("raidWindow", "…en N secondes (3–120)", 3, 120)}
          {numField("capsThreshold", "Majuscules en % (30–100)", 30, 100)}
        </div>
      </div>

      <div className="liquid-glass-strong rounded-2xl p-5 md:p-6 space-y-4">
        <h2 className="font-heading italic text-2xl text-white leading-none">Rôles et salons</h2>
        {roleBox("modRoles", "Rôles modérateurs", "peuvent approuver les avis, utiliser /realisation…, exemptés de l'automod")}
        {roleBox("adminRoles", "Rôles administrateurs", "idem")}
        {roleBox("automodExempt", "Autres rôles exemptés de l'automod", "ex. partenaires")}
        <div className="grid sm:grid-cols-2 gap-3">
          {chanSel("modLogChannel", "Salon des logs de modération (alertes anti-spam / raid)")}
          {chanSel("logChannel", "Salon des logs généraux")}
          {chanSel("messageLogChannel", "Logs des messages (modifiés / supprimés)")}
          {chanSel("memberLogChannel", "Logs des membres (arrivées / départs)")}
        </div>
      </div>

      <button type="submit" disabled={busy} className="w-full bg-white text-black rounded-full px-6 py-2.5 text-sm font-medium font-body hover:bg-white/90 transition-colors disabled:opacity-50">
        {busy ? "Enregistrement…" : "Enregistrer la sécurité"}
      </button>
      <div aria-live="polite">
        {msg && <p className="text-xs text-emerald-300/90 font-body">{msg}</p>}
        {err && <p role="alert" className="text-xs text-red-300 font-body">{err}</p>}
      </div>
    </form>
  );
}
