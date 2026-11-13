import { describe, expect, it } from 'vitest';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
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

    it('an empty slot is an empty state', () => {
        expect(d20State(of({ system: { key: 'd20', data: {} } }))).toEqual({});
    });

    it('has nothing without a slot', () => {
        expect(d20State(of({}))).toEqual({});
    });

    it("another system's slot is ignored", () => {
        expect(d20State(of({ system: { key: 'other', data: {} } }))).toEqual(
            {}
        );
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
    it('writes the slot with the patch merged in', () => {
        const prev = {
            key: 'd20',
            data: { deathSaves: SAVES, inspiration: true },
        };

        const data = d20StateData(of({ system: prev }), {
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
        const next = withD20State(
            of({ system: { key: 'd20', data: { inspirationSpent: true } } }),
            { attackedWithLight: true }
        );

        expect(d20State(next)).toEqual({
            inspirationSpent: true,
            attackedWithLight: true,
        });
    });
});
