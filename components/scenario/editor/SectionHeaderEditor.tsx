"use client";

import { OrderButtons } from "./OrderButtons";

import type { ScenarioSection } from "@/types/scenario";

export function SectionHeaderEditor({ section, actions }: { section: ScenarioSection; actions: { onTitle: (title: string) => void; onMove: (dir: -1 | 1) => void; onRemove: () => void } }) {
  return (
    <h2>
      <input aria-label="Назва розділу" value={section.title} maxLength={200} onChange={(e) => actions.onTitle(e.target.value)} style={{ font: "inherit", background: "transparent", color: "inherit", border: 0, flex: 1, minWidth: 0 }} />
      <OrderButtons
        labels={{ up: `Розділ вгору: ${section.title}`, down: `Розділ вниз: ${section.title}`, remove: `Видалити розділ: ${section.title}` }}
        onMove={actions.onMove}
        onRemove={actions.onRemove}
      />
    </h2>
  );
}
