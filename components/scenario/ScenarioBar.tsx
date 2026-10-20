"use client";

import type { ReactNode } from "react";

export function ScenarioBar({ title, sections, hideNotes, onToggleNotes, theme, onToggleTheme, actions }: {
  title: string;
  sections: { id: string; title: string }[];
  hideNotes: boolean;
  onToggleNotes: () => void;
  theme: "light" | "dark" | null;
  onToggleTheme: () => void;
  actions?: ReactNode;
}) {
  return (
    <div className="sb-bar">
      <div className="sb-bar-in">
        <strong>{title}</strong>
        <nav aria-label="Розділи">
          {sections.map((s) => (
            <a key={s.id} href={`#sec-${s.id}`}>
              {s.title}
            </a>
          ))}
        </nav>
        <button type="button" className="toggle" aria-pressed={hideNotes} onClick={onToggleNotes}>
          {hideNotes ? "Показати нотатки" : "Сховати нотатки"}
        </button>
        <button type="button" className="toggle" onClick={onToggleTheme}>
          {theme === "dark" ? "Світла" : "Темна"}
        </button>
        {actions}
      </div>
    </div>
  );
}
