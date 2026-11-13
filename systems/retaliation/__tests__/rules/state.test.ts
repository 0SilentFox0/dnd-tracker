import { beforeAll, describe, expect, it } from 'vitest';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { resetTurnState } from '@/lib/utils/battle/turn/turn-state';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { parseRules } from '@/lib/utils/rules/schema';
import { D20_STATE, d20State, withD20State } from '@/systems/d20/rules/state';
import {
    RETALIATION_STATE,
    retaliationResetState,
    retaliationStateData,
    retaliationsUsedOf,
    retaliationUsed,
} from '@/systems/retaliation/rules/state';
import type { BattleParticipant } from '@/types/battle';

const of = (
    battleData: Partial<BattleParticipant['battleData']> = {},
    hasUsedReaction = false
): BattleParticipant => {
    const p = makeParticipant({ id: 'p' });

    return {
        ...p,
        actionFlags: { ...p.actionFlags, hasUsedReaction },
        battleData: { ...p.battleData, ...battleData },
    };
};

const slotOf = (used: number, rest: Record<string, unknown> = {}) => ({
    key: 'd20',
    data: { ...rest, ext: { retaliation: { used } } },
});

beforeAll(async () => {
    await import('@/lib/utils/rules/systems/registry');
}, 30_000);

describe('retaliation count read', () => {
    it('reads the ext of the d20 slot', () => {
        expect(retaliationsUsedOf(of({ system: slotOf(2) }))).toBe(2);
    });

    it('reads the old flat field', () => {
        expect(retaliationsUsedOf(of({ retaliationsUsed: 1 }))).toBe(1);
    });

    it('the ext wins over the old field', () => {
        expect(
            retaliationsUsedOf(of({ retaliationsUsed: 5, system: slotOf(1) }))
        ).toBe(1);
    });

    it('a d20 slot without the ext falls back to the old field', () => {
        expect(
            retaliationsUsedOf(
                of({ retaliationsUsed: 1, system: { key: 'd20', data: {} } })
            )
        ).toBe(1);
    });

    it('is undefined with neither, and the reaction flag then stands for one', () => {
        expect(retaliationsUsedOf(of())).toBeUndefined();
        expect(retaliationUsed(of())).toBe(0);
        expect(retaliationUsed(of({}, true))).toBe(1);
    });

    it('a malformed ext is ignored', () => {
        expect(
            retaliationsUsedOf(
                of({
                    system: {
                        key: 'd20',
                        data: { ext: { retaliation: { used: 'x' } } },
                    },
                })
            )
        ).toBeUndefined();
    });
});

describe('retaliationStateData', () => {
    it('writes the ext next to the d20 data and keeps what is there', () => {
        const p = withD20State(of(), { attackedWithLight: true });

        const data = retaliationStateData(p, 1);

        expect(data.system).toEqual(slotOf(1, { attackedWithLight: true }));
    });

    it('a later d20 write keeps the ext', () => {
        const p = of({ system: slotOf(2) });

        const next = withD20State(p, { inspiration: true });

        expect(next.battleData.system).toEqual(
            slotOf(2, { inspiration: true })
        );
        expect(d20State(next)).toEqual({ inspiration: true });
    });

    it('the ext write does not drop the d20 state that was still in the old fields', () => {
        const data = retaliationStateData(
            of({ deathSaves: { successes: 1, failures: 0, stable: false } }),
            1
        );

        expect(D20_STATE.read(data.system)).toEqual({
            deathSaves: { successes: 1, failures: 0, stable: false },
        });
        expect(data).toHaveProperty('deathSaves', undefined);
    });

    it('clears the old flat counter', () => {
        const data = retaliationStateData(of({ retaliationsUsed: 1 }), 2);

        expect(data).toHaveProperty('retaliationsUsed', undefined);
        expect(RETALIATION_STATE.read(data.system)).toEqual({ used: 2 });
    });

    it('does not touch the flat counter when there was none', () => {
        expect(retaliationStateData(of(), 1)).not.toHaveProperty(
            'retaliationsUsed'
        );
    });
});

describe('retaliationResetState', () => {
    it('zeroes a spent count for the turn and for a regained reaction', () => {
        for (const scope of ['turn', 'reaction'] as const) {
            const next = retaliationResetState(of({ system: slotOf(2) }), scope);

            expect(retaliationsUsedOf(next)).toBe(0);
        }
    });

    it('zeroes an old flat count and clears it', () => {
        const next = retaliationResetState(of({ retaliationsUsed: 2 }), 'turn');

        expect(retaliationsUsedOf(next)).toBe(0);
        expect(next.battleData.retaliationsUsed).toBeUndefined();
    });

    it('is a no-op at zero or without a count', () => {
        const zero = of({ system: slotOf(0) });

        const none = of();

        expect(retaliationResetState(zero, 'turn')).toBe(zero);
        expect(retaliationResetState(none, 'turn')).toBe(none);
    });
});

describe('the module off', () => {
    const dnd5e = parseRules({ system: { key: 'dnd5e' } });

    it('an ext lies in the slot and a new turn neither reads nor drops it', () => {
        const p = of({ system: slotOf(2) });

        const next = resetTurnState(p, { rules: dnd5e });

        expect(next.system).toEqual(slotOf(2));
    });

    it('with the module on a new turn zeroes it', () => {
        const p = of({ system: slotOf(2) });

        const next = resetTurnState(p, { rules: DEFAULT_RULES });

        expect(RETALIATION_STATE.read(next.system)).toEqual({ used: 0 });
    });
});
