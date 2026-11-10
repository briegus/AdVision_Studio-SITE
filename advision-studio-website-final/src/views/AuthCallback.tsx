import { useEffect } from "react";
import Page from "@/components/Page";
import { useI18n } from "@/lib/i18n";
import { exchangeTicket } from "@/lib/auth";
import { hashParam, navigate } from "@/lib/router";

/** Retour de Google / Discord : le ticket (usage unique, 60 s) est lu puis effacé de l'URL, échangé contre une session. */
export default function AuthCallback() {
  const { t } = useI18n();

  useEffect(() => {
    const ticket = hashParam("ticket");
    // On efface tout de suite le ticket de la barre d'adresse et de l'historique
    window.history.replaceState(null, "", `${window.location.pathname}#/auth`);
    if (!ticket) {
      navigate("login", "error=failed");
      return;
    }
    exchangeTicket(ticket)
      .then(() => navigate("account"))
      .catch(() => navigate("login", "error=failed"));
  }, []);

  return (
    <Page title={t("login.title")}>
      <p role="status" className="text-center text-white/55 font-body font-light text-sm">{t("auth.signing")}</p>
    </Page>
  );
}
