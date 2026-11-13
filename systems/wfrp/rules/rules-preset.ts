import { RulesetSchema } from '@/lib/utils/rules/schema';
import type { RulesPreset } from '@/lib/utils/rules/systems/rules-presets';

export const WFRP_RULES_PRESET = {
    outOfCombat: { persistResources: true, xp: true },
    spellIngredients: { enabled: true },
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
