import { describe, expect, it } from 'vitest';

import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { buildParticipantPatch } from '@/lib/utils/battle/store';
import { FULL_PARTICIPANT } from '@/lib/utils/battle/store/participant-patch';
import {
    joinParticipant,
    splitParticipant,
} from '@/lib/utils/battle/store/split-participant';
import type { BattleParticipant } from '@/types/battle';

const place = { orderIndex: 0, isPending: false };

const dying = (p: BattleParticipant): BattleParticipant => ({
    ...p,
    battleData: { ...p.battleData, dying: true },
});

describe('neutral dying flag storage', () => {
    it('lives in state, not in the snapshot', () => {
        const stored = splitParticipant(dying(createMockParticipant()), place);

        expect(stored.state.dying).toBe(true);
        expect(
            (stored.snapshot.battleData as Record<string, unknown>).dying
        ).toBeUndefined();
    });

    it('join restores the flag', () => {
        const joined = joinParticipant(
            splitParticipant(dying(createMockParticipant()), place),
            'b1'
        );

        expect(joined.battleData.dying).toBe(true);
    });

    it('a participant that is not dying stores no key', () => {
        const stored = splitParticipant(createMockParticipant(), place);

        expect('dying' in stored.state).toBe(false);
    });

    it('raising the flag goes out as a patch and dropping it as a full participant', () => {
        const base = createMockParticipant();

        expect(buildParticipantPatch(base, dying(base))).toEqual({
            id: base.basicInfo.id,
            battleData: { dying: true },
        });
        expect(buildParticipantPatch(dying(base), base)).toBe(FULL_PARTICIPANT);
    });
});
