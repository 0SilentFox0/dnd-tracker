"use client";

import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { SelectField } from "@/components/ui/select-field";
import { HAZARD_DICE_PATTERN } from "@/lib/constants/battle";
import { DAMAGE_ELEMENT_OPTIONS } from "@/lib/constants/damage";
import { type MapTerrainTool, MAX_BARRIER_ROUNDS, type TerrainBrush } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

const BRUSHES: TerrainBrush[] = ["wall", "barrier", "hazard", "difficult", "erase", "erase-zone"];

export function MapTerrainToolbar({ tool }: { tool: MapTerrainTool }) {
  const t = useTranslations("battle.map.terrain");

  const tTypes = useTranslations("gameTerms.damageTypes");

  const { brush, setBrush } = tool;

  const damageOptions = DAMAGE_ELEMENT_OPTIONS.map(({ value }) => ({ value, label: tTypes(value) }));

  return (
    <div className="flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-1.5 rounded-md border border-hud-rule bg-black/70 p-1.5 text-xs">
      {BRUSHES.map((value) => (
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
          {t(`brushes.${value}`)}
        </button>
      ))}
      {brush.kind === "barrier" && (
        <label className="flex items-center gap-1 text-hud-muted">
          {t("rounds")}
          <NumberInput
            aria-label={t("rounds")}
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
          <Input aria-label={t("hazardLabel")} placeholder={t("hazardDefault")} className="h-7 w-40 px-2 text-xs" maxLength={60} value={brush.label} onChange={(e) => setBrush({ label: e.target.value })} />
          <Input
            aria-label={t("damageDice")}
            aria-invalid={brush.dice.trim() !== "" && !HAZARD_DICE_PATTERN.test(brush.dice.trim())}
            className="h-7 w-20 px-2 text-xs"
            maxLength={12}
            placeholder={t("noDamage")}
            value={brush.dice}
            onChange={(e) => setBrush({ dice: e.target.value })}
          />
          <label className="flex items-center gap-1 text-hud-muted">
            {t("type")}
            <SelectField value={brush.damageType} onValueChange={(damageType) => setBrush({ damageType })} placeholder={t("type")} options={damageOptions} className="h-7 w-28 px-2 text-xs" />
          </label>
        </>
      )}
    </div>
  );
}
