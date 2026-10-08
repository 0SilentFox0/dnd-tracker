import { CORE_ABILITY_SCORES } from "@/lib/constants/abilities";
import { spellLevelName } from "@/lib/constants/spells";
import { defaultSpellForm } from "@/lib/utils/spells/model/form";
import type { SpellFormData } from "@/types/spells";

export type { SpellFormData };

export const getDefaultSpellFormData = defaultSpellForm;

export const SPELL_LEVEL_OPTIONS = Array.from({ length: 6 }, (_, level) => ({ value: String(level), label: spellLevelName(level) }));

export const SPELL_COST_OPTIONS = [
  { value: "action", label: "Дія" },
  { value: "bonusAction", label: "Бонусна дія" },
] as const;

export const TARGETING_KIND_OPTIONS = [
  { value: "enemy", label: "Один ворог" },
  { value: "ally", label: "Один союзник" },
  { value: "self", label: "Заклинатель" },
  { value: "allyDead", label: "Полеглий союзник" },
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
