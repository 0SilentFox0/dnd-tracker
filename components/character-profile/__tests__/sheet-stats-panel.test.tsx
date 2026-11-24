// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sheetFixture, withSheet } from './sheet-fixture';

vi.mock('@/lib/hooks/systems', () => ({
    useCampaignSystem: () => ({
        system: { key: 'dnd5e', modules: [] },
    }),
}));
vi.mock('@/components/character-profile/rest/SheetRollDialog', () => ({
    SheetRollDialog: ({ request }: { request: { label: string } | null }) => (
        <div data-testid="roll-dialog">{request?.label ?? 'closed'}</div>
    ),
}));

import { ProfileContext } from '@/components/character-profile/ProfileContext';
import { SheetStatsPanel } from '@/components/character-profile/sheet/SheetStatsPanel';
import { mockMatchMedia } from '@/components/ui/__tests__/match-media';
import { renderWithConfirm } from '@/components/ui/__tests__/render-with-confirm';
import type { CharacterSheet } from '@/types/characters';

const withRest = (viewer: CharacterSheet['viewer']) =>
    withSheet({
        viewer,
        rest: {} as CharacterSheet['rest'],
        saves: [
            {
                key: 'dexterity',
                ability: 'dexterity',
                proficient: true,
                expertise: false,
                bonus: 6,
            },
        ] as unknown as CharacterSheet['saves'],
    });

const mount = (sheet: CharacterSheet) =>
    renderWithConfirm(
        <ProfileContext.Provider
            value={{
                campaignId: 'c',
                characterId: 'ch',
                sheet,
                canEdit: false,
            }}
        >
            <SheetStatsPanel />
        </ProfileContext.Provider>
    );

describe('SheetStatsPanel', () => {
    beforeEach(() => mockMatchMedia(false));
    afterEach(cleanup);

    it('renders abilities and skills via the system slot', () => {
        mount(withRest({ isDM: false, isOwner: true }));

        expect(
            screen.getByText('characterProfile.combat.abilities')
        ).toBeTruthy();
        expect(screen.getByText('characterProfile.combat.skills')).toBeTruthy();
    });

    it('tile click opens the roll dialog for the owner', () => {
        mount(withRest({ isDM: false, isOwner: true }));

        fireEvent.click(
            screen.getByRole('button', {
                name: /characterProfile\.combat\.saveShort/,
            })
        );

        expect(screen.getByTestId('roll-dialog').textContent).toContain(
            'saveRoll'
        );
    });

    it('has no roll buttons or dialog for a plain viewer', () => {
        mount(withRest({ isDM: false, isOwner: false }));

        expect(screen.queryAllByRole('button')).toHaveLength(0);
        expect(screen.queryByTestId('roll-dialog')).toBeNull();
    });

    it('is untouched by sheetFixture defaults without rest', () => {
        mount(sheetFixture);

        expect(screen.queryByTestId('roll-dialog')).toBeNull();
    });
});
