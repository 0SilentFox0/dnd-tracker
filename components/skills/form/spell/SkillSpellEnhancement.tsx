"use client";

import { memo, useMemo } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import { DICE_OPTIONS } from "@/lib/constants/dice";
import {
  SPELL_ENHANCEMENT_TYPES,
  SpellEnhancementType,
} from "@/lib/constants/spell-enhancement";
import {
  DAMAGE_MODIFIER_OPTIONS,
  SPELL_TARGET_OPTIONS,
} from "@/lib/constants/spells";

interface SpellOption {
  id: string;
  name: string;
}

interface SkillSpellEnhancementProps {
  spellEnhancementTypes: SpellEnhancementType[];
  spellEffectIncrease: string;
  spellTargetChange: string | null;
  spellAdditionalModifier: {
    modifier?: string;
    damageDice?: string;
    duration?: number;
  };
  spellNewSpellId: string | null;
  spells: SpellOption[];
  onEnhancementTypeToggle: (type: SpellEnhancementType) => void;
  onEffectIncreaseChange: (value: string) => void;
  onTargetChangeChange: (value: string | null) => void;
  onAdditionalModifierChange: (modifier: {
    modifier?: string;
    damageDice?: string;
    duration?: number;
  }) => void;
  onNewSpellIdChange: (value: string | null) => void;
}

function SkillSpellEnhancementComponent({
  spellEnhancementTypes,
  spellEffectIncrease,
  spellTargetChange,
  spellAdditionalModifier,
  spellNewSpellId,
  spells,
  onEnhancementTypeToggle,
  onEffectIncreaseChange,
  onTargetChangeChange,
  onAdditionalModifierChange,
  onNewSpellIdChange,
}: SkillSpellEnhancementProps) {
  const hasEffectIncrease = useMemo(
    () => spellEnhancementTypes.includes(SpellEnhancementType.EFFECT_INCREASE),
    [spellEnhancementTypes],
  );

  const hasTargetChange = useMemo(
    () => spellEnhancementTypes.includes(SpellEnhancementType.TARGET_CHANGE),
    [spellEnhancementTypes],
  );

  const hasAdditionalModifier = useMemo(
    () => spellEnhancementTypes.includes(SpellEnhancementType.ADDITIONAL_MODIFIER),
    [spellEnhancementTypes],
  );

  const hasNewSpell = useMemo(
    () => spellEnhancementTypes.includes(SpellEnhancementType.NEW_SPELL),
    [spellEnhancementTypes],
  );

  const spellTargetOptions = useMemo(
    () => SPELL_TARGET_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
    [],
  );

  const damageModifierOptions = useMemo(
    () => DAMAGE_MODIFIER_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
    [],
  );

  const diceOptions = useMemo(
    () =>
      DICE_OPTIONS.map((dice) => ({
        value: dice.value.replace("d", ""),
        label: dice.label,
      })),
    [],
  );

  const spellOptions = useMemo(
    () => spells.map((spell) => ({ value: spell.id, label: spell.name })),
    [spells],
  );

  const diceCount = useMemo(
    () => spellAdditionalModifier.damageDice?.match(/^(\d+)/)?.[1] || "",
    [spellAdditionalModifier.damageDice],
  );

  const diceType = useMemo(() => {
    const match = spellAdditionalModifier.damageDice?.match(/d(\d+)/);
    return match?.[1] || "6";
  }, [spellAdditionalModifier.damageDice]);

  return (
    <div className="space-y-3">
      <Label>Типи покращення (можна вибрати декілька)</Label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SPELL_ENHANCEMENT_TYPES.map((type) => (
          <div key={type.value} className="flex items-center space-x-2">
            <Checkbox
              id={`enhancement-${type.value}`}
              checked={spellEnhancementTypes.includes(type.value)}
              onCheckedChange={() => onEnhancementTypeToggle(type.value)}
            />
            <Label
              htmlFor={`enhancement-${type.value}`}
              className="text-sm font-normal cursor-pointer"
            >
              {type.label}
            </Label>
          </div>
        ))}
      </div>

      {hasEffectIncrease && (
        <div className="space-y-2 border-t pt-4">
          <LabeledInput
            id="spell-effect-increase"
            label="Збільшення ефекту (%)"
            type="number"
            min="0"
            max="200"
            value={spellEffectIncrease}
            onChange={(e) => onEffectIncreaseChange(e.target.value)}
            placeholder="Наприклад: 25"
            description="Відсоток, на який збільшується ефективність заклинання (шкода/лікування)"
          />
        </div>
      )}

      {hasTargetChange && (
        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="spell-target-change">Новий таргет</Label>
          <SelectField
            id="spell-target-change"
            value={spellTargetChange || ""}
            onValueChange={(value) => onTargetChangeChange(value || null)}
            placeholder="Виберіть таргет"
            options={spellTargetOptions}
            allowNone
            noneLabel="Без зміни"
          />
        </div>
      )}

      {hasAdditionalModifier && (
        <div className="space-y-3 border-t pt-4">
          <Label>Додатковий модифікатор</Label>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="additional-modifier-type">
                Тип модифікатора
              </Label>
              <SelectField
                id="additional-modifier-type"
                value={spellAdditionalModifier.modifier || ""}
                onValueChange={(value) =>
                  onAdditionalModifierChange({
                    ...spellAdditionalModifier,
                    modifier: value || undefined,
                  })
                }
                placeholder="Виберіть модифікатор"
                options={damageModifierOptions}
                allowNone
                noneLabel="Без модифікатора"
              />
            </div>

            {spellAdditionalModifier.modifier && (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="additional-modifier-dice">
                      Кубики шкоди
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="additional-modifier-dice-count"
                        type="number"
                        min="0"
                        max="10"
                        placeholder="Кількість"
                        value={diceCount}
                        onChange={(e) => {
                          const count = e.target.value;
                          onAdditionalModifierChange({
                            ...spellAdditionalModifier,
                            damageDice: count ? `${count}d${diceType}` : "",
                          });
                        }}
                      />
                      <SelectField
                        value={diceType}
                        onValueChange={(diceTypeNum) => {
                          const count = diceCount || "1";
                          onAdditionalModifierChange({
                            ...spellAdditionalModifier,
                            damageDice: `${count}d${diceTypeNum}`,
                          });
                        }}
                        options={diceOptions}
                        triggerClassName="w-24"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <LabeledInput
                      id="additional-modifier-duration"
                      label="Тривалість (раунди)"
                      type="number"
                      min="0"
                      max="10"
                      value={spellAdditionalModifier.duration?.toString() || ""}
                      onChange={(e) =>
                        onAdditionalModifierChange({
                          ...spellAdditionalModifier,
                          duration: e.target.value
                            ? parseInt(e.target.value, 10)
                            : undefined,
                        })
                      }
                      placeholder="Наприклад: 3"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Вороги отримують додаткову шкоду протягом вказаної кількості
                  раундів
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {hasNewSpell && (
        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="spell-new-spell">Нове заклинання</Label>
          <SelectField
            id="spell-new-spell"
            value={spellNewSpellId || ""}
            onValueChange={(value) => onNewSpellIdChange(value || null)}
            placeholder="Виберіть заклинання"
            options={spellOptions}
            allowNone
            noneLabel="Без нового заклинання"
          />
        </div>
      )}
    </div>
  );
}

export const SkillSpellEnhancement = memo(SkillSpellEnhancementComponent);
