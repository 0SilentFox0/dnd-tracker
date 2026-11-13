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

    it('an empty slot is an empty state', () => {
        expect(wfrpState(of({ system: { key: 'wfrp', data: {} } }))).toEqual(
            {}
        );
    });

    it('has nothing without a slot', () => {
        expect(wfrpState(of({}))).toEqual({});
    });

    it("another system's slot is ignored", () => {
        expect(
            wfrpState(of({ system: { key: 'other', data: { fortune: 9 } } }))
        ).toEqual({});
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
    it('writes the slot with the patch merged in', () => {
        const p = of({
            system: { key: 'wfrp', data: { fortune: 2, channelledSl: 1 } },
        });

        expect(wfrpStateData(p, { fortune: 1 }).system).toEqual({
            key: 'wfrp',
            data: { fortune: 1, channelledSl: 1 },
        });
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
        const next = withWfrpState(
            of({ system: { key: 'wfrp', data: { sin: 2 } } }),
            { fortune: 3 }
        );

        expect(wfrpState(next)).toEqual({ sin: 2, fortune: 3 });
    });
});
