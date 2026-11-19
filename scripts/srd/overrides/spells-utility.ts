import type { SpellRow } from '../lib/types';
import { MINUTE, rounds, SPELL_DURATION } from './durations';

import type { NonRandomEffect } from '@/lib/utils/abilities/schema';
import type {
    SpellEffect,
    SpellTargeting,
    SpellZone,
    SummonInlineEffect,
} from '@/lib/utils/spells/model/schema';

type Override = Partial<
    Omit<SpellRow, 'slug' | 'name' | 'level' | 'groupId' | 'description'>
>;

// the spell's own duration, resolved by the converter
const LONG = SPELL_DURATION;

const SELF: SpellTargeting = { kind: 'self' };

const touch = (range = 5): SpellTargeting => ({ kind: 'ally', range });

const AUTO = { kind: 'auto' } as const;

const marker = (id: string, n = LONG): SpellEffect => ({
    kind: 'mark',
    markId: id,
    positive: true,
    duration: rounds(n),
});

const note = (text: string): SpellEffect => ({ kind: 'note', text });

const save = (
    ability: 'strength' | 'dexterity' | 'constitution' | 'wisdom' | 'charisma',
    onSuccess: 'none' | 'half' = 'none'
) => ({ kind: 'save' as const, ability, onSuccess });

// no mechanical engine concept for the spell: a duration marker (so slot spend and concentration mean something) plus a log line
const narrative = (
    id: string,
    text: string,
    duration?: number,
    targeting: SpellTargeting = SELF
): Override => ({
    targeting,
    resolution: AUTO,
    spellEffects: duration ? [marker(id, duration), note(text)] : [note(text)],
});

const effects = (
    targeting: SpellTargeting,
    spellEffects: SpellEffect[],
    resolution: Override['resolution'] = AUTO
): Override => ({ targeting, resolution, spellEffects });

const cond = (
    condition: string,
    n: number,
    extra: { saveEnds?: boolean } = {}
): NonRandomEffect => ({
    kind: 'applyCondition',
    condition,
    duration: rounds(n),
    ...(extra.saveEnds && { saveEnds: { ability: 'wisdom' as const } }),
});

const resist = (damageType: string): NonRandomEffect => ({
    kind: 'flag',
    flag: 'resistance',
    damageType,
    percent: 50,
    duration: rounds(LONG),
});

const noCasting = {
    effects: [cond('disable_spell_casting', 1)],
};

const area = (
    side: 'ally' | 'enemy',
    maxTargets: number,
    range: number
): SpellTargeting => ({ kind: 'area', side, maxTargets, range });

const sphereZone = (
    size: number,
    range: number,
    zone: SpellZone
): SpellTargeting => ({
    kind: 'template',
    shape: 'circle',
    size,
    side: 'all',
    maxTargets: 20,
    range,
    zone,
});

const REVIVE_PENALTY: SpellEffect[] = [
    {
        kind: 'modifyStat',
        stat: 'attackBonus',
        flat: -4,
        duration: rounds(LONG),
    },
    {
        kind: 'modifyStat',
        stat: 'savingThrow',
        flat: -4,
        duration: rounds(LONG),
    },
];

const raise = (
    amount: Extract<NonRandomEffect, { kind: 'heal' }>['amount'],
    penalty: boolean
): Override =>
    effects({ kind: 'allyDead', range: 5 }, [
        { kind: 'heal', amount, revive: true },
        ...(penalty ? REVIVE_PENALTY : []),
    ]);

const hostileSave = (
    targeting: SpellTargeting,
    ability: Parameters<typeof save>[0],
    spellEffects: SpellEffect[]
): Override => effects(targeting, spellEffects, save(ability));

const unit = (
    name: string,
    size: SummonInlineEffect['size'],
    ac: number,
    hp: number | null,
    over: Partial<SummonInlineEffect> = {}
): SpellEffect => ({
    kind: 'summonInline',
    name,
    size,
    ac,
    hp,
    count: 1,
    duration: rounds(LONG),
    ...over,
});

const guardianStrike = {
    save: { ability: 'dexterity' as const },
    saveHalf: true as const,
    effects: [
        {
            kind: 'dealDamage' as const,
            amount: 20,
            damageType: 'radiant',
        },
    ],
};

const breath = (damageType: string): NonRandomEffect => ({
    kind: 'dealDamage',
    amount: { spellRoll: 100 },
    damageType,
});

export const UTILITY_SPELL_OVERRIDES: Record<string, Override> =
    Object.fromEntries(
        Object.entries({
            // teleportation: only the caster moves; carrying others and cross-plane travel are narrative
            'misty-step': effects(
                {
                    kind: 'template',
                    shape: 'circle',
                    size: 5,
                    side: 'all',
                    maxTargets: 20,
                    exact: true,
                    range: 30,
                },
                [{ kind: 'teleportSelf' }]
            ),
            'dimension-door': effects(
                {
                    kind: 'template',
                    shape: 'circle',
                    size: 5,
                    side: 'all',
                    maxTargets: 20,
                    exact: true,
                    range: 500,
                },
                [{ kind: 'teleportSelf' }]
            ),
            teleport: effects(
                {
                    kind: 'template',
                    shape: 'circle',
                    size: 5,
                    side: 'all',
                    maxTargets: 20,
                    exact: true,
                    range: 600,
                },
                [{ kind: 'teleportSelf' }]
            ),
            'tree-stride': effects(
                {
                    kind: 'template',
                    shape: 'circle',
                    size: 5,
                    side: 'all',
                    maxTargets: 20,
                    exact: true,
                    range: 500,
                },
                [
                    { kind: 'teleportSelf' },
                    {
                        kind: 'mark',
                        markId: 'tree-stride',
                        positive: true,
                        target: 'self',
                        duration: rounds(MINUTE),
                    },
                ]
            ),
            'teleportation-circle': narrative(
                'teleportation-circle',
                'A shimmering portal circle links to a known permanent teleportation circle; the DM moves the party.',
                MINUTE
            ),
            'word-of-recall': narrative(
                'word-of-recall',
                'The caster and up to five willing creatures teleport to the designated sanctuary; the DM removes them from the scene.'
            ),
            'plane-shift': narrative(
                'plane-shift',
                'The target travels to another plane of existence; the DM resolves the destination.'
            ),
            gate: narrative(
                'gate',
                'A portal to another plane opens; the DM resolves what comes through.',
                MINUTE
            ),
            'transport-via-plants': narrative(
                'transport-via-plants',
                'Creatures step into a large plant and emerge from a known plant on the same plane; the DM moves them.',
                MINUTE
            ),
            'wind-walk': narrative(
                'wind-walk',
                'The caster and allies become cloud-like with a flying speed of 300 feet.',
                LONG,
                area('ally', 10, 30)
            ),
            etherealness: effects(SELF, [
                { kind: 'flag', flag: 'passesWalls', duration: rounds(LONG) },
                marker('etherealness'),
                note(
                    'The caster is on the Ethereal Plane and passes through walls and creatures.'
                ),
            ]),
            'astral-projection': narrative(
                'astral-projection',
                'Astral bodies of the party travel the Astral Plane; the DM resolves the journey.',
                LONG,
                area('ally', 8, 5)
            ),
            'project-image': narrative(
                'project-image',
                'An illusory double of the caster appears within 500 feet and can cast spells from its position.',
                LONG
            ),
            'instant-summons': narrative(
                'instant-summons',
                'The marked object teleports to the caster hand; the DM moves it.'
            ),

            // vitality
            aid: effects(area('ally', 3, 30), [
                { kind: 'maxHpBoost', amount: 5, upcastAmount: 5 },
            ]),
            'raise-dead': raise(1, true),
            resurrection: raise({ percentOf: 'maxHp', value: 100 }, true),
            'true-resurrection': raise(
                { percentOf: 'maxHp', value: 100 },
                false
            ),
            reincarnate: raise(1, false),
            clone: narrative(
                'clone',
                'A dormant duplicate body grows; if the caster dies the soul moves into it (the DM resolves).'
            ),
            'create-food-and-water': narrative(
                'create-food-and-water',
                'Food and water for up to 15 humanoids or 5 steeds appear.'
            ),
            goodberry: effects(area('ally', 10, 5), [
                { kind: 'heal', amount: 1 },
            ]),
            'heroes-feast': effects(area('ally', 12, 30), [
                { kind: 'maxHpBoost', amount: '2d10' },
                {
                    kind: 'flag',
                    flag: 'conditionImmunity',
                    conditions: ['poisoned', 'frightened'],
                    duration: rounds(LONG),
                },
                resist('poison'),
            ]),
            'spare-the-dying': narrative(
                'spare-the-dying',
                'The dying creature is stabilized and stops making death saving throws.',
                undefined,
                touch()
            ),
            'mass-heal': effects({ kind: 'allAllies' }, [
                { kind: 'heal', amount: 700 },
                { kind: 'cleanse', includeConditions: true },
            ]),

            // reactions and dispelling
            counterspell: effects(
                { kind: 'enemy', range: 60 },
                [
                    cond('disable_spell_casting', 1),
                    note(
                        'Cast it before the enemy casts: the pipeline cannot pause a cast, so the target loses its spellcasting for the round.'
                    ),
                ],
                save('constitution')
            ),
            'dispel-magic': effects(area('enemy', 1, 120), [
                {
                    kind: 'cleanse',
                    includeBuffs: true,
                    includeConditions: true,
                },
            ]),
            'remove-curse': effects(touch(), [
                { kind: 'cleanse', includeConditions: true },
            ]),
            'dispel-evil-and-good': effects(SELF, [
                {
                    kind: 'flag',
                    flag: 'conditionImmunity',
                    conditions: ['charmed', 'frightened'],
                    duration: rounds(MINUTE),
                },
                marker('dispel-evil-and-good', MINUTE),
                note(
                    'Celestials, fiends and similar creatures have disadvantage to attack the caster; the DM applies it.'
                ),
            ]),
            'globe-of-invulnerability': effects(SELF, [
                {
                    kind: 'flag',
                    flag: 'spellImmunity',
                    duration: rounds(MINUTE),
                },
                marker('globe-of-invulnerability', MINUTE),
            ]),
            'antilife-shell': effects(SELF, [
                marker('antilife-shell', LONG),
                note(
                    'Living creatures cannot pass the 10-foot barrier around the caster.'
                ),
            ]),
            'magic-circle': narrative(
                'magic-circle',
                'A 10-foot-radius circle bars the chosen creature types from entering or affecting those inside.',
                LONG
            ),
            forbiddance: narrative(
                'forbiddance',
                'The area bars planar travel and damages chosen creature types; the DM resolves it.',
                LONG
            ),
            hallow: narrative(
                'hallow',
                'The ground becomes consecrated with a chosen extra effect.',
                LONG
            ),
            'time-stop': effects(SELF, [
                { kind: 'grantAction', extraActions: 2, refreshAction: true },
                note('The caster takes extra turns while others are frozen.'),
            ]),

            // summons: stat blocks follow the SRD creature the spell conjures (count capped at 4)
            'find-familiar': effects(SELF, [unit('Familiar', 'tiny', 12, 1)]),
            'find-steed': effects(SELF, [
                unit('Otherworldly Steed', 'large', 12, 25, {
                    attacks: [
                        {
                            name: 'Otherworldly Slam',
                            attackBonus: 6,
                            damageDice: '1d8+2',
                            damageType: 'radiant',
                        },
                    ],
                }),
            ]),
            'animate-dead': effects(SELF, [
                unit('Skeleton', 'medium', 14, 13, {
                    upcastEvery: 1,
                    attacks: [
                        {
                            name: 'Shortsword',
                            attackBonus: 5,
                            damageDice: '1d6+3',
                            damageType: 'piercing',
                        },
                    ],
                }),
            ]),
            'create-undead': effects(SELF, [
                unit('Ghoul', 'medium', 12, 22, {
                    count: 3,
                    attacks: [
                        {
                            name: 'Claws',
                            attackBonus: 4,
                            damageDice: '2d4+2',
                            damageType: 'slashing',
                        },
                    ],
                }),
            ]),
            'animate-objects': effects(SELF, [
                unit('Animated Object', 'small', 15, 20, {
                    count: 4,
                    upcastEvery: 1,
                    duration: rounds(MINUTE),
                    attacks: [
                        {
                            name: 'Slam',
                            attackBonus: 6,
                            damageDice: '1d6+3',
                            damageType: 'bludgeoning',
                        },
                    ],
                }),
            ]),
            'arcane-hand': effects(SELF, [
                unit('Arcane Hand', 'large', 18, 40, {
                    duration: rounds(MINUTE),
                    attacks: [
                        {
                            name: 'Clenched Fist',
                            attackBonus: 8,
                            damageDice: '4d8',
                            damageType: 'force',
                        },
                    ],
                }),
            ]),
            'conjure-minor-elementals': effects(SELF, [
                unit('Minor Elemental', 'small', 15, 20, {
                    count: 2,
                    upcastEvery: 1,
                    duration: rounds(MINUTE * 6),
                    attacks: [
                        {
                            name: 'Slam',
                            attackBonus: 5,
                            damageDice: '1d8+3',
                            damageType: 'fire',
                        },
                    ],
                }),
            ]),
            'giant-insect': effects(SELF, [
                unit('Giant Spider', 'large', 14, 26, {
                    duration: rounds(MINUTE * 6),
                    attacks: [
                        {
                            name: 'Bite',
                            attackBonus: 5,
                            damageDice: '1d8+3',
                            damageType: 'piercing',
                        },
                    ],
                }),
            ]),
            'phantom-steed': effects(SELF, [
                unit('Phantom Steed', 'large', 11, 13, {
                    duration: rounds(MINUTE * 6),
                }),
            ]),
            'planar-ally': effects(SELF, [
                unit('Planar Ally', 'large', 16, 90, {
                    attacks: [
                        {
                            name: 'Slam',
                            attackBonus: 8,
                            damageDice: '2d8+5',
                            damageType: 'radiant',
                        },
                    ],
                }),
                note('The DM negotiates the ally service and payment.'),
            ]),
            'summon-dragon': effects(SELF, [
                unit('Draconic Spirit', 'large', 19, 50, {
                    duration: rounds(MINUTE * 6),
                    attacks: [
                        {
                            name: 'Rend',
                            attackBonus: 8,
                            damageDice: '1d6+9',
                            damageType: 'piercing',
                        },
                    ],
                }),
            ]),
            'unseen-servant': effects(SELF, [
                unit('Unseen Servant', 'medium', 10, 1, {
                    duration: rounds(MINUTE * 6),
                }),
            ]),
            'floating-disk': effects(SELF, [
                unit('Floating Disk', 'medium', 10, null, {
                    duration: rounds(MINUTE * 6),
                }),
            ]),
            'mage-hand': effects(SELF, [
                unit('Spectral Hand', 'tiny', 10, null, {
                    duration: rounds(MINUTE),
                }),
            ]),
            'guardian-of-faith': effects(SELF, [
                unit('Guardian of Faith', 'large', 10, null, {
                    aura: {
                        radiusFeet: 10,
                        side: 'enemies',
                        onEnter: guardianStrike,
                        onTurnStart: guardianStrike,
                    },
                }),
            ]),
            simulacrum: effects(SELF, [
                unit('Simulacrum', 'medium', 15, 40),
                note(
                    'A duplicate with half the creature hit points; the DM sets its stats and abilities.'
                ),
            ]),
            awaken: narrative(
                'awaken',
                'The beast or plant gains an Intelligence of 10 and a language; the DM resolves it.'
            ),
            'planar-binding': narrative(
                'planar-binding',
                'The bound creature serves according to the DM ruling.',
                LONG
            ),
            'rope-trick': narrative(
                'rope-trick',
                'A rope leads to a pocket space that holds up to eight creatures.',
                LONG
            ),

            // transformations: the target keeps its own token, so the beast form is modelled by its limits
            polymorph: hostileSave({ kind: 'enemy', range: 60 }, 'wisdom', [
                cond('disable_spell_casting', LONG),
                cond('disable_ranged_attacks', LONG),
                note(
                    'The target takes a beast form; the DM sets the form stats if needed.'
                ),
            ]),
            'true-polymorph': hostileSave(
                { kind: 'enemy', range: 30 },
                'wisdom',
                [
                    cond('disable_spell_casting', LONG),
                    cond('disable_ranged_attacks', LONG),
                    note(
                        'The target takes a new form; the DM sets the form stats if needed.'
                    ),
                ]
            ),
            'alter-self': narrative(
                'alter-self',
                'The caster reshapes the body: aquatic adaptation, a changed appearance or natural weapons.',
                LONG
            ),
            'animal-shapes': narrative(
                'animal-shapes',
                'Willing creatures transform into beasts of CR 4 or lower.',
                LONG,
                area('ally', 10, 30)
            ),
            shapechange: narrative(
                'shapechange',
                'The caster takes the form of a creature up to CR equal to the caster level.',
                LONG
            ),
            'gaseous-form': effects(touch(), [
                resist('slashing'),
                resist('piercing'),
                resist('bludgeoning'),
                { kind: 'flag', flag: 'passesWalls', duration: rounds(LONG) },
                marker('gaseous-form'),
            ]),

            // buffs
            darkvision: effects(touch(), [
                {
                    kind: 'flag',
                    flag: 'sense',
                    sense: 'darkvision',
                    range: 150,
                    duration: rounds(LONG),
                },
            ]),
            'true-seeing': effects(touch(), [
                {
                    kind: 'flag',
                    flag: 'sense',
                    sense: 'truesight',
                    range: 120,
                    duration: rounds(LONG),
                },
            ]),
            'see-invisibility': narrative(
                'see-invisibility',
                'The caster sees invisible creatures and objects.',
                LONG
            ),
            'spider-climb': narrative(
                'spider-climb',
                'The target climbs walls and ceilings with a climbing speed equal to its walking speed.',
                MINUTE * 6,
                touch()
            ),
            levitate: narrative(
                'levitate',
                'The target floats up to 20 feet above the ground.',
                MINUTE,
                touch(60)
            ),
            jump: narrative(
                'jump',
                'Jump distance is tripled.',
                MINUTE,
                touch()
            ),
            'feather-fall': narrative(
                'feather-fall',
                'Falling creatures descend slowly and take no falling damage.',
                1,
                area('ally', 5, 60)
            ),
            'water-walk': narrative(
                'water-walk',
                'Creatures can walk on liquid surfaces.',
                LONG,
                area('ally', 10, 30)
            ),
            'water-breathing': narrative(
                'water-breathing',
                'Creatures can breathe underwater.',
                LONG,
                area('ally', 10, 30)
            ),
            'death-ward': narrative(
                'death-ward',
                'The first time the target would drop to 0 hit points it drops to 1 instead; the DM applies it.',
                LONG,
                touch()
            ),
            nondetection: narrative(
                'nondetection',
                'The target cannot be targeted by divination magic or perceived by scrying sensors.',
                LONG,
                touch()
            ),
            glibness: narrative(
                'glibness',
                'The caster treats Charisma checks as at least 15 and cannot be forced to lie.',
                LONG
            ),
            'true-strike': effects(SELF, [
                {
                    kind: 'flag',
                    flag: 'advantage',
                    attackKind: 'all',
                    consumeOn: 'ownAttack',
                    until: 'turnEnd',
                    duration: rounds(1),
                },
            ]),
            shillelagh: effects(SELF, [
                {
                    kind: 'damageBonus',
                    filter: { kind: 'melee' },
                    flat: 3,
                    duration: rounds(MINUTE),
                },
            ]),
            enthrall: hostileSave(area('enemy', 20, 60), 'wisdom', [
                {
                    kind: 'flag',
                    flag: 'checkDisadvantage',
                    skills: ['perception'],
                    duration: rounds(MINUTE),
                },
            ]),
            'calm-emotions': hostileSave(
                {
                    kind: 'template',
                    shape: 'circle',
                    size: 20,
                    side: 'all',
                    maxTargets: 20,
                    range: 60,
                },
                'charisma',
                [cond('no_damage_dealt', MINUTE)]
            ),
            sanctuary: effects(touch(30), [
                {
                    kind: 'flag',
                    flag: 'disadvantageForAttackers',
                    duration: rounds(MINUTE),
                },
                marker('sanctuary', MINUTE),
            ]),
            seeming: narrative(
                'seeming',
                'The appearance of the targets changes.',
                LONG,
                area('ally', 10, 30)
            ),
            'dragons-breath': effects(touch(), [
                {
                    kind: 'grantCast',
                    label: "Dragon's Breath",
                    cost: 'action',
                    duration: rounds(MINUTE),
                    target: 'eventTarget',
                    cast: {
                        targeting: {
                            kind: 'template',
                            shape: 'cone',
                            size: 15,
                            side: 'all',
                            maxTargets: 20,
                            range: 5,
                        },
                        resolution: save('dexterity', 'half'),
                        dice: 3,
                        dieSides: 6,
                        effects: [breath('fire')],
                    },
                },
            ]),
            confusion: hostileSave(
                {
                    kind: 'template',
                    shape: 'circle',
                    size: 10,
                    side: 'enemy',
                    maxTargets: 20,
                    range: 90,
                },
                'wisdom',
                [
                    {
                        kind: 'berserk',
                        damageBonusPercent: 0,
                        duration: rounds(MINUTE),
                    },
                ]
            ),

            // control and terrain
            forcecage: effects(
                {
                    kind: 'template',
                    shape: 'cube',
                    size: 20,
                    side: 'all',
                    maxTargets: 20,
                    range: 100,
                },
                [
                    cond('immobilized', LONG),
                    cond('disable_melee_attacks', LONG),
                    cond('disable_ranged_attacks', LONG),
                ]
            ),
            'resilient-sphere': hostileSave(
                { kind: 'enemy', range: 30 },
                'dexterity',
                [
                    cond('immobilized', MINUTE),
                    cond('disable_melee_attacks', MINUTE),
                    cond('disable_ranged_attacks', MINUTE),
                ]
            ),
            'reverse-gravity': hostileSave(
                {
                    kind: 'template',
                    shape: 'circle',
                    size: 50,
                    side: 'all',
                    maxTargets: 20,
                    range: 100,
                },
                'dexterity',
                [
                    {
                        kind: 'dealDamage',
                        amount: '5d6',
                        damageType: 'bludgeoning',
                    },
                    cond('restrained', MINUTE),
                ]
            ),
            silence: effects(
                sphereZone(20, 120, {
                    rounds: LONG,
                    label: 'Silence',
                    side: 'all',
                    onEnter: noCasting,
                    onTurnStart: noCasting,
                }),
                []
            ),
            'wall-of-stone': effects(
                {
                    kind: 'template',
                    shape: 'line',
                    size: 100,
                    side: 'enemy',
                    maxTargets: 1,
                    range: 120,
                },
                [
                    {
                        kind: 'createTerrain',
                        terrain: 'wall',
                        shape: 'cell',
                        cells: 20,
                        rounds: LONG,
                    },
                ]
            ),
            'move-earth': effects(
                {
                    kind: 'template',
                    shape: 'cube',
                    size: 40,
                    side: 'enemy',
                    maxTargets: 1,
                    range: 120,
                },
                [
                    {
                        kind: 'createTerrain',
                        terrain: 'difficult',
                        shape: 'cell',
                        cells: 12,
                        rounds: LONG,
                    },
                ]
            ),
            'plant-growth': effects(
                sphereZone(100, 150, {
                    rounds: LONG,
                    label: 'Overgrowth',
                    terrain: ['difficult'],
                    side: 'all',
                }),
                []
            ),
            daylight: effects(
                sphereZone(60, 60, {
                    rounds: LONG,
                    label: 'Daylight',
                    side: 'all',
                }),
                []
            ),
            'stone-shape': narrative(
                'stone-shape',
                'A stone object is reshaped as desired.'
            ),
            'control-water': narrative(
                'control-water',
                'Flood, part, redirect or whirlpool a body of water; the DM resolves the effect.',
                MINUTE
            ),
            'control-weather': narrative(
                'control-weather',
                'The weather around the caster shifts; the DM applies the map weather.',
                LONG
            ),
            'create-or-destroy-water': narrative(
                'create-or-destroy-water',
                'Up to 10 gallons of water appear or a volume of water or fog is destroyed.'
            ),
            creation: narrative(
                'creation',
                'A nonliving object of vegetable matter or mineral up to a 5-foot cube appears.'
            ),
            fabricate: narrative(
                'fabricate',
                'Raw materials are converted into a product of the same material.'
            ),
            'continual-flame': narrative(
                'continual-flame',
                'A magical flame without heat burns permanently on an object.'
            ),
            light: narrative(
                'light',
                'An object sheds bright light in a 20-foot radius.',
                LONG,
                touch()
            ),
            'dancing-lights': narrative(
                'dancing-lights',
                'Up to four torch-sized lights float in the air.',
                MINUTE
            ),

            // detection, divination and utility
            alarm: narrative(
                'alarm',
                'A ward alerts the caster when a creature enters the warded area.',
                LONG
            ),
            'animal-messenger': narrative(
                'animal-messenger',
                'A Tiny beast carries a message to a chosen recipient.'
            ),
            'arcane-eye': narrative(
                'arcane-eye',
                'An invisible magical eye floats up to 30 feet per turn and relays what it sees.',
                MINUTE * 6
            ),
            'arcane-lock': narrative(
                'arcane-lock',
                'A door, window or container is magically locked.',
                undefined,
                touch()
            ),
            'arcanists-magic-aura': narrative(
                'arcanists-magic-aura',
                'The magic aura of an object is masked or altered.',
                undefined,
                touch()
            ),
            augury: narrative(
                'augury',
                'The DM gives an omen (weal, woe, both or nothing) about the next 30 minutes.'
            ),
            clairvoyance: narrative(
                'clairvoyance',
                'An invisible sensor lets the caster see or hear a known location.',
                MINUTE * 6
            ),
            commune: narrative(
                'commune',
                'The caster asks the deity three yes/no questions; the DM answers.'
            ),
            'commune-with-nature': narrative(
                'commune-with-nature',
                'The caster gains knowledge of the surrounding terrain; the DM answers.'
            ),
            'comprehend-languages': narrative(
                'comprehend-languages',
                'The caster understands any spoken language and read written text.',
                LONG
            ),
            contingency: narrative(
                'contingency',
                'A prepared spell triggers when the chosen condition occurs; the DM resolves it.'
            ),
            demiplane: narrative(
                'demiplane',
                'A door opens to an extradimensional room.',
                LONG
            ),
            'detect-evil-and-good': narrative(
                'detect-evil-and-good',
                'The caster senses aberrations, celestials, elementals, fey, fiends and undead within 30 feet.',
                MINUTE * 6
            ),
            'detect-magic': narrative(
                'detect-magic',
                'The caster senses magic within 30 feet and can see the aura.',
                MINUTE * 6
            ),
            'detect-poison-and-disease': narrative(
                'detect-poison-and-disease',
                'The caster senses poison, poisonous creatures and disease within 30 feet.',
                MINUTE * 6
            ),
            'detect-thoughts': narrative(
                'detect-thoughts',
                'The caster reads the surface thoughts of creatures within 30 feet.',
                MINUTE
            ),
            'disguise-self': narrative(
                'disguise-self',
                'The caster appearance changes.',
                LONG
            ),
            divination: narrative(
                'divination',
                'The DM gives a truthful reply about the next seven days.'
            ),
            druidcraft: narrative(
                'druidcraft',
                'A minor nature effect: weather sensor, bloom, harmless sensory effect or a small fire.'
            ),
            elementalism: narrative(
                'elementalism',
                'A minor elemental effect: gust, flame, water or earth tremor.'
            ),
            'find-the-path': narrative(
                'find-the-path',
                'The caster knows the shortest path to a chosen location.',
                LONG
            ),
            'find-traps': narrative(
                'find-traps',
                'The caster senses the presence of traps within 120 feet.'
            ),
            'glyph-of-warding': narrative(
                'glyph-of-warding',
                'A glyph triggers a stored spell or explosive runes when disturbed; the DM resolves the trigger.',
                LONG
            ),
            'guards-and-wards': narrative(
                'guards-and-wards',
                'The building is warded with fog, locks and illusions.',
                LONG
            ),
            'hallucinatory-terrain': narrative(
                'hallucinatory-terrain',
                'Natural terrain looks like different terrain.',
                LONG
            ),
            identify: narrative(
                'identify',
                'The caster learns the properties of a touched magic item or the spells on a creature.'
            ),
            'illusory-script': narrative(
                'illusory-script',
                'Writing is readable only by chosen creatures.',
                LONG
            ),
            knock: narrative('knock', 'A lock, bar or stuck mechanism opens.'),
            'legend-lore': narrative(
                'legend-lore',
                'The caster learns lore about a chosen person, place or object; the DM answers.'
            ),
            'locate-animals-or-plants': narrative(
                'locate-animals-or-plants',
                'The caster senses the direction to the nearest chosen creature kind within 5 miles.'
            ),
            'locate-creature': narrative(
                'locate-creature',
                'The caster senses the direction to a known creature within 1000 feet.',
                MINUTE * 6
            ),
            'locate-object': narrative(
                'locate-object',
                'The caster senses the direction to a known object within 1000 feet.',
                MINUTE * 6
            ),
            'magic-jar': narrative(
                'magic-jar',
                'The soul enters a vessel and can possess creatures; the DM resolves possession.',
                LONG
            ),
            'magic-mouth': narrative(
                'magic-mouth',
                'A mouth appears on an object and speaks a message when triggered.'
            ),
            'magnificent-mansion': narrative(
                'magnificent-mansion',
                'A door opens to an extradimensional mansion.',
                LONG
            ),
            'major-image': narrative(
                'major-image',
                'A convincing illusory image with sound, smell and temperature appears.',
                MINUTE
            ),
            'silent-image': narrative(
                'silent-image',
                'An illusory image of an object, creature or effect appears.',
                MINUTE
            ),
            'minor-illusion': narrative(
                'minor-illusion',
                'A sound or an image of an object appears.',
                MINUTE
            ),
            mending: narrative(
                'mending',
                'A single break or tear in an object is repaired.'
            ),
            message: narrative(
                'message',
                'A whispered message reaches a chosen creature within range.'
            ),
            'mirage-arcane': narrative(
                'mirage-arcane',
                'The terrain looks, sounds and feels like different terrain.',
                LONG
            ),
            mislead: effects(SELF, [
                {
                    kind: 'applyCondition',
                    condition: 'invisible',
                    duration: rounds(MINUTE),
                },
                marker('mislead', MINUTE),
                note(
                    'An illusory double stands where the caster was; the DM voices it.'
                ),
            ]),
            passwall: narrative(
                'passwall',
                'A passage opens through a wooden, plaster or stone surface.',
                LONG
            ),
            prestidigitation: narrative(
                'prestidigitation',
                'A minor magical trick: sensory effect, light a candle, clean or soil, chill or warm.'
            ),
            'private-sanctum': narrative(
                'private-sanctum',
                'The area is shielded from sight, sound, scrying and teleportation.',
                LONG
            ),
            'programmed-illusion': narrative(
                'programmed-illusion',
                'An illusion plays out when a trigger occurs.',
                LONG
            ),
            'purify-food-and-drink': narrative(
                'purify-food-and-drink',
                'Food and drink in a 5-foot radius are purified of poison and disease.'
            ),
            scrying: narrative(
                'scrying',
                'The caster sees and hears a chosen creature on the same plane (Wisdom save for unwilling).',
                MINUTE
            ),
            'secret-chest': narrative(
                'secret-chest',
                'A chest is hidden on the Ethereal Plane and can be recalled.',
                LONG
            ),
            sending: narrative(
                'sending',
                'A message of up to 25 words reaches a known creature, which can reply.'
            ),
            sequester: narrative(
                'sequester',
                'The target becomes invisible and undetectable by divination.',
                LONG,
                touch()
            ),
            'speak-with-animals': narrative(
                'speak-with-animals',
                'The caster can talk to beasts.',
                LONG
            ),
            'speak-with-dead': narrative(
                'speak-with-dead',
                'A corpse answers up to five questions.',
                MINUTE
            ),
            'speak-with-plants': narrative(
                'speak-with-plants',
                'The caster can talk to plants and command them within 30 feet.',
                MINUTE
            ),
            'telepathic-bond': narrative(
                'telepathic-bond',
                'Willing creatures communicate telepathically at any distance on the same plane.',
                LONG,
                area('ally', 8, 30)
            ),
            thaumaturgy: narrative(
                'thaumaturgy',
                'A minor wonder: altered voice, flickering flames, tremors or a harmless sound.'
            ),
            tongues: narrative(
                'tongues',
                'The target understands any spoken language and is understood by all.',
                LONG,
                touch()
            ),
            'gentle-repose': narrative(
                'gentle-repose',
                'The corpse cannot become undead and does not decay.',
                LONG,
                touch()
            ),
            'meld-into-stone': narrative(
                'meld-into-stone',
                'The caster merges into a stone object and can hear the surroundings.',
                LONG
            ),
            'tiny-hut': narrative(
                'tiny-hut',
                'A 10-foot dome blocks weather and unwanted creatures; the DM resolves entries.',
                LONG
            ),
            symbol: narrative(
                'symbol',
                'A glyph triggers a magical effect when disturbed; the DM resolves the trigger.',
                LONG
            ),
            'zone-of-truth': narrative(
                'zone-of-truth',
                'Creatures in the 15-foot sphere that fail a Charisma save cannot speak a deliberate lie.',
                LONG
            ),
            wish: effects(SELF, [
                {
                    kind: 'chooseOne',
                    options: [
                        {
                            kind: 'heal',
                            amount: { percentOf: 'maxHp', value: 100 },
                            target: 'self',
                        },
                        { kind: 'restoreSpellSlot', count: 3, target: 'self' },
                        {
                            kind: 'grantAction',
                            extraActions: 1,
                            target: 'self',
                        },
                    ],
                },
                note(
                    'Beyond these stock wishes the DM adjudicates what the wish does.'
                ),
            ]),
        }).map(([slug, override]) => [`srd-2024_${slug}`, override])
    );
