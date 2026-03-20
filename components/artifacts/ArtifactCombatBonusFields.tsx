"use client";

import { Plus, Trash2 } from "lucide-react";

import type { ArtifactModifierDraft } from "./artifact-combat-draft";
import {
  defaultArtifactModifierDraft,
  modifierDraftToApi,
} from "./artifact-combat-draft";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import {
  ARTIFACT_COMBAT_BONUS_OPTIONS,
  ARTIFACT_MODIFIER_EDITOR_OPTIONS,
  ARTIFACT_SLOT_BONUS_LEVELS,
  artifactSlotBonusKey,
} from "@/lib/constants/artifacts";
import { cn } from "@/lib/utils";

function modifierOptionsForType(currentType: string) {
  const known = new Set(ARTIFACT_MODIFIER_EDITOR_OPTIONS.map((o) => o.value));

  const extra: { value: string; label: string }[] = [];

  if (currentType && !known.has(currentType)) {
    extra.push({ value: currentType, label: `${currentType} (з даних)` });
  }

  return [
    ...ARTIFACT_MODIFIER_EDITOR_OPTIONS.map((o) => ({
      value: o.value,
      label: o.label,
    })),
    ...extra,
  ];
}

function valueKindForType(type: string) {
  return (
    ARTIFACT_MODIFIER_EDITOR_OPTIONS.find((o) => o.value === type)
      ?.valueKind ?? "number"
  );
}

export interface ArtifactCombatBonusFieldsProps {
  bonuses: Record<string, number>;
  onBonusesChange: (next: Record<string, number>) => void;
  modifiers: ArtifactModifierDraft[];
  onModifiersChange: (next: ArtifactModifierDraft[]) => void;
}

export function ArtifactCombatBonusFields({
  bonuses,
  onBonusesChange,
  modifiers,
  onModifiersChange,
}: ArtifactCombatBonusFieldsProps) {
  const setBonus = (key: string, n: number) => {
    onBonusesChange({ ...bonuses, [key]: Number.isFinite(n) ? n : 0 });
  };

  const addModifier = () => {
    onModifiersChange([...modifiers, defaultArtifactModifierDraft()]);
  };

  const updateModifier = (i: number, patch: Partial<ArtifactModifierDraft>) => {
    onModifiersChange(
      modifiers.map((m, j) => (j === i ? { ...m, ...patch } : m)),
    );
  };

  const removeModifier = (i: number) => {
    onModifiersChange(modifiers.filter((_, j) => j !== i));
  };

  return (
    <div className="space-y-6 rounded-lg border p-4">
      <div>
        <p className="text-sm font-semibold">Бойові бонуси</p>
        <p className="text-xs text-muted-foreground mt-1">
          Застосовуються в бою для кожного екіпірованого артефакта окремо і{" "}
          <span className="font-medium text-foreground">сумуються</span>: наприклад,
          +1 моралі в одному артефакті та +1 в іншому дають +2 до моралі в бою.
          Окремо від пасивних ефектів нижче (резисти, слоти 4–5, перевага тощо).
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Характеристики та бойові параметри</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ARTIFACT_COMBAT_BONUS_OPTIONS.map((opt) => (
            <div key={opt.key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{opt.label}</Label>
              <Input
                type="number"
                value={String(bonuses[opt.key] ?? 0)}
                onChange={(e) =>
                  setBonus(
                    opt.key,
                    e.target.value === "" ? 0 : parseInt(e.target.value, 10),
                  )
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Додаткові слоти заклинань</p>
        <p className="text-xs text-muted-foreground">
          Ключі <code className="text-xs bg-muted px-1 rounded">slotBonus_1</code>
          … у JSON — +max і +current для рівня.
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-9">
          {ARTIFACT_SLOT_BONUS_LEVELS.map((lvl) => {
            const key = artifactSlotBonusKey(lvl);

            return (
              <div key={key} className="space-y-1">
                <Label className="text-xs text-muted-foreground">Рів. {lvl}</Label>
                <Input
                  type="number"
                  value={String(bonuses[key] ?? 0)}
                  onChange={(e) =>
                    setBonus(
                      key,
                      e.target.value === "" ? 0 : parseInt(e.target.value, 10),
                    )
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Модифікатори</p>
          <Button type="button" variant="outline" size="sm" onClick={addModifier}>
            <Plus className="mr-1 h-4 w-4" />
            Додати
          </Button>
        </div>
        {modifiers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Немає модифікаторів (кубики шкоди для зброї, % шкоди, бонус атаки…)
          </p>
        ) : (
          <div className="space-y-2">
            {modifiers.map((m, i) => {
              const kind = valueKindForType(m.type);

              const stringVal = kind === "string";

              return (
                <div
                  key={i}
                  className="flex flex-col gap-2 rounded-md border bg-muted/15 p-3 md:flex-row md:flex-wrap md:items-end"
                >
                  <div className="min-w-[220px] flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Тип</Label>
                    <SelectField
                      value={m.type}
                      onValueChange={(v) => updateModifier(i, { type: v })}
                      options={modifierOptionsForType(m.type)}
                    />
                  </div>
                  <div className="min-w-[100px] flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Значення
                    </Label>
                    <Input
                      type={stringVal ? "text" : "number"}
                      value={m.value}
                      onChange={(e) =>
                        updateModifier(i, { value: e.target.value })
                      }
                      placeholder={stringVal ? "2d6" : "0"}
                    />
                  </div>
                  {!stringVal && (
                    <label className="flex items-center gap-2 pb-2 text-sm">
                      <Checkbox
                        checked={m.isPercentage}
                        onCheckedChange={(c) =>
                          updateModifier(i, { isPercentage: c === true })
                        }
                      />
                      %
                    </label>
                  )}
                  <div className="min-w-[100px] flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Стихія (опційно)
                    </Label>
                    <Input
                      value={m.element}
                      onChange={(e) =>
                        updateModifier(i, { element: e.target.value })
                      }
                      placeholder="fire…"
                      className={cn(!stringVal && "max-w-[140px]")}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeModifier(i)}
                    aria-label="Видалити"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Відфільтровує порожні рядкові модифікатори перед відправкою. */
export function buildArtifactModifiersPayload(
  drafts: ArtifactModifierDraft[],
): ReturnType<typeof modifierDraftToApi>[] {
  return drafts
    .map(modifierDraftToApi)
    .filter((m) => {
      if (typeof m.value === "string") return m.value.trim() !== "";

      return m.value !== 0 || m.type;
    });
}
