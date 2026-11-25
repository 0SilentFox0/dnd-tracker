// @vitest-environment happy-dom
import type { ReactElement } from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sheetFixture, withSheet } from './sheet-fixture';

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
}));

import { ProfileContext } from '@/components/character-profile/ProfileContext';
import { SheetIdentityPanel } from '@/components/character-profile/sheet/SheetIdentityPanel';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';
import type { CharacterSheet } from '@/types/characters';

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


const longBio = 'word '.repeat(120);

const sheetWithBio = (biography: string) =>
    withSheet({
        system: 'dnd5e',
        story: { ...sheetFixture.story, biography },
    });

describe('SheetIdentityPanel description', () => {
    afterEach(cleanup);

    it('toggles a long description with aria-expanded', async () => {
        await inProfile(sheetWithBio(longBio), <SheetIdentityPanel />);

        const toggle = screen.getByRole('button', { name: 'Show more' });

        expect(toggle.getAttribute('aria-expanded')).toBe('false');

        fireEvent.click(toggle);

        expect(
            screen
                .getByRole('button', { name: 'Show less' })
                .getAttribute('aria-expanded')
        ).toBe('true');
    });

    it('has no toggle for a short description', async () => {
        await inProfile(sheetWithBio('Short bio'), <SheetIdentityPanel />);

        expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull();
    });

    it('renders actions in the header and they submit the form', async () => {
        const onSubmit = vi.fn((e: { preventDefault: () => void }) =>
            e.preventDefault()
        );

        await inProfile(
            sheetWithBio('Short bio'),
            <form id="profile-edit" onSubmit={onSubmit}>
                <SheetIdentityPanel
                    actions={
                        <button type="submit" form="profile-edit">
                            Save
                        </button>
                    }
                />
            </form>
        );

        expect(screen.getByTestId('sheet-actions')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(onSubmit).toHaveBeenCalledTimes(1);
    });
});
