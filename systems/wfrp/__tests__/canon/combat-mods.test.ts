import { describe, expect } from 'vitest';

import { bookExample } from './book-example';
import {
    attackDetails,
    bow,
    canonRules,
    fighter,
    input,
    legacyRules,
    sword,
} from './combat-fixtures';

import { testMap } from '@/lib/utils/battle/__tests__/fixtures/placed';
import { applyWfrpConditionTo } from '@/systems/wfrp/rules/conditions/apply';
import type { WfrpConditionKey } from '@/systems/wfrp/rules/conditions/catalog';
import { EDITION_PROFILES } from '@/systems/wfrp/rules/edition/profiles';
import type { BattleParticipant } from '@/types/battle';

const me = (extra = {}) => fighter('a', { at: { x: 4, y: 5 }, ...extra });

const foe = (extra = {}) =>
    fighter('t', { side: 'enemy', at: { x: 5, y: 5 }, ...extra });

const allyAt = (id: string, x: number, y: number) =>
    fighter(id, { at: { x, y } });

const withCondition = (p: BattleParticipant, key: WfrpConditionKey) =>
    applyWfrpConditionTo(p, {
        key,
        round: 0,
        edition: EDITION_PROFILES.canon5e,
        sourceName: 'test',
    }).participant;

const mods = (
    a: BattleParticipant,
    t: BattleParticipant,
    extra: Parameters<typeof attackDetails>[3] = {},
    attack = sword()
) => attackDetails(a, t, attack, extra).details?.mods ?? [];

const net = (
    a: BattleParticipant,
    t: BattleParticipant,
    extra: Parameters<typeof attackDetails>[3] = {},
    attack = sword()
) => attackDetails(a, t, attack, extra).details?.netSl ?? 0;

describe('canon: melee attack modifiers (p166)', () => {
    bookExample(
        166,
        'outnumbered target +1 SL, surrounded +2 SL, not cumulative',
        () => {
            const a = me();

            const t = foe();

            const second = allyAt('b', 5, 4);

            const third = allyAt('c', 6, 5);

            const two = { participants: [a, t, second] };

            const three = { participants: [a, t, second, third] };

            expect(mods(a, t)).toEqual([]);
            expect(mods(a, t, two)).toEqual([{ key: 'outnumbered', sl: 1 }]);
            expect(mods(a, t, three)).toEqual([{ key: 'surrounded', sl: 2 }]);
            expect(net(a, t, two)).toBe(net(a, t) + 1);
            expect(net(a, t, three)).toBe(net(a, t) + 2);
        }
    );

    bookExample(166, 'defender gets no mirrored penalty', () => {
        const a = me();

        const t = foe();

        const crowd = {
            participants: [a, t, allyAt('b', 5, 4), allyAt('c', 6, 5)],
        };

        const defence = (extra: typeof crowd | object) =>
            attackDetails(a, t, sword(), extra).details?.defender;

        expect(defence(crowd)).toEqual(defence({}));
    });

    bookExample(166, 'outnumbering gives no SL to a ranged attack', () => {
        const a = me();

        const t = foe();

        expect(
            mods(a, t, { participants: [a, t, allyAt('b', 5, 4)] }, bow())
        ).toEqual([]);
    });

    bookExample(166, 'attacker in difficult terrain -1 SL melee', () => {
        const a = me();

        const t = foe();

        const map = testMap(10, 10, {
            terrain: { '4:5': { kind: 'difficult' } },
        });

        expect(mods(a, t, { map })).toEqual([{ key: 'terrain', sl: -1 }]);
        expect(
            mods(a, t, {
                map: testMap(10, 10, {
                    terrain: { '9:9': { kind: 'difficult' } },
                }),
            })
        ).toEqual([]);
    });

    bookExample(166, 'hand-set mud or water costs -1 SL, once with terrain', () => {
        const a = me();

        const t = foe();

        const map = testMap(10, 10, {
            terrain: { '4:5': { kind: 'difficult' } },
        });

        const system = input({ situational: { badFooting: true } });

        expect(mods(a, t, { system })).toEqual([{ key: 'terrain', sl: -1 }]);
        expect(mods(a, t, { system, map })).toEqual([
            { key: 'terrain', sl: -1 },
        ]);
    });

    bookExample(166, 'high ground +1 SL, defender high ground -1 SL', () => {
        const a = me();

        const t = foe();

        const high = (v: 'attacker' | 'defender') =>
            mods(a, t, { system: input({ situational: { highGround: v } }) });

        expect(high('attacker')).toEqual([{ key: 'highGround', sl: 1 }]);
        expect(high('defender')).toEqual([
            { key: 'defenderHighGround', sl: -1 },
        ]);
    });

    bookExample(
        166,
        'enclosed space: Average reach -1 SL, longer -2 SL, shorter 0',
        () => {
            const a = me();

            const t = foe();

            const system = input({ situational: { enclosed: true } });

            const enclosed = (reach: 'average' | 'long' | 'short') =>
                mods(a, t, { system }, sword({ reach }));

            expect(enclosed('average')).toEqual([{ key: 'enclosed', sl: -1 }]);
            expect(enclosed('long')).toEqual([{ key: 'enclosed', sl: -2 }]);
            expect(enclosed('short')).toEqual([]);
        }
    );

    bookExample(166, 'attacker Prone -1 SL, target Entangled +1 SL', () => {
        const a = me();

        const t = foe();

        expect(mods(withCondition(a, 'prone'), t)).toEqual([
            { key: 'attackerProne', sl: -1 },
        ]);
        expect(mods(a, withCondition(t, 'entangled'))).toEqual([
            { key: 'targetEntangled', sl: 1 },
        ]);
    });

    bookExample(187, 'a Surprised target is struck with +2 SL in melee', () => {
        const a = me();

        expect(mods(a, withCondition(foe(), 'surprised'))).toEqual([
            { key: 'targetSurprised', sl: 2 },
        ]);
    });

    bookExample(166, 'off-hand weapon -2 SL joins the same list', () => {
        expect(mods(me(), foe(), {}, sword({ hand: 'off' }))).toEqual([
            { key: 'offHand', sl: -2 },
        ]);
    });
});

describe('canon: called shot (p167)', () => {
    bookExample(
        167,
        'called shot -2 SL, hit lands on the chosen location',
        () => {
            const a = me();

            const t = foe();

            const system = input({ calledShot: 'leftArm' });

            const called = attackDetails(a, t, sword(), { system });

            expect(called.details?.location).toBe('leftArm');
            expect(called.details?.mods).toEqual([
                { key: 'calledShot', sl: -2 },
            ]);
            expect(net(a, t, { system })).toBe(net(a, t) - 2);
        }
    );

    bookExample(167, 'a ranged called shot is -2 SL too', () => {
        const system = input({ calledShot: 'head' });

        expect(mods(me(), foe(), { system }, bow())).toEqual([
            { key: 'calledShot', sl: -2 },
        ]);
    });
});

describe('legacy edition keeps its combat modifiers', () => {
    bookExample(166, 'outnumbering is +10% to hit and gives no SL', () => {
        const a = me();

        const t = foe();

        const crowd = { participants: [a, t, allyAt('b', 5, 4)] };

        const target = (extra: object) =>
            attackDetails(a, t, sword(), { rules: legacyRules, ...extra })
                .details;

        expect(target(crowd)?.target).toBe((target({})?.target ?? 0) + 10);
        expect(target(crowd)?.mods).toBeUndefined();
    });

    bookExample(360, 'a larger legacy target is harder to hit by 10% a step', () => {
        const a = me();

        const hitTarget = (size?: 'large') =>
            attackDetails(a, foe({ size }), sword(), { rules: legacyRules })
                .details?.target;

        expect(hitTarget('large')).toBe((hitTarget() ?? 0) + 10);
    });

    bookExample(166, 'canon: size does not shift the melee target', () => {
        const a = me();

        const hitTarget = (size?: 'large') =>
            attackDetails(a, foe({ size }), sword(), { rules: canonRules })
                .details?.target;

        expect(hitTarget('large')).toBe(hitTarget());
    });
});
