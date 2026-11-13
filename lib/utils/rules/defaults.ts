import type { CoreRuleset, Ruleset } from './section-shapes';

export type SectionDefaults = Omit<CoreRuleset, 'system'>;

export const SECTION_DEFAULTS: SectionDefaults = {
    morale: { enabled: true, cap: 3 },
    criticals: {
        critOn: 20,
        fumbleOn: 1,
        effects: true,
        doubleDice: false,
        disabledSuccess: [],
        disabledFail: [],
    },
    formulas: { saveDcBase: 8, proficiencyBase: 2, proficiencyEvery: 4 },
    heroScaling: {
        meleeDiceByLevel: null,
        rangedDiceByLevel: null,
        hpBaseLevels: 3,
        hpConCoefficient: 1.5,
    },
    initiative: { heroMin: 10, heroMax: 16, mode: 'static' },
    defaultAttacks: {
        meleeName: 'Unarmed Strike',
        rangedName: 'Ranged Attack',
        weaponName: 'Weapon',
    },
    saves: { proficiency: false },
    deathSaves: { enabled: false, unitsDieAtZero: true },
    concentration: { enabled: false, dcCap: null },
    conditions: { enabled: false, exhaustion: '2014' },
    actions: {
        enabled: false,
        opportunityAttacks: true,
        retaliation: true,
        variant: '2014',
    },
    classes: { enabled: false },
    outOfCombat: {
        persistResources: false,
        longRestHitDice: 'half',
        xp: false,
        inspiration: false,
    },
    encounters: { balance: 'fair', edition: '2014', autoXp: false },
    items: { enabled: false, attunementLimit: 3 },
    spellIngredients: { enabled: false, autoPay: true },
};

/** Test fixture only (production imports are banned by ESLint): `advancement` is owned by a system section and absent here, full defaults come from `defaultRulesFor` */
export const DEFAULT_RULES = {
    ...SECTION_DEFAULTS,
    tables: {},
    system: { key: 'homm' },
} as Ruleset;

export function localizedDefaultAttacks(
    t: (key: string) => string
): SectionDefaults['defaultAttacks'] {
    return {
        meleeName: t('defaultNames.meleeAttack'),
        rangedName: t('defaultNames.rangedAttack'),
        weaponName: t('defaultNames.weapon'),
    };
}
