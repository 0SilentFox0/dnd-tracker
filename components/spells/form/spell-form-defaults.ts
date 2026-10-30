import { CORE_ABILITY_SCORES } from "@/lib/constants/abilities";
import { SPELL_COST_KEYS as COST_KEYS, SPELL_SAVE_ON_SUCCESS_KEYS, SPELL_TARGETING_KINDS, TEMPLATE_SHAPE_KEYS as SHAPE_KEYS } from "@/lib/constants/spells";
import { defaultSpellForm } from "@/lib/utils/spells/model/form";
import type { SpellFormData } from "@/types/spells";

export type { SpellFormData };

export const getDefaultSpellFormData = defaultSpellForm;

export const SPELL_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export const SPELL_COST_KEYS = [...COST_KEYS];

export const TARGETING_KINDS = [...SPELL_TARGETING_KINDS];

export const TEMPLATE_SHAPE_KEYS = [...SHAPE_KEYS];

export const SAVE_ABILITY_KEYS = CORE_ABILITY_SCORES.map(({ key }) => key);

export const SAVE_ON_SUCCESS_KEYS = [...SPELL_SAVE_ON_SUCCESS_KEYS];

export const SPELL_RESOLUTION_KEYS = ["auto", "save", "attack"];

export const SPELL_SIDE_KEYS = ["enemy", "ally"];

export const DIE_SIDES = [4, 6, 8, 10, 12];
