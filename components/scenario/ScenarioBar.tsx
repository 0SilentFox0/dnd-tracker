"use client";

import { type ReactNode, useRef } from "react";

import { useCssVarHeight } from "@/lib/hooks/common";

export function ScenarioBar({ title, sections, hideNotes, onToggleNotes, theme, onToggleTheme, actions }: {
  title: string;
  sections: { id: string; title: string }[];
  hideNotes: boolean;
  onToggleNotes: () => void;
  theme: "light" | "dark" | null;
  onToggleTheme: () => void;
  actions?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useCssVarHeight(ref, "--sb-bar-h");

  useCssVarHeight(ref, "--app-header-h", "header");

  return (
    <div ref={ref} className="sb-bar">
      <div className="sb-bar-in">
        <strong>{title}</strong>
        <nav aria-label="Розділи">
          {sections.map((s) => (
            <a key={s.id} href={`#sec-${s.id}`}>
              {s.title}
            </a>
          ))}
        </nav>
        <div className="sb-bar-btns">
          <button type="button" className="toggle" aria-pressed={hideNotes} onClick={onToggleNotes}>
            {hideNotes ? "Показати нотатки" : "Сховати нотатки"}
          </button>
          <button type="button" className="toggle" onClick={onToggleTheme}>
            {theme === "dark" ? "Світла" : "Темна"}
          </button>
          {actions}
        </div>
      </div>
    </div>
  );
}
