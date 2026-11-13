// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { sheetFixture } from './sheet-fixture';

import type { Ruleset } from '@/lib/utils/rules/schema';
import { parseRules } from '@/lib/utils/rules/schema';

const current = vi.hoisted(() => ({
    rules: undefined as Ruleset | undefined,
}));

vi.mock('@/components/character-profile/ProfileContext', () => ({
    useProfile: () => ({
        campaignId: 'c1',
        characterId: 'h1',
        sheet: { ...sheetFixture, system: 'homm' },
        canEdit: true,
    }),
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/components/character-profile/RacePassive', () => ({
    RacePassive: () => null,
}));
vi.mock('@/components/character-profile/FeatsBlock', () => ({
    FeatsBlock: () => null,
}));
vi.mock('@/components/character-profile/rest/ChargesList', () => ({
    ChargesList: () => null,
}));
vi.mock('@/components/skill-tree/progression', () => ({
    ProgressionPanel: () => <div data-testid="panel" />,
}));
vi.mock('@/lib/hooks/campaigns', async (orig) => ({
    ...(await orig<object>()),
    useCampaignRules: () => ({ data: current.rules }),
}));

let SkillsTab: typeof import('@/components/character-profile/SkillsTab').SkillsTab;

beforeAll(async () => {
    await import('@/components/systems');
    ({ SkillsTab } = await import('@/components/character-profile/SkillsTab'));
}, 30_000);

describe('SkillsTab path panels wait for the campaign rules (M8)', () => {
    afterEach(cleanup);

    it('shows no panel until the rules are loaded', () => {
        current.rules = undefined;
        render(<SkillsTab />);

        expect(screen.queryByTestId('panel')).toBeNull();
    });

    it('shows the panel once the rules carry the skilltrees module', () => {
        current.rules = parseRules({ system: { key: 'homm' } });
        render(<SkillsTab />);

        expect(screen.getByTestId('panel')).toBeTruthy();
    });

    it('shows no panel for a bare dnd5e campaign', () => {
        current.rules = parseRules({ system: { key: 'dnd5e' } });
        render(<SkillsTab />);

        expect(screen.queryByTestId('panel')).toBeNull();
    });
});
