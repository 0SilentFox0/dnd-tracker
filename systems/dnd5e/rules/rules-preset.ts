import type { RulesPreset } from '@/lib/utils/rules/systems/rules-presets';

export const DND5E_RULES_PRESET = {
    deathSaves: { enabled: true },
    outOfCombat: { inspiration: true },
} as const satisfies RulesPreset;
