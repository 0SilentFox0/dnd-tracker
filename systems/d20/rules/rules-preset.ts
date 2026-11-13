import type { RulesPreset } from '@/lib/utils/rules/systems/rules-presets';

export const D20_RULES_PRESET = {
    criticals: { effects: false, doubleDice: true },
    initiative: { heroMin: 0, heroMax: 20, mode: 'roll' },
    saves: { proficiency: true },
    deathSaves: { enabled: true },
    concentration: { enabled: true },
    conditions: { enabled: true, exhaustion: '2024' },
    actions: { enabled: true, variant: '2024' },
    classes: { enabled: true },
    outOfCombat: {
        persistResources: true,
        longRestHitDice: 'all',
        xp: true,
        inspiration: true,
    },
    encounters: { balance: 'xp', edition: '2024', autoXp: true },
    items: { enabled: true },
    spellIngredients: { enabled: true },
} as const satisfies RulesPreset;
