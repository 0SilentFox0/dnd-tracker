"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import type { ScenarioSection } from "@/types/scenario";

export function SectionHeaderEditor({ section, actions }: { section: ScenarioSection; actions: { onTitle: (title: string) => void; onMove: (dir: -1 | 1) => void; onRemove: () => void } }) {
  return (
    <h2>
      <input aria-label="Назва розділу" value={section.title} maxLength={200} onChange={(e) => actions.onTitle(e.target.value)} style={{ font: "inherit", background: "transparent", color: "inherit", border: 0, flex: 1, minWidth: 0 }} />
      <button type="button" className="toggle" aria-label={`Розділ вгору: ${section.title}`} onClick={() => actions.onMove(-1)}>
        <ArrowUp className="size-4" />
      </button>
      <button type="button" className="toggle" aria-label={`Розділ вниз: ${section.title}`} onClick={() => actions.onMove(1)}>
        <ArrowDown className="size-4" />
      </button>
      <button type="button" className="toggle" aria-label={`Видалити розділ: ${section.title}`} onClick={actions.onRemove}>
        <Trash2 className="size-4" />
      </button>
    </h2>
  );
}
