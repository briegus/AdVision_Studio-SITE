import { useI18n } from "@/lib/i18n";
import { getLegalDoc, type LegalKind } from "@/lib/legalContent";
import { navigate } from "@/lib/router";
import Page from "@/components/Page";

function LegalPage({ kind }: { kind: LegalKind }) {
  const { lang } = useI18n();
  const doc = getLegalDoc(kind, lang);
  return (
    <Page title={doc.title} intro={doc.intro}>
      <div className="max-w-3xl space-y-6 pb-6">
        {doc.sections.map((s) => (
          <section key={s.h}>
            <h2 className="font-heading italic text-2xl text-white leading-tight">{s.h}</h2>
            <div className="mt-2 space-y-2">
              {s.p.map((line, i) => (
                <p key={i} className="text-sm text-white/65 font-body font-light leading-relaxed">{line}</p>
              ))}
            </div>
            {s.table && (
              <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[640px] text-left text-xs font-body">
                  <thead>
                    <tr className="bg-white/5 text-white/50">
                      {s.table.head.map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {s.table.rows.map((row) => (
                      <tr key={row[0]} className="border-t border-white/10 align-top">
                        {row.map((cell, i) => (
                          <td key={i} className={`px-3 py-2 leading-relaxed ${i === 0 ? "text-white/85 font-medium whitespace-nowrap" : "text-white/60 font-light"}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
        <p className="text-xs text-white/40 font-body font-light flex flex-wrap gap-x-4 gap-y-1">
          <button onClick={() => navigate("legal")} className="hover:text-white/70 transition-colors">{getLegalDoc("legal", lang).title}</button>
          <button onClick={() => navigate("privacy")} className="hover:text-white/70 transition-colors">{getLegalDoc("privacy", lang).title}</button>
          <button onClick={() => navigate("cookies")} className="hover:text-white/70 transition-colors">{getLegalDoc("cookies", lang).title}</button>
          <button onClick={() => navigate("terms")} className="hover:text-white/70 transition-colors">{getLegalDoc("terms", lang).title}</button>
        </p>
      </div>
    </Page>
  );
}

export const LegalNotice = () => <LegalPage kind="legal" />;
export const PrivacyPolicy = () => <LegalPage kind="privacy" />;
export const CookiePolicy = () => <LegalPage kind="cookies" />;
export const TermsOfUse = () => <LegalPage kind="terms" />;
