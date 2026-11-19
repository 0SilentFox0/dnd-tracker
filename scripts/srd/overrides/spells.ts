import type { SpellRow } from '../lib/types';

import type { NonRandomEffect } from '@/lib/utils/abilities/schema';
import type {
    InlineCast,
    SpellEffect,
    SpellTargeting,
    SpellZone,
    ZoneTrigger,
} from '@/lib/utils/spells/model/schema';

export type SpellOverride = Partial<
    Omit<SpellRow, 'slug' | 'name' | 'level' | 'groupId' | 'description'>
>;

const rounds = (n: number) => ({ rounds: n });

// canon durations: 1 minute = 10 rounds, 10 minutes = 100, 1 hour = 600
const MINUTE = 10;

const TEN_MINUTES = 100;

const HOUR = 600;

export const FRIENDLY_FIRE_SPELLS: ReadonlySet<string> = new Set(
    [
        'acid-splash',
        'burning-hands',
        'circle-of-death',
        'cloudkill',
        'color-spray',
        'cone-of-cold',
        'confusion',
        'delayed-blast-fireball',
        'earthquake',
        'entangle',
        'faerie-fire',
        'fear',
        'fire-storm',
        'fireball',
        'flame-strike',
        'freezing-sphere',
        'gust-of-wind',
        'hypnotic-pattern',
        'ice-storm',
        'incendiary-cloud',
        'insect-plague',
        'lightning-bolt',
        'meteor-swarm',
        'moonbeam',
        'prismatic-spray',
        'shatter',
        'sleep',
        'sleet-storm',
        'stinking-cloud',
        'sunbeam',
        'sunburst',
        'thunderwave',
        'vitriolic-sphere',
        'web',
        'weird',
        'wall-of-fire',
    ].map((slug) => `srd-2024_${slug}`)
);

const NO_DAMAGE: SpellOverride = {
    dice: 0,
    dieSides: undefined,
    upcastDice: undefined,
    spellEffects: [],
};

const resist = (damageType: string, percent = 50, n = 99): NonRandomEffect => ({
    kind: 'flag',
    flag: 'resistance',
    damageType,
    percent,
    duration: rounds(n),
});

const damageChoice = (types: string[]): SpellEffect => ({
    kind: 'chooseOne',
    options: types.map(
        (damageType): NonRandomEffect => ({
            kind: 'dealDamage',
            amount: { spellRoll: 100 },
            damageType,
        })
    ),
});

const smite = (
    extraDice: string,
    damageType: string,
    upcast: { upcastDice: number; maxDice?: number }
): SpellEffect => ({
    kind: 'hitRider',
    attackKind: 'melee',
    extraDice,
    ...upcast,
    damageType,
    charges: 1,
    duration: rounds(1),
    expireAtTurnEnd: true,
});

const sphere = (
    radius: number,
    range: number,
    zone: SpellZone
): SpellTargeting => ({
    kind: 'template',
    shape: 'circle',
    size: radius,
    side: 'all',
    maxTargets: 20,
    exact: true,
    range,
    zone,
});

const noCasting: ZoneTrigger = {
    effects: [
        {
            kind: 'applyCondition',
            condition: 'disable_spell_casting',
            duration: rounds(1),
        },
    ],
};

const areaSave = (
    ability: NonNullable<ZoneTrigger['save']>['ability'],
    damageType: string
): ZoneTrigger => ({
    save: { ability },
    saveHalf: true,
    effects: [{ kind: 'dealDamage', amount: { spellRoll: 100 }, damageType }],
});

const repeatDamage = (
    label: string,
    cost: 'action' | 'bonusAction',
    cast: InlineCast
): SpellEffect => ({
    kind: 'grantCast',
    label,
    cost,
    duration: rounds(MINUTE),
    cast,
});

const strike = (damageType: string): NonRandomEffect => ({
    kind: 'dealDamage',
    amount: { spellRoll: 100 },
    damageType,
});

const gp = (
    name: string,
    minGp: number,
    consumed: boolean,
    qty = 1
): NonNullable<SpellOverride['ingredients']>[number] => ({
    name,
    qty,
    minGp,
    consumed,
    focus: false,
});

const vampiricHeal: NonRandomEffect = {
    kind: 'heal',
    amount: { percentOf: 'eventDamage', value: 50 },
    target: 'self',
};

// sides/targets of popular spells and timed buffs (flat approximations of 1d4 bonuses), checked by hand against SRD 5.2
export const SPELL_OVERRIDES: Record<string, SpellOverride> = {
    'srd-2024_bless': {
        ...NO_DAMAGE,
        targeting: { kind: 'area', side: 'ally', maxTargets: 3, range: 30 },
        resolution: { kind: 'auto' },
        spellEffects: [
            {
                kind: 'modifyStat',
                stat: 'attackBonus',
                flat: 2,
                duration: rounds(10),
            },
            {
                kind: 'modifyStat',
                stat: 'savingThrow',
                flat: 2,
                duration: rounds(10),
            },
        ],
        upcastTargets: 1,
    },
    'srd-2024_bane': {
        ...NO_DAMAGE,
        targeting: { kind: 'area', side: 'enemy', maxTargets: 3, range: 30 },
        resolution: { kind: 'save', ability: 'charisma', onSuccess: 'none' },
        spellEffects: [
            {
                kind: 'modifyStat',
                stat: 'attackBonus',
                flat: -2,
                duration: rounds(10),
            },
            {
                kind: 'modifyStat',
                stat: 'savingThrow',
                flat: -2,
                duration: rounds(10),
            },
        ],
        upcastTargets: 1,
    },
    'srd-2024_shield': {
        targeting: { kind: 'self' },
        resolution: { kind: 'auto' },
        spellEffects: [
            { kind: 'modifyStat', stat: 'armor', flat: 5, duration: rounds(1) },
        ],
    },
    'srd-2024_shield-of-faith': {
        targeting: { kind: 'ally', range: 60 },
        spellEffects: [
            {
                kind: 'modifyStat',
                stat: 'armor',
                flat: 2,
                duration: rounds(99),
            },
        ],
    },
    'srd-2024_mage-armor': {
        targeting: { kind: 'ally', range: 5 },
        spellEffects: [
            {
                kind: 'modifyStat',
                stat: 'armor',
                flat: 3,
                duration: rounds(99),
            },
        ],
    },
    'srd-2024_haste': {
        targeting: { kind: 'ally', range: 30 },
        resolution: { kind: 'auto' },
        spellEffects: [
            {
                kind: 'modifyStat',
                stat: 'armor',
                flat: 2,
                duration: rounds(10),
            },
            {
                kind: 'modifyStat',
                stat: 'actionsPerTurn',
                flat: 1,
                duration: rounds(10),
            },
            {
                kind: 'flag',
                flag: 'saveAdvantage',
                abilities: ['dexterity'],
                duration: rounds(10),
            },
        ],
    },
    'srd-2024_slow': {
        targeting: {
            kind: 'template',
            shape: 'cube',
            size: 40,
            side: 'enemy',
            maxTargets: 6,
            range: 120,
        },
        resolution: { kind: 'save', ability: 'wisdom', onSuccess: 'none' },
        spellEffects: [
            {
                kind: 'modifyStat',
                stat: 'armor',
                flat: -2,
                duration: rounds(10),
            },
            {
                kind: 'modifyStat',
                stat: 'savingThrow',
                flat: -2,
                duration: rounds(10),
            },
        ],
    },
    'srd-2024_faerie-fire': {
        resolution: { kind: 'save', ability: 'dexterity', onSuccess: 'none' },
        spellEffects: [
            {
                kind: 'flag',
                flag: 'advantageForAttackers',
                duration: rounds(10),
            },
        ],
    },
    'srd-2024_magic-missile': {
        dice: 1,
        dieSides: 4,
        targeting: {
            kind: 'area',
            side: 'enemy',
            maxTargets: 3,
            range: 120,
            projectiles: true,
        },
        resolution: { kind: 'auto' },
        spellEffects: [
            {
                kind: 'dealDamage',
                amount: { spellRoll: 100 },
                damageType: 'force',
            },
        ],
        upcastTargets: 1,
        fixedDice: true,
        damageBonus: 1,
    },
    'srd-2024_heal': {
        targeting: { kind: 'ally', range: 60 },
        resolution: { kind: 'auto' },
        spellEffects: [{ kind: 'heal', amount: 70 }],
    },
    'srd-2024_prayer-of-healing': {
        dice: 2,
        dieSides: 8,
        targeting: { kind: 'area', side: 'ally', maxTargets: 5, range: 30 },
        resolution: { kind: 'auto' },
        addAbilityMod: true,
        spellEffects: [{ kind: 'heal', amount: { spellRoll: 100 } }],
        upcastDice: 1,
    },
    'srd-2024_revivify': {
        targeting: { kind: 'allyDead', range: 5 },
        resolution: { kind: 'auto' },
        spellEffects: [{ kind: 'heal', amount: 1, revive: true }],
    },
    'srd-2024_web': {
        ...NO_DAMAGE,
        resolution: { kind: 'save', ability: 'dexterity', onSuccess: 'none' },
        spellEffects: [
            {
                kind: 'applyCondition',
                condition: 'restrained',
                duration: rounds(10),
                saveEnds: { ability: 'strength' },
            },
        ],
    },
    'srd-2024_entangle': {
        targeting: {
            kind: 'template',
            shape: 'cube',
            size: 20,
            side: 'enemy',
            maxTargets: 20,
            range: 90,
        },
        resolution: { kind: 'save', ability: 'strength', onSuccess: 'none' },
        spellEffects: [
            {
                kind: 'applyCondition',
                condition: 'restrained',
                duration: rounds(10),
                saveEnds: { ability: 'strength' },
            },
        ],
    },
    'srd-2024_dimension-door': {
        ...NO_DAMAGE,
        targeting: { kind: 'self' },
        resolution: { kind: 'auto' },
    },
    'srd-2024_wish': {
        ...NO_DAMAGE,
        targeting: { kind: 'self' },
        resolution: { kind: 'auto' },
    },
    'srd-2024_longstrider': {
        targeting: { kind: 'ally', range: 5 },
        spellEffects: [
            {
                kind: 'modifyStat',
                stat: 'speed',
                flat: 10,
                duration: rounds(99),
            },
        ],
        upcastTargets: 1,
    },
    'srd-2024_blur': {
        targeting: { kind: 'self' },
        spellEffects: [
            {
                kind: 'flag',
                flag: 'disadvantageForAttackers',
                duration: rounds(10),
            },
        ],
    },
    'srd-2024_mirror-image': {
        targeting: { kind: 'self' },
        spellEffects: [
            {
                kind: 'flag',
                flag: 'disadvantageForAttackers',
                duration: rounds(10),
            },
        ],
    },
    'srd-2024_greater-invisibility': {
        targeting: { kind: 'ally', range: 5 },
        spellEffects: [
            {
                kind: 'applyCondition',
                condition: 'invisible',
                duration: rounds(10),
            },
        ],
    },
    'srd-2024_invisibility': {
        targeting: { kind: 'ally', range: 5 },
        spellEffects: [
            {
                kind: 'applyCondition',
                condition: 'invisible',
                duration: rounds(99),
            },
        ],
        upcastTargets: 1,
    },
    'srd-2024_heroism': {
        targeting: { kind: 'ally', range: 5 },
        spellEffects: [
            {
                kind: 'flag',
                flag: 'conditionImmunity',
                conditions: ['frightened'],
                duration: rounds(MINUTE),
            },
            {
                kind: 'hot',
                healPerRound: { formula: 'max(0, cha_mod)' },
                temp: true,
                duration: rounds(MINUTE),
            },
        ],
        upcastTargets: 1,
    },
    'srd-2024_divine-favor': {
        targeting: { kind: 'self' },
        spellEffects: [
            {
                kind: 'damageBonus',
                filter: { kind: 'physical' },
                flat: 2,
                duration: rounds(10),
            },
        ],
    },
    // no concentration in 2024; the bonus-action attack repeats while the weapon lasts (upcast dice stay on the first hit)
    'srd-2024_spiritual-weapon': {
        addAbilityMod: true,
        concentration: false,
        spellEffects: [
            strike('force'),
            repeatDamage('Spiritual Weapon', 'bonusAction', {
                targeting: { kind: 'enemy', range: 60 },
                resolution: { kind: 'attack' },
                dice: 1,
                dieSides: 8,
                addAbilityMod: true,
                effects: [strike('force')],
            }),
        ],
    },
    'srd-2024_scorching-ray': {
        targeting: {
            kind: 'area',
            side: 'enemy',
            maxTargets: 3,
            range: 120,
            projectiles: true,
        },
        upcastTargets: 1,
        fixedDice: true,
    },
    'srd-2024_eldritch-blast': {
        targeting: { kind: 'enemy', range: 120, projectiles: true },
        fixedDice: true,
    },
    'srd-2024_chain-lightning': { upcastTargets: 1 },

    // Open5e rows of these spells carry another spell's numbers (Freedom of Movement has Freezing Sphere's 10d6 cold)
    'srd-2024_freedom-of-movement': {
        ...NO_DAMAGE,
        targeting: { kind: 'ally', range: 5 },
        resolution: { kind: 'auto' },
        spellEffects: [
            {
                kind: 'flag',
                flag: 'conditionImmunity',
                conditions: ['restrained', 'grappled'],
                duration: rounds(99),
            },
        ],
    },
    // self-range in the SRD, but the effect lands on a target
    'srd-2024_produce-flame': { targeting: { kind: 'enemy', range: 60 } },
    'srd-2024_eyebite': { targeting: { kind: 'enemy', range: 60 } },
    'srd-2024_sunbeam': {
        targeting: {
            kind: 'template',
            shape: 'line',
            size: 60,
            side: 'enemy',
            maxTargets: 20,
        },
    },
    // the caster's own psychic damage is the real price of the spell
    'srd-2024_contact-other-plane': { targeting: { kind: 'self' } },
    'srd-2024_hex': {
        ...NO_DAMAGE,
        targeting: { kind: 'enemy', range: 90 },
        resolution: { kind: 'auto' },
        spellEffects: [
            {
                kind: 'flag',
                flag: 'checkDisadvantage',
                skills: 'all',
                duration: rounds(99),
            },
            { kind: 'mark', markId: 'hex', duration: rounds(99) },
        ],
    },
    'srd-2024_hunters-mark': {
        ...NO_DAMAGE,
        targeting: { kind: 'enemy', range: 90 },
        resolution: { kind: 'auto' },
        spellEffects: [
            { kind: 'mark', markId: 'hunters-mark', duration: rounds(99) },
        ],
    },
    'srd-2024_barkskin': {
        spellEffects: [
            {
                kind: 'modifyStat',
                stat: 'armor',
                flat: 3,
                duration: rounds(99),
            },
        ],
    },
    'srd-2024_stoneskin': {
        spellEffects: [
            resist('bludgeoning'),
            resist('piercing'),
            resist('slashing'),
        ],
    },
    'srd-2024_protection-from-poison': { spellEffects: [resist('poison')] },
    'srd-2024_enhance-ability': {
        spellEffects: [
            {
                kind: 'flag',
                flag: 'checkAdvantage',
                skills: 'all',
                duration: rounds(99),
            },
        ],
    },
    'srd-2024_magic-weapon': {
        spellEffects: [
            {
                kind: 'modifyStat',
                stat: 'attackBonus',
                flat: 1,
                duration: rounds(99),
            },
        ],
    },
    'srd-2024_fly': {
        spellEffects: [
            {
                kind: 'modifyStat',
                stat: 'speed',
                flat: 30,
                duration: rounds(99),
            },
        ],
        upcastTargets: 1,
    },
    'srd-2024_expeditious-retreat': {
        targeting: { kind: 'self' },
        spellEffects: [
            {
                kind: 'modifyStat',
                stat: 'speed',
                flat: 30,
                duration: rounds(99),
            },
        ],
    },
    'srd-2024_resistance': {
        spellEffects: [
            {
                kind: 'modifyStat',
                stat: 'savingThrow',
                flat: 2,
                duration: rounds(10),
            },
        ],
    },
    'srd-2024_guidance': {
        spellEffects: [
            {
                kind: 'flag',
                flag: 'checkAdvantage',
                skills: 'all',
                duration: rounds(10),
            },
        ],
    },
    'srd-2024_protection-from-evil-and-good': {
        spellEffects: [
            {
                kind: 'flag',
                flag: 'disadvantageForAttackers',
                duration: rounds(99),
            },
        ],
    },
    'srd-2024_warding-bond': {
        spellEffects: [
            {
                kind: 'modifyStat',
                stat: 'armor',
                flat: 1,
                duration: rounds(99),
            },
            {
                kind: 'modifyStat',
                stat: 'savingThrow',
                flat: 1,
                duration: rounds(99),
            },
        ],
        ingredients: [
            {
                name: 'Platinum rings',
                qty: 2,
                minGp: 50,
                consumed: false,
                focus: false,
            },
        ],
    },
    'srd-2024_mind-blank': {
        spellEffects: [
            {
                kind: 'flag',
                flag: 'conditionImmunity',
                conditions: ['charmed'],
                duration: rounds(99),
            },
        ],
    },
    'srd-2024_foresight': {
        spellEffects: [
            {
                kind: 'flag',
                flag: 'advantage',
                attackKind: 'all',
                duration: rounds(99),
            },
            {
                kind: 'flag',
                flag: 'saveAdvantage',
                abilities: 'all',
                duration: rounds(99),
            },
            {
                kind: 'flag',
                flag: 'disadvantageForAttackers',
                duration: rounds(99),
            },
        ],
    },
    'srd-2024_beacon-of-hope': {
        targeting: { kind: 'area', side: 'ally', maxTargets: 20, range: 30 },
        resolution: { kind: 'auto' },
        spellEffects: [
            {
                kind: 'flag',
                flag: 'saveAdvantage',
                abilities: ['wisdom'],
                duration: rounds(10),
            },
        ],
    },
    'srd-2024_enlargereduce': {
        targeting: { kind: 'ally', range: 30 },
        resolution: { kind: 'auto' },
        spellEffects: [
            {
                kind: 'damageBonus',
                filter: { kind: 'physical' },
                flat: 2,
                duration: rounds(10),
            },
            {
                kind: 'flag',
                flag: 'saveAdvantage',
                abilities: ['strength'],
                duration: rounds(10),
            },
        ],
    },
    'srd-2024_lesser-restoration': {
        spellEffects: [{ kind: 'cleanse', includeConditions: true }],
    },
    'srd-2024_greater-restoration': {
        spellEffects: [{ kind: 'cleanse', includeConditions: true }],
    },
    'srd-2024_ray-of-enfeeblement': {
        resolution: { kind: 'attack' },
        spellEffects: [
            {
                kind: 'damageBonus',
                filter: { kind: 'physical' },
                percent: -50,
                duration: rounds(10),
            },
        ],
    },
    'srd-2024_hideous-laughter': {
        resolution: { kind: 'save', ability: 'wisdom', onSuccess: 'none' },
        spellEffects: [
            {
                kind: 'applyCondition',
                condition: 'prone',
                duration: rounds(10),
                saveEnds: { ability: 'wisdom' },
            },
            {
                kind: 'applyCondition',
                condition: 'incapacitated',
                duration: rounds(10),
                saveEnds: { ability: 'wisdom' },
            },
        ],
    },
    'srd-2024_blindnessdeafness': {
        resolution: {
            kind: 'save',
            ability: 'constitution',
            onSuccess: 'none',
        },
        spellEffects: [
            {
                kind: 'applyCondition',
                condition: 'blinded',
                duration: rounds(10),
                saveEnds: { ability: 'constitution' },
            },
        ],
        upcastTargets: 1,
    },
    'srd-2024_maze': {
        targeting: { kind: 'enemy', range: 60 },
        resolution: { kind: 'auto' },
        spellEffects: [
            {
                kind: 'applyCondition',
                condition: 'incapacitated',
                duration: rounds(10),
            },
        ],
    },
    // one damage type is chosen at cast time; fire is the approximation
    'srd-2024_protection-from-energy': { spellEffects: [resist('fire')] },
    'srd-2024_pass-without-trace': {
        targeting: { kind: 'area', side: 'ally', maxTargets: 20, range: 30 },
        resolution: { kind: 'auto' },
        spellEffects: [
            {
                kind: 'flag',
                flag: 'skillProficiency',
                skills: ['stealth'],
                duration: rounds(99),
            },
        ],
    },
    'srd-2024_holy-aura': {
        targeting: { kind: 'area', side: 'ally', maxTargets: 20, range: 30 },
        resolution: { kind: 'auto' },
        spellEffects: [
            {
                kind: 'flag',
                flag: 'disadvantageForAttackers',
                duration: rounds(10),
            },
            {
                kind: 'flag',
                flag: 'saveAdvantage',
                abilities: 'all',
                duration: rounds(10),
            },
        ],
    },
    'srd-2024_blink': {
        spellEffects: [
            {
                kind: 'flag',
                flag: 'disadvantageForAttackers',
                duration: rounds(10),
            },
        ],
    },

    // the cast picks the damage type; orb leaps and the d8-explosion are left to the DM
    'srd-2024_chromatic-orb': {
        dice: 3,
        dieSides: 8,
        upcastDice: 1,
        targeting: { kind: 'enemy', range: 90 },
        resolution: { kind: 'attack' },
        spellEffects: [
            damageChoice([
                'acid',
                'cold',
                'fire',
                'lightning',
                'poison',
                'thunder',
            ]),
        ],
    },
    'srd-2024_sorcerous-burst': {
        dice: 1,
        dieSides: 8,
        targeting: { kind: 'enemy', range: 120 },
        resolution: { kind: 'attack' },
        spellEffects: [
            damageChoice([
                'acid',
                'cold',
                'fire',
                'lightning',
                'poison',
                'psychic',
                'thunder',
            ]),
        ],
    },
    // cast right before the hit: the extra dice ride on the next melee hit of the turn (the fiend/undead bonus die stays manual)
    'srd-2024_divine-smite': {
        targeting: { kind: 'self' },
        resolution: { kind: 'auto' },
        spellEffects: [smite('2d8', 'radiant', { upcastDice: 1, maxDice: 5 })],
    },
    'srd-2024_shining-smite': {
        targeting: { kind: 'self' },
        resolution: { kind: 'auto' },
        spellEffects: [smite('2d6', 'radiant', { upcastDice: 1 })],
    },
    // the CON save only guards the held item: the opening damage is automatic, the bonus-action repeat is a grant
    // 2d4 + 4 temp HP; the +5 per slot level above 1 stays manual
    'srd-2024_false-life': {
        dice: 2,
        dieSides: 4,
        damageBonus: 4,
        targeting: { kind: 'self' },
        resolution: { kind: 'auto' },
        spellEffects: [
            { kind: 'tempHp', amount: { spellRoll: 100 }, target: 'self' },
        ],
    },
    'srd-2024_heat-metal': {
        resolution: { kind: 'auto' },
        spellEffects: [
            strike('fire'),
            repeatDamage('Heat Metal', 'bonusAction', {
                targeting: { kind: 'enemy', range: 60 },
                resolution: { kind: 'auto' },
                dice: 2,
                dieSides: 8,
                effects: [strike('fire')],
            }),
        ],
    },
    'srd-2024_disintegrate': { damageBonus: 40 },
    'srd-2024_finger-of-death': { damageBonus: 30 },
    'srd-2024_hypnotic-pattern': {
        spellEffects: [
            {
                kind: 'applyCondition',
                condition: 'charmed',
                duration: rounds(10),
                breakOnDamage: true,
            },
            {
                kind: 'applyCondition',
                condition: 'incapacitated',
                duration: rounds(10),
                breakOnDamage: true,
            },
            {
                kind: 'modifyStat',
                stat: 'speed',
                percent: -100,
                duration: rounds(10),
            },
        ],
    },
    'srd-2024_power-word-kill': {
        spellEffects: [
            {
                kind: 'dealDamage',
                amount: { spellRoll: 100 },
                damageType: 'psychic',
                killIfHpAtMost: 100,
            },
        ],
    },
    'srd-2024_power-word-heal': {
        spellEffects: [
            { kind: 'heal', amount: { percentOf: 'maxHp', value: 100 } },
            { kind: 'cleanse', includeConditions: true },
        ],
    },
    'srd-2024_regenerate': {
        spellEffects: [
            { kind: 'heal', amount: '4d8' },
            { kind: 'heal', amount: 15 },
            { kind: 'hot', healPerRound: 1, duration: rounds(99) },
        ],
    },
    // the retaliation 2d8 is not expressible; only the chosen resistance is mechanized
    'srd-2024_fire-shield': {
        ...NO_DAMAGE,
        targeting: { kind: 'self' },
        resolution: { kind: 'auto' },
        spellEffects: [
            { kind: 'chooseOne', options: [resist('cold'), resist('fire')] },
        ],
    },
    'srd-2024_aura-of-life': { spellEffects: [resist('necrotic')] },

    // spikes hurt on entering the zone, not per 5 feet moved
    'srd-2024_fog-cloud': {
        ...NO_DAMAGE,
        targeting: sphere(20, 120, {
            rounds: HOUR,
            terrain: ['obscured'],
            side: 'all',
        }),
    },
    'srd-2024_darkness': {
        ...NO_DAMAGE,
        targeting: sphere(15, 60, {
            rounds: TEN_MINUTES,
            terrain: ['obscured'],
            side: 'all',
        }),
    },
    'srd-2024_true-strike': { ingredients: [] },
    'srd-2024_gentle-repose': {
        ingredients: [
            {
                name: 'Copper pieces',
                qty: 2,
                minGp: 0.02,
                consumed: true,
                focus: false,
            },
        ],
    },
    'srd-2024_spike-growth': {
        ...NO_DAMAGE,
        targeting: sphere(20, 150, {
            rounds: TEN_MINUTES,
            terrain: ['difficult'],
            side: 'all',
            onEnter: {
                effects: [
                    {
                        kind: 'dealDamage',
                        amount: '2d4',
                        damageType: 'piercing',
                    },
                ],
            },
        }),
    },
    'srd-2024_gust-of-wind': {
        ...NO_DAMAGE,
        targeting: {
            kind: 'template',
            shape: 'line',
            size: 60,
            side: 'enemy',
            maxTargets: 20,
        },
        resolution: { kind: 'save', ability: 'strength', onSuccess: 'none' },
        spellEffects: [{ kind: 'push', feet: 15, from: 'caster' }],
    },
    // the panels become a 100-foot line of wall cells; its immunity to damage and dispel is not modelled
    'srd-2024_wall-of-force': {
        ...NO_DAMAGE,
        targeting: {
            kind: 'template',
            shape: 'line',
            size: 100,
            side: 'enemy',
            maxTargets: 1,
            range: 120,
        },
        resolution: { kind: 'auto' },
        spellEffects: [
            {
                kind: 'createTerrain',
                terrain: 'wall',
                shape: 'cell',
                cells: 20,
                rounds: 99,
            },
        ],
    },
    // zone triggers roll the cast dice again (upcast included); terrain, 10-ft cloud drift and moving the sphere are not modelled
    'srd-2024_spirit-guardians': {
        targeting: { kind: 'self' },
        resolution: { kind: 'auto' },
        spellEffects: [
            {
                kind: 'anchoredZone',
                radiusFeet: 15,
                side: 'enemies',
                excludeBearer: true,
                onEnter: areaSave('wisdom', 'radiant'),
                onTurnStart: areaSave('wisdom', 'radiant'),
                duration: rounds(TEN_MINUTES),
            },
        ],
    },
    'srd-2024_flaming-sphere': {
        ...NO_DAMAGE,
        dice: 2,
        dieSides: 6,
        upcastDice: 1,
        targeting: {
            kind: 'template',
            shape: 'circle',
            size: 5,
            side: 'all',
            maxTargets: 20,
            exact: true,
            range: 60,
        },
        resolution: { kind: 'auto' },
        spellEffects: [
            {
                kind: 'summonInline',
                name: 'Flaming Sphere',
                size: 'medium',
                ac: 10,
                hp: null,
                count: 1,
                aura: {
                    radiusFeet: 5,
                    side: 'all',
                    onEnter: areaSave('dexterity', 'fire'),
                    onTurnStart: areaSave('dexterity', 'fire'),
                },
                duration: rounds(MINUTE),
            },
        ],
    },
    'srd-2024_call-lightning': {
        targeting: {
            kind: 'template',
            shape: 'circle',
            size: 5,
            side: 'all',
            maxTargets: 20,
            exact: true,
            range: 120,
        },
        spellEffects: [
            strike('lightning'),
            repeatDamage('Call Lightning', 'action', {
                targeting: {
                    kind: 'template',
                    shape: 'circle',
                    size: 5,
                    side: 'all',
                    maxTargets: 20,
                    exact: true,
                    range: 120,
                },
                resolution: {
                    kind: 'save',
                    ability: 'dexterity',
                    onSuccess: 'half',
                },
                dice: 3,
                dieSides: 10,
                effects: [strike('lightning')],
            }),
        ],
    },
    'srd-2024_cloudkill': {
        targeting: sphere(20, 120, {
            rounds: TEN_MINUTES,
            terrain: ['obscured'],
            side: 'all',
            onEnter: areaSave('constitution', 'poison'),
            onTurnStart: areaSave('constitution', 'poison'),
        }),
    },
    'srd-2024_insect-plague': {
        targeting: sphere(20, 300, {
            rounds: TEN_MINUTES,
            terrain: ['difficult'],
            side: 'all',
            onEnter: areaSave('constitution', 'piercing'),
            onTurnStart: areaSave('constitution', 'piercing'),
        }),
    },
    'srd-2024_incendiary-cloud': {
        targeting: sphere(20, 150, {
            rounds: MINUTE,
            terrain: ['obscured'],
            side: 'all',
            onEnter: areaSave('dexterity', 'fire'),
            onTurnStart: areaSave('dexterity', 'fire'),
        }),
    },
    // after the opening save the wall burns whoever enters or starts a turn in it; the one-sided 10-ft heat is not modelled
    'srd-2024_wall-of-fire': {
        targeting: {
            kind: 'template',
            shape: 'line',
            size: 60,
            side: 'all',
            maxTargets: 20,
            range: 120,
            zone: {
                rounds: MINUTE,
                side: 'all',
                onEnter: { effects: [strike('fire')] },
                onTurnStart: { effects: [strike('fire')] },
            },
        },
    },
    // heals half of the damage dealt; the repeat is an action on a later turn
    'srd-2024_vampiric-touch': {
        spellEffects: [
            strike('necrotic'),
            vampiricHeal,
            repeatDamage('Vampiric Touch', 'action', {
                targeting: { kind: 'enemy', range: 5 },
                resolution: { kind: 'attack' },
                dice: 3,
                dieSides: 6,
                effects: [strike('necrotic'), vampiricHeal],
            }),
        ],
    },
    // secondary effects of attack/save spells; a miss or a passed save skips them
    'srd-2024_guiding-bolt': {
        spellEffects: [
            strike('radiant'),
            {
                kind: 'flag',
                flag: 'advantageForAttackers',
                duration: rounds(1),
            },
        ],
    },
    'srd-2024_ray-of-sickness': {
        spellEffects: [
            strike('poison'),
            {
                kind: 'applyCondition',
                condition: 'poisoned',
                duration: rounds(2),
            },
        ],
    },
    'srd-2024_thunderwave': {
        spellEffects: [
            strike('thunder'),
            { kind: 'push', feet: 10, from: 'caster' },
        ],
    },
    // per-target components are priced for one target; the stock check is a floor, not a count of targets
    'srd-2024_astral-projection': {
        ingredients: [gp('Jacinth', 1000, true), gp('Silver bar', 100, true)],
    },
    'srd-2024_clone': {
        ingredients: [
            gp('Diamond', 1000, true),
            gp('Sealable vessel', 2000, false),
        ],
    },
    'srd-2024_legend-lore': {
        ingredients: [
            gp('Incense', 250, true),
            gp('Ivory strips', 50, false, 4),
        ],
    },
    'srd-2024_secret-chest': {
        ingredients: [
            gp('Chest of rare materials', 5000, false),
            gp('Tiny replica of the chest', 50, false),
        ],
    },
    'srd-2024_create-undead': {
        ingredients: [gp('Black onyx stone', 150, false)],
    },
    // everyone inside, the caster included, loses spellcasting; magic items and area suppression stay manual
    'srd-2024_antimagic-field': {
        ...NO_DAMAGE,
        targeting: { kind: 'self' },
        resolution: { kind: 'auto' },
        spellEffects: [
            {
                kind: 'anchoredZone',
                radiusFeet: 10,
                side: 'all',
                onEnter: noCasting,
                onTurnStart: noCasting,
                endsWhenStartOutside: true,
                duration: rounds(99),
            },
        ],
    },
};
