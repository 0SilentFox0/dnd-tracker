import { describe, expect, it } from 'vitest';

import {
    reassignControlledBy,
    retargetPendingChoice,
} from '../reassign-controller';

import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';

const base = createMockParticipant();

const unit = (id: string, controlledBy: string) =>
    createMockParticipant({
        basicInfo: { ...base.basicInfo, id, controlledBy },
    });

describe('reassignControlledBy', () => {
    it('hands the user participants and the reserve to the DM, keeps others', () => {
        const other = unit('b', 'u2');

        const out = reassignControlledBy(
            [unit('a', 'u1'), other],
            [unit('r', 'u1')],
            'u1'
        );

        expect(out.participants.map((p) => p.basicInfo.controlledBy)).toEqual([
            'dm',
            'u2',
        ]);
        expect(out.participants[1]).toBe(other);
        expect(out.pending[0].basicInfo.controlledBy).toBe('dm');
        expect(out.reassigned.map((p) => p.basicInfo.id)).toEqual(['a', 'r']);
    });

    it('reports nothing when the user controls no one', () => {
        const out = reassignControlledBy([unit('a', 'u2')], [], 'u1');

        expect(out.reassigned).toEqual([]);
    });
});

describe('retargetPendingChoice', () => {
    const counter = {
        shown: {
            kind: 'counter',
            windowId: 'w',
            actorId: 'x',
            deadline: 'd',
            offers: [
                { reactorId: 'a', slotLevels: [1], dm: false },
                { reactorId: 'b', slotLevels: [1], dm: false },
            ],
        },
        hidden: { userId: 'u1', isDM: false, seed: 1, attempts: 0 },
    };

    it('turns offers of handed-over reactors into DM offers and resumes the held cast as the DM', () => {
        const out = retargetPendingChoice(
            counter,
            'u1',
            'dm-user',
            new Set(['a'])
        );

        expect(
            (out?.shown as typeof counter.shown).offers.map((o) => o.dm)
        ).toEqual([true, false]);
        expect(out?.hidden).toMatchObject({ userId: 'dm-user', isDM: true });
    });

    it('leaves unrelated pending untouched', () => {
        expect(retargetPendingChoice(counter, 'u9', 'dm-user', new Set())).toBe(
            counter
        );
        expect(
            retargetPendingChoice(null, 'u1', 'dm-user', new Set())
        ).toBeNull();
    });
});
