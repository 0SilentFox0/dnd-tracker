// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sheetFixture } from './sheet-fixture';

const h = vi.hoisted(() => ({
    replace: vi.fn(),
    wide: false,
    sheetQuery: {
        data: null as unknown,
        isPending: false,
        isError: false,
        error: null,
        refetch: () => {},
    },
}));

vi.mock('@/lib/hooks/notifications', () => ({
    useSeenOnOpen: () => new Set<string>(),
    useNotifications: () => ({ data: undefined }),
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: h.replace, push: vi.fn() }),
}));
vi.mock('@/components/hud/fonts', () => ({
    hudFontClassName: '',
    HUD_SURFACE: 'hud-surface',
}));
vi.mock('@/systems/wfrp/ui/equipment/EquippedArmourSummary', () => ({
    EquippedArmourSummary: () => <div data-testid="wfrp-equipped-summary" />,
}));
vi.mock('@/systems/skilltrees/ui/progression', () => ({
    ProgressionPanel: () => <div>прокачка</div>,
    LevelUpOverlay: () => null,
}));
vi.mock('@/lib/hooks/campaigns', async (orig) => ({
    ...(await orig<object>()),
    useCampaignRules: () => ({ data: undefined }),
}));
vi.mock('@/systems/skilltrees/hooks', async (orig) => ({
    ...(await orig<object>()),
    useCharacterProgression: () => ({ view: null }),
    useLevelUpCelebration: () => ({ celebration: null, dismiss: () => {} }),
}));
vi.mock('@/lib/hooks/characters/useStash', async (orig) => ({
    ...(await orig<object>()),
    useStash: () => ({
        data: { purse: { gp: 0, sp: 0, cp: 0 }, items: [], artifacts: [] },
        isPending: false,
        isError: false,
    }),
    useStashAction: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useInventoryLog: () => ({ data: { pages: [] }, isPending: false }),
    useFreeArtifacts: () => ({ data: [] }),
}));
vi.mock('@/lib/hooks/characters', async (orig) => ({
    ...(await orig<object>()),
    useCharacterRoster: () => ({ data: [], isLoading: false }),
    useTransferArtifact: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useStashAction: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useCharacterSheet: () => h.sheetQuery,
}));

vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<object>()),
    useMediaQuery: () => h.wide,
}));
vi.mock('@/components/character-profile/sheet/SheetStatsPanel', () => ({
    SheetStatsPanel: () => <div data-testid="stats-panel" />,
}));

import { CharacterProfile } from '@/components/character-profile';
import { renderWithConfirm } from '@/components/ui/__tests__/render-with-confirm';

const ui = () =>
    renderWithConfirm(
        <CharacterProfile campaignId="c" characterId="ch" canEdit={false} />
    );

describe('SheetLayout: панель характеристик', () => {
    beforeEach(() => {
        h.sheetQuery.data = sheetFixture;
    });

    afterEach(cleanup);

    it('lg: панель одна, над вкладками, вкладки «stats» немає', () => {
        h.wide = true;
        ui();
        expect(screen.getAllByTestId('stats-panel')).toHaveLength(1);
        expect(
            screen.queryByRole('tab', { name: 'characterProfile.tabs.skills' })
        ).toBeNull();
    });

    it('phone: перша вкладка «stats» відкривається за кліком, панель одна', () => {
        h.wide = false;
        ui();
        expect(screen.queryByTestId('stats-panel')).toBeNull();
        fireEvent.mouseDown(
            screen.getByRole('tab', { name: 'characterProfile.tabs.skills' })
        );
        fireEvent.click(
            screen.getByRole('tab', { name: 'characterProfile.tabs.skills' })
        );
        expect(screen.getAllByTestId('stats-panel')).toHaveLength(1);
    });

    it('?tab=stash відкриває інвентар', () => {
        h.wide = true;
        renderWithConfirm(
            <CharacterProfile
                campaignId="c"
                characterId="ch"
                canEdit={false}
                initialTab="stash"
            />
        );
        expect(
            screen.getByRole('tab', { name: 'characterProfile.tabs.items' })
        ).toHaveAttribute('data-state', 'active');
    });
});
