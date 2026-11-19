import type { AbilityCore } from '../lib/abilities';

import type { DndSkill } from '@/lib/constants/skills';
import type { Choice, FeatType } from '@/types/choices';

export const FEAT_FEATURES: Record<
    string,
    { featTypes: FeatType[]; embedded?: true }
> = {
    'ability-score-improvement': { featTypes: ['origin', 'general'] },
    'epic-boon': { featTypes: ['origin', 'general', 'epicBoon'] },
    'fighting-style': { featTypes: ['fightingStyle'], embedded: true },
    'additional-fighting-style': { featTypes: ['fightingStyle'] },
};

export const EXPERTISE_FEATURES: Record<
    string,
    { count: number; skills?: DndSkill[]; keepAbility?: true }
> = {
    'bard:expertise': { count: 2 },
    'rogue:expertise': { count: 2 },
    'ranger:deft-explorer': { count: 1, keepAbility: true },
    'ranger:expertise': { count: 2 },
    'wizard:scholar': {
        count: 1,
        skills: [
            'arcana',
            'history',
            'investigation',
            'medicine',
            'nature',
            'religion',
        ],
    },
};

export const SKILL_FEATURES: Record<
    string,
    { count: number; fromClass?: true; keepAbility?: true }
> = {
    'barbarian:primal-knowledge': {
        count: 1,
        fromClass: true,
        keepAbility: true,
    },
    'bard:bonus-proficiencies': { count: 3 },
};

export const SPELL_FEATURES: Record<
    string,
    NonNullable<Choice['spells']> & { count: number }
> = {
    'bard:magical-discoveries': {
        count: 2,
        lists: ['Cleric', 'Druid', 'Wizard'],
        minLevel: 0,
        maxLevel: 'slots',
    },
};

export interface MasteryWeapon {
    name: string;
    mastery: string;
    ranged?: true;
}

export const MASTERY_WEAPONS: readonly MasteryWeapon[] = [
    { name: 'Battleaxe', mastery: 'Topple' },
    { name: 'Blowgun', mastery: 'Vex', ranged: true },
    { name: 'Club', mastery: 'Slow' },
    { name: 'Dagger', mastery: 'Nick' },
    { name: 'Dart', mastery: 'Vex', ranged: true },
    { name: 'Flail', mastery: 'Sap' },
    { name: 'Glaive', mastery: 'Graze' },
    { name: 'Greataxe', mastery: 'Cleave' },
    { name: 'Greatclub', mastery: 'Push' },
    { name: 'Greatsword', mastery: 'Graze' },
    { name: 'Halberd', mastery: 'Cleave' },
    { name: 'Hand Crossbow', mastery: 'Vex', ranged: true },
    { name: 'Handaxe', mastery: 'Vex' },
    { name: 'Heavy Crossbow', mastery: 'Push', ranged: true },
    { name: 'Javelin', mastery: 'Slow' },
    { name: 'Lance', mastery: 'Topple' },
    { name: 'Light Crossbow', mastery: 'Slow', ranged: true },
    { name: 'Light Hammer', mastery: 'Nick' },
    { name: 'Longbow', mastery: 'Slow', ranged: true },
    { name: 'Longsword', mastery: 'Sap' },
    { name: 'Mace', mastery: 'Sap' },
    { name: 'Maul', mastery: 'Topple' },
    { name: 'Morningstar', mastery: 'Sap' },
    { name: 'Musket', mastery: 'Slow', ranged: true },
    { name: 'Pike', mastery: 'Push' },
    { name: 'Pistol', mastery: 'Vex', ranged: true },
    { name: 'Quarterstaff', mastery: 'Topple' },
    { name: 'Rapier', mastery: 'Vex' },
    { name: 'Scimitar', mastery: 'Nick' },
    { name: 'Shortbow', mastery: 'Vex', ranged: true },
    { name: 'Shortsword', mastery: 'Vex' },
    { name: 'Sickle', mastery: 'Nick' },
    { name: 'Sling', mastery: 'Slow', ranged: true },
    { name: 'Spear', mastery: 'Sap' },
    { name: 'Trident', mastery: 'Topple' },
    { name: 'War Pick', mastery: 'Sap' },
    { name: 'Warhammer', mastery: 'Push' },
    { name: 'Whip', mastery: 'Slow' },
];

/** Classes that grow their count with a class column; the rest train a fixed number of kinds */
export const MASTERY_FEATURES: Record<
    string,
    { count: number | { scale: string }; meleeOnly?: true }
> = {
    'barbarian:weapon-mastery': {
        count: { scale: 'weapon-mastery-count' },
        meleeOnly: true,
    },
    'fighter:weapon-mastery': { count: { scale: 'weapon-mastery-count' } },
    'paladin:weapon-mastery': { count: 2 },
    'ranger:weapon-mastery': { count: 2 },
    'rogue:weapon-mastery': { count: 2 },
};

const strike = (damageType: string): AbilityCore => ({
    trigger: { event: 'hit', role: 'attacker' },
    limits: { perTurn: 1 },
    effects: [
        {
            kind: 'dealDamage',
            amount: '1d8',
            damageType,
            target: 'eventTarget',
        },
    ],
});

export const BINARY_FEATURES: Record<string, Record<string, AbilityCore>> = {
    'divine-order': {},
    'primal-order': {},
    'blessed-strikes': { 'divine-strike': strike('radiant') },
    'elemental-fury': { 'primal-strike': strike('fire') },
    'hunters-prey': {
        'colossus-slayer': {
            trigger: { event: 'hit', role: 'attacker' },
            condition: { type: 'hpBelow', who: 'eventTarget', percent: 100 },
            limits: { perTurn: 1 },
            effects: [
                { kind: 'dealDamage', amount: '1d8', target: 'eventTarget' },
            ],
        },
    },
    'defensive-tactics': {},
};

export const RESISTANCE_FEATURES: Record<string, string[]> = {
    'elemental-affinity': ['acid', 'cold', 'fire', 'lightning', 'poison'],
    'fiendish-resilience': [
        'acid',
        'bludgeoning',
        'cold',
        'fire',
        'lightning',
        'necrotic',
        'piercing',
        'poison',
        'psychic',
        'radiant',
        'slashing',
        'thunder',
    ],
};

export const EXTRA_CHOICES: Record<string, Choice[]> = {
    'srd-2024_warlock': [6, 7, 8, 9].map((level, i) => ({
        id: `mystic-arcanum-${level}`,
        label: `Mystic Arcanum (${level})`,
        level: 11 + i * 2,
        count: 1,
        kind: 'spell',
        spells: { lists: ['Warlock'], minLevel: level, maxLevel: level },
        grant: { uses: 1, rest: 'long', castLevel: level, via: 'grant' },
    })),
    'srd-2024_wizard': [
        {
            id: 'signature-spells',
            label: 'Signature Spells',
            level: 20,
            count: 2,
            kind: 'spell',
            spells: { lists: ['Wizard'], minLevel: 3, maxLevel: 3 },
            grant: { uses: 1, rest: 'short', castLevel: 3, via: 'slotOrGrant' },
        },
    ],
    'srd-2024_bard': [
        {
            id: 'expertise-9',
            label: 'Expertise',
            level: 9,
            count: 2,
            kind: 'expertise',
        },
    ],
};

export const INVOCATION_MECHANICS: Record<string, AbilityCore> = {
    'eldritch-mind': {
        trigger: { event: 'passive' },
        effects: [
            {
                kind: 'flag',
                flag: 'saveAdvantage',
                abilities: ['constitution'],
            },
        ],
    },
    'thirsting-blade': {
        trigger: { event: 'passive' },
        effects: [{ kind: 'modifyStat', stat: 'attacksPerAction', flat: 1 }],
    },
};
