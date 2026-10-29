import { useSyncExternalStore } from "react";

export type Route =
  | "home"
  | "services"
  | "work"
  | "process"
  | "pricing"
  | "reviews"
  | "contact"
  | "admin";

const VALID: Route[] = ["home", "services", "work", "process", "pricing", "reviews", "contact", "admin"];

function current(): Route {
  const h = window.location.hash.replace(/^#\/?/, "") as Route;
  return VALID.includes(h) ? h : "home";
}

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, current);
}

export function navigate(to: Route) {
  window.location.hash = `/${to}`;
}
