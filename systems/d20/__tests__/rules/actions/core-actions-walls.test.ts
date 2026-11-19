import { describe, expect, it } from 'vitest';

import { ParticipantSide } from '@/lib/constants/battle';
import { placed, testMap } from '@/lib/utils/battle/__tests__/fixtures/placed';
import { coreActionTargets } from '@/systems/d20/rules/actions/availability';

describe('coreActionTargets: стіни', () => {
    const actor = placed('a', {
        side: ParticipantSide.ALLY,
        at: { x: 1, y: 1 },
    });

    const foe = placed('f', {
        side: ParticipantSide.ENEMY,
        at: { x: 2, y: 1 },
    });

    it('help: ворог через стіну не ціль, союзник не ціль', () => {
        const near = (map: ReturnType<typeof testMap>) =>
            coreActionTargets('help', actor, [actor, foe], map).map(
                (p) => p.basicInfo.id
            );

        expect(near(testMap(5, 5))).toEqual(['f']);
        expect(near(testMap(5, 5, { walls: ['1:1:e'] }))).toEqual([]);
    });
});
