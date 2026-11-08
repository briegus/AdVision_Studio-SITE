import { useCallback, useEffect, useState } from "react";

/** Compte à rebours en secondes (ex. délai avant de pouvoir redemander un code). */
export function useCooldown(): [number, (seconds: number) => void] {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  const start = useCallback((s: number) => setLeft(Math.max(0, Math.floor(s))), []);
  return [left, start];
}
