import { describe, expect, it } from 'vitest';

import { createCritGate } from '../gate';
import { runWithCritChoice } from '../run-with-crit-choice';
import type { RiderPicker } from '../types';

import { context } from '@/lib/server/battles/__tests__/mutations/fixtures';
import {
    makeEffect,
    makeParticipant,
    seq,
} from '@/lib/utils/abilities/__tests__/fixtures';
import { D20_RIDER } from '@/lib/utils/battle/d20-rider/held';
import type { BattleParticipant } from '@/types/battle';

const holder = (die = 6): BattleParticipant => {
    const p = makeParticipant({ id: 'h' });

    return {
        ...p,
        battleData: {
            ...p.battleData,
            activeEffects: [
                makeEffect('insp', { effects: [{ type: D20_RIDER, value: die }] }),
            ],
        },
    };
};

const info = (over: Partial<Parameters<RiderPicker>[0]> = {}) => ({
    holder: holder(),
    kind: 'attack' as const,
    total: 12,
    needed: 15,
    ...over,
});

describe('rider gate', () => {
    it('offers a die that could flip the test and keeps it unspent without a choice', () => {
        const gate = createCritGate({ rng: seq(0.5) });

        expect(gate.pick.rider?.(info())).toBeUndefined();
        expect(gate.offers).toEqual([
            { key: 'rider:h:attack:0', holderId: 'h', kind: 'attack', die: 6, total: 12 },
        ]);
        expect(gate.spent).toEqual([]);
    });

    it('makes no offer when the test passed or the die cannot reach it', () => {
        const gate = createCritGate({ rng: seq(0.5, 0.5) });

        expect(gate.pick.rider?.(info({ total: 15 }))).toBeUndefined();
        expect(gate.pick.rider?.(info({ needed: 19 }))).toBeUndefined();
        expect(gate.offers).toEqual([]);
    });

    it('makes no offer without a held die', () => {
        const gate = createCritGate({ rng: seq(0.5) });

        expect(
            gate.pick.rider?.(info({ holder: makeParticipant({ id: 'h' }) }))
        ).toBeUndefined();
        expect(gate.offers).toEqual([]);
    });

    it('spends the die on a chosen offer and rolls it from the seeded rng', () => {
        const gate = createCritGate({
            rng: seq(0.5),
            riderChoices: { 'rider:h:attack:0': true },
        });

        expect(gate.pick.rider?.(info())).toEqual({ bonus: 4, die: 6 });
        expect(gate.spent).toEqual([{ holderId: 'h', effectId: 'insp' }]);
    });

    it('a declined offer consumes the same rng value', () => {
        const rng = seq(0.5, 0.9);

        const gate = createCritGate({ rng });

        gate.pick.rider?.(info());
        expect(rng()).toBe(0.9);
    });
});

describe('runWithCritChoice with rider offers', () => {
    const ctx = context();

    const run =
        (p: BattleParticipant) =>
        ({ crit }: { crit: { rider?: RiderPicker } }) => {
            crit.rider?.({
                holder: p,
                kind: 'save',
                total: 8,
                needed: 12,
            });

            return {
                participants: [p],
                pending: ctx.pending,
                events: [{ type: 'attack' as const, round: 1, resultText: 'ok' }],
            };
        };

    const base = {
        action: 'attack' as const,
        actorId: 'x',
        request: { a: 1 },
        enabled: false,
    };

    it('pauses even with the crit-choice setting off and keeps crit triggers empty', async () => {
        const out = await runWithCritChoice(ctx, { ...base, run: run(holder()) });

        expect(out.response).toEqual({ pendingChoice: true });
        expect(out.events).toEqual([]);
        expect(out.scene?.pendingChoice?.shown).toMatchObject({
            triggers: [],
            riders: [{ key: 'rider:h:save:0', holderId: 'h', die: 6 }],
        });
    });

    it('resume with a spend consumes the die and clears the pause', async () => {
        const out = await runWithCritChoice(ctx, {
            ...base,
            resume: { seed: 7, choices: {}, riderChoices: { 'rider:h:save:0': true } },
            run: run(holder()),
        });

        expect(out.scene?.pendingChoice).toBeNull();
        expect(out.participants[0].battleData.activeEffects).toEqual([]);
    });

    it('resume that keeps the die leaves it held', async () => {
        const out = await runWithCritChoice(ctx, {
            ...base,
            resume: { seed: 7, choices: {}, riderChoices: { 'rider:h:save:0': false } },
            run: run(holder()),
        });

        expect(out.participants[0].battleData.activeEffects).toHaveLength(1);
    });
});
