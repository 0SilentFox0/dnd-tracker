import { describe, expect, it } from 'vitest';

import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { d20Defense } from '@/systems/d20/ui/battle/defense';

const target = createMockParticipant();

const ctx = { order: [target], log: [], exact: true };

describe('d20Defense', () => {
    it('shows the exact armor class when the viewer may see it', () => {
        expect(d20Defense(target, ctx)).toBe('14');
    });

    it('shows ? when nothing is known about the target', () => {
        expect(d20Defense(target, { ...ctx, exact: false })).toBe('?');
    });

    it('shows the range from the stored knowledge', () => {
        const knowledge = {
            [target.basicInfo.id]: {
                ac: { min: 12, max: 15, evidence: [] },
                traits: [],
            },
        };

        expect(d20Defense(target, { ...ctx, exact: false, knowledge })).toBe(
            '12–15'
        );
    });
});
