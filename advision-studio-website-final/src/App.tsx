import { useEffect, useRef } from "react";
import { LanguageProvider, useI18n } from "@/lib/i18n";
import { wakeUp } from "@/lib/api";
import { useRoute } from "@/lib/router";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "@/views/Home";
import Services from "@/views/Services";
import Work from "@/views/Work";
import Process from "@/views/Process";
import Pricing from "@/views/Pricing";
import Reviews from "@/views/Reviews";
import Contact from "@/views/Contact";
import Admin from "@/views/Admin";
import ErrorBoundary from "@/components/ErrorBoundary";

const VIEWS = {
  home: Home,
  services: Services,
  work: Work,
  process: Process,
  pricing: Pricing,
  reviews: Reviews,
  contact: Contact,
  admin: Admin,
} as const;

export default function App() {
  return (
    <LanguageProvider>
      <Shell />
    </LanguageProvider>
  );
}

function Shell() {
  const route = useRoute();
  const View = VIEWS[route];
  const mainRef = useRef<HTMLElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    wakeUp(); // le bot est déjà réveillé quand le visiteur arrive sur le formulaire
  }, []);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [route]);

  return (
    <div className="h-dvh flex flex-col bg-black text-white overflow-hidden">
      <a href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }} className="skip-link">
        {t("a11y.skip")}
      </a>
      <Navbar />
      <main
        id="main"
        tabIndex={-1}
        ref={mainRef}
        className="relative flex-1 min-h-0 overflow-y-auto scrollbar-slim flex flex-col outline-none"
      >
        <ErrorBoundary key={route}>
          <View />
        </ErrorBoundary>
        <Footer />
      </main>
    </div>
  );
}
