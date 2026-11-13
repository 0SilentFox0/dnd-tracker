import type { RulesPreset } from '@/lib/utils/rules/systems/rules-presets';

/** Overrides the d20 base values: HoMM plays with the 2014 flavour and none of the 5e subsystems */
export const HOMM_RULES_PRESET = {
    criticals: { effects: true, doubleDice: false },
    initiative: { heroMin: 10, heroMax: 16, mode: 'static' },
    saves: { proficiency: false },
    deathSaves: { enabled: false },
    concentration: { enabled: false },
    conditions: { enabled: false, exhaustion: '2014' },
    actions: { enabled: false, variant: '2014' },
    classes: { enabled: false },
    outOfCombat: {
        persistResources: false,
        longRestHitDice: 'half',
        xp: false,
        inspiration: false,
    },
    encounters: { balance: 'fair', edition: '2014', autoXp: false },
    items: { enabled: false },
    spellIngredients: { enabled: false },
} as const satisfies RulesPreset;
