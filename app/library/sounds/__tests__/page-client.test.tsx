// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SoundLibraryPageClient } from '../page-client';

import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';
import type { LibrarySound, SoundPreset } from '@/types/soundboard';

const mocks = vi.hoisted(() => {
    const lib = (id: string, name: string): LibrarySound => ({
        id,
        source: 'library',
        name,
        icon: 'volume-2',
        color: null,
        volume: 1,
        url: 'u',
        durationMs: 1,
    });

    const builtin: LibrarySound = {
        id: 'builtin:bell',
        source: 'builtin',
        name: null,
        nameKey: 'soundboard.builtin.bell',
        icon: 'bell',
        color: null,
        volume: 1,
        url: '/sfx/bell.mp3',
        durationMs: null,
    };

    const sounds = [builtin, lib('s1', 'Roar')];

    const presets: SoundPreset[] = [
        {
            id: 'p1',
            name: 'Camp',
            slots: ['s1', ...Array(8).fill(null)],
            sortOrder: 0,
        },
    ];

    return {
        sounds,
        presets,
        createPreset: vi.fn().mockResolvedValue({ id: 'new' }),
        removeSound: vi.fn().mockResolvedValue(true),
        confirm: vi.fn().mockResolvedValue(true),
    };
});

vi.mock('@/lib/hooks/soundboard', () => ({
    useSoundLibrary: () => ({
        sounds: mocks.sounds,
        byId: new Map(mocks.sounds.map((s) => [s.id, s])),
        presets: mocks.presets,
        isLoading: false,
    }),
    useSoundPreview: () => vi.fn(),
    isRecorderSupported: () => false,
    useLibraryMutations: () => ({
        upload: { mutateAsync: vi.fn() },
        update: { mutateOk: vi.fn(), isPending: false },
        remove: { mutateOk: mocks.removeSound },
        importLink: { mutateAsync: vi.fn() },
        create: { mutateAsync: vi.fn() },
        discard: { mutateAsync: vi.fn() },
    }),
    usePresetMutations: () => ({
        create: { mutateAsync: mocks.createPreset, isPending: false },
        update: { mutateOk: vi.fn(), isPending: false },
        remove: { mutateOk: vi.fn() },
        reorder: { mutateOk: vi.fn() },
    }),
}));

vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<typeof import('@/lib/hooks/common')>()),
    useConfirm: () => mocks.confirm,
    useNotify: () => vi.fn(),
}));

vi.unmock('next-intl');

const mount = () =>
    renderWithIntl(<SoundLibraryPageClient />, {
        locale: 'en',
        namespaces: ['common', 'soundboard'],
    });

describe('SoundLibraryPageClient', () => {
    afterEach(cleanup);

    it('renders library tiles and presets', async () => {
        await mount();

        expect(screen.getByText('Roar')).toBeTruthy();
        expect(screen.getByText('Bell')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Camp' })).toBeTruthy();
    });

    it('creates a preset', async () => {
        await mount();

        fireEvent.change(screen.getByLabelText('New preset'), {
            target: { value: 'Tavern' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Add' }));

        await vi.waitFor(() =>
            expect(mocks.createPreset).toHaveBeenCalledWith('Tavern')
        );
    });

    it('confirms deleting a sound and lists the presets using it', async () => {
        await mount();

        fireEvent.click(screen.getByRole('button', { name: 'Edit Roar' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

        await vi.waitFor(() =>
            expect(mocks.removeSound).toHaveBeenCalledWith('s1')
        );
        expect(mocks.confirm.mock.calls[0][0].title).toContain('Camp');
    });

    it('gives builtin tiles no edit button', async () => {
        await mount();

        expect(screen.getByText('Built-in')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Edit Bell' })).toBeNull();
    });
});
