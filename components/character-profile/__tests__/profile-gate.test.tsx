// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
    systems: [] as unknown[],
    rules: { data: undefined as unknown, isPending: true },
    sheet: {
        data: { system: 'wfrp' } as unknown,
        isPending: false,
        isError: false,
        error: null,
        refetch: () => {},
    },
}));

vi.mock('@/components/systems/SystemGate', () => ({
    SystemGate: ({ system }: { system: unknown }) => {
        h.systems.push(system);

        return null;
    },
}));
vi.mock('@/lib/hooks/campaigns', async (orig) => ({
    ...(await orig<object>()),
    useCampaignRules: () => h.rules,
}));
vi.mock('@/lib/hooks/characters', async (orig) => ({
    ...(await orig<object>()),
    useCharacterSheet: () => h.sheet,
}));

import { CharacterProfile } from '../CharacterProfile';

const props = { campaignId: 'c', characterId: 'x', canEdit: false };

describe('CharacterProfile gate', () => {
    afterEach(() => {
        cleanup();
        h.systems.length = 0;
    });

    it('does not open the gate on the bare sheet key while rules are loading', () => {
        h.rules = { data: undefined, isPending: true };
        render(<CharacterProfile {...props} />);
        expect(h.systems).toEqual([]);
    });

    it('opens it once, with the composition from rules', () => {
        h.rules = {
            data: { system: { key: 'wfrp', modules: ['morale'] } },
            isPending: false,
        };
        render(<CharacterProfile {...props} />);
        expect(h.systems).toEqual([{ key: 'wfrp', modules: ['morale'] }]);
    });

    it('falls back to the sheet key when rules failed to load', () => {
        h.rules = { data: undefined, isPending: false };
        render(<CharacterProfile {...props} />);
        expect(h.systems).toEqual([{ key: 'wfrp' }]);
    });
});
