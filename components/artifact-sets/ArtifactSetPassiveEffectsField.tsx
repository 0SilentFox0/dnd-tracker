"use client";

import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";

import type { ArtifactSetPassiveFormRow } from "./artifact-set-bonus-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SelectOption } from "@/components/ui/select-field";
import { SelectField } from "@/components/ui/select-field";
import {
  ARTIFACT_SET_PASSIVE_FLAG_STATS,
  ARTIFACT_SET_PASSIVE_STAT_OPTIONS,
} from "@/lib/constants/artifact-sets";
import {
  EFFECT_TYPE_OPTIONS,
  isFlagValueType,
  isTextValueType,
} from "@/lib/constants/skill-effects";

interface Props {
  passiveEffects: ArtifactSetPassiveFormRow[];
  onChange: (next: ArtifactSetPassiveFormRow[]) => void;
}

function defaultPassive(): ArtifactSetPassiveFormRow {
  return { stat: "hp_bonus", type: "flat", value: "" };
}

export function ArtifactSetPassiveEffectsField({
  passiveEffects,
  onChange,
}: Props) {
  const statSelectOptions = useMemo(() => {
    const known = new Set(
      ARTIFACT_SET_PASSIVE_STAT_OPTIONS.map((o) => o.value),
    );

    const extra: SelectOption[] = [];

    for (const row of passiveEffects) {
      if (row.stat && !known.has(row.stat)) {
        extra.push({ value: row.stat, label: `${row.stat} (з даних)` });
        known.add(row.stat);
      }
    }

    return [...ARTIFACT_SET_PASSIVE_STAT_OPTIONS, ...extra];
  }, [passiveEffects]);

  const add = () => onChange([...passiveEffects, defaultPassive()]);

  const update = (i: number, patch: Partial<ArtifactSetPassiveFormRow>) => {
    const next = passiveEffects.map((row, j) => {
      if (j !== i) return row;

      const merged = { ...row, ...patch };

      if (patch.stat != null && ARTIFACT_SET_PASSIVE_FLAG_STATS.has(patch.stat)) {
        return { ...merged, type: "flag", value: "" };
      }

      return merged;
    });

    onChange(next);
  };

  const remove = (i: number) => {
    onChange(passiveEffects.filter((_, j) => j !== i));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Пасивні ефекти</p>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="mr-1 h-4 w-4" />
          Додати
        </Button>
      </div>
      {passiveEffects.length === 0 ? (
        <p className="text-sm text-muted-foreground">Немає пасивів</p>
      ) : (
        <div className="space-y-2">
          {passiveEffects.map((row, i) => {
            const isFlagStat = ARTIFACT_SET_PASSIVE_FLAG_STATS.has(row.stat);

            const typeIsFlag = isFlagValueType(row.type);

            const showValue = !isFlagStat && !typeIsFlag;

            return (
              <div
                key={i}
                className="grid gap-2 rounded-md border bg-muted/20 p-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end"
              >
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Стат</Label>
                  <SelectField
                    value={row.stat}
                    onValueChange={(v) => update(i, { stat: v })}
                    placeholder="Стат"
                    options={statSelectOptions}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Тип</Label>
                  <SelectField
                    value={row.type}
                    onValueChange={(v) =>
                      update(i, {
                        type: v,
                        value: isFlagValueType(v) ? "" : row.value,
                      })
                    }
                    placeholder="Тип"
                    options={EFFECT_TYPE_OPTIONS}
                    disabled={isFlagStat}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Значення
                  </Label>
                  {!showValue ? (
                    <Input value="—" disabled className="bg-muted" />
                  ) : (
                    <Input
                      type={isTextValueType(row.type) ? "text" : "number"}
                      value={row.value}
                      onChange={(e) => update(i, { value: e.target.value })}
                      placeholder={
                        row.type === "formula" ? "2*hero_level" : "0"
                      }
                    />
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => remove(i)}
                  aria-label="Видалити пасив"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
