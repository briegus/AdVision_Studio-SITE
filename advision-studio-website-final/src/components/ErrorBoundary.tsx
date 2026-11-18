import { Component, type ReactNode } from "react";

/** Empêche l'écran blanc : si une page plante, on affiche un message et un bouton de rechargement (design inchangé). */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[UI]", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const fr = document.documentElement.lang === "fr";
    return (
      <div role="alert" className="flex-1 flex items-center justify-center p-6">
        <div className="liquid-glass rounded-3xl p-8 max-w-md text-center">
          <h2 className="font-heading italic text-3xl text-white leading-none">{fr ? "Un souci est survenu" : "Something went wrong"}</h2>
          <p className="mt-3 text-sm text-white/55 font-body font-light">
            {fr ? "Cette page n'a pas pu s'afficher. Rechargez-la ou revenez à l'accueil." : "This page could not be displayed. Reload it or go back home."}
          </p>
          <button
            onClick={() => { window.location.hash = "/home"; window.location.reload(); }}
            className="mt-6 bg-white text-black rounded-full px-6 py-2.5 text-sm font-medium font-body hover:bg-white/90 transition-colors"
          >
            {fr ? "Recharger" : "Reload"}
          </button>
        </div>
      </div>
    );
  }
}
