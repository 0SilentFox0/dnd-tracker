import type { ArtifactRow } from '../lib/types';

import { ROUNDS_PER_MINUTE } from '@/lib/constants/duration';
import type { WeaponTrait } from '@/lib/constants/weapon-traits';
import type { Ability, Condition, Effect } from '@/lib/utils/abilities/schema';
import type { ItemStats } from '@/lib/utils/items/item-stats';

type PropertyOverride = {
    abilities?: Ability[];
    dropAbilities?: string[];
    overrides?: NonNullable<ItemStats['property']>['overrides'];
};

// <kind>:<template> → property name; the +N families are split by kind because SRD names them alike
export const FAMILY_NAMES: Record<string, string> = {
    'weapon:{base} (+1)': 'Weapon +1',
    'weapon:{base} (+2)': 'Weapon +2',
    'weapon:{base} (+3)': 'Weapon +3',
    'weapon:Weapon of Warning ({base})': 'Weapon of Warning',
    'weapon:Defender ({base})': 'Defender',
    'weapon:Giant Slayer ({base})': 'Giant Slayer',
    'weapon:Holy Avenger ({base})': 'Holy Avenger',
    'weapon:Nine Lives Stealer ({base})': 'Nine Lives Stealer',
    'weapon:Vicious {base}': 'Vicious',
    'weapon:Flame Tongue {base}': 'Flame Tongue',
    'weapon:Luck Blade ({base})': 'Luck Blade',
    'weapon:Frost Brand ({base})': 'Frost Brand',
    'weapon:{base} of Life Stealing': 'Life Stealing',
    'weapon:{base} of Wounding': 'Wounding',
    'weapon:Dancing {base}': 'Dancing',
    'weapon:{base} of Sharpness': 'Sharpness',
    'weapon:Vorpal {base}': 'Vorpal',
    'weapon:Berserker {base}': 'Berserker',
    'weapon:Hammer of Thunderbolts ({base})': 'Hammer of Thunderbolts',
    'weapon:Oathbow ({base})': 'Oathbow',
    'armor:{base} (+1)': 'Armor +1',
    'armor:{base} (+2)': 'Armor +2',
    'armor:{base} (+3)': 'Armor +3',
    'armor:Armor of Vulnerability ({base})': 'Armor of Vulnerability',
    'armor:Demon {base}': 'Demon Armor',
    'armor:Armor of Resistance ({base})': 'Armor of Resistance',
    'armor:Adamantine Armor ({base})': 'Adamantine Armor',
    'armor:Mithral Armor ({base})': 'Mithral Armor',
    'armor:Elven {base}': 'Elven Chain',
    'armor:Dwarven {base}': 'Dwarven Plate',
    'armor:{base} of Etherealness': 'Armor of Etherealness',
};

export const PROPERTY_OVERRIDES: Record<string, PropertyOverride> = {
    Berserker: {
        abilities: [
            {
                id: 'hp-level',
                name: 'Berserker',
                description:
                    'Your Hit Point maximum increases by 1 for each level you have attained.',
                trigger: { event: 'passive' },
                effects: [
                    {
                        kind: 'modifyStat',
                        stat: 'maxHp',
                        flat: { formula: 'hero_level' },
                    },
                ],
            },
        ],
    },
    'Mithral Armor': {
        overrides: { stealthDisadvantage: false, strength: null },
    },
    // "gain a +2 bonus to Armor Class" is an example of moving the bonus, not a passive (spec: Defender keeps +3)
    Defender: { dropAbilities: ['ac'] },
};

export const DRAGON_SLAYER_PK = 'srd-2024_dragon-slayer';

export const DROPPED_GENERIC = ['srd-2024_defender', 'srd-2024_holy-avenger'];

// items whose SRD text fixes a base weapon/armor but carry no FK
export const UNIQUE_BASES: Record<
    string,
    {
        base: string;
        overrides?: { damageType?: string; addTraits?: WeaponTrait[] };
    }
> = {
    'srd-2024_sun-blade': {
        base: 'srd-2024_longsword',
        overrides: { damageType: 'radiant', addTraits: ['finesse'] },
    },
    'srd-2024_dagger-of-venom': { base: 'srd-2024_dagger' },
    'srd-2024_mace-of-smiting': { base: 'srd-2024_mace' },
    'srd-2024_mace-of-disruption': { base: 'srd-2024_mace' },
    'srd-2024_mace-of-terror': { base: 'srd-2024_mace' },
    'srd-2024_rod-of-lordly-might': { base: 'srd-2024_mace' },
    'srd-2024_javelin-of-lightning': { base: 'srd-2024_javelin' },
    'srd-2024_trident-of-fish-command': { base: 'srd-2024_trident' },
    'srd-2024_dwarven-thrower': { base: 'srd-2024_warhammer' },
    'srd-2024_scimitar-of-speed': { base: 'srd-2024_scimitar' },
    'srd-2024_glamoured-studded-leather': {
        base: 'srd-2024_studded-leather-armor',
    },
    'srd-2024_dragon-scale-mail': { base: 'srd-2024_scale-mail' },
    'srd-2024_armor-of-invulnerability': { base: 'srd-2024_plate-armor' },
    'srd-2024_animated-shield': { base: 'srd-2024_shield' },
    'srd-2024_arrow-catching-shield': { base: 'srd-2024_shield' },
    'srd-2024_spellguard-shield': { base: 'srd-2024_shield' },
    'srd-2024_shield-of-missile-attraction': { base: 'srd-2024_shield' },
};

export const QUARTERSTAFF_PK = 'srd-2024_quarterstaff';

// the belt row only says "see the table"
export const BELT_STRENGTH: Record<string, number> = {
    'srd-2024_belt-of-giant-strength-hill': 21,
    'srd-2024_belt-of-giant-strength-frost-or-stone': 23,
    'srd-2024_belt-of-giant-strength-fire': 25,
    'srd-2024_belt-of-giant-strength-cloud': 27,
    'srd-2024_belt-of-giant-strength-storm': 29,
};

export const POTIONS_OF_HEALING_PK = 'srd-2024_potions-of-healing';

export const HEALING_POTIONS: Array<{
    slug: string;
    name: string;
    rarity: ArtifactRow['rarity'];
    heal: string;
}> = [
    {
        slug: 'srd-2024_potion-of-healing',
        name: 'Potion of Healing',
        rarity: 'common',
        heal: '2d4+2',
    },
    {
        slug: 'srd-2024_potion-of-greater-healing',
        name: 'Potion of Greater Healing',
        rarity: 'uncommon',
        heal: '4d4+4',
    },
    {
        slug: 'srd-2024_potion-of-superior-healing',
        name: 'Potion of Superior Healing',
        rarity: 'rare',
        heal: '8d4+8',
    },
    {
        slug: 'srd-2024_potion-of-supreme-healing',
        name: 'Potion of Supreme Healing',
        rarity: 'epic',
        heal: '10d4+20',
    },
];

export const CONSUMABLE_NAME_RE =
    /^(Ammunition\b|Dust of |Feather Token|Elemental Gem|Bead of Force|Universal Solvent|Sovereign Glue)/;

export const WONDROUS_SLOTS: Array<[RegExp, ArtifactRow['slot']]> = [
    [
        /\b(Amulet|Periapt|Necklace|Medallion|Scarab|Brooch|Talisman)\b/,
        'amulet',
    ],
    [/\b(Boots|Slippers)\b/, 'boots'],
    [/\b(Cloak|Cape|Mantle|Robe)\b/, 'cloak'],
    [/\b(Helm|Hat|Circlet|Headband)\b/, 'helmet'],
];

// items whose single charge is the SRD "once until the next dawn" use
export const ITEM_CHARGES: Record<string, NonNullable<ItemStats['charges']>> = {
    'srd-2024_dagger-of-venom': { max: 1, rest: 'long' },
    'srd-2024_armor-of-invulnerability': { max: 1, rest: 'long' },
};

const withThisItem = { type: 'withThisItem' } as const;

const critical = { type: 'critical' } as const;

const vsConstruct: Condition = {
    type: 'targetCreatureType',
    types: ['construct'],
};

const PHYSICAL_TYPES = ['bludgeoning', 'piercing', 'slashing'] as const;

const physicalResistance = (percent: number, rounds?: number): Effect[] =>
    PHYSICAL_TYPES.map((damageType) => ({
        kind: 'flag',
        flag: 'resistance',
        damageType,
        percent,
        ...(rounds && { duration: { rounds } }),
    }));

// wholly passive SRD properties the description parser leaves as text
export const UNIQUE_ABILITIES: Record<string, Ability[]> = {
    'srd-2024_periapt-of-proof-against-poison': [
        {
            id: 'poison-immunity',
            name: 'Proof against Poison',
            trigger: { event: 'passive' },
            effects: [
                {
                    kind: 'flag',
                    flag: 'resistance',
                    damageType: 'poison',
                    percent: 100,
                },
                {
                    kind: 'flag',
                    flag: 'conditionImmunity',
                    conditions: ['poisoned'],
                },
            ],
        },
    ],
    'srd-2024_stone-of-good-luck-luckstone': [
        {
            id: 'luck',
            name: 'Good Luck',
            description:
                'Applies to saving throws; ability checks stay manual.',
            trigger: { event: 'passive' },
            effects: [{ kind: 'modifyStat', stat: 'savingThrow', flat: 1 }],
        },
    ],
    'srd-2024_mace-of-smiting': [
        {
            id: 'smite-crit',
            name: 'Smiting',
            description: 'A Critical Hit deals an extra 7 Bludgeoning damage.',
            trigger: { event: 'hit', role: 'attacker' },
            condition: { type: 'all', conditions: [withThisItem, critical] },
            effects: [
                {
                    kind: 'dealDamage',
                    amount: 7,
                    damageType: 'bludgeoning',
                    target: 'eventTarget',
                },
            ],
        },
        {
            id: 'smite-construct',
            name: 'Smiting (Construct)',
            description: 'The bonus is +3 against a Construct: +2 damage here.',
            trigger: { event: 'hit', role: 'attacker' },
            condition: {
                type: 'all',
                conditions: [withThisItem, vsConstruct],
            },
            effects: [
                {
                    kind: 'dealDamage',
                    amount: 2,
                    damageType: 'bludgeoning',
                    target: 'eventTarget',
                },
            ],
        },
        {
            id: 'smite-construct-crit',
            name: 'Smiting (Construct crit)',
            description:
                'A Critical Hit on a Construct deals 7 more Bludgeoning damage; it is destroyed at 25 HP or fewer after the damage.',
            trigger: { event: 'hit', role: 'attacker' },
            condition: {
                type: 'all',
                conditions: [withThisItem, critical, vsConstruct],
            },
            effects: [
                {
                    kind: 'dealDamage',
                    amount: 7,
                    damageType: 'bludgeoning',
                    killIfHpAtMost: 32,
                    target: 'eventTarget',
                },
            ],
        },
    ],
    'srd-2024_scimitar-of-speed': [
        {
            id: 'speed',
            name: 'Speed',
            description:
                'Bonus Action: one extra attack with this weapon (granted as an extra action).',
            trigger: { event: 'bonusAction' },
            limits: { perTurn: 1 },
            effects: [{ kind: 'grantAction', extraActions: 1 }],
        },
    ],
    'srd-2024_dagger-of-venom': [
        {
            id: 'coat-blade',
            name: 'Coat the blade',
            description:
                'Bonus Action, once until dawn: the poison lasts 1 minute or until a hit; the creature hit makes a DC 15 Constitution save or takes 2d10 Poison damage and is Poisoned for 1 minute.',
            trigger: { event: 'bonusAction' },
            limits: { pool: { key: 'charges', cost: 1 } },
            effects: [
                {
                    kind: 'mark',
                    markId: 'venom-coat',
                    positive: true,
                    duration: { rounds: ROUNDS_PER_MINUTE },
                    target: 'self',
                },
                {
                    kind: 'note',
                    text: 'On a hit: DC 15 Constitution save or 2d10 Poison damage and Poisoned for 1 minute',
                },
            ],
        },
    ],
    'srd-2024_cloak-of-displacement': [
        {
            id: 'displacement',
            name: 'Displacement',
            description:
                'Attackers have Disadvantage against you until you take damage; it works again from the start of your next turn.',
            trigger: { event: 'passive' },
            condition: {
                type: 'not',
                condition: {
                    type: 'hasMark',
                    who: 'self',
                    markId: 'displacement-off',
                },
            },
            effects: [{ kind: 'flag', flag: 'disadvantageForAttackers' }],
        },
        {
            id: 'displacement-broken',
            name: 'Displacement disrupted',
            trigger: { event: 'hit', role: 'target' },
            effects: [
                {
                    kind: 'mark',
                    markId: 'displacement-off',
                    positive: false,
                    duration: { rounds: 1 },
                    target: 'self',
                },
            ],
        },
    ],
    'srd-2024_ring-of-free-action': [
        {
            id: 'free-action',
            name: 'Free Action',
            trigger: { event: 'passive' },
            effects: [
                { kind: 'flag', flag: 'ignoreDifficultTerrain' },
                {
                    kind: 'flag',
                    flag: 'conditionImmunity',
                    conditions: ['paralyzed', 'restrained'],
                },
            ],
        },
    ],
    'srd-2024_armor-of-invulnerability': [
        {
            id: 'invulnerable-resistance',
            name: 'Resistance to weapon damage',
            trigger: { event: 'passive' },
            effects: physicalResistance(50),
        },
        {
            id: 'metal-shell',
            name: 'Metal Shell',
            description:
                'Magic action, once until dawn: Immunity to Bludgeoning, Piercing and Slashing damage for 10 minutes.',
            trigger: { event: 'action' },
            limits: { pool: { key: 'charges', cost: 1 } },
            effects: physicalResistance(100, 10 * ROUNDS_PER_MINUTE),
        },
    ],
};
