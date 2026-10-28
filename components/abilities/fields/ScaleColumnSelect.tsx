"use client";

import { useAbilityEditor } from "@/components/abilities/editor-context";
import { HUD_SELECT_CLASS } from "@/components/hud/form";

export function ScaleColumnSelect({ id, value, onChange, poolsOnly = false }: { id: string; value: string | undefined; onChange: (key: string) => void; poolsOnly?: boolean }) {
  const columns = (useAbilityEditor().classColumns ?? []).filter((c) => !poolsOnly || c.pool);

  return (
    <select id={id} aria-label="Колонка таблиці класу" className={`${HUD_SELECT_CLASS} w-full`} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>
        —
      </option>
      {columns.map((c) => (
        <option key={c.key} value={c.key}>
          {c.label} ({c.key})
        </option>
      ))}
    </select>
  );
}
