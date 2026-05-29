"use client";

import { useEffect } from "react";

/*
 * Atajos de teclado globales (UX-10, S5-T03). Ignora pulsaciones mientras se
 * escribe en inputs/areas/selects (salvo Escape, que siempre aplica).
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

export type HotkeyMap = Record<string, (e: KeyboardEvent) => void>;

export function useHotkeys(map: HotkeyMap) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const handler = map[e.key];
      if (!handler) return;
      if (e.key !== "Escape" && isTypingTarget(e.target)) return;
      handler(e);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
}
