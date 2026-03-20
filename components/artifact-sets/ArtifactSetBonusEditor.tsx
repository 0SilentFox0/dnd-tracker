"use client";

import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";

import type {
  ArtifactSetBonusFormState,
  ArtifactSetModifierFormRow,
  ArtifactSetPassiveFormRow,
} from "./artifact-set-bonus-form";

import { ArtifactEffectScopeFields } from "@/components/artifacts/ArtifactEffectScopeFields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SelectOption } from "@/components/ui/select-field";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import {
  ARTIFACT_SET_FLAT_BONUS_OPTIONS,
  ARTIFACT_SET_MODIFIER_OPTIONS,
  ARTIFACT_SET_PASSIVE_FLAG_STATS,
  ARTIFACT_SET_PASSIVE_STAT_OPTIONS,
  buildArtifactSetModifierSelectGroups,
  SPELL_SLOT_LEVEL_KEYS,
} from "@/lib/constants/artifact-sets";
import {
  EFFECT_TYPE_OPTIONS,
  isFlagValueType,
  isTextValueType,
} from "@/lib/constants/skill-effects";

export interface ArtifactSetBonusEditorProps {
  value: ArtifactSetBonusFormState;
  onChange: (next: ArtifactSetBonusFormState) => void;
  campaignId: string;
}

function defaultModifier(): ArtifactSetModifierFormRow {
  return {
    type: "all_damage",
    value: 0,
    isPercentage: false,
    element: "",
  };
}

function defaultPassive(): ArtifactSetPassiveFormRow {
  return { stat: "hp_bonus", type: "flat", value: "" };
}

export function ArtifactSetBonusEditor({
  value,
  onChange,
  campaignId,
}: ArtifactSetBonusEditorProps) {
  const modifierSelectGroups = useMemo(() => {
    const known = new Set(ARTIFACT_SET_MODIFIER_OPTIONS.map((o) => o.value));

    const extra: SelectOption[] = [];

    for (const m of value.modifiers) {
      if (m.type && !known.has(m.type)) {
        extra.push({ value: m.type, label: `${m.type} (з даних)` });
        known.add(m.type);
      }
    }

    const all = [...ARTIFACT_SET_MODIFIER_OPTIONS, ...extra];

    return buildArtifactSetModifierSelectGroups(all);
  }, [value.modifiers]);

  const hasRangedAttackAdvantage = value.passiveEffects.some(
    (e) => e.stat === "advantage_ranged",
  );

  const setRangedAttackAdvantage = (enabled: boolean) => {
    const without = value.passiveEffects.filter((e) => e.stat !== "advantage_ranged");

    if (!enabled) {
      setBonusField("passiveEffects", without);

      return;
    }

    setBonusField("passiveEffects", [
      ...without,
      { stat: "advantage_ranged", type: "flag", value: "" },
    ]);
  };

  const passiveStatSelectOptions = useMemo(() => {
    const known = new Set(
      ARTIFACT_SET_PASSIVE_STAT_OPTIONS.map((o) => o.value),
    );

    const extra: SelectOption[] = [];

    for (const row of value.passiveEffects) {
      if (row.stat && !known.has(row.stat)) {
        extra.push({ value: row.stat, label: `${row.stat} (з даних)` });
        known.add(row.stat);
      }
    }

    return [...ARTIFACT_SET_PASSIVE_STAT_OPTIONS, ...extra];
  }, [value.passiveEffects]);

  const setBonusField = <K extends keyof ArtifactSetBonusFormState>(
    key: K,
    v: ArtifactSetBonusFormState[K],
  ) => {
    onChange({ ...value, [key]: v });
  };

  const setBonusAmount = (key: string, n: number) => {
    onChange({
      ...value,
      bonuses: { ...value.bonuses, [key]: Number.isFinite(n) ? n : 0 },
    });
  };

  const setSlotLevel = (lvl: string, n: number) => {
    onChange({
      ...value,
      spellSlotBonus: {
        ...value.spellSlotBonus,
        [lvl]: Number.isFinite(n) ? n : 0,
      },
    });
  };

  const addModifier = () => {
    setBonusField("modifiers", [...value.modifiers, defaultModifier()]);
  };

  const updateModifier = (i: number, patch: Partial<ArtifactSetModifierFormRow>) => {
    const next = value.modifiers.map((m, j) =>
      j === i ? { ...m, ...patch } : m,
    );

    setBonusField("modifiers", next);
  };

  const removeModifier = (i: number) => {
    setBonusField(
      "modifiers",
      value.modifiers.filter((_, j) => j !== i),
    );
  };

  const addPassive = () => {
    setBonusField("passiveEffects", [...value.passiveEffects, defaultPassive()]);
  };

  const updatePassive = (i: number, patch: Partial<ArtifactSetPassiveFormRow>) => {
    const next = value.passiveEffects.map((row, j) => {
      if (j !== i) return row;

      const merged = { ...row, ...patch };

      if (patch.stat != null && ARTIFACT_SET_PASSIVE_FLAG_STATS.has(patch.stat)) {
        return { ...merged, type: "flag", value: "" };
      }

      return merged;
    });

    setBonusField("passiveEffects", next);
  };

  const removePassive = (i: number) => {
    setBonusField(
      "passiveEffects",
      value.passiveEffects.filter((_, j) => j !== i),
    );
  };

  return (
    <div className="space-y-6 rounded-lg border p-4">
      <div>
        <p className="text-sm font-semibold">Бонус повного комплекту</p>
        <p className="text-xs text-muted-foreground mt-1">
          Застосовується в бою, коли на персонажі всі артефакти цього сету.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="set-bonus-name">Назва бонусу в бою (опційно)</Label>
        <p className="text-xs text-muted-foreground">
          Якщо порожньо — у бою показується назва сету.
        </p>
        <Input
          id="set-bonus-name"
          value={value.bonusName}
          onChange={(e) => setBonusField("bonusName", e.target.value)}
          placeholder="Наприклад, Сила дракона"
          maxLength={120}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="set-bonus-desc">Опис бонусу (довідка)</Label>
        <Textarea
          id="set-bonus-desc"
          value={value.bonusDescription}
          onChange={(e) => setBonusField("bonusDescription", e.target.value)}
          rows={2}
          placeholder="Коротко, що дає повний сет"
        />
      </div>

      <ArtifactEffectScopeFields
        campaignId={campaignId}
        value={{
          audience: value.effectAudience,
          immuneSpellIds: value.immuneSpellIds,
        }}
        onChange={(d) =>
          onChange({
            ...value,
            effectAudience: d.audience,
            immuneSpellIds: d.immuneSpellIds,
          })
        }
        idPrefix="set-bonus"
      />

      <div className="space-y-3">
        <p className="text-sm font-medium">Плоскі бонуси</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ARTIFACT_SET_FLAT_BONUS_OPTIONS.map((opt) => (
            <div key={opt.value} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{opt.label}</Label>
              <Input
                type="number"
                value={String(value.bonuses[opt.value] ?? 0)}
                onChange={(e) =>
                  setBonusAmount(
                    opt.value,
                    e.target.value === "" ? 0 : parseInt(e.target.value, 10),
                  )
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Додаткові плоскі бонуси</p>
            <p className="text-xs text-muted-foreground">
              Довільний ключ у об&apos;єкті bonuses (якщо потрібно щось поза списком вище).
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                ...value,
                extraBonuses: [...value.extraBonuses, { key: "", value: 0 }],
              })
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            Рядок
          </Button>
        </div>
        {value.extraBonuses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Немає додаткових ключів</p>
        ) : (
          <div className="space-y-2">
            {value.extraBonuses.map((row, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-md border bg-muted/10 p-2 sm:flex-row sm:items-end"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Ключ</Label>
                  <Input
                    value={row.key}
                    onChange={(e) => {
                      const next = [...value.extraBonuses];

                      next[i] = { ...row, key: e.target.value };

                      onChange({ ...value, extraBonuses: next });
                    }}
                    placeholder="customStat"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="w-28 space-y-1">
                  <Label className="text-xs text-muted-foreground">Значення</Label>
                  <Input
                    type="number"
                    value={String(row.value)}
                    onChange={(e) => {
                      const next = [...value.extraBonuses];

                      next[i] = {
                        ...row,
                        value:
                          e.target.value === ""
                            ? 0
                            : parseFloat(e.target.value),
                      };

                      onChange({ ...value, extraBonuses: next });
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() =>
                    onChange({
                      ...value,
                      extraBonuses: value.extraBonuses.filter((_, j) => j !== i),
                    })
                  }
                  aria-label="Видалити рядок"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-md border border-dashed bg-muted/15 p-4">
        <div>
          <p className="text-sm font-medium">Шкода та дальні атаки</p>
          <p className="text-xs text-muted-foreground mt-1">
            Бонус до шкоди задається рядками «Модифікатори» нижче (група «Шкода»). Тут —
            швидкий перемикач переваги на кидки дальньої атаки (як пасив сету).
          </p>
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug">
          <Checkbox
            checked={hasRangedAttackAdvantage}
            onCheckedChange={(c) => setRangedAttackAdvantage(c === true)}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">Перевага на всі дальні атаки</span>
            <span className="block text-xs text-muted-foreground">
              Еквівалент пасиву «Перевага на дальні атаки» у списку нижче; у бою
              застосовується після збору повного сету.
            </span>
          </span>
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Модифікатори (атака / шкода / цілі)</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Тип «Шкода (усі фізичні атаки)» або «Шкода дальня» — плоский бонус або % до
              відповідної шкоди в бою.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addModifier}>
            <Plus className="mr-1 h-4 w-4" />
            Додати
          </Button>
        </div>
        {value.modifiers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Немає рядків</p>
        ) : (
          <div className="space-y-2">
            {value.modifiers.map((m, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-md border bg-muted/20 p-3 md:flex-row md:flex-wrap md:items-end"
              >
                <div className="min-w-[200px] flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Тип</Label>
                  <SelectField
                    value={m.type}
                    onValueChange={(v) => updateModifier(i, { type: v })}
                    placeholder="Тип"
                    groups={modifierSelectGroups}
                  />
                </div>
                <div className="w-28 space-y-1">
                  <Label className="text-xs text-muted-foreground">Значення</Label>
                  <Input
                    type="number"
                    value={String(m.value)}
                    onChange={(e) =>
                      updateModifier(i, {
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
                      updateModifier(i, { isPercentage: c === true })
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
                    onChange={(e) =>
                      updateModifier(i, { element: e.target.value })
                    }
                    placeholder="fire, cold…"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => removeModifier(i)}
                  aria-label="Видалити модифікатор"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Додаткові слоти заклинань</p>
        <p className="text-xs text-muted-foreground">
          Скільки додати до max і current для кожного рівня (1–9).
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-9">
          {SPELL_SLOT_LEVEL_KEYS.map((lvl) => (
            <div key={lvl} className="space-y-1">
              <Label className="text-xs text-muted-foreground">Рів. {lvl}</Label>
              <Input
                type="number"
                value={String(value.spellSlotBonus[lvl] ?? 0)}
                onChange={(e) =>
                  setSlotLevel(
                    lvl,
                    e.target.value === "" ? 0 : parseInt(e.target.value, 10),
                  )
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Пасивні ефекти</p>
          <Button type="button" variant="outline" size="sm" onClick={addPassive}>
            <Plus className="mr-1 h-4 w-4" />
            Додати
          </Button>
        </div>
        {value.passiveEffects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Немає пасивів</p>
        ) : (
          <div className="space-y-2">
            {value.passiveEffects.map((row, i) => {
              const isFlagStat = ARTIFACT_SET_PASSIVE_FLAG_STATS.has(row.stat);

              const typeIsFlag = isFlagValueType(row.type);

              const showValue =
                !isFlagStat && !typeIsFlag;

              return (
                <div
                  key={i}
                  className="grid gap-2 rounded-md border bg-muted/20 p-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end"
                >
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Стат</Label>
                    <SelectField
                      value={row.stat}
                      onValueChange={(v) => updatePassive(i, { stat: v })}
                      placeholder="Стат"
                      options={passiveStatSelectOptions}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Тип</Label>
                    <SelectField
                      value={row.type}
                      onValueChange={(v) =>
                        updatePassive(i, {
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
                        onChange={(e) =>
                          updatePassive(i, { value: e.target.value })
                        }
                        placeholder={
                          row.type === "formula"
                            ? "2*hero_level"
                            : "0"
                        }
                      />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removePassive(i)}
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
    </div>
  );
}
