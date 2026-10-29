import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ExternalLink, Eye, EyeOff, LogOut, Pencil, Plus, ShieldCheck, Star, Trash2, X, Check } from "lucide-react";
import Page from "@/components/Page";
import LoadState from "@/components/LoadState";
import { useI18n } from "@/lib/i18n";
import { API_URL, ApiError } from "@/lib/api";
import {
  getToken, login, logout, clearToken, listAdminWork, createWork, updateWork, deleteWork,
  listAdminReviews, moderateReview, deleteReview,
  type AdminWork, type AdminReview, type WorkInput, type ReviewAction,
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
  const [tab, setTab] = useState<"work" | "reviews">("work");
  const dashboard = `${API_URL}/dashboard`;
  const tabBtn = (id: "work" | "reviews", label: string) => (
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
          {tabBtn("work", "Réalisations")}
          {tabBtn("reviews", "Avis")}
        </div>
        <div className="flex items-center gap-2">
          <a href={dashboard} target="_blank" rel="noopener noreferrer" className="liquid-glass rounded-full px-4 py-1.5 text-xs text-white/80 font-body inline-flex items-center gap-1.5 hover:bg-white/10">
            Dashboard complet <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          <button onClick={onLogout} className="liquid-glass rounded-full px-4 py-1.5 text-xs text-white/80 font-body inline-flex items-center gap-1.5 hover:bg-white/10">
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Déconnexion
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-slim pr-1">
        {tab === "work" ? <WorkTab onExpired={onExpired} /> : <ReviewsTab onExpired={onExpired} />}
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
          <span className="text-white/60 font-light">{a.auteurNom ?? "Client Discord"}</span>
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
