import { useCallback, useEffect, useState } from "react";
import LoadState from "@/components/LoadState";
import { ApiError } from "@/lib/api";
import { syncMessage, syncFailed, getCatalogueAdmin, saveCatalogueAdmin, resetCatalogueAdmin, listTicketCategoriesAdmin, createTicketCategory, updateTicketCategory, type AdminCatalogueData, type AService, type AFormule, type AQuestion, type AL, type AProjectField, type ATicketCategory } from "@/lib/admin";
import { cn } from "@/utils/cn";
import { ta, taServer } from "@/lib/adminI18n";

/**
 * Onglet « Catalogue » — services, questions de formulaire et formules, sans toucher au code.
 * Le site (page Services, formulaire), le bot (panels, tickets) et les e-mails lisent ce catalogue.
 * Les anciennes demandes gardent leur contenu : elles enregistrent un instantané au moment de la demande.
 */
const iconLabel = (k: string): string => ({ video: ta("Caméra vidéo"), scissors: ta("Ciseaux (montage)"), pen: ta("Stylo (logo)"), discord: "Discord", sparkles: ta("Étincelles"), star: ta("Étoile"), camera: ta("Appareil photo"), music: ta("Musique") } as Record<string, string>)[k] ?? k;
const roleLabel = (k: string): string => ({ "": ta("Aucun"), duree: ta("Durée souhaitée"), resolution: ta("Résolution souhaitée"), format: ta("Format souhaité") } as Record<string, string>)[k] ?? k;

const btn = "rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-body text-white/80 hover:bg-white/10 transition-colors disabled:opacity-40";
const lab = "block text-[11px] uppercase tracking-widest text-white/40 font-body";
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const move = <T,>(arr: T[], i: number, d: number): T[] => { const j = i + d; if (j < 0 || j >= arr.length) return arr; const a = [...arr]; [a[i], a[j]] = [a[j]!, a[i]!]; return a; };
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 30);

function Pair({ label, v, onChange, long, placeholder }: { label: string; v: AL | undefined; onChange: (v: AL) => void; long?: boolean; placeholder?: string }) {
  const set = (k: "fr" | "en", s: string) => { const n: AL = { fr: k === "fr" ? s : v?.fr ?? "", ...(k === "en" ? (s ? { en: s } : {}) : v?.en ? { en: v.en } : {}) }; onChange(n); };
  const F = long ? "textarea" : "input";
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      <label className="block"><span className={lab}>{label} {ta("(FR)")}</span><F className="glass-field mt-1" value={v?.fr ?? ""} placeholder={placeholder} onChange={(e) => set("fr", e.target.value)} {...(long ? { rows: 2 } : {})} /></label>
      <label className="block"><span className={lab}>{label} {ta("(EN)")}</span><F className="glass-field mt-1" value={v?.en ?? ""} placeholder={ta("(facultatif — sinon le français est affiché)")} onChange={(e) => set("en", e.target.value)} {...(long ? { rows: 2 } : {})} /></label>
    </div>
  );
}

function QuestionEditor({ q, services, onChange, onMove, onDelete }: { q: AQuestion; services: string[]; onChange: (q: AQuestion) => void; onMove: (d: number) => void; onDelete: () => void }) {
  const upd = (p: Partial<AQuestion>) => onChange({ ...q, ...p });
  const optsText = (q.options ?? []).map((o) => `${o.value} | ${o.label.fr}${o.label.en ? ` | ${o.label.en}` : ""}`).join("\n");
  const parseOpts = (t: string) => t.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p[0]).map((p) => ({ value: p[0]!, label: { fr: p[1] || p[0]!, ...(p[2] ? { en: p[2] } : {}) } }));
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-white/60 font-body">{ta("Question")}</span>
        <input className="glass-field !w-44 !py-1 text-xs font-mono" value={q.name} onChange={(e) => upd({ name: slug(e.target.value) })} aria-label={ta("Identifiant de la question")} />
        <span className="flex-1" />
        <button type="button" className={btn} onClick={() => onMove(-1)} aria-label={ta("Monter")}>↑</button>
        <button type="button" className={btn} onClick={() => onMove(1)} aria-label={ta("Descendre")}>↓</button>
        <button type="button" className={cn(btn, "text-red-300")} onClick={onDelete}>{ta("Retirer")}</button>
      </div>
      <Pair label={ta("Question")} v={q.label} onChange={(v) => upd({ label: v })} />
      <Pair label={ta("Aide (exemple)")} v={q.placeholder} onChange={(v) => upd({ placeholder: v.fr || v.en ? v : undefined })} />
      <div className="grid sm:grid-cols-3 gap-2">
        <label className="block"><span className={lab}>{ta("Type")}</span>
          <select className="glass-field mt-1" value={q.kind} onChange={(e) => {
            const kind = e.target.value as AQuestion["kind"];
            upd({ kind, ...(kind === "select" && !q.options?.length ? { options: [{ value: "oui", label: { fr: ta("Oui") } }, { value: "non", label: { fr: ta("Non") } }] } : {}), ...(kind === "slider" && !q.slider ? { slider: { min: 10, max: 30, step: 5, default: 20 }, default: "20" } : {}) });
          }}>
            <option value="text">{ta("Texte court")}</option><option value="long">{ta("Texte long")}</option><option value="select">{ta("Liste de choix")}</option><option value="slider">{ta("Curseur")}</option>
          </select>
        </label>
        <label className="block"><span className={lab}>{ta("Rôle dans la demande")}</span>
          <select className="glass-field mt-1" value={q.role ?? ""} onChange={(e) => upd({ role: (e.target.value || undefined) as AQuestion["role"] })}>
            {["", "duree", "resolution", "format"].map((k) => <option key={k} value={k}>{roleLabel(k)}</option>)}
          </select>
        </label>
        <label className="flex items-end gap-2 text-sm text-white/80 font-body pb-2"><input type="checkbox" checked={q.required} onChange={(e) => upd({ required: e.target.checked })} /> {ta("Obligatoire")}</label>
      </div>
      {q.kind === "select" && (
        <label className="block"><span className={lab}>{ta("Choix — une ligne par option : valeur | libellé FR | libellé EN")}</span>
          <textarea className="glass-field mt-1 font-mono text-xs" rows={4} value={optsText} onChange={(e) => upd({ options: parseOpts(e.target.value) })} />
        </label>
      )}
      {q.kind === "slider" && q.slider && (
        <div className="grid grid-cols-4 gap-2">
          {(["min", "max", "step", "default"] as const).map((k) => (
            <label key={k} className="block"><span className={lab}>{{ min: ta("Minimum"), max: ta("Maximum"), step: ta("Pas"), default: ta("Départ") }[k]}</span>
              <input type="number" className="glass-field mt-1" value={q.slider![k]} onChange={(e) => upd({ slider: { ...q.slider!, [k]: Number(e.target.value) }, ...(k === "default" ? { default: e.target.value } : {}) })} /></label>
          ))}
        </div>
      )}
      <label className="block"><span className={lab}>{ta("Masquer si la formule contient aussi ces services (identifiants séparés par des virgules)")}</span>
        <input className="glass-field mt-1" value={(q.skipIfServices ?? []).join(", ")} placeholder={services.join(", ")} onChange={(e) => upd({ skipIfServices: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
      </label>
    </div>
  );
}

/** Champs de suivi de projet propres à un service (Phase 5). Sans personnalisation, les champs par défaut du service d'origine s'appliquent. */
function ProjectFieldsEditor({ service, defaults, onChange }: { service: AService; defaults: AProjectField[]; onChange: (fields: AProjectField[] | null) => void }) {
  const fields = service.projectFields;
  const upd = (i: number, p: Partial<AProjectField>) => onChange((fields ?? []).map((f, k) => (k === i ? { ...f, ...p } : f)));
  return (
    <fieldset className="rounded-xl border border-white/10 p-3 space-y-2">
      <legend className={cn(lab, "px-1")}>{ta("Champs de suivi de projet propres à ce service")}</legend>
      {fields === undefined ? (
        <>
          <p className="text-xs text-white/55 font-body">{defaults.length ? ta("Champs par défaut : {0}.", [defaults.map((d) => d.label.fr).join(", ")]) : ta("Aucun champ par défaut pour ce service.")}</p>
          <button type="button" className={btn} onClick={() => onChange(defaults.map((d) => ({ ...d, label: { ...d.label } })))}>{ta("Personnaliser")}</button>
        </>
      ) : (
        <>
          {fields.map((f, i) => (
            <div key={i} className="grid sm:grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-end">
              <input className="glass-field !py-1 text-xs font-mono" aria-label={ta("Identifiant du champ de projet")} value={f.name} onChange={(e) => upd(i, { name: slug(e.target.value) })} />
              <input className="glass-field !py-1 text-xs" aria-label={ta("Libellé du champ (FR)")} placeholder={ta("Libellé (FR)")} value={f.label.fr} onChange={(e) => upd(i, { label: { ...f.label, fr: e.target.value } })} />
              <input className="glass-field !py-1 text-xs" aria-label={ta("Label of the field (EN)")} placeholder={ta("Label (EN)")} value={f.label.en ?? ""} onChange={(e) => upd(i, { label: { fr: f.label.fr, ...(e.target.value ? { en: e.target.value } : {}) } })} />
              <select className="glass-field !w-auto !py-1 text-xs" aria-label={ta("Type de champ")} value={f.kind} onChange={(e) => upd(i, { kind: e.target.value as "text" | "long" })}><option value="text">{ta("Texte court")}</option><option value="long">{ta("Texte long")}</option></select>
              <button type="button" className={cn(btn, "text-red-300")} onClick={() => onChange(fields.filter((_, k) => k !== i))}>{ta("Retirer")}</button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {fields.length < 12 && <button type="button" className={btn} onClick={() => onChange([...fields, { name: `champ_${fields.length + 1}`, label: { fr: ta("Nouveau champ") }, kind: "text" }])}>{ta("+ Champ")}</button>}
            <button type="button" className={btn} onClick={() => onChange(null)}>{ta("Revenir aux champs par défaut")}</button>
          </div>
          <p className="text-[11px] text-white/40 font-body">{ta("Retirer un champ de la liste ne supprime pas les valeurs déjà saisies dans les projets existants.")}</p>
        </>
      )}
    </fieldset>
  );
}

/** Catégories de tickets Discord (Phase 5) : une par service créé dans l'administration, libellés FR/EN, émoji ; archivage réversible (jamais de suppression). */
function TicketCategoriesPanel({ list, services, onChanged, fail, setMsg }: { list: ATicketCategory[]; services: AService[]; onChanged: (l: ATicketCategory[]) => void; fail: (e: unknown) => void; setMsg: (m: string, warn?: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ key: "", labelFr: "", labelEn: "", emoji: "🎫" });
  const usedBy = (key: string) => services.filter((s) => !s.archived && s.ticketCategory === key).map((s) => s.nom.fr);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); onChanged(await listTicketCategoriesAdmin()); setMsg(ok); return true; } catch (e) { fail(e); return false; } finally { setBusy(false); }
  };
  return (
    <section className="liquid-glass-strong rounded-2xl p-4 space-y-3">
      <p className="text-xs text-white/50 font-body font-light">{ta("Chaque service peut avoir sa catégorie de ticket (choisie dans la fiche du service). Une catégorie archivée n'est plus proposée aux nouvelles demandes ; les anciens tickets gardent la leur. Les catégories « siteweb » et « sitebot » (anciennes) sont archivées et conservées pour l'historique.")}</p>
      {list.map((t) => (
        <div key={t.key} className={cn("rounded-xl border border-white/10 bg-black/20 p-3 flex flex-wrap items-center gap-2", t.archived && "opacity-60")}>
          <span className="text-lg" aria-hidden="true">{t.emoji}</span>
          <span className="flex-1 min-w-40"><span className="text-sm text-white font-body">{t.labelFr}</span>{t.labelEn && <span className="ml-2 text-xs text-white/45">{t.labelEn}</span>}
            <span className="ml-2 text-[11px] font-mono text-white/40">{t.key}</span>
            {t.systeme && <span className="ml-2 text-[11px] text-white/35 font-body">{ta("(d'origine)")}</span>}
            {usedBy(t.key).length > 0 && <span className="block text-[11px] text-white/40 font-body">{ta("Utilisée par :")} {usedBy(t.key).join(", ")}</span>}</span>
          <span className={cn("text-[11px] font-body", t.archived ? "text-white/40" : t.actif ? "text-emerald-300" : "text-amber-300")}>{t.archived ? ta("archivée") : t.actif ? "active" : ta("désactivée")}</span>
          {!t.archived && <button type="button" className={btn} disabled={busy} onClick={() => void run(() => updateTicketCategory(t.key, { actif: !t.actif }), t.actif ? ta("Catégorie désactivée.") : ta("Catégorie activée."))}>{t.actif ? ta("Désactiver") : ta("Activer")}</button>}
          <button type="button" className={cn(btn, t.archived ? "" : "text-red-300")} disabled={busy} onClick={() => void run(() => updateTicketCategory(t.key, t.archived ? { archived: false, actif: true } : { archived: true }), t.archived ? ta("Catégorie restaurée.") : ta("Catégorie archivée."))}>{t.archived ? ta("Restaurer") : ta("Archiver")}</button>
        </div>
      ))}
      <div className="rounded-xl border border-white/10 p-3 space-y-2">
        <span className={lab}>{ta("Nouvelle catégorie de ticket")}</span>
        <div className="grid sm:grid-cols-[1fr_1.3fr_1.3fr_5rem_auto] gap-2 items-end">
          <input className="glass-field !py-1.5 text-xs font-mono" aria-label={ta("Identifiant de la catégorie de ticket")} placeholder={ta("identifiant (ex. photo)")} value={draft.key} onChange={(e) => setDraft({ ...draft, key: slug(e.target.value).replace(/_/g, "-") })} />
          <input className="glass-field !py-1.5 text-xs" aria-label={ta("Nom de la catégorie de ticket (FR)")} placeholder={ta("Nom (FR)")} value={draft.labelFr} onChange={(e) => setDraft({ ...draft, labelFr: e.target.value })} />
          <input className="glass-field !py-1.5 text-xs" aria-label={ta("Name of the ticket category (EN)")} placeholder={ta("Name (EN)")} value={draft.labelEn} onChange={(e) => setDraft({ ...draft, labelEn: e.target.value })} />
          <input className="glass-field !py-1.5 text-xs" aria-label={ta("Émoji de la catégorie")} value={draft.emoji} maxLength={8} onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} />
          <button type="button" className={btn} disabled={busy || !draft.key || !draft.labelFr.trim()} onClick={() => void run(() => createTicketCategory({ key: draft.key, labelFr: draft.labelFr.trim(), ...(draft.labelEn.trim() ? { labelEn: draft.labelEn.trim() } : {}), emoji: draft.emoji || "🎫" }), ta("Catégorie de ticket créée.")).then((ok) => { if (ok) setDraft({ key: "", labelFr: "", labelEn: "", emoji: "🎫" }); })}>{ta("+ Catégorie")}</button>
        </div>
      </div>
    </section>
  );
}

export default function CatalogueTab({ onExpired }: { onExpired: () => void }) {
  const [cat, setCat] = useState<AdminCatalogueData | null>(null);
  const [icons, setIcons] = useState<string[]>([]);
  const [ticketList, setTicketList] = useState<ATicketCategory[]>([]);
  const [defaultFields, setDefaultFields] = useState<Record<string, AProjectField[]>>({});
  const [source, setSource] = useState<"db" | "default">("default");
  const [view, setView] = useState<"services" | "formules" | "tickets">("services");
  const [open, setOpen] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [load, setLoad] = useState<"loading" | "ok" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [warn, setWarn] = useState(false);
  const [errs, setErrs] = useState<string[]>([]);
  const [newKey, setNewKey] = useState("");

  const fail = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) { onExpired(); return; }
    const list = e instanceof ApiError && Array.isArray(e.data["errors"]) ? (e.data["errors"] as string[]) : [];
    setErrs(list.length ? list.map(taServer) : [e instanceof ApiError && e.status ? taServer(e.message) : ta("Serveur injoignable, réessayez.")]);
  }, [onExpired]);

  const refresh = useCallback(() => {
    setLoad("loading");
    getCatalogueAdmin().then((r) => { setCat(r.catalogue); setIcons(r.icons); setTicketList(r.ticketCategoryList); setDefaultFields(r.defaultProjectFields ?? {}); setSource(r.source); setDirty(false); setErrs([]); setLoad("ok"); }).catch((e) => { fail(e); setLoad("error"); });
  }, [fail]);
  useEffect(refresh, [refresh]);
  if (load !== "ok" || !cat) return <LoadState state={load === "ok" ? "loading" : load} onRetry={refresh} />;

  const edit = (fn: (c: AdminCatalogueData) => void) => { const c = clone(cat); fn(c); setCat(c); setDirty(true); setMsg(""); };
  const svcKeys = cat.services.map((s) => s.key);

  const save = async () => {
    setBusy(true); setMsg(""); setErrs([]);
    try { const r = await saveCatalogueAdmin(cat); setCat(r.catalogue); setDirty(false); setMsg(ta("Catalogue enregistré. Le site et le bot l'utilisent immédiatement (le site peut mettre jusqu'à une minute à se mettre à jour). {0}", [syncMessage(r.discord)]).trim()); setWarn(syncFailed(r.discord)); }
    catch (e) { fail(e); } finally { setBusy(false); }
  };
  const reset = async () => {
    if (!window.confirm(ta("Remettre les 4 services et 6 formules d'origine à leur état initial ? Les services et formules que vous avez ajoutés sont conservés ; les anciennes demandes ne changent pas."))) return;
    setBusy(true); setErrs([]);
    try { const r = await resetCatalogueAdmin(); setCat(r.catalogue); setDirty(false); setMsg(ta("Valeurs d'origine rétablies.")); } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const addService = () => {
    const key = slug(newKey);
    if (key.length < 2 || svcKeys.includes(key)) { setErrs([ta("Identifiant de service invalide ou déjà utilisé (lettres, chiffres et _, 2 caractères minimum).")]); return; }
    edit((c) => { c.services.push({ key, nom: { fr: ta("Nouveau service") }, description: { fr: "" }, points: [], icon: "sparkles", actif: false, ordre: c.services.length, requiresBrand: false, ticketCategory: "devis", aiNotice: false, questions: [{ name: "description_projet", label: { fr: ta("Décrivez votre projet") }, kind: "long", required: true }] }); });
    setOpen(key); setNewKey(""); setErrs([]);
  };
  const addFormule = () => {
    const key = slug(newKey);
    if (key.length < 2 || cat.formules.some((f) => f.key === key)) { setErrs([ta("Identifiant de formule invalide ou déjà utilisé.")]); return; }
    edit((c) => { c.formules.push({ key, nom: { fr: ta("Nouvelle formule") }, description: { fr: "" }, services: [], actif: false, ordre: c.formules.length }); });
    setOpen(key); setNewKey(""); setErrs([]);
  };
  /** Aucune suppression : un service/une formule est ARCHIVÉ(E) (n'est plus proposé(e), reste consultable et restaurable ; les formules qui le contiennent deviennent indisponibles). */
  const setArchived = (kind: "services" | "formules", key: string, archived: boolean) => {
    if (archived && !window.confirm(ta("Archiver cet élément ? Il disparaît du site et de Discord mais reste consultable et restaurable ; les anciennes demandes ne changent pas."))) return;
    edit((c) => { const x = (c[kind] as { key: string; archived?: boolean }[]).find((e) => e.key === key); if (x) { if (archived) x.archived = true; else delete x.archived; } });
  };

  const Header = ({ id, title, sub, actif, archived, onUp, onDown, onToggle, onArchive }: { id: string; title: string; sub: string; actif: boolean; archived: boolean; onUp: () => void; onDown: () => void; onToggle: () => void; onArchive: () => void }) => (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="flex-1 min-w-40 text-left" onClick={() => setOpen(open === id ? null : id)} aria-expanded={open === id}>
        <span className="font-heading italic text-xl text-white">{title || id}</span>
        <span className="ml-2 text-[11px] font-mono text-white/40">{sub}</span>
        <span className={cn("ml-2 text-[11px] font-body", archived ? "text-white/40" : actif ? "text-emerald-300" : "text-amber-300")}>{archived ? ta("archivé") : actif ? "actif" : ta("désactivé")}</span>
      </button>
      <button type="button" className={btn} onClick={onUp} aria-label={ta("Monter")}>↑</button>
      <button type="button" className={btn} onClick={onDown} aria-label={ta("Descendre")}>↓</button>
      {!archived && <button type="button" className={btn} onClick={onToggle}>{actif ? ta("Désactiver") : ta("Activer")}</button>}
      <button type="button" className={cn(btn, archived ? "" : "text-red-300")} onClick={onArchive}>{archived ? ta("Restaurer") : ta("Archiver")}</button>
    </div>
  );

  return (
    <div className="max-w-4xl space-y-4">
      <p className="text-xs text-white/50 font-body font-light">
        {ta("Le catalogue est la source unique du site (page Services, formulaires) et du bot (panels, tickets, e-mails). Désactiver un service masque ses formules ; archiver ou modifier ne change jamais les anciennes demandes.")}
        {source === "default" && <span className="text-amber-300"> {ta("Catalogue d'origine en usage (aucune modification enregistrée).")}</span>}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {(["services", "formules", "tickets"] as const).map((v) => (
          <button key={v} type="button" onClick={() => { setView(v); setOpen(null); setErrs([]); }} aria-pressed={view === v}
            className={cn("rounded-full border px-4 py-1.5 text-sm font-body transition-colors", view === v ? "border-white bg-white text-black font-medium" : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10")}>
            {v === "services" ? ta("Services ({0})", [cat.services.filter((x) => !x.archived).length]) : v === "formules" ? ta("Formules ({0})", [cat.formules.filter((x) => !x.archived).length]) : ta("Catégories de tickets ({0})", [ticketList.filter((t) => !t.archived).length])}
          </button>
        ))}
        <span className="flex-1" />
        {view !== "tickets" && <input className="glass-field !w-44 !py-1.5 text-xs" placeholder={ta("identifiant du nouveau…")} value={newKey} onChange={(e) => setNewKey(e.target.value)} aria-label={ta("Identifiant du nouvel élément")} />}
        {view !== "tickets" && <button type="button" className={btn} onClick={view === "services" ? addService : addFormule}>{view === "services" ? "+ Service" : "+ Formule"}</button>}
      </div>

      {view === "tickets" && <TicketCategoriesPanel list={ticketList} services={cat.services} onChanged={setTicketList} fail={fail} setMsg={(m, w) => { setMsg(m); setWarn(!!w); }} />}

      {view === "services" && cat.services.map((s: AService, i) => {
        const upd = (fn: (s: AService) => void) => edit((c) => fn(c.services[i]!));
        return (
          <section key={s.key} className={cn("liquid-glass-strong rounded-2xl p-4 space-y-3", s.archived && "opacity-60")}>
            <Header id={s.key} title={s.nom.fr} sub={s.key} actif={s.actif} archived={!!s.archived}
              onUp={() => edit((c) => { c.services = move(c.services, i, -1); })} onDown={() => edit((c) => { c.services = move(c.services, i, 1); })}
              onToggle={() => upd((x) => { x.actif = !x.actif; })} onArchive={() => setArchived("services", s.key, !s.archived)} />
            {open === s.key && (
              <div className="space-y-3 pt-2">
                <Pair label={ta("Nom")} v={s.nom} onChange={(v) => upd((x) => { x.nom = v; })} />
                <Pair label={ta("Description")} v={s.description} long onChange={(v) => upd((x) => { x.description = v; })} />
                <div className="grid sm:grid-cols-2 gap-2">
                  <label className="block"><span className={lab}>{ta("Points forts — une ligne par point (FR)")}</span>
                    <textarea className="glass-field mt-1" rows={4} value={s.points.map((p) => p.fr).join("\n")} onChange={(e) => upd((x) => { const fr = e.target.value.split("\n").filter((l) => l.trim()).slice(0, 6); x.points = fr.map((l, k) => ({ fr: l, ...(x.points[k]?.en ? { en: x.points[k]!.en } : {}) })); })} /></label>
                  <label className="block"><span className={lab}>{ta("Points forts — même ordre (EN, facultatif)")}</span>
                    <textarea className="glass-field mt-1" rows={4} value={s.points.map((p) => p.en ?? "").join("\n")} onChange={(e) => upd((x) => { const en = e.target.value.split("\n"); x.points = x.points.map((p, k) => ({ fr: p.fr, ...(en[k]?.trim() ? { en: en[k]!.trim() } : {}) })); })} /></label>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <label className="block"><span className={lab}>{ta("Icône")}</span>
                    <select className="glass-field mt-1" value={s.icon} onChange={(e) => upd((x) => { x.icon = e.target.value; })}>{icons.map((k) => <option key={k} value={k}>{iconLabel(k)}</option>)}</select></label>
                  <label className="block"><span className={lab}>{ta("Ticket Discord associé")}</span>
                    <select className="glass-field mt-1" value={s.ticketCategory} onChange={(e) => upd((x) => { x.ticketCategory = e.target.value; })}>
                      {ticketList.filter((t) => (t.actif && !t.archived) || t.key === s.ticketCategory).map((t) => <option key={t.key} value={t.key}>{t.emoji} {t.labelFr}{t.archived ? ta(" (archivée)") : ""}</option>)}
                    </select></label>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <label className="inline-flex items-center gap-2 text-sm text-white/80 font-body"><input type="checkbox" checked={s.requiresBrand} onChange={(e) => upd((x) => { x.requiresBrand = e.target.checked; })} /> {ta("Nom de la marque obligatoire")}</label>
                  <label className="inline-flex items-center gap-2 text-sm text-white/80 font-body"><input type="checkbox" checked={s.aiNotice} onChange={(e) => upd((x) => { x.aiNotice = e.target.checked; })} /> {ta("Afficher la mention « plans générés par IA, montés par notre équipe »")}</label>
                </div>
                <ProjectFieldsEditor service={s} defaults={defaultFields[s.key] ?? []} onChange={(fields) => upd((x) => { if (fields) x.projectFields = fields; else delete x.projectFields; })} />
                <h3 className="font-heading italic text-lg text-white pt-1">{ta("Questions du formulaire (")}{s.questions.length})</h3>
                {s.questions.map((q, k) => (
                  <QuestionEditor key={k} q={q} services={svcKeys}
                    onChange={(nq) => upd((x) => { x.questions[k] = nq; })} onMove={(d) => upd((x) => { x.questions = move(x.questions, k, d); })} onDelete={() => upd((x) => { x.questions.splice(k, 1); })} />
                ))}
                <button type="button" className={btn} onClick={() => upd((x) => { x.questions.push({ name: `question_${x.questions.length + 1}`, label: { fr: ta("Nouvelle question") }, kind: "text", required: false }); })}>{ta("+ Question")}</button>
              </div>
            )}
          </section>
        );
      })}

      {view === "formules" && cat.formules.map((f: AFormule, i) => {
        const upd = (fn: (f: AFormule) => void) => edit((c) => fn(c.formules[i]!));
        const unavailable = f.actif && !f.archived && f.services.some((k) => { const sv = cat.services.find((s) => s.key === k); return !sv?.actif || !!sv.archived; });
        return (
          <section key={f.key} className={cn("liquid-glass-strong rounded-2xl p-4 space-y-3", f.archived && "opacity-60")}>
            <Header id={f.key} title={f.nom.fr} sub={f.key} actif={f.actif} archived={!!f.archived}
              onUp={() => edit((c) => { c.formules = move(c.formules, i, -1); })} onDown={() => edit((c) => { c.formules = move(c.formules, i, 1); })}
              onToggle={() => upd((x) => { x.actif = !x.actif; })} onArchive={() => setArchived("formules", f.key, !f.archived)} />
            {unavailable && <p className="text-xs text-amber-300 font-body">{ta("Indisponible sur le site : un de ses services est désactivé ou archivé.")}</p>}
            {open === f.key && (
              <div className="space-y-3 pt-2">
                <Pair label={ta("Nom")} v={f.nom} onChange={(v) => upd((x) => { x.nom = v; })} />
                <Pair label={ta("Description")} v={f.description} long onChange={(v) => upd((x) => { x.description = v; })} />
                <fieldset>
                  <legend className={lab}>{ta("Composition (1 à 3 services — une seule demande et un seul ticket, quelle que soit la composition)")}</legend>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                    {cat.services.map((s) => (
                      <label key={s.key} className="inline-flex items-center gap-2 text-sm text-white/80 font-body">
                        <input type="checkbox" checked={f.services.includes(s.key)} onChange={(e) => upd((x) => { x.services = e.target.checked ? [...x.services, s.key] : x.services.filter((k) => k !== s.key); })} />
                        {s.nom.fr}{(!s.actif || s.archived) && <span className="text-amber-300 text-[11px]">({s.archived ? ta("archivé") : ta("désactivé")})</span>}
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-white/40 font-body">{ta("Le premier service coché détermine la catégorie du ticket Discord.")}</p>
                </fieldset>
              </div>
            )}
          </section>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void save()} disabled={busy || !dirty} className="bg-white text-black rounded-full px-6 py-2.5 text-sm font-medium font-body hover:bg-white/90 transition-colors disabled:opacity-50">
          {busy ? ta("Enregistrement…") : dirty ? ta("Enregistrer le catalogue") : ta("Aucune modification")}
        </button>
        {dirty && <button type="button" className={btn} onClick={refresh}>{ta("Annuler les modifications")}</button>}
        <span className="flex-1" />
        <button type="button" className={btn} onClick={() => void reset()} disabled={busy}>{ta("Revenir aux valeurs d'origine")}</button>
      </div>
      <div aria-live="polite">
        {msg && <p className={cn("text-xs font-body", warn ? "text-amber-300" : "text-emerald-300/90")}>{msg}</p>}
        {errs.length > 0 && (
          <ul role="alert" className="text-xs text-red-300 font-body list-disc pl-5 space-y-0.5">{errs.map((e, k) => <li key={k}>{e}</li>)}</ul>
        )}
      </div>
    </div>
  );
}
