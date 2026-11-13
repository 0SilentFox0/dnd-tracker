import { describe, expect, it } from 'vitest';

import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { buildParticipantPatch } from '@/lib/utils/battle/store';
import { diffParticipants } from '@/lib/utils/battle/store/diff-participants';
import {
    joinParticipant,
    splitParticipant,
} from '@/lib/utils/battle/store/split-participant';
import type { BattleParticipant } from '@/types/battle';

const place = { orderIndex: 0, isPending: false };

const withSystem = (
    p: BattleParticipant,
    data: Record<string, unknown>
): BattleParticipant => ({
    ...p,
    battleData: { ...p.battleData, system: { key: 'test', data } },
});

describe('participant system slot storage', () => {
    it('lives in state, not in the snapshot', () => {
        const stored = splitParticipant(
            withSystem(createMockParticipant(), { counter: 1 }),
            place
        );

        expect(stored.state.system).toEqual({
            key: 'test',
            data: { counter: 1 },
        });
        expect(
            (stored.snapshot.battleData as Record<string, unknown>).system
        ).toBeUndefined();
    });

    it('join restores the slot', () => {
        const p = withSystem(createMockParticipant(), { counter: 1 });

        const joined = joinParticipant(splitParticipant(p, place), 'b1');

        expect(joined.battleData.system).toEqual(p.battleData.system);
    });

    it('a participant without a slot stores no system key', () => {
        const stored = splitParticipant(createMockParticipant(), place);

        expect('system' in stored.state).toBe(false);
    });

    it('a slot change alone keeps the snapshot hash and reports only a state change', () => {
        const base = createMockParticipant();

        const before = splitParticipant(
            withSystem(base, { counter: 1 }),
            place
        );

        const after = splitParticipant(withSystem(base, { counter: 2 }), place);

        expect(after.snapshotHash).toBe(before.snapshotHash);

        const { updated } = diffParticipants([before], [after]);

        expect(updated).toHaveLength(1);
        expect(updated[0]).toMatchObject({
            stateChanged: true,
            snapshotChanged: false,
        });
    });

    it('the patch carries only battleData.system', () => {
        const base = withSystem(createMockParticipant(), { counter: 1 });

        const next = withSystem(createMockParticipant(), { counter: 2 });

        expect(buildParticipantPatch(base, next)).toEqual({
            id: base.basicInfo.id,
            battleData: { system: { key: 'test', data: { counter: 2 } } },
        });
    });

    it('a legacy psychologyTested in state is still joined', () => {
        const stored = splitParticipant(createMockParticipant(), place);

        const joined = joinParticipant(
            {
                ...stored,
                state: { ...stored.state, psychologyTested: { fear: 2 } },
            },
            'b1'
        );

        expect(joined.battleData.psychologyTested).toEqual({ fear: 2 });
    });
});
