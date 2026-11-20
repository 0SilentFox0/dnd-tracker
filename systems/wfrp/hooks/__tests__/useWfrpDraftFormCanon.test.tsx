// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWfrpDraftForm } from '../useWfrpDraftForm';

import { mulberry32 } from '@/lib/utils/common/rng';
import { createWfrpDraft } from '@/systems/wfrp/api/characters';
import { DEFAULT_ADVANCEMENT_RULES } from '@/systems/wfrp/rules/advancement/rules';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@/systems/wfrp/api/characters', () => ({
    createWfrpDraft: vi.fn().mockResolvedValue({}),
    updateWfrpDraftIdentity: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/hooks/campaigns', () => ({
    useCampaignRules: () => ({
        data: {
            system: { key: 'wfrp' },
            edition: { preset: 'canon5e' },
            advancement: DEFAULT_ADVANCEMENT_RULES,
        },
    }),
}));

const tier = {
    name: 'T',
    characteristics: ['ws', 'int', 'wp'],
    skills: ['x', 'y', 'z'],
    talents: ['f0', 'f1'],
    trappings: ['Rope'],
};

vi.mock('@/systems/wfrp/hooks/careers', () => ({
    useCareers: () => ({
        data: [{ id: 'ca', name: 'A', tiers: [tier, tier, tier, tier] }],
    }),
}));

vi.mock('@/lib/hooks/feats', () => ({
    useFeats: () => ({
        data: [
            { id: 'f0', name: 'F0' },
            { id: 'f1', name: 'F1' },
        ],
    }),
}));

const profile = {
    mods: {},
    move: 4,
    fate: 2,
    extraWounds: 0,
    talents: [],
    randomTalentCount: 0,
    randomTalents: [],
    careerTable: [{ max: 100, careerId: 'ca' }],
    skillPicks: { count: 2, options: ['a', 'b', 'c'] },
};

vi.mock('@/lib/hooks/races', () => ({
    useRaces: () => ({ data: [{ id: 'r1', name: 'Human' }], isPending: false }),
}));

vi.mock('@/systems/wfrp/hooks/useRaceProfiles', () => ({
    useRaceProfiles: () => ({
        data: [{ raceId: 'r1', profile }],
        isPending: false,
    }),
}));

const setup = () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={new QueryClient()}>
            {children}
        </QueryClientProvider>
    );

    return renderHook(
        () => useWfrpDraftForm({ campaignId: 'c1', rng: mulberry32(3) }),
        { wrapper }
    );
};

describe('useWfrpDraftForm canon5e', () => {
    beforeEach(() => {
        vi.stubGlobal('matchMedia', () => ({ matches: true }));
        vi.mocked(createWfrpDraft).mockClear();
    });

    it('blocks the species step until all species skills are picked', () => {
        const { result } = setup();

        act(() => result.current.species.select('r1'));
        expect(result.current.step.canNext).toBe(false);

        act(() => result.current.canon?.speciesSkills.toggle('a', 2));
        act(() => result.current.canon?.speciesSkills.toggle('b', 2));
        expect(result.current.step.canNext).toBe(true);
    });

    it('exposes career skills, talents, trappings and the distribution cap for the chosen career', () => {
        const { result } = setup();

        act(() => result.current.species.select('r1'));
        act(() => result.current.career.roll());

        const canon = result.current.canon;

        expect(canon?.careerSkills.options).toEqual(['x', 'y', 'z']);
        expect(canon?.careerTalent.options).toEqual(['f0', 'f1']);
        expect(canon?.trappings).toEqual(['Rope']);
        expect(canon?.distribution.keys).toEqual(['ws', 'int', 'wp']);
        expect(canon?.distribution.cap).toBe(6);
    });

    it('career-bound picks reset when the career changes', () => {
        const { result } = setup();

        act(() => result.current.species.select('r1'));
        act(() => result.current.career.roll());
        act(() => result.current.canon?.careerSkills.set('x', 2));
        expect(result.current.canon?.careerSkills.counts.x).toBe(2);

        act(() => result.current.career.setMode('free'));
        act(() => result.current.career.pick('other'));
        expect(result.current.canon?.careerSkills.counts.x).toBeUndefined();
    });
});
