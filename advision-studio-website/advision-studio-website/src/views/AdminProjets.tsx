import { useCallback, useEffect, useMemo, useState } from "react";
import LoadState from "@/components/LoadState";
import { ApiError } from "@/lib/api";
import {
  addProjetNote, createProjet, getCatalogueAdmin, getProjet, listPrestationsAdmin, listProjets, updateProjet,
  type AdminCatalogueData, type AProjectField, type AProjet, type APrestation, type ProjetDetail, type ProjetInput,
} from "@/lib/admin";
import { cn } from "@/utils/cn";
import { ta, taServer } from "@/lib/adminI18n";

/**
 * Onglet « Projets » — suivi UNIVERSEL : champs communs (service, prestation, formule, dates, statut, notes, historique) + champs de suivi propres à chaque service
 * (définis dans l'onglet Catalogue). Les anciens projets vidéo (type / format / durée) restent affichés. Archivage réversible, jamais de suppression.
 */
const btn = "rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-body text-white/80 hover:bg-white/10 transition-colors disabled:opacity-40";
const lab = "block text-xs font-medium tracking-wide text-white/75 font-body";
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

interface Draft {
  id: string | null; titre: string; statut: string; clientNom: string; marque: string; description: string; serviceKey: string; formuleKey: string; prestationId: string;
  dateDebut: string; datePrevue: string; dateLivraisonReelle: string; details: Record<string, Record<string, string>>; archived: boolean;
}
const emptyDraft = (statut: string): Draft => ({ id: null, titre: "", statut, clientNom: "", marque: "", description: "", serviceKey: "", formuleKey: "", prestationId: "", dateDebut: "", datePrevue: "", dateLivraisonReelle: "", details: {}, archived: false });
const parseDetails = (json: string): Record<string, Record<string, string>> => { try { const x = JSON.parse(json); return x && typeof x === "object" ? x : {}; } catch { return {}; } };
const draftOf = (p: AProjet): Draft => ({
  id: p.id, titre: p.titre, statut: p.statut, clientNom: p.clientNom ?? "", marque: p.marque ?? "", description: p.description ?? "", serviceKey: p.serviceKey ?? "", formuleKey: p.formuleKey ?? "", prestationId: p.prestationId ?? "",
  dateDebut: day(p.dateDebut), datePrevue: day(p.datePrevue), dateLivraisonReelle: day(p.dateLivraisonReelle), details: parseDetails(p.details), archived: p.archived,
});

/** Rubriques de champs de suivi : celles du service principal et des services de la formule (même règle que le serveur). */
export function sectionsFor(cat: AdminCatalogueData, defaults: Record<string, AProjectField[]>, serviceKey: string, formuleKey: string) {
  const keys = new Set<string>(); if (serviceKey) keys.add(serviceKey);
  for (const k of cat.formules.find((f) => f.key === formuleKey)?.services ?? []) keys.add(k);
  return [...keys].map((k) => cat.services.find((s) => s.key === k)).filter((s): s is NonNullable<typeof s> => !!s).map((s) => ({ service: s.key, nom: s.nom.fr, fields: s.projectFields ?? defaults[s.key] ?? [] }));
}

export default function ProjetsTab({ onExpired }: { onExpired: () => void }) {
  const [list, setList] = useState<AProjet[]>([]);
  const [statuts, setStatuts] = useState<{ key: string; label: string }[]>([]);
  const [cat, setCat] = useState<AdminCatalogueData | null>(null);
  const [defaults, setDefaults] = useState<Record<string, AProjectField[]>>({});
  const [prestations, setPrestations] = useState<APrestation[]>([]);
  const [load, setLoad] = useState<"loading" | "ok" | "error">("loading");
  const [filter, setFilter] = useState(""); const [q, setQ] = useState(""); const [archived, setArchived] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null); const [detail, setDetail] = useState<ProjetDetail | null>(null);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(""); const [errs, setErrs] = useState<string[]>([]); const [note, setNote] = useState("");

  const fail = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) { onExpired(); return; }
    setErrs([e instanceof ApiError && e.status ? taServer(e.message) : ta("Serveur injoignable, réessayez.")]);
  }, [onExpired]);

  const reload = useCallback(async () => {
    try {
      const [l, c, p] = await Promise.all([listProjets({ service: filter, archived, q }), getCatalogueAdmin(), listPrestationsAdmin(false)]);
      setList(l.projets); setStatuts(l.statuts); setCat(c.catalogue); setDefaults(c.defaultProjectFields ?? {}); setPrestations(p); setLoad("ok");
    } catch (e) { fail(e); setLoad((x) => (x === "ok" ? "ok" : "error")); }
  }, [filter, archived, q, fail]);
  useEffect(() => { void reload(); }, [reload]);

  const sections = useMemo(() => (cat && draft ? sectionsFor(cat, defaults, draft.serviceKey, draft.formuleKey) : []), [cat, defaults, draft]);
  if (load !== "ok" || !cat) return <LoadState state={load === "ok" ? "loading" : load} onRetry={() => { setLoad("loading"); void reload(); }} />;

  const open = async (p: AProjet) => {
    if (draft?.id === p.id) { setDraft(null); setDetail(null); return; }
    setErrs([]); setMsg("");
    try { const d = await getProjet(p.id); setDetail(d); setDraft(draftOf(d.projet)); } catch (e) { fail(e); }
  };
  const setField = (svc: string, name: string, v: string) => setDraft((d) => (d ? { ...d, details: { ...d.details, [svc]: { ...(d.details[svc] ?? {}), [name]: v } } } : d));
  const body = (d: Draft): ProjetInput => ({
    titre: d.titre, statut: d.statut, clientNom: d.clientNom || null, marque: d.marque || null, description: d.description || null,
    serviceKey: d.serviceKey || null, formuleKey: d.formuleKey || null, prestationId: d.prestationId || null,
    dateDebut: d.dateDebut || null, datePrevue: d.datePrevue || null, dateLivraisonReelle: d.dateLivraisonReelle || null,
    details: Object.fromEntries(Object.entries(d.details).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).filter(([, x]) => x.trim()))]).filter(([, v]) => Object.keys(v as object).length > 0)),
  });
  const save = async () => {
    if (!draft) return;
    if (!draft.titre.trim()) { setErrs([ta("Le titre est requis.")]); return; }
    setBusy(true); setErrs([]); setMsg("");
    try {
      if (draft.id) { await updateProjet(draft.id, body(draft)); const d = await getProjet(draft.id); setDetail(d); setDraft(draftOf(d.projet)); setMsg(ta("Projet enregistré.")); }
      else { const r = await createProjet(body(draft)); const d = await getProjet(r.projet.id); setDetail(d); setDraft(draftOf(d.projet)); setMsg(ta("Projet créé.")); }
      await reload();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };
  const toggleArchive = async (p: AProjet) => {
    setBusy(true); setErrs([]);
    try { await updateProjet(p.id, { archived: !p.archived }); setMsg(p.archived ? ta("Projet restauré.") : ta("Projet archivé (réversible).")); setDraft(null); setDetail(null); await reload(); } catch (e) { fail(e); } finally { setBusy(false); }
  };
  const addNote = async () => {
    if (!draft?.id || !note.trim()) return;
    try { await addProjetNote(draft.id, note.trim()); setNote(""); setDetail(await getProjet(draft.id)); } catch (e) { fail(e); }
  };
  const svcName = (k: string | null) => (k ? cat.services.find((s) => s.key === k)?.nom.fr ?? k : ta("Sans service"));
  const statutLabel = (k: string) => statuts.find((s) => s.key === k)?.label ?? k;
  const legacy = detail?.projet && (detail.projet.typePub || detail.projet.format || detail.projet.duree);

  return (
    <div className="max-w-4xl space-y-4">
      <p className="text-xs text-white/50 font-body font-light">{ta("Chaque projet suit son service : les champs de suivi proposés dépendent du service et de la formule (réglables dans l'onglet Catalogue). Une modification est inscrite dans l'historique ; « Archiver » est réversible, aucun projet n'est supprimé.")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <select className="glass-field !w-auto !py-1.5 text-xs" aria-label={ta("Filtrer les projets par service")} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">{ta("Tous les services")}</option>{cat.services.map((s) => <option key={s.key} value={s.key}>{s.nom.fr}</option>)}
        </select>
        <input className="glass-field !w-56 !py-1.5 text-xs" placeholder={ta("Rechercher…")} aria-label={ta("Rechercher un projet")} value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="inline-flex items-center gap-1.5 text-xs text-white/75 font-body"><input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} /> {ta("Afficher les archivés")}</label>
        <span className="flex-1" />
        <button type="button" className={btn} onClick={() => { setDraft(emptyDraft(statuts[0]?.key ?? "nouvelle_demande")); setDetail(null); setErrs([]); setMsg(""); }}>{ta("+ Projet")}</button>
      </div>

      {draft && (
        <section className="liquid-glass liquid-glass--vision rounded-2xl p-4 space-y-3" aria-label={ta("Fiche projet")}>
          <h3 className="font-heading italic text-lg text-white">{draft.id ? `${detail?.projet.ref ?? ""} — ${draft.titre || ta("Projet")}` : ta("Nouveau projet")}</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="block"><span className={lab}>{ta("Titre *")}</span><input className="glass-field mt-1" maxLength={140} value={draft.titre} onChange={(e) => setDraft({ ...draft, titre: e.target.value })} /></label>
            <label className="block"><span className={lab}>{ta("Statut")}</span><select className="glass-field mt-1" value={draft.statut} onChange={(e) => setDraft({ ...draft, statut: e.target.value })}>{statuts.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select></label>
            <label className="block"><span className={lab}>{ta("Client")}</span><input className="glass-field mt-1" maxLength={120} value={draft.clientNom} onChange={(e) => setDraft({ ...draft, clientNom: e.target.value })} /></label>
            <label className="block"><span className={lab}>{ta("Marque / projet")}</span><input className="glass-field mt-1" maxLength={120} value={draft.marque} onChange={(e) => setDraft({ ...draft, marque: e.target.value })} /></label>
            <label className="block"><span className={lab}>{ta("Service")}</span><select className="glass-field mt-1" value={draft.serviceKey} onChange={(e) => setDraft({ ...draft, serviceKey: e.target.value })}><option value="">{ta("— Aucun —")}</option>{cat.services.map((s) => <option key={s.key} value={s.key}>{s.nom.fr}{s.archived ? ta(" (archivé)") : ""}</option>)}</select></label>
            <label className="block"><span className={lab}>{ta("Formule")}</span><select className="glass-field mt-1" value={draft.formuleKey} onChange={(e) => setDraft({ ...draft, formuleKey: e.target.value })}><option value="">{ta("— Aucune —")}</option>{cat.formules.map((f) => <option key={f.key} value={f.key}>{f.nom.fr}</option>)}</select></label>
            <label className="block sm:col-span-2"><span className={lab}>{ta("Prestation")}</span><select className="glass-field mt-1" value={draft.prestationId} onChange={(e) => setDraft({ ...draft, prestationId: e.target.value })}><option value="">{ta("— Aucune —")}</option>{prestations.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select></label>
          </div>
          <div className="grid sm:grid-cols-3 gap-2">
            <label className="block"><span className={lab}>{ta("Début")}</span><input type="date" className="glass-field mt-1" value={draft.dateDebut} onChange={(e) => setDraft({ ...draft, dateDebut: e.target.value })} /></label>
            <label className="block"><span className={lab}>{ta("Livraison prévue")}</span><input type="date" className="glass-field mt-1" value={draft.datePrevue} onChange={(e) => setDraft({ ...draft, datePrevue: e.target.value })} /></label>
            <label className="block"><span className={lab}>{ta("Livraison réelle")}</span><input type="date" className="glass-field mt-1" value={draft.dateLivraisonReelle} onChange={(e) => setDraft({ ...draft, dateLivraisonReelle: e.target.value })} /></label>
          </div>
          <label className="block"><span className={lab}>{ta("Description")}</span><textarea className="glass-field mt-1" rows={3} maxLength={3000} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>

          {sections.map((sec) => (
            <fieldset key={sec.service} className="rounded-xl border border-white/10 p-3 space-y-2">
              <legend className={cn(lab, "px-1")}>{ta("Suivi —")} {sec.nom}</legend>
              {sec.fields.length === 0 && <p className="text-xs text-white/45 font-body">{ta("Aucun champ de suivi défini pour ce service (voir l'onglet Catalogue).")}</p>}
              {sec.fields.map((f) => (
                <label key={f.name} className="block"><span className={lab}>{f.label.fr}</span>
                  {f.kind === "long"
                    ? <textarea className="glass-field mt-1" rows={2} maxLength={1000} value={draft.details[sec.service]?.[f.name] ?? ""} onChange={(e) => setField(sec.service, f.name, e.target.value)} />
                    : <input className="glass-field mt-1" maxLength={1000} value={draft.details[sec.service]?.[f.name] ?? ""} onChange={(e) => setField(sec.service, f.name, e.target.value)} />}
                </label>
              ))}
            </fieldset>
          ))}
          {legacy && detail && (
            <p className="text-xs text-white/50 font-body" data-testid="legacy-video">{ta("Ancien suivi vidéo (conservé) :")} {[detail.projet.typePub, detail.projet.format, detail.projet.duree].filter(Boolean).join(" · ")}</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={busy} onClick={() => void save()} className="bg-white text-black rounded-full px-5 py-2 text-sm font-medium font-body hover:bg-white/90 transition-colors disabled:opacity-50">{busy ? ta("Enregistrement…") : draft.id ? ta("Enregistrer le projet") : ta("Créer le projet")}</button>
            <button type="button" className={btn} onClick={() => { setDraft(null); setDetail(null); }}>{ta("Fermer")}</button>
          </div>

          {detail && draft.id && (
            <div className="grid md:grid-cols-2 gap-4 pt-2">
              <div>
                <span className={lab}>{ta("Historique des modifications")}</span>
                <ul className="mt-1 space-y-1 text-xs text-white/65 font-body max-h-48 overflow-y-auto scrollbar-slim" data-testid="project-history">
                  {detail.changes.length === 0 && <li className="text-white/40">{ta("Aucune modification enregistrée.")}</li>}
                  {detail.changes.map((c, i) => <li key={i}><span className="text-white/40">{(c.at ?? "").slice(0, 10)} · {c.by} · </span>{c.champ} : {c.avant} → {c.apres}</li>)}
                </ul>
              </div>
              <div>
                <span className={lab}>{ta("Notes internes")}</span>
                <ul className="mt-1 space-y-1 text-xs text-white/65 font-body max-h-32 overflow-y-auto scrollbar-slim">{(detail.notes ?? []).map((n, i) => <li key={i}><span className="text-white/40">{(n.at ?? "").slice(0, 10)} · {n.by} · </span>{n.text}</li>)}</ul>
                <div className="mt-2 flex gap-2"><input className="glass-field !py-1.5 text-xs" aria-label={ta("Nouvelle note interne")} placeholder={ta("Ajouter une note…")} value={note} maxLength={1500} onChange={(e) => setNote(e.target.value)} /><button type="button" className={btn} onClick={() => void addNote()}>{ta("Ajouter")}</button></div>
              </div>
            </div>
          )}
        </section>
      )}

      {list.length === 0 && !draft && <p className="text-sm text-white/50 font-body">{ta("Aucun projet")}{filter || q ? " pour ce filtre" : ta(" pour le moment : convertissez une demande (onglet Demandes) ou créez-en un avec « + Projet »")}.</p>}
      {list.map((p) => (
        <section key={p.id} className={cn("liquid-glass liquid-glass--vision rounded-2xl p-4", p.archived && "opacity-60")}>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="flex-1 min-w-48 text-left" aria-expanded={draft?.id === p.id} onClick={() => void open(p)}>
              <span className="font-heading italic text-xl text-white">{p.titre}</span><span className="ml-2 text-[11px] font-mono text-white/40">{p.ref}</span>
              <span className="block text-[11px] text-white/45 font-body">{svcName(p.serviceKey)} · {statutLabel(p.statut)}{p.clientNom ? ` · ${p.clientNom}` : ""}{p.datePrevue ? ta(" · prévu {0}", [day(p.datePrevue)]) : ""}</span>
            </button>
            {p.archived && <span className="text-[11px] text-amber-300 font-body">{ta("archivé")}</span>}
            <button type="button" className={btn} disabled={busy} onClick={() => void toggleArchive(p)}>{p.archived ? ta("Restaurer") : ta("Archiver")}</button>
          </div>
        </section>
      ))}
      <div aria-live="polite">
        {msg && <p className="text-xs text-emerald-300/90 font-body">{msg}</p>}
        {errs.length > 0 && <ul role="alert" className="text-xs text-red-300 font-body list-disc pl-5">{errs.map((e, k) => <li key={k}>{e}</li>)}</ul>}
      </div>
    </div>
  );
}
