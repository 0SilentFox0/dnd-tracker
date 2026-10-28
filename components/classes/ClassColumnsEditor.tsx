"use client";

import { Plus, Trash2 } from "lucide-react";

import { HUD_SELECT_CLASS, HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_CLASS_COLUMNS, MAX_CLASS_LEVEL } from "@/lib/constants/classes";
import { parseColumnValuesText } from "@/lib/utils/characters/classes/columns";
import type { ClassColumn } from "@/types/classes";

export function ClassColumnsEditor({ value, onChange }: { value: ClassColumn[]; onChange: (next: ClassColumn[]) => void }) {
  const patch = (i: number, next: Partial<ClassColumn>) => onChange(value.map((c, j) => (j === i ? { ...c, ...next } : c)));

  const setPool = (i: number, on: boolean) =>
    onChange(
      value.map((c, j) => {
        if (j !== i) return c;

        const { pool: _drop, ...rest } = c;

        return on ? { ...rest, pool: { rest: "long" as const } } : rest;
      }),
    );

  const add = () => {
    const n = value.length + 1;

    onChange([...value, { key: `column-${n}`, label: `Колонка ${n}`, values: Array(MAX_CLASS_LEVEL).fill("") }]);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">20 значень через кому (рівні 1–20): «2», «+2», «1d6», «D8», «+10 ft.»; порожньо — немає. Колонка-пул — максимум очок, спільних для вмінь класу.</p>
      {value.map((c, i) => (
        <HudSection
          key={i}
          title={c.label || c.key}
          action={
            <Button type="button" variant="ghost" size="sm" aria-label={`Видалити колонку ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          }
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <Input aria-label={`Ключ колонки ${i + 1}`} value={c.key} onChange={(e) => patch(i, { key: e.target.value })} placeholder="sneak-attack" />
            <Input aria-label={`Назва колонки ${i + 1}`} value={c.label} onChange={(e) => patch(i, { label: e.target.value })} placeholder="Sneak Attack" />
          </div>
          <Input aria-label={`Значення колонки ${i + 1}`} className="mt-2" value={c.values.join(", ")} onChange={(e) => patch(i, { values: parseColumnValuesText(e.target.value) })} />
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" aria-label={`Пул колонки ${i + 1}`} checked={!!c.pool} onChange={(e) => setPool(i, e.target.checked)} />
              Пул
            </label>
            {c.pool && (
              <select aria-label={`Відпочинок колонки ${i + 1}`} className={HUD_SELECT_CLASS} value={c.pool.rest} onChange={(e) => patch(i, { pool: { rest: e.target.value as "short" | "long" } })}>
                <option value="short">короткий відпочинок</option>
                <option value="long">довгий відпочинок</option>
              </select>
            )}
          </div>
        </HudSection>
      ))}
      {value.length < MAX_CLASS_COLUMNS && (
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4" />
          Додати колонку
        </Button>
      )}
    </div>
  );
}
