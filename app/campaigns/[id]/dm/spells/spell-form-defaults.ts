import type { Spell } from "@/types/spells";

export type SpellFormData = Partial<Spell> & { effects?: string[] };

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

export const SPELL_LEVEL_OPTIONS = [
  { value: "0", label: "Cantrip" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6", label: "6" },
  { value: "7", label: "7" },
  { value: "8", label: "8" },
  { value: "9", label: "9" },
] as const;

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

export const SAVE_ABILITY_OPTIONS = [
  { value: "strength", label: "Сила" },
  { value: "dexterity", label: "Спритність" },
  { value: "constitution", label: "Статура" },
  { value: "intelligence", label: "Інтелект" },
  { value: "wisdom", label: "Мудрість" },
  { value: "charisma", label: "Харизма" },
] as const;

export const SAVE_ON_SUCCESS_OPTIONS = [
  { value: "half", label: "Половина шкоди" },
  { value: "none", label: "Без урону" },
] as const;
