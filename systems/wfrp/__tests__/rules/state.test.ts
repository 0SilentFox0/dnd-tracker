import { describe, expect, it } from 'vitest';

import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { PARTICIPANT_STATE } from '@/systems/wfrp/rules/slots';
import {
    wfrpState,
    wfrpStateData,
    withWfrpState,
} from '@/systems/wfrp/rules/state';
import type { BattleParticipant } from '@/types/battle';

const of = (
    battleData: Partial<BattleParticipant['battleData']>
): BattleParticipant => {
    const p = makeParticipant({ id: 'p' });

    return { ...p, battleData: { ...p.battleData, ...battleData } };
};

describe('wfrpState read', () => {
    it('reads the slot', () => {
        const p = of({
            system: { key: 'wfrp', data: { fortune: 2, channelledSl: 1 } },
        });

        expect(wfrpState(p)).toEqual({ fortune: 2, channelledSl: 1 });
    });

    it('reads the old flat fields, psychologyTested included', () => {
        const p = of({
            fortune: 1,
            sin: 3,
            conditionTests: ['bleeding'],
            psychologyTested: { fear: 2 },
        });

        expect(wfrpState(p)).toEqual({
            fortune: 1,
            sin: 3,
            conditionTests: ['bleeding'],
            psychologyTested: { fear: 2 },
        });
    });

    it('the slot wins over the old fields, even when it is empty', () => {
        expect(
            wfrpState(of({ fortune: 5, system: { key: 'wfrp', data: {} } }))
        ).toEqual({});
        expect(
            wfrpState(
                of({
                    fortune: 5,
                    system: { key: 'wfrp', data: { fortune: 1 } },
                })
            )
        ).toEqual({ fortune: 1 });
    });

    it('has nothing without either', () => {
        expect(wfrpState(of({}))).toEqual({});
    });

    it("another system's slot is ignored and the old fields are read", () => {
        expect(
            wfrpState(
                of({
                    fortune: 4,
                    system: { key: 'other', data: { fortune: 9 } },
                })
            )
        ).toEqual({ fortune: 4 });
    });

    it('drops an invalid field and keeps the rest', () => {
        const p = of({
            system: {
                key: 'wfrp',
                data: {
                    fortune: 'many',
                    sin: 2,
                    conditionTests: ['a', 7],
                    psychologyTested: { fear: 1, terror: 'x' },
                },
            },
        });

        expect(wfrpState(p)).toEqual({
            sin: 2,
            conditionTests: ['a'],
            psychologyTested: { fear: 1 },
        });
    });
});

describe('wfrpStateData', () => {
    it('writes the slot and clears only the old keys that are present', () => {
        const p = of({ fortune: 2, channelledSl: 1 });

        const data = wfrpStateData(p, { fortune: 1 });

        expect(data.system).toEqual({
            key: 'wfrp',
            data: { fortune: 1, channelledSl: 1 },
        });
        expect(data).toHaveProperty('fortune', undefined);
        expect(data).toHaveProperty('channelledSl', undefined);
        expect(data).not.toHaveProperty('sin');
        expect(data).not.toHaveProperty('conditionTests');
        expect(data).not.toHaveProperty('psychologyTested');
    });

    it('keeps the ext of other modules from the previous slot', () => {
        const prev = {
            key: 'wfrp',
            data: { fortune: 1, ext: { retaliation: { used: 1 } } },
        };

        const data = wfrpStateData(of({ system: prev }), { fortune: 0 });

        expect(data.system).toEqual({
            key: 'wfrp',
            data: { fortune: 0, ext: { retaliation: { used: 1 } } },
        });
    });

    it('a patch key set to undefined drops the field', () => {
        const p = of({
            system: {
                key: 'wfrp',
                data: { fortune: 1, conditionTests: ['x'] },
            },
        });

        expect(
            PARTICIPANT_STATE.read(
                wfrpStateData(p, { conditionTests: undefined }).system
            )
        ).toEqual({ fortune: 1 });
    });

    it('never writes an empty state into a missing slot', () => {
        expect(wfrpStateData(of({}), {})).toEqual({});
        expect(wfrpStateData(of({}), { channelledSl: undefined })).toEqual({});
    });

    it('only clears the old key when the result is empty', () => {
        const data = wfrpStateData(of({ channelledSl: 3 }), {
            channelledSl: undefined,
        });

        expect(data).not.toHaveProperty('system');
        expect(data).toHaveProperty('channelledSl', undefined);
    });

    it('an already written slot stays even when it empties', () => {
        const p = of({ system: { key: 'wfrp', data: { fortune: 1 } } });

        expect(wfrpStateData(p, { fortune: undefined }).system).toEqual({
            key: 'wfrp',
            data: {},
        });
    });
});

describe('withWfrpState', () => {
    it('returns the participant with the written state', () => {
        const next = withWfrpState(of({ sin: 2 }), { fortune: 3 });

        expect(wfrpState(next)).toEqual({ sin: 2, fortune: 3 });
        expect(next.battleData.sin).toBeUndefined();
    });
});
