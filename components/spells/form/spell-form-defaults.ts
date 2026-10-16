import { CORE_ABILITY_SCORES } from "@/lib/constants/abilities";
import { labelOptions, SPELL_COST_LABELS, SPELL_SAVE_ON_SUCCESS_LABELS, SPELL_TARGETING_LABELS, spellLevelName } from "@/lib/constants/spells";
import { defaultSpellForm } from "@/lib/utils/spells/model/form";
import type { SpellFormData } from "@/types/spells";

export type { SpellFormData };

export const getDefaultSpellFormData = defaultSpellForm;

const levelOption = (level: number) => ({ value: String(level), label: spellLevelName(level) });

/** Нові заклинання — рівні 1–5; старе заклинання 0-го рівня лишає свій рівень у списку, поки його не змінять. */
export const spellLevelOptions = (current?: number) => [...(current === 0 ? [0] : []), 1, 2, 3, 4, 5].map(levelOption);

export const SPELL_COST_OPTIONS = labelOptions(SPELL_COST_LABELS);

export const TARGETING_KIND_OPTIONS = labelOptions(SPELL_TARGETING_LABELS);

export const SAVE_ABILITY_OPTIONS = CORE_ABILITY_SCORES.map(({ key, label }) => ({ value: key, label }));

export const SAVE_ON_SUCCESS_OPTIONS = labelOptions(SPELL_SAVE_ON_SUCCESS_LABELS);
