import type { CoreRuleset } from './section-shapes';

export type SectionDefaults = Omit<CoreRuleset, 'system'>;

export const SECTION_DEFAULTS: SectionDefaults = {
    criticals: {
        critOn: 20,
        fumbleOn: 1,
        effects: true,
        doubleDice: false,
        disabledSuccess: [],
        disabledFail: [],
    },
    formulas: { saveDcBase: 8, proficiencyBase: 2, proficiencyEvery: 4 },
    initiative: { heroMin: 10, heroMax: 16, mode: 'static' },
    defaultAttacks: {
        meleeName: 'Unarmed Strike',
        rangedName: 'Ranged Attack',
        weaponName: 'Weapon',
    },
    saves: { proficiency: false },
    concentration: { enabled: false, dcCap: null },
    conditions: { enabled: false, exhaustion: '2014' },
    actions: {
        enabled: false,
        variant: '2014',
    },
    classes: { enabled: false },
    outOfCombat: {
        persistResources: false,
        longRestHitDice: 'half',
        xp: false,
    },
    encounters: { balance: 'fair', edition: '2014', autoXp: false },
    items: { enabled: false, attunementLimit: 3 },
    spellIngredients: { enabled: false, autoPay: true },
};

export function localizedDefaultAttacks(
    t: (key: string) => string
): SectionDefaults['defaultAttacks'] {
    return {
        meleeName: t('defaultNames.meleeAttack'),
        rangedName: t('defaultNames.rangedAttack'),
        weaponName: t('defaultNames.weapon'),
    };
}
