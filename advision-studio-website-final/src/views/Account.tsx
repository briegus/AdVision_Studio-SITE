import { useEffect, useState } from "react";
import { Trash2, LogOut, Plus } from "lucide-react";
import Page from "@/components/Page";
import LoadState from "@/components/LoadState";
import { useI18n } from "@/lib/i18n";
import { deleteAccount, logoutAccount, myRequests, refreshMe, useAuth, type MyRequest } from "@/lib/auth";
import { navigate } from "@/lib/router";

export default function Account() {
  const { t, lang } = useI18n();
  const session = useAuth();
  const [items, setItems] = useState<MyRequest[]>([]);
  const [load, setLoad] = useState<"loading" | "ok" | "error">("loading");
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (!session) navigate("login");
  }, [session]);

  const fetchAll = () => {
    setLoad("loading");
    myRequests().then((r) => { setItems(r); setLoad("ok"); }).catch(() => setLoad("error"));
  };
  useEffect(() => {
    void refreshMe();
    fetchAll();
  }, []);

  if (!session) return null;
  const u = session.user;
  const fmt = (d: string) => new Date(d).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const via = [u.providers.google && "Google", u.providers.discord && "Discord", u.providers.email && "E-mail"].filter(Boolean).join(" · ");

  return (
    <Page title={t("account.title")} wide>
      <div className="grid lg:grid-cols-[320px_1fr] gap-4 md:gap-6 flex-1 min-h-0">
        <aside className="liquid-glass-strong rounded-2xl p-5 md:p-6 self-start">
          <div className="flex items-center gap-3">
            {u.avatarUrl ? (
              <img src={u.avatarUrl} alt="" width={48} height={48} referrerPolicy="no-referrer" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center font-heading italic text-xl text-white" aria-hidden="true">
                {u.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-body font-medium text-white truncate">{u.name}</p>
              <p className="text-xs text-white/50 font-body truncate">{u.email ?? "—"}</p>
            </div>
          </div>
          {via && <p className="mt-3 text-[11px] uppercase tracking-widest text-white/35 font-body">{via}</p>}

          <button onClick={() => navigate("contact")} className="mt-5 w-full bg-white text-black rounded-full px-6 py-2.5 text-sm font-medium font-body hover:bg-white/90 transition-colors inline-flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" /> {t("account.new")}
          </button>
          <button onClick={() => void logoutAccount().then(() => navigate("home"))} className="mt-2 w-full liquid-glass rounded-full px-6 py-2.5 text-sm text-white/80 font-body hover:bg-white/10 inline-flex items-center justify-center gap-2">
            <LogOut className="h-4 w-4" aria-hidden="true" /> {t("account.logout")}
          </button>

          {confirmDel ? (
            <div className="mt-4 rounded-xl border border-red-400/30 p-3">
              <p className="text-xs text-red-200/90 font-body">{t("account.delete.ask")}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => void deleteAccount().then(() => navigate("home"))} className="flex-1 bg-red-500/80 text-white rounded-full py-1.5 text-xs font-body hover:bg-red-500">{t("account.delete.yes")}</button>
                <button onClick={() => setConfirmDel(false)} className="flex-1 liquid-glass rounded-full py-1.5 text-xs text-white/80 font-body">{t("account.cancel")}</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(true)} className="mt-4 w-full text-xs text-white/40 hover:text-red-300 font-body inline-flex items-center justify-center gap-1.5">
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> {t("account.delete")}
            </button>
          )}
        </aside>

        <section className="min-h-0 overflow-y-auto scrollbar-slim pr-1">
          <h2 className="font-heading italic text-2xl text-white leading-none mb-3">{t("account.requests")}</h2>
          {load !== "ok" ? (
            <LoadState state={load} onRetry={fetchAll} />
          ) : items.length === 0 ? (
            <div className="liquid-glass rounded-2xl p-6 text-center text-sm text-white/55 font-body font-light">{t("account.none")}</div>
          ) : (
            <ul className="space-y-3">
              {items.map((r) => (
                <li key={r.ref} className="liquid-glass rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-body font-medium text-sm text-white">{r.ref}{r.marque ? ` · ${r.marque}` : ""}</p>
                    <span className="text-[11px] uppercase tracking-wider text-white/60 font-body bg-white/10 rounded-full px-2.5 py-1">
                      {t(`account.status.${r.statut}`) === `account.status.${r.statut}` ? r.statut : t(`account.status.${r.statut}`)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/45 font-body">{[fmt(r.createdAt), r.format, r.duree].filter(Boolean).join(" · ")}</p>
                  {r.description && <p className="mt-2 text-sm text-white/60 font-body font-light line-clamp-3">{r.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Page>
  );
}
