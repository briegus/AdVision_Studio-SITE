import { useCallback, useEffect, useMemo, useState } from "react";
import LoadState from "@/components/LoadState";
import { ApiError } from "@/lib/api";
import {
  archivePrestation, createCategory, createPrestation, createServiceCategory, getRattachement, listPrestationsAdmin,
  previewPrestation, reorderPrestations, runAutoRattachement, saveRattachement, syncDiscordCatalogue, syncFailed, syncMessage, updateCategory, updatePrestation,
  type APrestation, type DiscordSync, type EmbedPreview, type POption, type PrixMode, type RattachementData,
} from "@/lib/admin";
import { cn } from "@/utils/cn";
import { emptyDraft, draftOf, buildInput, type Draft } from "@/lib/prestationForm";
import { ta, taServer } from "@/lib/adminI18n";

/**
 * Onglet « Prestations » — prestations détaillées (tarif, délai, options, visibilité) et rattachement des catégories de l'ancien catalogue aux services.
 * Source unique : la base partagée avec Discord. Chaque enregistrement actualise les panels Discord déjà publiés et le dit clairement (succès ou échec).
 * Jamais de tarif inventé : un prix n'est affiché que s'il est saisi ici. Archiver est réversible ; aucune suppression définitive n'existe (prestations, options, catégories).
 */
const PRIX_MODES: PrixMode[] = ["devis", "aucun", "fixe", "a_partir", "fourchette"];
const prixLabel = (k: PrixMode): string => ({
  devis: ta("Sur devis (aucun montant)"), aucun: ta("Ne pas afficher de tarif"), fixe: ta("Prix fixe"), a_partir: ta("À partir de…"), fourchette: ta("Fourchette (minimum – maximum)"),
} as Record<PrixMode, string>)[k];
const btn = "rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-body text-white/80 hover:bg-white/10 transition-colors disabled:opacity-40";
const lab = "block text-xs font-medium tracking-wide text-white/75 font-body";
const chip = (on: boolean) => cn("rounded-full px-2 py-0.5 text-[11px] font-body", on ? "bg-emerald-400/15 text-emerald-200" : "bg-white/5 text-white/40");

type Run = (fn: () => Promise<{ discord?: DiscordSync } | void>, okMsg: string) => Promise<boolean>;

function PrestationForm({ draft, setDraft, ratt, busy, onSave, onCancel, onPreview, preview }: {
  draft: Draft; setDraft: (d: Draft) => void; ratt: RattachementData; busy: boolean; onSave: () => void; onCancel: () => void; onPreview: () => void; preview: EmbedPreview | null;
}) {
  const upd = (p: Partial<Draft>) => setDraft({ ...draft, ...p });
  const moveItem = <T,>(list: T[], i: number, dir: -1 | 1): T[] => { const n = [...list]; const j = i + dir; if (j < 0 || j >= n.length) return n; [n[i], n[j]] = [n[j]!, n[i]!]; return n; };
  const setOpt = (i: number, p: Partial<POption>) => upd({ options: draft.options.map((o, k) => (k === i ? { ...o, ...p } : o)) });
  const servicesWithoutCategory = ratt.services.filter((s) => s.categories.length === 0);
  const catLinked = ratt.services.some((s) => s.categories.some((c) => c.id === draft.cat));
  const chosenNoService = draft.cat && !draft.cat.startsWith("service:") && !catLinked;
  return (
    <div className="space-y-3 pt-2">
      <div className="grid sm:grid-cols-2 gap-2">
        <label className="block"><span className={lab}>{ta("Nom (FR) *")}</span><input className="glass-field mt-1" value={draft.nom} maxLength={140} onChange={(e) => upd({ nom: e.target.value })} /></label>
        <label className="block"><span className={lab}>{ta("Catégorie (et donc service)")}</span>
          <select className="glass-field mt-1" value={draft.cat} onChange={(e) => upd({ cat: e.target.value })}>
            <option value="">{ta("— Sans catégorie (visible sur Discord seulement) —")}</option>
            {ratt.services.map((s) => s.categories.length > 0 && (
              <optgroup key={s.key} label={`${s.nom}${s.actif ? "" : ta(" (désactivé)")}`}>{s.categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}</optgroup>
            ))}
            {ratt.orphans.length > 0 && <optgroup label={ta("Catégories sans service")}>{ratt.orphans.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}</optgroup>}
            {servicesWithoutCategory.length > 0 && (
              <optgroup label={ta("Nouveau (la catégorie du service est créée à l'enregistrement)")}>{servicesWithoutCategory.map((s) => <option key={s.key} value={`service:${s.key}`}>{s.nom}</option>)}</optgroup>
            )}
          </select>
        </label>
      </div>
      {(!draft.cat || chosenNoService) && <p className="text-xs text-amber-300 font-body">{ta("Cette prestation ne s'affichera pas sur le site tant que sa catégorie n'est pas rattachée à un service (onglet « Rattachement »).")}</p>}
      <label className="block"><span className={lab}>{ta("Description (FR) *")}</span><textarea className="glass-field mt-1" rows={3} maxLength={3500} value={draft.description} onChange={(e) => upd({ description: e.target.value })} /></label>

      <fieldset className="rounded-xl border border-white/10 p-3 space-y-2">
        <legend className={cn(lab, "px-1")}>{ta("English (EN) — facultatif : si vide, le site affiche le français")}</legend>
        <div className="grid sm:grid-cols-2 gap-2">
          <label className="block"><span className={lab}>{ta("Name (EN)")}</span><input className="glass-field mt-1" value={draft.nomEn} maxLength={140} onChange={(e) => upd({ nomEn: e.target.value })} /></label>
          <label className="block"><span className={lab}>{ta("Lead time (EN)")}</span><input className="glass-field mt-1" value={draft.delaiEn} maxLength={200} onChange={(e) => upd({ delaiEn: e.target.value })} /></label>
        </div>
        <label className="block"><span className={lab}>{ta("Description (EN)")}</span><textarea className="glass-field mt-1" rows={2} maxLength={3500} value={draft.descriptionEn} onChange={(e) => upd({ descriptionEn: e.target.value })} /></label>
        <div className="grid sm:grid-cols-2 gap-2">
          <label className="block"><span className={lab}>{ta("Format / length (EN)")}</span><input className="glass-field mt-1" value={draft.formatDureeEn} maxLength={300} onChange={(e) => upd({ formatDureeEn: e.target.value })} /></label>
          <label className="block"><span className={lab}>{ta("Conditions (EN)")}</span><input className="glass-field mt-1" value={draft.conditionsEn} maxLength={1500} onChange={(e) => upd({ conditionsEn: e.target.value })} /></label>
        </div>
        {!draft.nomEn.trim() && <p className="text-[11px] text-amber-300 font-body">{ta("Traduction anglaise du nom manquante.")}</p>}
      </fieldset>

      <fieldset className="rounded-xl border border-white/10 p-3 space-y-2">
        <legend className={cn(lab, "px-1")}>{ta("Tarif — jamais affiché sans montant saisi ici")}</legend>
        <div className="grid sm:grid-cols-4 gap-2">
          <label className="block sm:col-span-2"><span className={lab}>{ta("Mode")}</span>
            <select className="glass-field mt-1" value={draft.prixMode} onChange={(e) => upd({ prixMode: e.target.value as PrixMode })}>{PRIX_MODES.map((k) => <option key={k} value={k}>{prixLabel(k)}</option>)}</select></label>
          {(draft.prixMode === "fixe" || draft.prixMode === "a_partir" || draft.prixMode === "fourchette") && (
            <label className="block"><span className={lab}>{draft.prixMode === "fourchette" ? ta("Minimum") : ta("Montant")}</span><input className="glass-field mt-1" inputMode="decimal" value={draft.prixMin} onChange={(e) => upd({ prixMin: e.target.value })} /></label>
          )}
          {draft.prixMode === "fourchette" && <label className="block"><span className={lab}>{ta("Maximum")}</span><input className="glass-field mt-1" inputMode="decimal" value={draft.prixMax} onChange={(e) => upd({ prixMax: e.target.value })} /></label>}
        </div>
        {(draft.prixMode === "fixe" || draft.prixMode === "a_partir" || draft.prixMode === "fourchette") && (
          <label className="block max-w-[8rem]"><span className={lab}>{ta("Devise")}</span><input className="glass-field mt-1" maxLength={5} value={draft.devise} onChange={(e) => upd({ devise: e.target.value })} /></label>
        )}
      </fieldset>

      <div className="grid sm:grid-cols-2 gap-2">
        <label className="block"><span className={lab}>{ta("Délai indicatif (facultatif)")}</span><input className="glass-field mt-1" maxLength={200} value={draft.delai} placeholder={ta("ex : à confirmer après étude")} onChange={(e) => upd({ delai: e.target.value })} /></label>
        <label className="block"><span className={lab}>{ta("Format / durée (facultatif)")}</span><input className="glass-field mt-1" maxLength={300} value={draft.formatDuree} onChange={(e) => upd({ formatDuree: e.target.value })} /></label>
      </div>
      <label className="block"><span className={lab}>{ta("Conditions particulières (facultatif)")}</span><textarea className="glass-field mt-1" rows={2} maxLength={1500} value={draft.conditions} onChange={(e) => upd({ conditions: e.target.value })} /></label>
      <label className="block"><span className={lab}>{ta("Image (lien https, facultatif — affichée sur Discord)")}</span><input className="glass-field mt-1" value={draft.imageUrl} onChange={(e) => upd({ imageUrl: e.target.value })} /></label>

      <div className="space-y-2">
        <span className={lab}>{ta("Options (")}{draft.options.length}{ta("/20) — « Information » : présentée au client ; « Au choix » : le client peut la cocher (enregistrée avec sa demande)")}</span>
        {draft.options.map((o, i) => (
          <fieldset key={o.id ?? `n${i}`} className={cn("rounded-xl border border-white/10 p-3 space-y-2", o.actif === false && "opacity-60")}>
            <legend className={cn(lab, "px-1")}>{ta("Option")} {i + 1}{o.actif === false ? ta(" (désactivée)") : ""}</legend>
            <div className="grid sm:grid-cols-[1.4fr_1fr_0.8fr] gap-2">
              <input className="glass-field" placeholder={ta("Nom (FR)")} aria-label={ta("Nom de l'option")} maxLength={100} value={o.nom} onChange={(e) => setOpt(i, { nom: e.target.value })} />
              <input className="glass-field" placeholder={ta("Name (EN)")} aria-label={ta("Name of the option (EN)")} maxLength={100} value={o.nomEn ?? ""} onChange={(e) => setOpt(i, { nomEn: e.target.value })} />
              <input className="glass-field" placeholder={ta("Supplément (texte libre)")} aria-label={ta("Prix de l'option")} maxLength={50} value={o.prix ?? ""} onChange={(e) => setOpt(i, { prix: e.target.value })} />
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <input className="glass-field" placeholder={ta("Description (FR, facultatif)")} aria-label={ta("Description de l'option")} maxLength={300} value={o.description ?? ""} onChange={(e) => setOpt(i, { description: e.target.value })} />
              <input className="glass-field" placeholder={ta("Description (EN, optional)")} aria-label={ta("Description of the option (EN)")} maxLength={300} value={o.descriptionEn ?? ""} onChange={(e) => setOpt(i, { descriptionEn: e.target.value })} />
              <input className="glass-field" placeholder={ta("Conditions (FR, facultatif)")} aria-label={ta("Conditions de l'option")} maxLength={300} value={o.conditions ?? ""} onChange={(e) => setOpt(i, { conditions: e.target.value })} />
              <input className="glass-field" placeholder={ta("Conditions (EN, optional)")} aria-label={ta("Conditions of the option (EN)")} maxLength={300} value={o.conditionsEn ?? ""} onChange={(e) => setOpt(i, { conditionsEn: e.target.value })} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select className="glass-field !w-auto !py-1 text-xs" aria-label={ta("Fonctionnement de l'option")} value={o.mode ?? "info"} onChange={(e) => setOpt(i, { mode: e.target.value as "info" | "select" })}>
                <option value="info">{ta("Information (rien à choisir)")}</option><option value="select">{ta("Au choix du client")}</option>
              </select>
              <label className="inline-flex items-center gap-1.5 text-xs text-white/75 font-body"><input type="checkbox" checked={o.actif !== false} onChange={(e) => setOpt(i, { actif: e.target.checked })} /> {ta("Active")}</label>
              <span className="flex-1" />
              <button type="button" className={btn} disabled={i === 0} onClick={() => upd({ options: moveItem(draft.options, i, -1) })} aria-label={ta("Monter l'option")}>↑</button>
              <button type="button" className={btn} disabled={i === draft.options.length - 1} onClick={() => upd({ options: moveItem(draft.options, i, 1) })} aria-label={ta("Descendre l'option")}>↓</button>
              {!o.id && <button type="button" className={cn(btn, "text-red-300")} onClick={() => upd({ options: draft.options.filter((_, k) => k !== i) })} aria-label={ta("Retirer l'option")}>{ta("Retirer")}</button>}
            </div>
          </fieldset>
        ))}
        {draft.options.length < 20 && <button type="button" className={btn} onClick={() => upd({ options: [...draft.options, { nom: "", mode: "select", actif: true }] })}>{ta("+ Option")}</button>}
        <p className="text-[11px] text-white/40 font-body">{ta("Une option déjà enregistrée ne se supprime pas : désactivez-la (les demandes passées la conservent).")}</p>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <label className="inline-flex items-center gap-2 text-sm text-white/80 font-body"><input type="checkbox" checked={draft.actif} onChange={(e) => upd({ actif: e.target.checked })} /> {ta("Active")}</label>
        <label className="inline-flex items-center gap-2 text-sm text-white/80 font-body"><input type="checkbox" checked={draft.visibleSite} onChange={(e) => upd({ visibleSite: e.target.checked })} /> {ta("Visible sur le site")}</label>
        <label className="inline-flex items-center gap-2 text-sm text-white/80 font-body"><input type="checkbox" checked={draft.visibleDiscord} onChange={(e) => upd({ visibleDiscord: e.target.checked })} /> {ta("Visible sur Discord")}</label>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button type="button" disabled={busy} onClick={onSave} className="bg-white text-black rounded-full px-5 py-2 text-sm font-medium font-body hover:bg-white/90 transition-colors disabled:opacity-50">{busy ? ta("Enregistrement…") : draft.id ? ta("Enregistrer la prestation") : ta("Créer la prestation")}</button>
        <button type="button" className={btn} onClick={onPreview} disabled={busy}>{ta("Aperçu de la fiche Discord")}</button>
        <button type="button" className={btn} onClick={onCancel}>{ta("Fermer sans enregistrer")}</button>
      </div>
      {preview && (
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 max-w-lg" aria-label={ta("Aperçu de la fiche Discord")}>
          <p className="text-sm font-medium text-white font-body">{preview.title}</p>
          <p className="mt-1 text-xs text-white/65 font-body whitespace-pre-line">{preview.description}</p>
          {preview.fields?.map((f) => <p key={f.name} className="mt-1.5 text-xs font-body"><span className="text-white/45">{f.name} : </span><span className="text-white/85 whitespace-pre-line">{f.value}</span></p>)}
          {preview.footer?.text && <p className="mt-2 text-[11px] text-white/35 font-body">{preview.footer.text}</p>}
        </div>
      )}
    </div>
  );
}

function Rattachement({ ratt, run, busy, reload }: { ratt: RattachementData; run: Run; busy: boolean; reload: () => void }) {
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [catEdit, setCatEdit] = useState<Record<string, string>>({});
  const [catEditEn, setCatEditEn] = useState<Record<string, string>>({});
  const [newCat, setNewCat] = useState("");
  const current = (id: string): string => ratt.services.find((s) => s.categories.some((c) => c.id === id))?.key ?? "";
  const value = (id: string) => assign[id] ?? current(id);
  const changes = Object.entries(assign).filter(([id, v]) => v !== current(id));
  const row = (id: string, nom: string, count: number, note?: string) => (
    <div key={id} className="flex flex-wrap items-center gap-2 rounded-lg bg-black/20 px-3 py-2">
      <span className="flex-1 min-w-40 text-sm text-white font-body">{nom}<span className="ml-2 text-[11px] text-white/40">{count} {ta("prestation(s)")}</span>{note && <span className="ml-2 text-[11px] text-amber-300">{note}</span>}</span>
      <select className="glass-field !w-auto !py-1 text-xs" value={value(id)} aria-label={ta("Service de la catégorie {0}", [nom])} onChange={(e) => setAssign((a) => ({ ...a, [id]: e.target.value }))}>
        <option value="">{ta("Aucun service (laisser libre)")}</option>
        {ratt.services.map((s) => <option key={s.key} value={s.key}>{s.nom}{s.actif ? "" : ta(" (désactivé)")}</option>)}
      </select>
    </div>
  );
  return (
    <div className="space-y-4">
      <p className="text-xs text-white/50 font-body font-light">
        {ta("Les anciennes catégories de prestations restent intactes : on choisit ici à quel")} <b className="text-white/70">{ta("service")}</b> {ta("chacune appartient. Les prestations d'un service désactivé disparaissent du site et de Discord ; une catégorie sans service reste visible sur Discord (compatibilité) mais pas sur le site. Rien n'est supprimé ni déplacé en base.")}
      </p>

      <section className="liquid-glass-strong rounded-2xl p-4 space-y-2">
        <h3 className="font-heading italic text-lg text-white">{ta("Rattachement automatique")}</h3>
        {ratt.pendingAuto.length === 0 ? (
          <p className="text-xs text-white/50 font-body">{ta("Rien à proposer : toutes les catégories reconnaissables par leur nom sont déjà rattachées et enregistrées.")}</p>
        ) : (
          <>
            <p className="text-xs text-white/60 font-body">{ratt.pendingAuto.length} {ta("rattachement(s) déduit(s) du nom, appliqués pour l'instant mais")} <b>{ta("pas encore enregistrés")}</b> :</p>
            <ul className="text-xs text-white/75 font-body list-disc pl-5">{ratt.pendingAuto.map((p) => <li key={p.categorieId}>« {p.categorie} » → {p.serviceNom}</li>)}</ul>
            <button type="button" className={btn} disabled={busy} onClick={() => { if (window.confirm(ta("Enregistrer ces {0} rattachements ? Aucune donnée n'est supprimée ; vous pourrez les modifier ensuite.", [ratt.pendingAuto.length]))) void run(async () => { const r = await runAutoRattachement(); return r; }, ta("Rattachement automatique enregistré.")).then((ok) => { if (ok) void reload(); }); }}>
              {ta("Lancer et enregistrer le rattachement automatique")}
            </button>
          </>
        )}
      </section>

      {ratt.services.map((s) => (
        <section key={s.key} className="liquid-glass-strong rounded-2xl p-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading italic text-lg text-white">{s.nom}</h3>
            <span className="text-[11px] font-mono text-white/40">{s.key}</span>
            <span className={cn("text-[11px] font-body", s.actif ? "text-emerald-300" : "text-amber-300")}>{s.actif ? "actif" : ta("désactivé")}</span>
            <span className="flex-1" />
            {s.categories.length === 0 && <button type="button" className={btn} disabled={busy} onClick={() => void run(() => createServiceCategory(s.key), ta("Catégorie créée pour « {0} ».", [s.nom])).then((ok) => { if (ok) void reload(); })}>{ta("Créer sa catégorie")}</button>}
          </div>
          {s.categories.length === 0 ? <p className="text-xs text-white/45 font-body">{ta("Aucune catégorie rattachée : aucune prestation détaillée pour ce service.")}</p> : s.categories.map((c) => row(c.id, c.nom, c.prestations, c.auto ? ta("déduit du nom, non enregistré") : undefined))}
        </section>
      ))}

      <section className="liquid-glass-strong rounded-2xl p-4 space-y-2">
        <h3 className="font-heading italic text-lg text-white">{ta("Catégories sans service (")}{ratt.orphans.length})</h3>
        {ratt.orphans.length === 0 ? <p className="text-xs text-white/45 font-body">{ta("Aucune.")}</p> : ratt.orphans.map((c) => row(c.id, c.nom, c.prestations, c.libre ? ta("laissée libre volontairement") : ta("à rattacher")))}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy || changes.length === 0} onClick={() => void run(() => saveRattachement(Object.fromEntries(changes.map(([id, v]) => [id, v || null]))), ta("Rattachement enregistré.")).then((ok) => { if (ok) { setAssign({}); reload(); } })}
          className="bg-white text-black rounded-full px-5 py-2 text-sm font-medium font-body hover:bg-white/90 transition-colors disabled:opacity-50">
          {changes.length ? ta("Enregistrer le rattachement ({0} changement(s))", [changes.length]) : ta("Aucun changement")}
        </button>
        {changes.length > 0 && <button type="button" className={btn} onClick={() => setAssign({})}>{ta("Annuler")}</button>}
      </div>

      <section className="liquid-glass-strong rounded-2xl p-4 space-y-2">
        <h3 className="font-heading italic text-lg text-white">{ta("Catégories (")}{ratt.categories.length})</h3>
        <p className="text-xs text-white/45 font-body">{ta("Renommer, masquer ou archiver une catégorie masque ses prestations (elles sont conservées). Les catégories ne se suppriment jamais : « Archivée » est réversible.")}</p>
        {ratt.categories.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-black/20 px-3 py-2">
            <input className="glass-field !w-56 !py-1 text-xs" aria-label={ta("Nom de la catégorie {0}", [c.nom])} value={catEdit[c.id] ?? c.nom} maxLength={100} onChange={(e) => setCatEdit((m) => ({ ...m, [c.id]: e.target.value }))} />
            {(catEdit[c.id] ?? c.nom).trim() !== c.nom && (catEdit[c.id] ?? "").trim() !== "" && <button type="button" className={btn} disabled={busy} onClick={() => void run(() => updateCategory(c.id, { nom: (catEdit[c.id] ?? "").trim() }), ta("Catégorie renommée.")).then((ok) => { if (ok) { setCatEdit((m) => { const n = { ...m }; delete n[c.id]; return n; }); reload(); } })}>{ta("Renommer")}</button>}
            <input className="glass-field !w-48 !py-1 text-xs" aria-label={ta("Name of the category {0} (EN)", [c.nom])} placeholder={ta("Name (EN)")} value={catEditEn[c.id] ?? c.nomEn ?? ""} maxLength={100} onChange={(e) => setCatEditEn((m) => ({ ...m, [c.id]: e.target.value }))} />
            {(catEditEn[c.id] ?? c.nomEn ?? "").trim() !== (c.nomEn ?? "") && <button type="button" className={btn} disabled={busy} onClick={() => void run(() => updateCategory(c.id, { nomEn: (catEditEn[c.id] ?? "").trim() }), ta("Catégorie traduite.")).then((ok) => { if (ok) { setCatEditEn((m) => { const n = { ...m }; delete n[c.id]; return n; }); reload(); } })}>{ta("Enregistrer EN")}</button>}
            <span className="text-[11px] text-white/40 font-body">{c.prestations} {ta("prestation(s)")}</span>
            <span className="flex-1" />
            {([["actif", ta("Active")], ["visibleSite", "Site"], ["visibleDiscord", "Discord"], ["archived", ta("Archivée")]] as const).map(([k, label]) => (
              <label key={k} className="inline-flex items-center gap-1.5 text-xs text-white/75 font-body"><input type="checkbox" checked={c[k]} disabled={busy} onChange={(e) => void run(() => updateCategory(c.id, { [k]: e.target.checked }), ta("Catégorie « {0} » mise à jour.", [c.nom])).then((ok) => { if (ok) void reload(); })} /> {label}</label>
            ))}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input className="glass-field !w-64 !py-1.5 text-xs" placeholder={ta("Nom de la nouvelle catégorie")} aria-label={ta("Nom de la nouvelle catégorie")} value={newCat} maxLength={100} onChange={(e) => setNewCat(e.target.value)} />
          <button type="button" className={btn} disabled={busy || !newCat.trim()} onClick={() => void run(() => createCategory({ nom: newCat.trim() }), ta("Catégorie créée (à rattacher à un service ci-dessus).")).then((ok) => { if (ok) { setNewCat(""); reload(); } })}>{ta("+ Catégorie")}</button>
        </div>
      </section>
    </div>
  );
}

export default function PrestationsTab({ onExpired }: { onExpired: () => void }) {
  const [view, setView] = useState<"prestations" | "rattachement">("prestations");
  const [list, setList] = useState<APrestation[]>([]);
  const [ratt, setRatt] = useState<RattachementData | null>(null);
  const [load, setLoad] = useState<"loading" | "ok" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [warn, setWarn] = useState(false);
  const [errs, setErrs] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);        // identifiant de la prestation dépliée, ou « new »
  const [draft, setDraft] = useState<Draft | null>(null);
  const [preview, setPreview] = useState<EmbedPreview | null>(null);

  const fail = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) { onExpired(); return; }
    setErrs([e instanceof ApiError && e.status ? taServer(e.message) : ta("Serveur injoignable, réessayez.")]);
  }, [onExpired]);

  const reload = useCallback(async () => {
    try { const [p, r] = await Promise.all([listPrestationsAdmin(showArchived), getRattachement()]); setList(p); setRatt(r); setLoad("ok"); }
    catch (e) { fail(e); setLoad((l) => (l === "ok" ? "ok" : "error")); }
  }, [showArchived, fail]);
  useEffect(() => { void reload(); }, [reload]);

  /** Exécute une action d'écriture : état occupé, message de réussite + état de la synchronisation Discord, erreurs lisibles. */
  const run: Run = useCallback(async (fn, okMsg) => {
    setBusy(true); setErrs([]); setMsg(""); setWarn(false);
    try { const r = await fn(); const d = (r && typeof r === "object" ? r.discord : undefined); setMsg(`${okMsg} ${syncMessage(d)}`.trim()); setWarn(syncFailed(d)); return true; }
    catch (e) { fail(e); return false; }
    finally { setBusy(false); }
  }, [fail]);

  const serviceOf = useMemo(() => {
    const m = new Map<string, { key: string; nom: string; actif: boolean }>();
    for (const s of ratt?.services ?? []) for (const c of s.categories) m.set(c.id, { key: s.key, nom: s.nom, actif: s.actif });
    return m;
  }, [ratt]);
  const catOf = useMemo(() => new Map((ratt?.categories ?? []).map((c) => [c.id, c])), [ratt]);

  if (load !== "ok" || !ratt) return <LoadState state={load === "ok" ? "loading" : load} onRetry={() => { setLoad("loading"); void reload(); }} />;

  const svc = (p: APrestation) => (p.categorieId ? serviceOf.get(p.categorieId) ?? null : null);
  /** Indications (la décision finale revient au serveur) : où la prestation est réellement proposée. */
  const onSite = (p: APrestation) => { const c = p.categorieId ? catOf.get(p.categorieId) : undefined; const s = svc(p); return p.actif && !p.archived && p.visibleSite && !!c && c.actif && c.visibleSite && !!s && s.actif; };
  const onDiscord = (p: APrestation) => { const c = p.categorieId ? catOf.get(p.categorieId) : undefined; const s = svc(p); return p.actif && !p.archived && p.visibleDiscord && (!c || (c.actif && c.visibleDiscord)) && (!s || s.actif); };

  const visible = list.filter((p) => {
    if (filter === "__none") { if (svc(p)) return false; } else if (filter && svc(p)?.key !== filter) return false;
    const t = q.trim().toLowerCase();
    return !t || p.nom.toLowerCase().includes(t) || p.description.toLowerCase().includes(t);
  });
  const active = list.filter((p) => !p.archived);

  const startNew = () => {
    const first = filter && filter !== "__none" ? ratt.services.find((s) => s.key === filter) : undefined;
    setDraft(emptyDraft(first ? (first.categories[0]?.id ?? `service:${first.key}`) : "")); setOpen("new"); setPreview(null); setErrs([]); setMsg("");
  };
  const openEdit = (p: APrestation) => { if (open === p.id) { setOpen(null); setDraft(null); return; } setDraft(draftOf(p)); setOpen(p.id); setPreview(null); setErrs([]); setMsg(""); };

  /** Résout la catégorie (crée celle d'un service neuf si besoin), valide, puis enregistre. */
  const save = async () => {
    if (!draft) return;
    let catId: string | null = draft.cat || null;
    const v0 = buildInput(draft, catId && !catId.startsWith("service:") ? catId : null);
    if (v0.errors.length) { setErrs(v0.errors); setMsg(""); return; }
    const ok = await run(async () => {
      if (catId?.startsWith("service:")) catId = (await createServiceCategory(catId.slice(8))).categorieId;
      const { input } = buildInput(draft, catId);
      return draft.id ? updatePrestation(draft.id, input!) : createPrestation(input!);
    }, draft.id ? ta("Prestation enregistrée.") : ta("Prestation créée."));
    if (ok) { setOpen(null); setDraft(null); setPreview(null); await reload(); }
  };

  const doPreview = async () => {
    if (!draft) return;
    const { input, errors } = buildInput(draft, draft.cat && !draft.cat.startsWith("service:") ? draft.cat : null);
    if (errors.length || !input) { setErrs(errors); return; }
    setErrs([]);
    try { setPreview(await previewPrestation(input)); } catch (e) { fail(e); }
  };

  const move = async (p: APrestation, dir: -1 | 1) => {
    const ids = active.map((x) => x.id);
    const pos = visible.filter((x) => !x.archived).findIndex((x) => x.id === p.id);
    const neighbour = visible.filter((x) => !x.archived)[pos + dir];
    if (!neighbour) return;
    const a = ids.indexOf(p.id), b = ids.indexOf(neighbour.id);
    [ids[a], ids[b]] = [ids[b]!, ids[a]!];
    if (await run(() => reorderPrestations(ids), ta("Ordre enregistré."))) await reload();
  };

  const duplicate = async (p: APrestation) => {
    const { input } = buildInput({ ...draftOf(p), nom: `${p.nom} (copie)` }, p.categorieId);
    if (input && await run(() => createPrestation({ ...input, actif: false }), ta("Copie créée (désactivée : activez-la quand elle est prête)."))) await reload();
  };

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {([["prestations", ta("Prestations ({0})", [active.length])], ["rattachement", ta("Rattachement aux services")]] as const).map(([v, label]) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => { setView(v); setErrs([]); setMsg(""); }}
            className={cn("rounded-full border px-4 py-1.5 text-sm font-body transition-colors", view === v ? "border-white bg-white text-black font-medium" : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10")}>{label}</button>
        ))}
        {ratt.orphans.some((c) => c.prestations > 0 && !c.libre) && <span className="text-[11px] text-amber-300 font-body">{ta("⚠ des catégories avec prestations ne sont rattachées à aucun service")}</span>}
        <span className="flex-1" />
        <button type="button" className={btn} disabled={busy} onClick={() => void run(async () => { const r = await syncDiscordCatalogue(); return { discord: r.discord }; }, ta("Synchronisation demandée."))}>{ta("Synchroniser Discord")}</button>
      </div>

      {view === "prestations" && (
        <>
          <p className="text-xs text-white/50 font-body font-light">
            {ta("Les prestations détaillées alimentent la page Services et le formulaire de commande du site, ainsi que les menus Discord. Aucun tarif ni délai n'est jamais inventé : seuls les champs renseignés ici s'affichent. « Archiver » est réversible (aucune suppression définitive) ; les demandes passées gardent le nom, le tarif et les options de la prestation.")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select className="glass-field !w-auto !py-1.5 text-xs" aria-label={ta("Filtrer par service")} value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">{ta("Tous les services")}</option>
              {ratt.services.map((s) => <option key={s.key} value={s.key}>{s.nom}</option>)}
              <option value="__none">{ta("Sans service")}</option>
            </select>
            <input className="glass-field !w-56 !py-1.5 text-xs" placeholder={ta("Rechercher…")} aria-label={ta("Rechercher une prestation")} value={q} onChange={(e) => setQ(e.target.value)} />
            <label className="inline-flex items-center gap-1.5 text-xs text-white/75 font-body"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> {ta("Afficher les archivées")}</label>
            <span className="flex-1" />
            <button type="button" className={btn} onClick={startNew} disabled={busy}>{ta("+ Prestation")}</button>
          </div>

          {open === "new" && draft && (
            <section className="liquid-glass-strong rounded-2xl p-4">
              <h3 className="font-heading italic text-lg text-white">{ta("Nouvelle prestation")}</h3>
              <PrestationForm draft={draft} setDraft={setDraft} ratt={ratt} busy={busy} onSave={() => void save()} onCancel={() => { setOpen(null); setDraft(null); }} onPreview={() => void doPreview()} preview={preview} />
            </section>
          )}

          {visible.length === 0 && open !== "new" && <p className="text-sm text-white/50 font-body">{ta("Aucune prestation")}{q || filter ? " pour ce filtre" : ta(" pour le moment : créez la première avec « + Prestation »")}.</p>}

          {visible.map((p) => {
            const s = svc(p); const isOpen = open === p.id && draft;
            const pos = visible.filter((x) => !x.archived).findIndex((x) => x.id === p.id);
            return (
              <section key={p.id} className={cn("liquid-glass-strong rounded-2xl p-4", p.archived && "opacity-70")}>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="flex-1 min-w-48 text-left" aria-expanded={open === p.id} onClick={() => openEdit(p)}>
                    <span className="font-heading italic text-xl text-white">{p.nom}</span>
                    <span className="ml-2 text-xs text-white/50 font-body">{p.tarifAffiche ?? ta("tarif non affiché")}</span>
                    <span className="block text-[11px] text-white/40 font-body">{s ? s.nom : ta("Sans service")}{p.categorieId && catOf.get(p.categorieId) ? ` › ${catOf.get(p.categorieId)!.nom}` : ""}{p.delai ? ` · ${p.delai}` : ""}</span>
                  </button>
                  <span className={chip(onSite(p))}>{ta("Site")} {onSite(p) ? "✓" : "—"}</span>
                  <span className={chip(onDiscord(p))}>{ta("Discord")} {onDiscord(p) ? "✓" : "—"}</span>
                  {p.archived && <span className="text-[11px] text-amber-300 font-body">{ta("archivée")}</span>}
                  {!p.archived && <>
                    <button type="button" className={btn} disabled={busy || !!q || pos <= 0} onClick={() => void move(p, -1)} aria-label={ta("Monter {0}", [p.nom])}>↑</button>
                    <button type="button" className={btn} disabled={busy || !!q || pos < 0 || pos >= visible.filter((x) => !x.archived).length - 1} onClick={() => void move(p, 1)} aria-label={ta("Descendre {0}", [p.nom])}>↓</button>
                    <button type="button" className={btn} disabled={busy} onClick={() => void run(() => updatePrestation(p.id, { actif: !p.actif }), p.actif ? ta("Prestation désactivée.") : ta("Prestation activée.")).then((ok) => { if (ok) void reload(); })}>{p.actif ? ta("Désactiver") : ta("Activer")}</button>
                    <button type="button" className={btn} disabled={busy} onClick={() => void duplicate(p)}>{ta("Dupliquer")}</button>
                    <button type="button" className={cn(btn, "text-red-300")} disabled={busy} onClick={() => { if (window.confirm(ta("Archiver « {0} » ? Elle disparaît du site et de Discord ; vous pourrez la restaurer.", [p.nom]))) void run(() => archivePrestation(p.id), ta("Prestation archivée.")).then((ok) => { if (ok) void reload(); }); }}>{ta("Archiver")}</button>
                  </>}
                  {p.archived && <>
                    <button type="button" className={btn} disabled={busy} onClick={() => void run(() => updatePrestation(p.id, { archived: false, actif: true }), ta("Prestation restaurée.")).then((ok) => { if (ok) void reload(); })}>{ta("Restaurer")}</button>
                  </>}
                </div>
                {isOpen && <PrestationForm draft={draft} setDraft={setDraft} ratt={ratt} busy={busy} onSave={() => void save()} onCancel={() => { setOpen(null); setDraft(null); }} onPreview={() => void doPreview()} preview={preview} />}
              </section>
            );
          })}
        </>
      )}

      {view === "rattachement" && <Rattachement ratt={ratt} run={run} busy={busy} reload={() => void reload()} />}

      <div aria-live="polite">
        {msg && <p className={cn("text-xs font-body", warn ? "text-amber-300" : "text-emerald-300/90")}>{msg}</p>}
        {errs.length > 0 && <ul role="alert" className="text-xs text-red-300 font-body list-disc pl-5 space-y-0.5">{errs.map((e, k) => <li key={k}>{e}</li>)}</ul>}
      </div>
    </div>
  );
}
