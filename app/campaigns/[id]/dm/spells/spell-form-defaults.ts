import { CORE_ABILITY_SCORES } from "@/lib/constants/abilities";
import { spellLevelName } from "@/lib/constants/spells";
import { defaultSpellForm } from "@/lib/utils/spells/model/form";
import type { SpellFormData } from "@/types/spells";

export type { SpellFormData };

export const getDefaultSpellFormData = defaultSpellForm;

const levelOption = (level: number) => ({ value: String(level), label: spellLevelName(level) });

/** Нові заклинання — рівні 1–5; старе заклинання 0-го рівня лишає свій рівень у списку, поки його не змінять. */
export const spellLevelOptions = (current?: number) => [...(current === 0 ? [0] : []), 1, 2, 3, 4, 5].map(levelOption);

export const SPELL_COST_OPTIONS = [
  { value: "action", label: "Дія" },
  { value: "bonusAction", label: "Бонусна дія" },
] as const;

export const TARGETING_KIND_OPTIONS = [
  { value: "enemy", label: "Один ворог" },
  { value: "ally", label: "Один союзник" },
  { value: "self", label: "Заклинатель" },
  { value: "allyDead", label: "Полеглий союзник" },
  { value: "allAlliesDead", label: "Усі полеглі союзники" },
  { value: "area", label: "Область (до N цілей)" },
  { value: "allAllies", label: "Усі союзники" },
  { value: "allEnemies", label: "Усі вороги" },
  { value: "everyone", label: "Усі учасники" },
] as const;

export const SAVE_ABILITY_OPTIONS = CORE_ABILITY_SCORES.map(({ key, label }) => ({ value: key, label }));

export const SAVE_ON_SUCCESS_OPTIONS = [
  { value: "half", label: "Половина шкоди" },
  { value: "none", label: "Без ефекту" },
] as const;
