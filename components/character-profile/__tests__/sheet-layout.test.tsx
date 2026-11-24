// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sheetFixture } from './sheet-fixture';

const h = vi.hoisted(() => ({
    replace: vi.fn(),
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

vi.mock('@/components/character-profile/sheet/SheetStatsPanel', () => ({
    SheetStatsPanel: () => <div data-testid="stats-panel" />,
}));

import { CharacterProfile } from '@/components/character-profile';
import { renderWithConfirm } from '@/components/ui/__tests__/render-with-confirm';

const ui = () =>
    renderWithConfirm(
        <CharacterProfile campaignId="c" characterId="ch" canEdit={false} />
    );

describe('SheetLayout: вкладки', () => {
    beforeEach(() => {
        h.sheetQuery.data = sheetFixture;
    });

    afterEach(cleanup);

    it('без ?tab= відкрита перша вкладка «stats» з однією панеллю', () => {
        ui();
        expect(
            screen.getByRole('tab', { name: 'characterProfile.tabs.stats' })
        ).toHaveAttribute('data-state', 'active');
        expect(screen.getAllByTestId('stats-panel')).toHaveLength(1);
    });

    it('«stats» стоїть першою у списку вкладок', () => {
        ui();

        const names = screen.getAllByRole('tab').map((x) => x.textContent);

        expect(names[0]).toBe('characterProfile.tabs.stats');
        expect(names[1]).toBe('characterProfile.tabs.combat');
    });

    it('перемикання на «combat» прибирає панель характеристик', () => {
        ui();
        fireEvent.mouseDown(
            screen.getByRole('tab', { name: 'characterProfile.tabs.combat' })
        );
        expect(screen.queryByTestId('stats-panel')).toBeNull();
    });

    it('ряд характеристик лишається над вкладками після перемикання', () => {
        ui();
        fireEvent.mouseDown(
            screen.getByRole('tab', { name: 'characterProfile.tabs.combat' })
        );
        expect(screen.getByTestId('sheet-abilities')).toBeInTheDocument();
    });

    it('?tab=stash відкриває інвентар', () => {
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
