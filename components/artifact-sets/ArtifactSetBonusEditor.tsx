"use client";

import type { ArtifactSetBonusFormState } from "./artifact-set-bonus-form";
import { ArtifactSetExtraBonusesField } from "./ArtifactSetExtraBonusesField";
import { ArtifactSetModifiersField } from "./ArtifactSetModifiersField";
import { ArtifactSetPassiveEffectsField } from "./ArtifactSetPassiveEffectsField";
import { ArtifactSetSpellSlotsField } from "./ArtifactSetSpellSlotsField";

import { ArtifactEffectScopeFields } from "@/components/artifacts/ArtifactEffectScopeFields";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ARTIFACT_SET_FLAT_BONUS_OPTIONS } from "@/lib/constants/artifact-sets";

export interface ArtifactSetBonusEditorProps {
  value: ArtifactSetBonusFormState;
  onChange: (next: ArtifactSetBonusFormState) => void;
  campaignId: string;
}

export function ArtifactSetBonusEditor({
  value,
  onChange,
  campaignId,
}: ArtifactSetBonusEditorProps) {
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

  const hasRangedAttackAdvantage = value.passiveEffects.some(
    (e) => e.stat === "advantage_ranged",
  );

  const setRangedAttackAdvantage = (enabled: boolean) => {
    const without = value.passiveEffects.filter(
      (e) => e.stat !== "advantage_ranged",
    );

    if (!enabled) {
      setBonusField("passiveEffects", without);

      return;
    }

    setBonusField("passiveEffects", [
      ...without,
      { stat: "advantage_ranged", type: "flag", value: "" },
    ]);
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

      <ArtifactSetExtraBonusesField
        extraBonuses={value.extraBonuses}
        onChange={(next) => setBonusField("extraBonuses", next)}
      />

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

      <ArtifactSetModifiersField
        modifiers={value.modifiers}
        onChange={(next) => setBonusField("modifiers", next)}
      />

      <ArtifactSetSpellSlotsField
        spellSlotBonus={value.spellSlotBonus}
        onChange={(next) => setBonusField("spellSlotBonus", next)}
      />

      <ArtifactSetPassiveEffectsField
        passiveEffects={value.passiveEffects}
        onChange={(next) => setBonusField("passiveEffects", next)}
      />
    </div>
  );
}
