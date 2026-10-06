"use client";

import { memo, useMemo } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import {
  SPELL_ENHANCEMENT_TYPES,
  SpellEnhancementType,
} from "@/lib/constants/spell-enhancement";
import {
  DAMAGE_MODIFIER_SELECT_OPTIONS,
  DICE_SIDE_OPTIONS,
  parseDamageDice,
  SPELL_TARGET_SELECT_OPTIONS,
} from "@/lib/utils/skills/spell-enhancement";

interface SpellOption {
  id: string;
  name: string;
}

const ENHANCEMENT_CHECKBOX_TYPES = SPELL_ENHANCEMENT_TYPES.filter(
  (t) => t.value !== SpellEnhancementType.AOE_SPELL_UNLOCK,
);

type AdditionalModifier = { modifier?: string; damageDice?: string; duration?: number };

export interface SpellEnhancementValue {
  types: SpellEnhancementType[];
  effectIncrease: string;
  targetChange: string | null;
  additionalModifier: AdditionalModifier;
  newSpellId: string | null;
}

export interface SpellEnhancementActions {
  toggleType: (type: SpellEnhancementType) => void;
  setEffectIncrease: (value: string) => void;
  setTargetChange: (value: string | null) => void;
  setAdditionalModifier: (modifier: AdditionalModifier) => void;
  setNewSpellId: (value: string | null) => void;
}

interface SkillSpellEnhancementProps {
  value: SpellEnhancementValue;
  spells: SpellOption[];
  actions: SpellEnhancementActions;
}

function SkillSpellEnhancementComponent({ value, spells, actions }: SkillSpellEnhancementProps) {
  const has = (t: SpellEnhancementType) => value.types.includes(t);

  const spellOptions = useMemo(() => spells.map((spell) => ({ value: spell.id, label: spell.name })), [spells]);

  const modifier = value.additionalModifier;

  const { count: diceCount, sides: diceType } = parseDamageDice(modifier.damageDice);

  return (
    <div className="space-y-3">
      <Label>Типи покращення (можна вибрати декілька)</Label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ENHANCEMENT_CHECKBOX_TYPES.map((type) => (
          <div key={type.value} className="flex items-center space-x-2">
            <Checkbox
              id={`enhancement-${type.value}`}
              checked={has(type.value)}
              onCheckedChange={() => actions.toggleType(type.value)}
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

      {has(SpellEnhancementType.EFFECT_INCREASE) && (
        <div className="space-y-2 border-t pt-4">
          <LabeledInput
            id="spell-effect-increase"
            label="Збільшення ефекту (%)"
            type="number"
            min="0"
            max="200"
            value={value.effectIncrease}
            onChange={(e) => actions.setEffectIncrease(e.target.value)}
            placeholder="Наприклад: 25"
            description="Відсоток, на який збільшується ефективність заклинання (шкода/лікування)"
          />
        </div>
      )}

      {has(SpellEnhancementType.TARGET_CHANGE) && (
        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="spell-target-change">Новий таргет</Label>
          <SelectField
            id="spell-target-change"
            value={value.targetChange || ""}
            onValueChange={(v) => actions.setTargetChange(v || null)}
            placeholder="Виберіть таргет"
            options={SPELL_TARGET_SELECT_OPTIONS}
            allowNone
            noneLabel="Без зміни"
          />
        </div>
      )}

      {has(SpellEnhancementType.ADDITIONAL_MODIFIER) && (
        <div className="space-y-3 border-t pt-4">
          <Label>Додатковий модифікатор</Label>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="additional-modifier-type">
                Тип модифікатора
              </Label>
              <SelectField
                id="additional-modifier-type"
                value={modifier.modifier || ""}
                onValueChange={(v) => actions.setAdditionalModifier({ ...modifier, modifier: v || undefined })}
                placeholder="Виберіть модифікатор"
                options={DAMAGE_MODIFIER_SELECT_OPTIONS}
                allowNone
                noneLabel="Без модифікатора"
              />
            </div>

            {modifier.modifier && (
              <>
                <div className="grid grid-cols-2 items-end gap-3 [&>*]:min-w-0">
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

                          actions.setAdditionalModifier({ ...modifier, damageDice: count ? `${count}d${diceType}` : "" });
                        }}
                      />
                      <SelectField
                        value={diceType}
                        onValueChange={(diceTypeNum) => {
                          const count = diceCount || "1";

                          actions.setAdditionalModifier({ ...modifier, damageDice: `${count}d${diceTypeNum}` });
                        }}
                        options={DICE_SIDE_OPTIONS}
                        triggerClassName="w-24"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <LabeledInput
                      id="additional-modifier-duration"
                      label="Тривалість (раунди)"
                      labelClassName="text-xs leading-tight"
                      type="number"
                      min="0"
                      max="10"
                      value={modifier.duration?.toString() || ""}
                      onChange={(e) =>
                        actions.setAdditionalModifier({
                          ...modifier,
                          duration: e.target.value ? parseInt(e.target.value, 10) : undefined,
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

      {has(SpellEnhancementType.NEW_SPELL) && (
        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="spell-new-spell">Нове заклинання</Label>
          <SelectField
            id="spell-new-spell"
            value={value.newSpellId || ""}
            onValueChange={(v) => actions.setNewSpellId(v || null)}
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
