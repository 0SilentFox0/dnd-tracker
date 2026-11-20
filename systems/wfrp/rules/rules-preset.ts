import { RulesetSchema } from '@/lib/utils/rules/schema';
import type { RulesPreset } from '@/lib/utils/rules/systems/rules-presets';
import {
    CANON_ADVANCE_MAX,
    CHARACTERISTIC_PURCHASE_COSTS,
    SKILL_PURCHASE_COSTS,
} from '@/systems/wfrp/rules/advancement/canon';

export const WFRP_RULES_PRESET = {
    outOfCombat: { persistResources: true, xp: true },
    spellIngredients: { enabled: true },
    edition: { preset: 'canon5e' },
    advancement: {
        characteristic: {
            brackets: CHARACTERISTIC_PURCHASE_COSTS.map((cost, i) => ({
                upTo: i + 1,
                cost,
            })),
            max: CANON_ADVANCE_MAX,
        },
        skill: {
            brackets: SKILL_PURCHASE_COSTS.map((cost, i) => ({
                upTo: i + 1,
                cost,
            })),
            max: CANON_ADVANCE_MAX,
        },
    },
} as const satisfies RulesPreset;

export const WFRP_RULES = RulesetSchema.parse({
    system: { key: 'wfrp' },
    morale: { enabled: false },
    classes: { enabled: false },
    deathSaves: { enabled: false },
    concentration: { enabled: false },
    conditions: { enabled: false },
    actions: { enabled: false },
    outOfCombat: { persistResources: true, xp: true, inspiration: false },
    spellIngredients: { enabled: true },
    encounters: { balance: 'fair' },
});
