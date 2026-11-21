import { useCallback, useEffect, useState, type FormEvent } from "react";
import LoadState from "@/components/LoadState";
import { ApiError } from "@/lib/api";
import { getChannelRoles, saveChannelRoles, type ChannelRolesData, type ChannelRoleItem, type ChannelStatus } from "@/lib/admin";
import { ta, taServer } from "@/lib/adminI18n";

/**
 * Onglet « Salons » — TOUS les salons du bot au même endroit.
 * La sélection manuelle est prioritaire ; sans choix, le bot détecte le salon d'après son nom (polices, accents, emojis ignorés).
 * Les réglages sont enregistrés dans la même base que /setup : un changement ici est vu par le bot immédiatement.
 */
const groups = (): { id: ChannelRoleItem["group"]; title: string; hint: string }[] => [
  { id: "studio", title: ta("Équipe et demandes"), hint: ta("Où arrivent les demandes, les notifications et les absences.") },
  { id: "tickets", title: ta("Tickets"), hint: ta("Journal, catégorie par défaut et destination de chaque type de ticket (montage, Discord, devis, recrutement…).") },
  { id: "vitrine", title: ta("Vitrine publique"), hint: ta("Annonces, avis, réalisations et panel des prestations (visibles aussi sur le site).") },
  { id: "journaux", title: ta("Journaux"), hint: ta("Logs du bot et de la modération.") },
];

const status = (): Record<ChannelStatus, { label: string; cls: string }> => ({
  manual: { label: ta("Choisi manuellement"), cls: "text-emerald-300" },
  auto: { label: ta("Détecté automatiquement"), cls: "text-sky-300" },
  ambiguous: { label: ta("Plusieurs salons correspondent — le premier sera utilisé : choisissez-en un"), cls: "text-amber-300" },
  missing: { label: ta("Non configuré"), cls: "text-white/45" },
  deleted: { label: ta("Le salon choisi n'existe plus — détection automatique utilisée"), cls: "text-red-300" },
  wrong_type: { label: ta("Le salon choisi n'est pas du bon type"), cls: "text-red-300" },
});

export default function ChannelsTab({ onExpired }: { onExpired: () => void }) {
  const [data, setData] = useState<ChannelRolesData | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});                 // clé → id choisi ("" = détection automatique)
  const [roleEdits, setRoleEdits] = useState<{ notifyRoleId?: string; absenceManagerRoleIds?: string[]; ticketSupportRoles?: string[] }>({});
  const [load, setLoad] = useState<"loading" | "ok" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const fail = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) { onExpired(); return; }
    setErr(e instanceof ApiError && e.status ? taServer(e.message) : ta("Serveur injoignable, réessayez."));
  }, [onExpired]);

  const refresh = useCallback(() => {
    setLoad("loading");
    getChannelRoles()
      .then((d) => { setData(d); setEdits({}); setRoleEdits({}); setLoad("ok"); })
      .catch((e) => { fail(e); setLoad("error"); });
  }, [fail]);
  useEffect(refresh, [refresh]);

  if (load !== "ok" || !data) return <LoadState state={load === "ok" ? "loading" : load} onRetry={refresh} />;

  const current = (it: ChannelRoleItem) => (it.key in edits ? edits[it.key]! : it.manualId ?? "");
  const opts = (it: ChannelRoleItem) => {
    const c = data.choices;
    const list = (a: { id: string; name: string }[], p: string) => a.map((x) => <option key={x.id} value={x.id}>{p}{x.name}</option>);
    if (it.kind === "category") return list(c.categories, "📁 ");
    if (it.kind === "forum") return list(c.forums, "# ");
    if (it.kind === "textOrForum") return (<>{c.forums.length > 0 && <optgroup label={ta("Forums")}>{list(c.forums, "# ")}</optgroup>}<optgroup label={ta("Salons texte")}>{list(c.channels, "#")}</optgroup></>);
    return list(c.channels, "#");
  };

  const roleVal = <K extends "absenceManagerRoleIds" | "ticketSupportRoles">(k: K): string[] => roleEdits[k] ?? data.staffRoles[k];
  const toggleRole = (k: "absenceManagerRoleIds" | "ticketSupportRoles", id: string) => {
    const cur = roleVal(k);
    setRoleEdits((r) => ({ ...r, [k]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] }));
  };

  const dirty = Object.keys(edits).length > 0 || Object.keys(roleEdits).length > 0;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!dirty) return;
    setBusy(true); setMsg(""); setErr("");
    try {
      const channels: Record<string, string | null> = {};
      for (const [k, v] of Object.entries(edits)) channels[k] = v || null;
      const staffRoles: Record<string, unknown> = {};
      if (roleEdits.notifyRoleId !== undefined) staffRoles["notifyRoleId"] = roleEdits.notifyRoleId || null;
      if (roleEdits.absenceManagerRoleIds) staffRoles["absenceManagerRoleIds"] = roleEdits.absenceManagerRoleIds;
      if (roleEdits.ticketSupportRoles) staffRoles["ticketSupportRoles"] = roleEdits.ticketSupportRoles;
      const r = await saveChannelRoles({ channels, staffRoles });
      setMsg(ta("Enregistré ({0}). Actif immédiatement.{1}", [r.saved.length, r.ignored.length ? ta(" {0} réglage(s) refusé(s) : {1}.", [r.ignored.length, r.ignored.map((i) => i.key).join(", ")]) : ""]));
      refresh();
    } catch (x) { fail(x); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="max-w-3xl space-y-5">
      {!data.connected && <p role="alert" className="text-xs text-red-300 font-body">{ta("Le bot n'est pas connecté à Discord : les salons ne peuvent pas être listés.")}</p>}
      <p className="text-xs text-white/50 font-body font-light">
        {ta("Un salon choisi ici est")} <strong className="text-white/80">{ta("toujours prioritaire")}</strong>{ta(". Sans choix, le bot détecte le salon d'après son nom — quelle que soit la police, les accents ou les emojis. Rien n'est créé automatiquement en double.")}
      </p>

      {groups().map((g) => {
        const items = data.items.filter((i) => i.group === g.id);
        if (!items.length) return null;
        return (
          <section key={g.id} className="liquid-glass-strong rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="font-heading italic text-2xl text-white leading-none">{g.title}</h2>
              <p className="mt-1 text-xs text-white/45 font-body font-light">{g.hint}</p>
            </div>
            {items.map((it) => {
              const st = status()[it.status];
              return (
                <label key={it.key} className="block text-xs text-white/50 font-body">
                  <span className="text-white/85 text-sm font-medium">{it.label}</span>
                  <span className="block font-light text-white/40">{it.usage}</span>
                  <select className="glass-field mt-1" value={current(it)} onChange={(e) => setEdits((d) => ({ ...d, [it.key]: e.target.value }))}>
                    <option value="">{it.canDetect ? ta("— détection automatique —") : ta("— non configuré —")}</option>
                    {opts(it)}
                  </select>
                  <span className={`mt-1 block ${st.cls}`}>
                    {st.label}
                    {it.effective && it.status !== "manual" && <> : #{it.effective.name}</>}
                    {it.manual && it.status === "manual" && <> : #{it.manual.name}</>}
                    {it.status === "ambiguous" && <span className="text-white/40"> ({it.detected.map((d) => `#${d.name}`).join(", ")})</span>}
                  </span>
                </label>
              );
            })}
          </section>
        );
      })}

      <section className="liquid-glass-strong rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="font-heading italic text-2xl text-white leading-none">{ta("Rôles du staff")}</h2>
          <p className="mt-1 text-xs text-white/45 font-body font-light">{ta("Qui est prévenu et qui gère les tickets et les absences (les administrateurs Discord y ont toujours accès).")}</p>
        </div>
        <label className="block text-xs text-white/50 font-body">{ta("Rôle mentionné pour les nouvelles demandes (facultatif)")}
          <select className="glass-field mt-1" value={roleEdits.notifyRoleId ?? data.staffRoles.notifyRoleId ?? ""} onChange={(e) => setRoleEdits((r) => ({ ...r, notifyRoleId: e.target.value }))}>
            <option value="">{ta("— aucun —")}</option>
            {data.choices.roles.map((r) => <option key={r.id} value={r.id}>@{r.name}</option>)}
          </select>
        </label>
        {([["ticketSupportRoles", ta("Rôles qui gèrent les tickets")], ["absenceManagerRoleIds", ta("Rôles qui gèrent les absences")]] as const).map(([k, title]) => (
          <fieldset key={k}>
            <legend className="text-xs text-white/50 font-body">{title}</legend>
            <div className="mt-2 max-h-36 overflow-y-auto scrollbar-slim grid sm:grid-cols-2 gap-x-4 gap-y-1">
              {data.choices.roles.map((r) => (
                <label key={r.id} className="inline-flex items-center gap-2 text-sm text-white/75 font-body">
                  <input type="checkbox" checked={roleVal(k).includes(r.id)} onChange={() => toggleRole(k, r.id)} /> @{r.name}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </section>

      <button type="submit" disabled={busy || !dirty} className="w-full bg-white text-black rounded-full px-6 py-2.5 text-sm font-medium font-body hover:bg-white/90 transition-colors disabled:opacity-50">
        {busy ? ta("Enregistrement…") : dirty ? ta("Enregistrer les salons") : ta("Aucune modification")}
      </button>
      <p className="text-xs text-white/40 font-body font-light">{ta("Les panels déjà publiés (avis, prestations, absences) se republient avec /setup → Panels ou au prochain démarrage du bot.")}</p>
      <div aria-live="polite">
        {msg && <p className="text-xs text-emerald-300/90 font-body">{msg}</p>}
        {err && <p role="alert" className="text-xs text-red-300 font-body">{err}</p>}
      </div>
    </form>
  );
}
