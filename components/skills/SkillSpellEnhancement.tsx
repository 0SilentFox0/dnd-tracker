"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SPELL_ENHANCEMENT_TYPES,
  type SpellEnhancementType,
} from "@/lib/constants/spell-enhancement";
import {
  DAMAGE_MODIFIER_OPTIONS,
  SPELL_TARGET_OPTIONS,
} from "@/lib/constants/spells";
import { DICE_OPTIONS } from "@/lib/constants/dice";

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

export function SkillSpellEnhancement({
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

      {spellEnhancementTypes.includes("effect_increase") && (
        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="spell-effect-increase">Збільшення ефекту (%)</Label>
          <Input
            id="spell-effect-increase"
            type="number"
            min="0"
            max="200"
            value={spellEffectIncrease}
            onChange={(e) => onEffectIncreaseChange(e.target.value)}
            placeholder="Наприклад: 25"
          />
          <p className="text-xs text-muted-foreground">
            Відсоток, на який збільшується ефективність заклинання
            (шкода/лікування)
          </p>
        </div>
      )}

      {spellEnhancementTypes.includes("target_change") && (
        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="spell-target-change">Новий таргет</Label>
          <Select
            value={spellTargetChange || "none"}
            onValueChange={(value) =>
              onTargetChangeChange(value === "none" ? null : value)
            }
          >
            <SelectTrigger id="spell-target-change">
              <SelectValue placeholder="Виберіть таргет" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Без зміни</SelectItem>
              {SPELL_TARGET_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {spellEnhancementTypes.includes("additional_modifier") && (
        <div className="space-y-3 border-t pt-4">
          <Label>Додатковий модифікатор</Label>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="additional-modifier-type">
                Тип модифікатора
              </Label>
              <Select
                value={spellAdditionalModifier.modifier || "none"}
                onValueChange={(value) =>
                  onAdditionalModifierChange({
                    ...spellAdditionalModifier,
                    modifier: value === "none" ? undefined : value,
                  })
                }
              >
                <SelectTrigger id="additional-modifier-type">
                  <SelectValue placeholder="Виберіть модифікатор" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без модифікатора</SelectItem>
                  {DAMAGE_MODIFIER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                        value={
                          spellAdditionalModifier.damageDice?.match(/^(\d+)/)?.[1] ||
                          ""
                        }
                        onChange={(e) => {
                          const count = e.target.value;
                          const diceMatch =
                            spellAdditionalModifier.damageDice?.match(/d(\d+)/);
                          const diceType = diceMatch?.[1] || "6";
                          onAdditionalModifierChange({
                            ...spellAdditionalModifier,
                            damageDice: count ? `${count}d${diceType}` : "",
                          });
                        }}
                      />
                      <Select
                        value={
                          (() => {
                            const match =
                              spellAdditionalModifier.damageDice?.match(/d(\d+)/);
                            return match?.[1] || "6";
                          })()
                        }
                        onValueChange={(diceTypeNum) => {
                          const count =
                            spellAdditionalModifier.damageDice?.match(/^(\d+)/)?.[1] ||
                            "1";
                          onAdditionalModifierChange({
                            ...spellAdditionalModifier,
                            damageDice: `${count}d${diceTypeNum}`,
                          });
                        }}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DICE_OPTIONS.map((dice) => (
                            <SelectItem
                              key={dice.value}
                              value={dice.value.replace("d", "")}
                            >
                              {dice.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="additional-modifier-duration">
                      Тривалість (раунди)
                    </Label>
                    <Input
                      id="additional-modifier-duration"
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

      {spellEnhancementTypes.includes("new_spell") && (
        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="spell-new-spell">Нове заклинання</Label>
          <Select
            value={spellNewSpellId || "none"}
            onValueChange={(value) =>
              onNewSpellIdChange(value === "none" ? null : value)
            }
          >
            <SelectTrigger id="spell-new-spell">
              <SelectValue placeholder="Виберіть заклинання" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Без нового заклинання</SelectItem>
              {spells.map((spell) => (
                <SelectItem key={spell.id} value={spell.id}>
                  {spell.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
