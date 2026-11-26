// @vitest-environment happy-dom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sheetFixture } from './sheet-fixture';

vi.mock('@/lib/hooks/campaigns', async (orig) => ({
    ...(await orig<object>()),
    useCampaignRules: () => ({ data: undefined }),
}));
vi.mock('@/lib/hooks/characters', async (orig) => ({
    ...(await orig<object>()),
    useCharacterGoals: () => ({ save: vi.fn(), isPending: false }),
}));

import {
    IdentityDraftProvider,
    useIdentityDraft,
} from '@/components/character-profile/IdentityDraft';
import { ProfileContext } from '@/components/character-profile/ProfileContext';
import { SheetIdentityPanel } from '@/components/character-profile/sheet/SheetIdentityPanel';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';

function Probe() {
    const draft = useIdentityDraft();

    return <span>{draft ? `draft:${draft.name}` : 'none'}</span>;
}

function Editor({ onPortraitChange }: { onPortraitChange?: () => void }) {
    const [name, setName] = useState('Ліра');

    return (
        <ProfileContext.Provider
            value={{
                campaignId: 'c',
                characterId: 'ch',
                sheet: sheetFixture,
                canEdit: true,
            }}
        >
            <IdentityDraftProvider value={{ name }}>
                <input
                    aria-label="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <SheetIdentityPanel onPortraitChange={onPortraitChange} />
            </IdentityDraftProvider>
        </ProfileContext.Provider>
    );
}

describe('identity draft', () => {
    afterEach(cleanup);

    it('is null outside a provider', () => {
        render(<Probe />);
        expect(screen.getByText('none')).toBeTruthy();
    });

    it('exposes the value inside a provider', () => {
        render(
            <IdentityDraftProvider value={{ name: 'Ада' }}>
                <Probe />
            </IdentityDraftProvider>
        );
        expect(screen.getByText('draft:Ада')).toBeTruthy();
    });

    it('updates the banner heading while the name is typed', () => {
        render(<Editor />);

        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
            'Ліра'
        );

        fireEvent.change(screen.getByLabelText('name'), {
            target: { value: 'Нова' },
        });
        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
            'Нова'
        );
    });

    it('opens the portrait dialog from the banner portrait', () => {
        render(
            <ConfirmProvider>
                <Editor onPortraitChange={vi.fn()} />
            </ConfirmProvider>
        );

        fireEvent.click(
            screen.getByRole('button', {
                name: /characterProfile\.portrait\.add/,
            })
        );
        expect(
            screen.getAllByText('characterProfile.portrait.change').length
        ).toBeGreaterThan(0);
    });
});
