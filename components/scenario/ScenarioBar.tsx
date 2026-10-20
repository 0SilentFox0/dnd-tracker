"use client";

import { type ReactNode, useEffect, useRef } from "react";

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

  useEffect(() => {
    const el = ref.current;

    const host = el?.parentElement;

    if (!el || !host) return;

    const sync = () => host.style.setProperty("--sb-bar-h", `${el.offsetHeight}px`);

    sync();

    const observer = new ResizeObserver(sync);

    observer.observe(el);

    return () => {
      observer.disconnect();
      host.style.removeProperty("--sb-bar-h");
    };
  }, []);

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
