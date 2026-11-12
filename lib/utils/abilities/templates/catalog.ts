import {
    ability,
    both,
    damageType,
    dice,
    dual,
    fx,
    num,
    PASSIVE,
    range,
    rounds,
} from './kit';
import type { Recipe, RecipeCategory } from './types';

import type { Trigger } from '@/lib/utils/abilities/schema';
import {
    DAMAGE_FILTER_KINDS,
    STAT_KEYS,
} from '@/lib/utils/abilities/schema/kinds';

export const RECIPE_CATEGORIES: readonly RecipeCategory[] = [
    'defense',
    'offense',
    'support',
    'resource',
    'control',
];

export const CORE_RECIPES: readonly Recipe[] = [
    {
        id: 'stats',
        category: 'support',
        scopes: ['ability'],
        params: [
            {
                key: 'stat',
                kind: 'stat',
                default: 'armor',
                options: STAT_KEYS.filter((k) => k !== 'spellSlots'),
            },
            num('value', 1, 1, 10),
        ],
        build: (v, ctx) =>
            ability(PASSIVE, [
                fx('modifyStat', PASSIVE, { stat: v.stat, flat: v.value }),
            ])(v, ctx),
    },
    {
        id: 'damage',
        category: 'offense',
        scopes: ['ability'],
        params: [
            {
                key: 'filter',
                kind: 'select',
                default: 'melee',
                options: DAMAGE_FILTER_KINDS,
            },
            num('percent', 10, 1, 100),
        ],
        build: (v, ctx) =>
            ability(PASSIVE, [
                fx('damageBonus', PASSIVE, {
                    filter: { kind: v.filter },
                    percent: v.percent,
                }),
            ])(v, ctx),
    },
    {
        id: 'onHit',
        category: 'offense',
        scopes: ['ability'],
        params: [dice('1d4'), damageType('bleed'), rounds(2)],
        build: (v, ctx) => {
            const trigger: Trigger = { event: 'hit', role: 'attacker' };

            return ability(trigger, [
                fx('dot', trigger, {
                    damagePerRound: v.dice,
                    damageType: v.damageType,
                    duration: { rounds: v.rounds },
                }),
            ])(v, ctx);
        },
    },
    {
        id: 'resistance',
        category: 'defense',
        scopes: ['ability'],
        params: [damageType('slashing'), num('percent', 25, 1, 100)],
        build: (v, ctx) =>
            ability(PASSIVE, [
                fx('flag', PASSIVE, {
                    flag: 'resistance',
                    attackKind: undefined,
                    damageType: v.damageType,
                    percent: v.percent,
                }),
            ])(v, ctx),
    },
    {
        id: 'aura',
        category: 'support',
        scopes: ['ability'],
        params: [num('value', 1, 1, 5)],
        build: (v, ctx) =>
            ability(PASSIVE, [
                fx('modifyStat', PASSIVE, {
                    stat: 'armor',
                    flat: v.value,
                    target: 'allAllies',
                }),
            ])(v, ctx),
    },
    {
        id: 'survive',
        category: 'defense',
        scopes: ['ability'],
        params: [],
        build: (v, ctx) => {
            const trigger: Trigger = { event: 'lethalDamage' };

            return ability(
                trigger,
                [fx('heal', trigger, { amount: 1, revive: true })],
                { perBattle: 1 }
            )(v, ctx);
        },
    },
    {
        id: 'bonusAction',
        category: 'support',
        scopes: ['ability'],
        params: [dice('1d10')],
        build: (v, ctx) => {
            const trigger: Trigger = { event: 'bonusAction' };

            return ability(trigger, [fx('heal', trigger, { amount: v.dice })], {
                perBattle: 1,
            })(v, ctx);
        },
    },
    {
        id: 'damageSpell',
        category: 'offense',
        scopes: both,
        params: [dice('1d8'), damageType('fire')],
        build: dual((v, t) => [
            fx('dealDamage', t, { amount: v.dice, damageType: v.damageType }),
        ]),
    },
    {
        id: 'healSpell',
        category: 'support',
        scopes: both,
        params: [dice('1d8')],
        build: dual((v, t) => [fx('heal', t, { amount: v.dice })]),
    },
    {
        id: 'dotSpell',
        category: 'offense',
        scopes: both,
        params: [dice('1d4'), damageType('poison'), rounds(3)],
        build: dual((v, t) => [
            fx('dot', t, {
                damagePerRound: v.dice,
                damageType: v.damageType,
                duration: { rounds: v.rounds },
            }),
        ]),
    },
    {
        id: 'hotSpell',
        category: 'support',
        scopes: both,
        params: [dice('1d4'), rounds(3)],
        build: dual((v, t) => [
            fx('hot', t, {
                healPerRound: v.dice,
                duration: { rounds: v.rounds },
            }),
        ]),
    },
    {
        id: 'pushBack',
        category: 'control',
        scopes: both,
        params: [
            {
                key: 'feet',
                kind: 'select',
                default: 10,
                options: range(5, 30, 5),
            },
        ],
        build: dual((v, t) => [
            fx('push', t, { feet: Number(v.feet), from: 'caster' }),
        ]),
    },
    {
        id: 'buffArmor',
        category: 'support',
        scopes: both,
        params: [num('value', 2, 1, 5), rounds(3)],
        build: dual((v, t) => [
            fx('modifyStat', t, {
                stat: 'armor',
                flat: v.value,
                duration: { rounds: v.rounds },
            }),
        ]),
    },
    {
        id: 'cleanse',
        category: 'support',
        scopes: both,
        params: [],
        build: dual((_v, t) => [fx('cleanse', t)]),
    },
];
