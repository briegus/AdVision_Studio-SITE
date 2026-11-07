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
          </section>
        ))}
        <p className="text-xs text-white/40 font-body font-light flex flex-wrap gap-x-4 gap-y-1">
          <button onClick={() => navigate("legal")} className="hover:text-white/70 transition-colors">{getLegalDoc("legal", lang).title}</button>
          <button onClick={() => navigate("privacy")} className="hover:text-white/70 transition-colors">{getLegalDoc("privacy", lang).title}</button>
          <button onClick={() => navigate("terms")} className="hover:text-white/70 transition-colors">{getLegalDoc("terms", lang).title}</button>
        </p>
      </div>
    </Page>
  );
}

export const LegalNotice = () => <LegalPage kind="legal" />;
export const PrivacyPolicy = () => <LegalPage kind="privacy" />;
export const TermsOfUse = () => <LegalPage kind="terms" />;
