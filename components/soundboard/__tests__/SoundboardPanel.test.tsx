// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SoundboardPanel } from '../SoundboardPanel';

import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';
import type { Sound } from '@/types/soundboard';

const play = vi.fn();

const pads: Sound[] = [
    {
        id: 'builtin:bell',
        source: 'builtin',
        name: 'soundboard.builtin.bell',
        url: 'u',
        volume: 1,
        color: null,
        icon: 'bell',
        sortOrder: 0,
        durationMs: null,
    },
    {
        id: 'c1',
        source: 'custom',
        name: 'Roar',
        url: 'u',
        volume: 1,
        color: null,
        icon: null,
        sortOrder: 1,
        durationMs: 1,
    },
];

vi.mock('@/lib/hooks/soundboard', () => ({
    useSoundboardPads: () => ({ sounds: pads, play, preview: vi.fn() }),
    useSoundLibrary: () => ({ custom: [], hiddenBuiltin: [], all: pads }),
    useSoundboardKeys: vi.fn(),
    useSoundMutations: () => ({
        upload: { mutateAsync: vi.fn() },
        update: { mutateOk: vi.fn(), isPending: false },
        remove: { mutateOk: vi.fn() },
        hide: { mutateOk: vi.fn() },
    }),
}));

vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<typeof import('@/lib/hooks/common')>()),
    useConfirm: () => vi.fn(),
    useNotify: () => vi.fn(),
}));

async function mount() {
    await renderWithIntl(<SoundboardPanel campaignId="camp" />, {
        locale: 'en',
        namespaces: ['common', 'soundboard'],
    });
}

vi.unmock('next-intl');

describe('SoundboardPanel', () => {
    afterEach(cleanup);

    it('lists builtin and custom pads and plays on click', async () => {
        await mount();
        fireEvent.click(screen.getByRole('button', { name: 'Sounds' }));

        expect(screen.getByRole('button', { name: 'Play Bell' })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Play Roar' }));

        expect(play).toHaveBeenCalledWith(pads[1]);
    });

    it('edit mode offers hide for builtin and delete for custom', async () => {
        await mount();
        fireEvent.click(screen.getByRole('button', { name: 'Sounds' }));
        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
        fireEvent.click(screen.getByRole('button', { name: 'Edit Bell' }));

        expect(screen.getByRole('button', { name: 'Hide' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    });
});
