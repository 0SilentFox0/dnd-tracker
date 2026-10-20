"use client";

import type { DraftError, DraftState } from "@/lib/hooks/scenario";

const TEXT: Record<DraftState, string> = { saved: "Збережено", dirty: "Є зміни…", saving: "Збереження…", error: "Не збережено", conflict: "Конфлікт версій" };

export function SaveStatus({ state, error, onRetry, onReload }: { state: DraftState; error?: DraftError | null; onRetry: () => void; onReload: () => void }) {
  return (
    <span className="sans" role="status" aria-live="polite" style={{ color: state === "error" || state === "conflict" ? "var(--blood)" : "var(--ink-soft)" }}>
      {state === "error" && error ? error.message : TEXT[state]}
      {state === "error" && error?.retryable !== false && (
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
