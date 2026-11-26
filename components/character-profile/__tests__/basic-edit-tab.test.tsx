// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BasicEditTab } from '@/components/character-profile/tabs/BasicEditTab';
import type { DmCharacterEditor } from '@/lib/hooks/characters';

vi.mock('@/components/character-profile/ProfileContext', () => ({
    useProfile: () => ({
        campaignId: 'c1',
        sheet: { system: 'd20', hp: { total: 7, lines: [] } },
    }),
}));

vi.mock('@/components/characters/basic/CharacterBasicInfo', () => ({
    CharacterBasicInfo: ({
        classSlots,
    }: {
        classSlots?: { aside?: React.ReactNode };
    }) => <div>{classSlots?.aside}</div>,
}));

vi.mock('@/components/characters/stats/CharacterHpPreview', () => ({
    CharacterHpPreview: () => <div>hp-tile</div>,
}));

vi.mock('@/components/systems', () => ({
    systemUiOf: () => ({ hideProgression: false }),
}));

vi.mock('@/lib/hooks/campaigns', () => ({
    useCampaignRules: () => ({ data: null }),
}));

vi.mock('@/lib/hooks/classes', () => ({
    useClassMode: () => ({ enabled: false, byId: {}, classes: [] }),
}));

vi.mock('@/lib/hooks/systems', () => ({
    useCampaignSystem: () => ({
        def: { lineage: true, identity: { alignments: true } },
        system: { key: 'd20', modules: [] },
    }),
}));

vi.mock('@/lib/utils/rules/systems/stats', () => ({
    statColumnsOf: () => new Set<string>(),
}));

afterEach(cleanup);

const editor = {
    form: {
        basicInfo: { data: { classes: [], level: 1 }, set: vi.fn() },
        abilityScores: { data: {} },
    },
    options: { members: [], races: [] },
    dmActions: { remove: vi.fn() },
} as unknown as DmCharacterEditor;

describe('BasicEditTab', () => {
    it('renders the HP tile and no delete button', () => {
        render(<BasicEditTab editor={editor} />);

        expect(screen.getByText('hp-tile')).toBeTruthy();
        expect(screen.queryByText('characterProfile.basic.delete')).toBeNull();
        expect(screen.queryByRole('button')).toBeNull();
    });
});
