import { describe, expect, it, vi } from 'vitest';

import { compareInitiative, scoreInitiative } from '../initiative';

import { D6POOL_SYSTEM } from '@/lib/__tests__/fixtures/d6pool/definition';
import { ParticipantSide } from '@/lib/constants/battle';
import { placed } from '@/lib/utils/battle/__tests__/fixtures/placed';
import { DEFAULT_RULES } from '@/lib/utils/rules/defaults';
import type { BattleParticipant } from '@/types/battle';

vi.mock('@/lib/utils/rules/systems', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    ruleSystemOf: () => D6POOL_SYSTEM,
    ruleSystemByKey: () => D6POOL_SYSTEM,
}));

const withInit = (
    id: string,
    initiative: number,
    baseInitiative: number,
    initiativeBonus = 0
): BattleParticipant => {
    const p = placed(id, { side: ParticipantSide.ALLY });

    return {
        ...p,
        abilities: {
            ...p.abilities,
            initiative,
            baseInitiative,
            initiativeBonus,
        },
    };
};

describe('initiative through system hooks only', () => {
    it('static mode returns the stored base from the system hook', () => {
        expect(
            scoreInitiative(withInit('a', 0, 7), undefined, {
                rules: DEFAULT_RULES,
            })
        ).toMatchObject({ total: 7, roll: null, die: null });
    });

    it("roll mode uses the system's die", () => {
        const rules = {
            ...DEFAULT_RULES,
            initiative: { ...DEFAULT_RULES.initiative, mode: 'roll' as const },
        };

        expect(
            scoreInitiative(withInit('a', 0, 7), undefined, {
                rules,
                rng: () => 0.999,
            })
        ).toMatchObject({ total: 13, roll: 6, die: 6 });
    });

    it("ties are broken by the system's stat", () => {
        expect(
            compareInitiative(withInit('a', 5, 5, 4), withInit('b', 5, 5, 1))
        ).toBeLessThan(0);
    });
});
