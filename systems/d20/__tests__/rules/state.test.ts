import { describe, expect, it } from 'vitest';

import { CombatStatus } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { isDying } from '@/lib/utils/abilities/engine/core/participants';
import {
    D20_STATE,
    d20State,
    d20StateData,
    withD20State,
} from '@/systems/d20/rules/state';
import type { BattleParticipant } from '@/types/battle';

const of = (
    battleData: Partial<BattleParticipant['battleData']>
): BattleParticipant => {
    const p = makeParticipant({ id: 'p' });

    return { ...p, battleData: { ...p.battleData, ...battleData } };
};

const SAVES = { successes: 1, failures: 2, stable: false };

describe('d20State read', () => {
    it('reads the slot', () => {
        const p = of({
            system: {
                key: 'd20',
                data: { deathSaves: SAVES, attackedWithLight: true },
            },
        });

        expect(d20State(p)).toEqual({
            deathSaves: SAVES,
            attackedWithLight: true,
        });
    });

    it('reads the old flat fields', () => {
        const p = of({
            deathSaves: SAVES,
            inspiration: true,
            inspirationSpent: true,
            attackedWithLight: true,
        });

        expect(d20State(p)).toEqual({
            deathSaves: SAVES,
            inspiration: true,
            inspirationSpent: true,
            attackedWithLight: true,
        });
    });

    it('an old inspiration of false is not a state', () => {
        expect(d20State(of({ inspiration: false }))).toEqual({});
    });

    it('the slot wins over the old fields, even when it is empty', () => {
        expect(
            d20State(of({ inspiration: true, system: { key: 'd20', data: {} } }))
        ).toEqual({});
    });

    it('has nothing without either', () => {
        expect(d20State(of({}))).toEqual({});
    });

    it("another system's slot is ignored and the old fields are read", () => {
        expect(
            d20State(
                of({
                    attackedWithLight: true,
                    system: { key: 'other', data: {} },
                })
            )
        ).toEqual({ attackedWithLight: true });
    });

    it('drops an invalid field and keeps the rest', () => {
        const p = of({
            system: {
                key: 'd20',
                data: {
                    deathSaves: { successes: 'x', failures: 1 },
                    inspiration: 'yes',
                    inspirationSpent: true,
                },
            },
        });

        expect(d20State(p)).toEqual({ inspirationSpent: true });
    });
});

describe('d20StateData', () => {
    it('writes the slot and clears only the old keys that are present', () => {
        const data = d20StateData(of({ inspiration: true, deathSaves: SAVES }), {
            attackedWithLight: true,
        });

        expect(data.system).toEqual({
            key: 'd20',
            data: {
                deathSaves: SAVES,
                inspiration: true,
                attackedWithLight: true,
            },
        });
        expect(data).toHaveProperty('inspiration', undefined);
        expect(data).toHaveProperty('deathSaves', undefined);
        expect(data).not.toHaveProperty('inspirationSpent');
        expect(data).not.toHaveProperty('attackedWithLight');
    });

    it('keeps the ext of other modules from the previous slot', () => {
        const prev = {
            key: 'd20',
            data: { inspiration: true, ext: { retaliation: { used: 1 } } },
        };

        const data = d20StateData(of({ system: prev }), {
            inspiration: undefined,
            inspirationSpent: true,
        });

        expect(data.system).toEqual({
            key: 'd20',
            data: {
                inspirationSpent: true,
                ext: { retaliation: { used: 1 } },
            },
        });
    });

    it('a patch key set to undefined drops the field', () => {
        const p = of({
            system: {
                key: 'd20',
                data: { attackedWithLight: true, inspiration: true },
            },
        });

        expect(
            D20_STATE.read(
                d20StateData(p, { attackedWithLight: undefined }).system
            )
        ).toEqual({ inspiration: true });
    });

    it('never writes an empty state into a missing slot', () => {
        expect(d20StateData(of({}), {})).toEqual({});
        expect(d20StateData(of({}), { attackedWithLight: undefined })).toEqual(
            {}
        );
    });

    it('only clears the old key when the result is empty', () => {
        const data = d20StateData(of({ attackedWithLight: true }), {
            attackedWithLight: undefined,
        });

        expect(data).not.toHaveProperty('system');
        expect(data).toHaveProperty('attackedWithLight', undefined);
    });

    it('an already written slot stays even when it empties', () => {
        const p = of({
            system: { key: 'd20', data: { attackedWithLight: true } },
        });

        expect(
            d20StateData(p, { attackedWithLight: undefined }).system
        ).toEqual({ key: 'd20', data: {} });
    });
});

describe('withD20State', () => {
    it('returns the participant with the written state', () => {
        const next = withD20State(of({ inspirationSpent: true }), {
            attackedWithLight: true,
        });

        expect(d20State(next)).toEqual({
            inspirationSpent: true,
            attackedWithLight: true,
        });
        expect(next.battleData.inspirationSpent).toBeUndefined();
    });
});

describe('legacy dying hero', () => {
    it('keeps isDying when another d20 write migrates the old deathSaves', () => {
        const base = of({ deathSaves: SAVES });

        const legacy = {
            ...base,
            combatStats: {
                ...base.combatStats,
                status: CombatStatus.UNCONSCIOUS,
            },
        };

        expect(isDying(legacy)).toBe(true);

        const next = withD20State(legacy, { attackedWithLight: undefined });

        expect(next.battleData.deathSaves).toBeUndefined();
        expect(isDying(next)).toBe(true);
    });
});
