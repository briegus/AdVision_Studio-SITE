import { useEffect, useState, type FormEvent } from "react";
import { Star, MessageSquareQuote } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { listReviews, postReview, type PublicReview } from "@/lib/api";
import Page from "@/components/Page";
import LoadState from "@/components/LoadState";
import { cn } from "@/utils/cn";

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1" role={onChange ? "radiogroup" : undefined}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} / 5`}
            onClick={() => onChange(n)}
            className="p-0.5"
          >
            <Star
              className={cn("h-5 w-5 transition-colors", n <= value ? "fill-white text-white" : "text-white/25")}
            />
          </button>
        ) : (
          <Star
            key={n}
            aria-hidden="true"
            className={cn("h-3.5 w-3.5", n <= value ? "fill-white text-white" : "text-white/20")}
          />
        )
      )}
    </div>
  );
}

export default function Reviews() {
  const { t } = useI18n();
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [load, setLoad] = useState<"loading" | "ok" | "error">("loading");

  const fetchReviews = (silent = false) => {
    if (!silent) setLoad("loading");
    // Vrais avis approuvés (Discord + site), partagés par tous les visiteurs.
    listReviews()
      .then((r) => {
        setReviews(r);
        setLoad("ok");
      })
      .catch(() => {
        if (!silent) setLoad("error");
      });
  };
  useEffect(() => {
    fetchReviews();
    // Un avis approuvé sur Discord apparaît ici sans recharger la page (actualisation discrète toutes les 30 s).
    const id = setInterval(() => {
      if (!document.hidden) fetchReviews(true);
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || text.trim().length < 10) return;
    setStatus("sending");
    try {
      await postReview({ nom: name.trim(), entreprise: company.trim(), note: rating, commentaire: text.trim() });
      setStatus("done");
      setName("");
      setCompany("");
      setText("");
      setRating(5);
    } catch {
      setStatus("error");
    }
  };

  return (
    <Page title={t("reviews.title")} wide>
      <div className="grid lg:grid-cols-2 gap-4 md:gap-6 flex-1 min-h-0">
        {/* Published reviews */}
        <div className="min-h-0 overflow-y-auto scrollbar-slim pr-1">
          {load !== "ok" ? (
            <LoadState state={load} onRetry={() => fetchReviews()} />
          ) : reviews.length === 0 ? (
            <div className="liquid-glass rounded-2xl p-6 text-center">
              <MessageSquareQuote className="h-6 w-6 text-white/40 mx-auto" aria-hidden="true" />
              <p className="mt-3 text-white/55 font-body font-light text-sm leading-relaxed">
                {t("reviews.empty")}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="liquid-glass rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-body font-medium text-sm text-white">{r.auteur}</p>
                    <Stars value={r.note} />
                  </div>
                  <p className="mt-2 text-sm text-white/65 font-body font-light leading-relaxed">“{r.commentaire}”</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Leave a review */}
        <form onSubmit={submit} className="liquid-glass-strong rounded-2xl p-5 md:p-6 self-start">
          <h2 className="font-heading italic text-2xl text-white leading-none">{t("reviews.leave")}</h2>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <input
              className="glass-field"
              placeholder={t("reviews.name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              aria-label={t("reviews.name")}
            />
            <input
              className="glass-field"
              placeholder={t("reviews.company")}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              maxLength={80}
              aria-label={t("reviews.company")}
            />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs uppercase tracking-widest text-white/40 font-body">{t("reviews.rating")}</span>
            <Stars value={rating} onChange={setRating} />
          </div>
          <textarea
            className="glass-field mt-3 min-h-20 resize-none"
            placeholder={t("reviews.text")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            minLength={10}
            maxLength={1000}
            aria-label={t("reviews.text")}
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="mt-4 w-full bg-white text-black rounded-full px-6 py-2.5 text-sm font-medium font-body hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {status === "sending" ? t("reviews.sending") : t("reviews.submit")}
          </button>
          <div aria-live="polite">
            {status === "done" && (
              <p className="mt-3 text-xs text-emerald-300/90 font-body">{t("reviews.thanks")}</p>
            )}
            {status === "error" && <p className="mt-3 text-xs text-red-300 font-body">{t("reviews.error")}</p>}
          </div>
        </form>
      </div>
    </Page>
  );
}
