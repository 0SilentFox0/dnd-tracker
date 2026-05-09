"use client";

import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";

import type { ArtifactSetModifierFormRow } from "./artifact-set-bonus-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SelectOption } from "@/components/ui/select-field";
import { SelectField } from "@/components/ui/select-field";
import {
  ARTIFACT_SET_MODIFIER_OPTIONS,
  buildArtifactSetModifierSelectGroups,
} from "@/lib/constants/artifact-sets";

interface Props {
  modifiers: ArtifactSetModifierFormRow[];
  onChange: (next: ArtifactSetModifierFormRow[]) => void;
}

function defaultModifier(): ArtifactSetModifierFormRow {
  return {
    type: "all_damage",
    value: 0,
    isPercentage: false,
    element: "",
  };
}

export function ArtifactSetModifiersField({ modifiers, onChange }: Props) {
  const selectGroups = useMemo(() => {
    const known = new Set(ARTIFACT_SET_MODIFIER_OPTIONS.map((o) => o.value));

    const extra: SelectOption[] = [];

    for (const m of modifiers) {
      if (m.type && !known.has(m.type)) {
        extra.push({ value: m.type, label: `${m.type} (з даних)` });
        known.add(m.type);
      }
    }

    return buildArtifactSetModifierSelectGroups([
      ...ARTIFACT_SET_MODIFIER_OPTIONS,
      ...extra,
    ]);
  }, [modifiers]);

  const add = () => onChange([...modifiers, defaultModifier()]);

  const update = (i: number, patch: Partial<ArtifactSetModifierFormRow>) => {
    onChange(modifiers.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  };

  const remove = (i: number) => {
    onChange(modifiers.filter((_, j) => j !== i));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Модифікатори (атака / шкода / цілі)</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Тип «Шкода (усі фізичні атаки)» або «Шкода дальня» — плоский бонус або % до
            відповідної шкоди в бою.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="mr-1 h-4 w-4" />
          Додати
        </Button>
      </div>
      {modifiers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Немає рядків</p>
      ) : (
        <div className="space-y-2">
          {modifiers.map((m, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-md border bg-muted/20 p-3 md:flex-row md:flex-wrap md:items-end"
            >
              <div className="min-w-[200px] flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Тип</Label>
                <SelectField
                  value={m.type}
                  onValueChange={(v) => update(i, { type: v })}
                  placeholder="Тип"
                  groups={selectGroups}
                />
              </div>
              <div className="w-28 space-y-1">
                <Label className="text-xs text-muted-foreground">Значення</Label>
                <Input
                  type="number"
                  value={String(m.value)}
                  onChange={(e) =>
                    update(i, {
                      value:
                        e.target.value === ""
                          ? 0
                          : parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <Checkbox
                  checked={m.isPercentage}
                  onCheckedChange={(c) =>
                    update(i, { isPercentage: c === true })
                  }
                />
                %
              </label>
              <div className="min-w-[120px] flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Стихія (опційно)
                </Label>
                <Input
                  value={m.element}
                  onChange={(e) => update(i, { element: e.target.value })}
                  placeholder="fire, cold…"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => remove(i)}
                aria-label="Видалити модифікатор"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
