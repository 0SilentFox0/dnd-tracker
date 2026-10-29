"use client";

import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { SelectField } from "@/components/ui/select-field";
import { HAZARD_DICE_PATTERN } from "@/lib/constants/battle";
import { DAMAGE_ELEMENT_OPTIONS } from "@/lib/constants/damage";
import { type MapTerrainTool, MAX_BARRIER_ROUNDS, type TerrainBrush } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

const BRUSHES: { value: TerrainBrush; label: string }[] = [
  { value: "wall", label: "Непрохідне" },
  { value: "barrier", label: "Барʼєр" },
  { value: "hazard", label: "Небезпека" },
  { value: "difficult", label: "Складна" },
  { value: "erase", label: "Стерти" },
];

const DAMAGE_OPTIONS = DAMAGE_ELEMENT_OPTIONS.map(({ value, label }) => ({ value, label }));

export function MapTerrainToolbar({ tool }: { tool: MapTerrainTool }) {
  const { brush, setBrush } = tool;

  return (
    <div className="flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-1.5 rounded-md border border-hud-rule bg-black/70 p-1.5 text-xs">
      {BRUSHES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={brush.kind === value}
          onClick={() => setBrush({ kind: value })}
          className={cn(
            "h-7 rounded-md border bg-black/60 px-2 hover:bg-black/80",
            brush.kind === value ? "border-[var(--gold)] text-hud-gold-bright" : "border-hud-rule text-hud-muted",
          )}
        >
          {label}
        </button>
      ))}
      {brush.kind === "barrier" && (
        <label className="flex items-center gap-1 text-hud-muted">
          Раундів
          <NumberInput
            aria-label="Раундів"
            className="h-7 w-14 px-2 text-xs"
            min={1}
            max={MAX_BARRIER_ROUNDS}
            value={brush.rounds}
            onChange={(v) => setBrush({ rounds: Math.min(MAX_BARRIER_ROUNDS, Math.max(1, v ?? 1)) })}
          />
        </label>
      )}
      {brush.kind === "hazard" && (
        <>
          <Input aria-label="Підпис небезпеки" className="h-7 w-40 px-2 text-xs" maxLength={60} value={brush.label} onChange={(e) => setBrush({ label: e.target.value })} />
          <Input
            aria-label="Шкода (кубики)"
            aria-invalid={brush.dice.trim() !== "" && !HAZARD_DICE_PATTERN.test(brush.dice.trim())}
            className="h-7 w-20 px-2 text-xs"
            maxLength={12}
            placeholder="без шкоди"
            value={brush.dice}
            onChange={(e) => setBrush({ dice: e.target.value })}
          />
          <label className="flex items-center gap-1 text-hud-muted">
            Тип
            <SelectField value={brush.damageType} onValueChange={(damageType) => setBrush({ damageType })} placeholder="Тип" options={DAMAGE_OPTIONS} className="h-7 w-28 px-2 text-xs" />
          </label>
        </>
      )}
    </div>
  );
}
