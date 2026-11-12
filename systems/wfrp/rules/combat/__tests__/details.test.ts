import { describe, expect, it } from 'vitest';

import { ACTION_SLOT } from '../../slots';
import { wfrpActionDetails as hook } from '../details';

import { textRef } from '@/lib/i18n/text-ref';
import { percentileDice } from '@/lib/utils/battle/fx/dice';
import { ruleSystemByKey } from '@/lib/utils/rules/systems';
import type {
    PercentileAttackDetails,
    PercentileCastDetails,
} from '@/systems/wfrp/rules/percentile/details';

const attack: PercentileAttackDetails = {
    roll: 34,
    target: 45,
    sl: 1,
    netSl: 3,
    location: 'body',
    doubles: false,
    defender: { kind: 'parry', roll: 70, sl: -2, target: 40 },
    opposed: true,
};

const cast: PercentileCastDetails = {
    roll: 11,
    target: 35,
    sl: 2,
    cn: 3,
    channelled: 0,
    armourSl: 0,
    doubles: true,
    outcome: 'failure',
    overcastSteps: 0,
    miscast: 'minor',
};

const slotOf = (data: {
    attack?: PercentileAttackDetails;
    cast?: PercentileCastDetails;
}) => ACTION_SLOT.write(data);

const view = (
    over: Partial<{ hideNumbers: boolean; hideActor: boolean }> = {}
) => ({ hideNumbers: false, hideActor: false, ...over });

describe('wfrp combat.details.redact', () => {
    it('P1 visible target: the defender goes, the numbers stay', () => {
        const out =
            ACTION_SLOT.read(hook.redact(slotOf({ attack }), view())) ?? {};

        expect(out.attack).toEqual({
            roll: 34,
            target: 45,
            sl: 1,
            netSl: 3,
            location: 'body',
            doubles: false,
            opposed: true,
        });
        expect(out.attack && 'defender' in out.attack).toBe(false);
    });

    it('P2 hidden target: the attack part goes, the cast stays', () => {
        expect(
            hook.redact(slotOf({ attack }), view({ hideNumbers: true }))
        ).toBeUndefined();
        expect(
            ACTION_SLOT.read(
                hook.redact(
                    slotOf({ attack, cast }),
                    view({ hideNumbers: true })
                )
            )
        ).toEqual({ cast });
    });

    it('P3 invisible caster: miscast cleared; visible caster unchanged', () => {
        expect(
            ACTION_SLOT.read(
                hook.redact(slotOf({ cast }), view({ hideActor: true }))
            )?.cast?.miscast
        ).toBeNull();

        const same = slotOf({ cast });

        expect(hook.redact(same, view())).toBe(same);
    });

    it('P6 nothing secret: the same object', () => {
        const quiet = slotOf({ attack: { ...attack, defender: undefined } });

        const noDefender = { ...attack };

        delete noDefender.defender;

        const plain = slotOf({
            attack: noDefender,
            cast: { ...cast, miscast: null },
        });

        expect(hook.redact(quiet, view())).toBe(quiet);
        expect(hook.redact(plain, view({ hideActor: true }))).toBe(plain);
    });

    it('is idempotent', () => {
        const once =
            hook.redact(slotOf({ attack, cast }), view({ hideActor: true })) ??
            slotOf({});

        expect(hook.redact(once, view({ hideActor: true }))).toBe(once);
    });

    it('an unreadable slot is dropped', () =>
        expect(hook.redact({ key: 'wfrp', data: 5 }, view())).toBeUndefined());
});

describe('wfrp combat.details lines, secrets, dice', () => {
    const opposed = textRef('battleLog.percentile.opposed', {
        roll: 30,
        target: 40,
        sl: 1,
        netSl: 2,
        defense: 'x',
    });

    it('P4 opposed line becomes opposedHidden; a second pass changes nothing', () => {
        const once = hook.redactLine(opposed);

        expect(once).toMatchObject({
            message: 'battleLog.percentile.opposedHidden',
            params: { roll: 30, target: 40, sl: 1, netSl: 2 },
        });
        expect(hook.redactLine(once)).toBe(once);
        expect(hook.redactLine('plain')).toBe('plain');
    });

    it('actorSecret is true only for a cast with a miscast', () => {
        expect(hook.actorSecret(slotOf({ cast }))).toBe(true);
        expect(
            hook.actorSecret(slotOf({ cast: { ...cast, miscast: null } }))
        ).toBe(false);
        expect(hook.actorSecret(slotOf({ attack }))).toBe(false);
    });

    it('P9 diceFx: an attack throws the d10 pair, a cast throws nothing', () => {
        expect(hook.diceFx(slotOf({ attack }))).toEqual(percentileDice(34));
        expect(hook.diceFx(slotOf({ cast }))).toEqual([]);
    });

    it('failed marks failure and fumble casts', () => {
        expect(hook.failed(slotOf({ cast }))).toBe(true);
        expect(
            hook.failed(slotOf({ cast: { ...cast, outcome: 'success' } }))
        ).toBe(false);
        expect(hook.failed(slotOf({ attack }))).toBe(false);
    });
});

describe('P11 slot and registry lookups', () => {
    it('ACTION_SLOT ignores d20 and foreign slots', () => {
        expect(ACTION_SLOT.read(undefined)).toBeUndefined();
        expect(
            ACTION_SLOT.read({ key: 'zzz', data: { attack } })
        ).toBeUndefined();
        expect(ACTION_SLOT.read({ key: 'wfrp', data: {} })).toBeUndefined();
    });

    it('ruleSystemByKey returns undefined for an unknown key', () => {
        expect(ruleSystemByKey('zzz')).toBeUndefined();
        expect(ruleSystemByKey('toString')).toBeUndefined();
        expect(ruleSystemByKey('wfrp')?.combat.details).toBe(hook);
        expect(ruleSystemByKey('homm')?.combat.details).toBeUndefined();
    });
});
