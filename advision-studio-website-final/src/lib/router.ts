import { useSyncExternalStore } from "react";

export type Route =
  | "home"
  | "services"
  | "work"
  | "process"
  | "pricing"
  | "reviews"
  | "contact"
  | "login"
  | "account"
  | "auth"
  | "admin";

const VALID: Route[] = ["home", "services", "work", "process", "pricing", "reviews", "contact", "login", "account", "auth", "admin"];

function current(): Route {
  const h = window.location.hash.replace(/^#\/?/, "").split("?")[0] as Route;
  return VALID.includes(h) ? h : "home";
}

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, current);
}

export function navigate(to: Route, query = "") {
  window.location.hash = `/${to}${query ? `?${query}` : ""}`;
}

/** Paramètre du fragment, ex. #/login?error=denied → hashParam("error") === "denied". */
export function hashParam(name: string): string | null {
  const q = window.location.hash.split("?")[1];
  return q ? new URLSearchParams(q).get(name) : null;
}
