"use client";

import type { DraftState } from "@/lib/hooks/scenario";

const TEXT: Record<DraftState, string> = { saved: "Збережено", dirty: "Є зміни…", saving: "Збереження…", error: "Не збережено", conflict: "Конфлікт версій" };

export function SaveStatus({ state, onRetry, onReload }: { state: DraftState; onRetry: () => void; onReload: () => void }) {
  return (
    <span className="sans" role="status" aria-live="polite" style={{ color: state === "error" || state === "conflict" ? "var(--blood)" : "var(--ink-soft)" }}>
      {TEXT[state]}
      {state === "error" && (
        <button type="button" className="toggle" style={{ marginLeft: 8 }} onClick={onRetry}>
          Повторити
        </button>
      )}
      {state === "conflict" && (
        <button type="button" className="toggle" style={{ marginLeft: 8 }} onClick={onReload}>
          Перезавантажити
        </button>
      )}
    </span>
  );
}
