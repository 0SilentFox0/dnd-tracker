import { describe, expect, it } from 'vitest';

import {
    createMockParticipant,
    grantPassive,
} from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import {
    applyResistance,
    getCombinedResistancePercent,
} from '@/lib/utils/battle/resistance';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';

const flag = (percent: number) => ({
    kind: 'flag' as const,
    flag: 'resistance' as const,
    damageType: 'fire',
    percent,
});

const stacked = (...percents: number[]) =>
    grantPassive(createMockParticipant(), percents.map(flag));

describe('resistance combination', () => {
    it('sums percentages without a system hook', () => {
        const t = stacked(50, 50);

        expect(getCombinedResistancePercent(t, 'fire')).toBe(100);
        expect(applyResistance(t, 10, 'fire').finalDamage).toBe(0);
    });

    it('collapses duplicates for a d20 ruleset', () => {
        const t = stacked(50, 40);

        expect(
            applyResistance(t, 10, 'fire', { rules: DEFAULT_RULES }).finalDamage
        ).toBe(5);
    });

    it('treats resistance plus vulnerability as normal damage for d20', () => {
        const t = stacked(50, -100);

        expect(
            applyResistance(t, 10, 'fire', { rules: DEFAULT_RULES }).finalDamage
        ).toBe(10);
    });
});
