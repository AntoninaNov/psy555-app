"use client";
import { useEffect, useState } from "react";

/**
 * Returns true once the Zustand store has been hydrated from localStorage.
 * Zustand's persist middleware with synchronous localStorage hydrates during
 * the first render, so by the time useEffect fires the store is ready.
 */
export function useHasHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  return hydrated;
}
