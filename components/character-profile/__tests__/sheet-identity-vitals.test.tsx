// @vitest-environment happy-dom
import type { ReactElement } from 'react';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sheetFixture, withSheet } from './sheet-fixture';

const mutateOk = vi.fn(async () => true);

vi.unmock('next-intl');
vi.mock('@/components/hud/fonts', () => ({
    hudFontClassName: '',
    HUD_SURFACE: 'hud-surface',
}));
vi.mock('@/lib/hooks/campaigns', async (orig) => ({
    ...(await orig<object>()),
    useCampaignRules: () => ({ data: undefined }),
}));
vi.mock('@/lib/hooks/characters', async (orig) => ({
    ...(await orig<object>()),
    useEditResources: () => ({ mutateOk, isPending: false }),
    useSpendHitDie: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { ProfileContext } from '@/components/character-profile/ProfileContext';
import { SheetIdentityPanel } from '@/components/character-profile/sheet/SheetIdentityPanel';
import { SheetVitals } from '@/components/character-profile/sheet/SheetVitals';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';
import type { CharacterSheet, SheetRest } from '@/types/characters';

const rest = (over: Partial<SheetRest>): SheetRest =>
    ({
        hp: { current: 20, max: 30, temp: 5 },
        charges: [],
        hitDice: [],
        inspiration: null,
        xp: null,
        ...over,
    }) as SheetRest;

const inProfile = (sheet: CharacterSheet, ui: ReactElement) =>
    renderWithIntl(
        <ConfirmProvider>
            <ProfileContext.Provider
                value={{
                    campaignId: 'c',
                    characterId: 'ch',
                    sheet,
                    canEdit: false,
                }}
            >
                {ui}
            </ProfileContext.Provider>
        </ConfirmProvider>,
        { locale: 'en', namespaces: ['common', 'characterProfile', 'rest'] }
    );

const dmSheet = (isDM: boolean) =>
    withSheet({
        system: 'dnd5e',
        viewer: { isDM, isOwner: !isDM },
        rest: rest({}),
    });

describe('SheetVitals', () => {
    afterEach(() => {
        cleanup();
        mutateOk.mockClear();
    });

    it('DM damage consumes temp hp first', async () => {
        await inProfile(dmSheet(true), <SheetVitals />);

        fireEvent.change(screen.getByLabelText('Amount'), {
            target: { value: '8' },
        });
        fireEvent.click(screen.getByLabelText('− Damage'));

        await waitFor(() =>
            expect(mutateOk).toHaveBeenCalledWith({ hp: 17, tempHp: 0 })
        );
    });

    it('DM heal caps at max, default step is 1', async () => {
        await inProfile(dmSheet(true), <SheetVitals />);

        fireEvent.click(screen.getByLabelText('+ Heal'));

        await waitFor(() =>
            expect(mutateOk).toHaveBeenCalledWith({ hp: 21, tempHp: 5 })
        );
    });

    it('DM temp opens a dialog and keeps the larger pool', async () => {
        await inProfile(dmSheet(true), <SheetVitals />);

        fireEvent.click(screen.getByText('Temp'));
        fireEvent.change(
            await screen.findByLabelText('Amount', {
                selector: '#vitals-amount',
            }),
            {
                target: { value: '9' },
            }
        );
        fireEvent.click(screen.getByText('Apply'));

        await waitFor(() =>
            expect(mutateOk).toHaveBeenCalledWith({ hp: 20, tempHp: 9 })
        );
    });

    it('non-DM sees numbers but no controls', async () => {
        await inProfile(dmSheet(false), <SheetVitals />);

        expect(screen.getByLabelText('HP 20 / 30', { selector: 'button' })).toBeInTheDocument();
        expect(screen.getByText('+5 temp')).toBeInTheDocument();
        expect(screen.queryByLabelText('− Damage')).toBeNull();
        expect(screen.queryByLabelText('+ Heal')).toBeNull();
        expect(screen.queryByText('Temp')).toBeNull();
    });
});

describe('SheetIdentityPanel', () => {
    afterEach(cleanup);

    it('shows xp bar and inspiration only when present', async () => {
        const withXp = withSheet({
            system: 'dnd5e',
            identity: { ...sheetFixture.identity, level: 2 },
            rest: rest({
                xp: { value: 400, next: 900, levelUp: false },
                inspiration: true,
            }),
        });

        const a = await inProfile(withXp, <SheetIdentityPanel />);

        expect(screen.getByLabelText('XP 400 / 900')).toBeInTheDocument();
        expect(a.container.textContent).toContain('Inspiration');
        cleanup();

        const b = await inProfile(
            withSheet({ system: 'dnd5e', rest: rest({}) }),
            <SheetIdentityPanel />
        );

        expect(screen.queryByRole('progressbar')).toBeNull();
        expect(b.container.textContent).not.toContain('Inspiration');
        expect(sheetFixture.rest).toBeNull();
    });
});
