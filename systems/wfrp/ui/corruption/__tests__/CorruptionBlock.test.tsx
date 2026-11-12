// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CorruptionBlock } from '../CorruptionBlock';

import { ProfileProvider } from '@/components/character-profile/ProfileContext';
import { render } from '@/lib/i18n/test/render-uk';
import type { CharacterSheet } from '@/types/characters';

vi.unmock('next-intl');
vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<object>()),
    useConfirm: () => vi.fn(),
}));
vi.mock('@/systems/wfrp/hooks', async (orig) => ({
    ...(await orig<object>()),
    useGrantCorruption: () => ({ mutateOk: vi.fn(), isPending: false }),
    useUndoCorruption: () => ({ mutateOk: vi.fn(), isPending: false }),
}));

type Corruption = { points: number; threshold: number; mutations: unknown[] };

const mount = (
    corruption: Corruption | undefined,
    isDM = false,
    wfrp = true,
    pending = false
) =>
    render(
        <ProfileProvider
            campaignId="c"
            characterId="h"
            canEdit={false}
            sheet={
                {
                    viewer: { isDM, isOwner: !isDM },
                    review: { pending },
                    ...(wfrp && {
                        systemSlot: { key: 'wfrp', data: { corruption } },
                    }),
                } as unknown as CharacterSheet
            }
        >
            <CorruptionBlock />
        </ProfileProvider>
    );

const mutation = (text: unknown, effects: unknown[]) => ({
    id: 'm',
    at: 'x',
    kind: 'physical',
    roll: 3,
    text,
    effects,
});

describe('CorruptionBlock', () => {
    afterEach(cleanup);

    it('owner sees points and threshold without the grant button', () => {
        mount({ points: 3, threshold: 6, mutations: [] });

        expect(screen.getByText(/Пункти порчі: 3 \/ поріг 6/)).toBeTruthy();
        expect(
            screen.queryByRole('button', { name: 'Нарахувати порчу' })
        ).toBeNull();
        expect(screen.queryByText('Понад поріг')).toBeNull();
        expect(screen.getByText('Мутацій немає')).toBeTruthy();
    });

    it('flags points over the threshold', () => {
        mount({ points: 7, threshold: 6, mutations: [] });

        expect(screen.getByText('Понад поріг')).toBeTruthy();
    });

    it('translates a default mutation text and shows its effect', () => {
        mount({
            points: 7,
            threshold: 6,
            mutations: [
                mutation({ message: 'wfrpCorruption.mutations.physical.3' }, [
                    { type: 'move', amount: -1 },
                ]),
            ],
        });

        expect(screen.getByText(/Ступні зрослися в копита/)).toBeTruthy();
        expect(screen.getByText('Рух -1')).toBeTruthy();
    });

    it('shows a plain string text and a characteristic effect', () => {
        mount({
            points: 7,
            threshold: 6,
            mutations: [
                mutation('Whispers', [
                    { type: 'characteristic', key: 'wp', amount: -5 },
                ]),
            ],
        });

        expect(screen.getByText(/Whispers/)).toBeTruthy();
        expect(screen.getByText('Вл -5')).toBeTruthy();
    });

    it('the DM sees the grant button', () => {
        mount({ points: 0, threshold: 6, mutations: [] }, true);

        expect(
            screen.getByRole('button', { name: 'Нарахувати порчу' })
        ).toBeTruthy();
    });

    it('hides the grant button for a pending hero', () => {
        mount({ points: 0, threshold: 6, mutations: [] }, true, true, true);

        expect(
            screen.queryByRole('button', { name: 'Нарахувати порчу' })
        ).toBeNull();
    });

    it('renders nothing without the wfrp block', () => {
        const { container } = mount(undefined, false, false);

        expect(container.textContent).toBe('');
    });
});
