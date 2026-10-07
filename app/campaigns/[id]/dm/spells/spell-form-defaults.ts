import { CORE_ABILITY_SCORES } from "@/lib/constants/abilities";
import { spellLevelName } from "@/lib/constants/spells";
import type { SpellFormData } from "@/types/spells";

export type { SpellFormData };

export function getDefaultSpellFormData(): SpellFormData {
  return {
    name: "",
    level: 0,
    type: "target",
    target: null,
    damageType: "damage",
    damageElement: null,
    damageModifier: null,
    healModifier: null,
    castingTime: null,
    range: "",
    duration: "",
    diceCount: null,
    diceType: null,
    savingThrow: null,
    description: null,
    effects: [],
    groupId: null,
    icon: null,
    summonUnitId: null,
    damageDistribution: null,
  };
}

export const SPELL_LEVEL_OPTIONS = Array.from({ length: 10 }, (_, level) => ({ value: String(level), label: spellLevelName(level) }));

export const SPELL_TYPE_OPTIONS = [
  { value: "target", label: "Цільове" },
  { value: "aoe", label: "Область дії" },
  { value: "no_target", label: "Без цілі" },
] as const;

export const SPELL_DAMAGE_TYPE_OPTIONS = [
  { value: "damage", label: "Шкода" },
  { value: "heal", label: "Лікування" },
  { value: "all", label: "Усі" },
  { value: "buff", label: "Баф (можна розвіяти)" },
  { value: "debuff", label: "Дебаф (можна розвіяти)" },
] as const;

export const CASTING_TIME_OPTIONS = [
  { value: "1 action", label: "1 action" },
  { value: "1 bonus action", label: "1 bonus action" },
] as const;

export const SAVE_ABILITY_OPTIONS = CORE_ABILITY_SCORES.map(({ key, label }) => ({ value: key, label }));

export const SAVE_ON_SUCCESS_OPTIONS = [
  { value: "half", label: "Половина шкоди" },
  { value: "none", label: "Без урону" },
] as const;
