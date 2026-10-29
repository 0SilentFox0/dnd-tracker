"use client";

import { Plus, Trash2 } from "lucide-react";

import { HUD_SELECT_CLASS, HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_CLASS_COLUMNS, MAX_CLASS_LEVEL } from "@/lib/constants/classes";
import type { ClassColumn } from "@/types/classes";

const PASTE_SEPARATORS = /[,\t\n]/;

function ColumnValuesGrid({ column, index, onChange }: { column: ClassColumn; index: number; onChange: (values: string[]) => void }) {
  const cells = Array.from({ length: MAX_CLASS_LEVEL }, (_, i) => column.values[i] ?? "");

  const setCell = (level: number, text: string) => onChange(cells.map((v, j) => (j === level ? text : v)));

  const paste = (level: number, text: string) => {
    const pasted = text.split(PASTE_SEPARATORS).map((c) => c.trim());

    onChange(cells.map((v, j) => (j >= level && j - level < pasted.length ? pasted[j - level] : v)));
  };

  return (
    <div className="mt-2 grid grid-cols-5 gap-x-1.5 gap-y-2 sm:grid-cols-10">
      {cells.map((value, level) => (
        <label key={level} className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-hud-muted">{level + 1}</span>
          <Input
            aria-label={`Колонка ${index + 1}, рівень ${level + 1}`}
            className="h-8 px-1 text-center text-xs md:text-xs"
            value={value}
            onChange={(e) => setCell(level, e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");

              if (!PASTE_SEPARATORS.test(text)) return;

              e.preventDefault();
              paste(level, text);
            }}
          />
        </label>
      ))}
    </div>
  );
}

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
      <p className="text-xs text-muted-foreground">Значення по рівнях 1–20: «2», «+2», «1d6», «D8», «+10 ft.»; порожньо — немає. Список через кому можна вставити в клітинку. Колонка-пул — максимум очок, спільних для вмінь класу.</p>
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
          <ColumnValuesGrid column={c} index={i} onChange={(values) => patch(i, { values })} />
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
