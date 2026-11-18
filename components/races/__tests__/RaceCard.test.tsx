// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RaceCard } from '../RaceCard';

import type { Race } from '@/types/races';

vi.mock('@/lib/hooks/skills', () => ({
    useSkills: () => ({ data: [{ id: 's1' }, { id: 's2' }] }),
    useMainSkills: () => ({ data: [] }),
}));

const race = {
    id: 'r',
    name: 'Elf',
    icon: null,
    availableSkills: [],
    disabledSkills: [],
} as unknown as Race;

describe('RaceCard skill summary slot', () => {
    afterEach(cleanup);

    it('shows 0 skills when no module supplies a summary', () => {
        render(<RaceCard race={race} campaignId="c" />);

        expect(screen.getByText(/0/)).toBeTruthy();
    });

    it('uses the count of the supplied summary hook', () => {
        render(
            <RaceCard
                race={race}
                campaignId="c"
                useSkillSummary={() => ({ treeSkillCount: 7 })}
            />
        );

        expect(screen.getByText(/7/)).toBeTruthy();
    });
});
