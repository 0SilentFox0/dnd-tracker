// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SoundboardPanel } from '../SoundboardPanel';

import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';
import type { LibrarySound, SoundPreset } from '@/types/soundboard';

const mocks = vi.hoisted(() => {
    const sound = (id: string, name: string): LibrarySound => ({
        id,
        source: 'library',
        name,
        icon: 'volume-2',
        color: null,
        volume: 1,
        url: `/${id}.mp3`,
        durationMs: 1000,
    });

    const sounds = [sound('a', 'Bell'), sound('b', 'Roar'), sound('c', 'Drum')];

    const presets: SoundPreset[] = [
        {
            id: 'p1',
            name: 'soundboard.starter.battle',
            slots: ['a', null, 'b', null, null, null, null, null, null],
            sortOrder: 0,
        },
        {
            id: 'p2',
            name: 'Camp',
            slots: ['c', null, null, null, null, null, null, null, null],
            sortOrder: 1,
        },
    ];

    return {
        sounds,
        presets,
        playSound: vi.fn().mockResolvedValue(undefined),
        mutateOk: vi.fn().mockResolvedValue(true),
    };
});

vi.mock('@/lib/hooks/soundboard/useSoundLibrary', () => ({
    useSoundLibrary: () => ({
        sounds: mocks.sounds,
        byId: new Map(mocks.sounds.map((s) => [s.id, s])),
        presets: mocks.presets,
        isLoading: false,
    }),
}));

vi.mock('@/lib/hooks/soundboard/usePresetMutations', () => ({
    usePresetMutations: () => ({
        update: { mutateOk: mocks.mutateOk, isPending: false },
    }),
}));

vi.mock('@/lib/hooks/soundboard/player', () => ({
    playBuffer: vi.fn().mockResolvedValue(undefined),
    previewSound: vi.fn(),
}));

vi.mock('@/lib/api/soundboard', () => ({ playSound: mocks.playSound }));

vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<typeof import('@/lib/hooks/common')>()),
    useNotify: () => vi.fn(),
}));

vi.mock(
    '@/components/ui/select-field',
    () => import('@/components/ui/__tests__/select-field-mock')
);

async function mount() {
    await renderWithIntl(<SoundboardPanel campaignId="camp" />, {
        locale: 'en',
        namespaces: ['common', 'soundboard'],
    });
}

const open = () =>
    fireEvent.click(screen.getByRole('button', { name: 'Sounds' }));

vi.unmock('next-intl');

describe('SoundboardPanel', () => {
    beforeEach(() => {
        window.localStorage.clear();
        mocks.playSound.mockClear();
        mocks.mutateOk.mockClear();
    });

    afterEach(cleanup);

    it('translates starter preset names and plays pads', async () => {
        await mount();
        open();

        expect(screen.getByRole('option', { name: 'Battle' })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Play Bell' }));

        await waitFor(() =>
            expect(mocks.playSound).toHaveBeenCalledWith(
                'camp',
                expect.objectContaining({ soundId: 'a' })
            )
        );
    });

    it('switching the preset swaps the pads and remembers the choice', async () => {
        await mount();
        open();

        fireEvent.change(screen.getByRole('combobox'), {
            target: { value: 'p2' },
        });

        expect(screen.queryByRole('button', { name: 'Play Bell' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Play Drum' })).toBeTruthy();
        expect(window.localStorage.getItem('soundboard.preset.camp')).toBe(
            'p2'
        );
    });

    it('does not play for an empty slot', async () => {
        await mount();
        open();

        fireEvent.click(screen.getByRole('img', { name: 'Empty slot 2' }));

        expect(mocks.playSound).not.toHaveBeenCalled();
    });

    it('replace mode picks a sound and saves 9 slots with one change', async () => {
        await mount();
        open();
        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
        fireEvent.click(
            screen.getAllByRole('button', { name: 'Replace slot 2' })[0]
        );
        fireEvent.click(
            await screen.findByRole('button', { name: 'Put Drum in the slot' })
        );

        await waitFor(() =>
            expect(mocks.mutateOk).toHaveBeenCalledWith({
                id: 'p1',
                patch: {
                    slots: ['a', 'c', 'b', null, null, null, null, null, null],
                },
            })
        );
        expect(mocks.playSound).not.toHaveBeenCalled();
    });

    it('key 3 plays the pad in slot index 2', async () => {
        await mount();

        fireEvent.keyDown(document.body, { key: '3' });

        await waitFor(() =>
            expect(mocks.playSound).toHaveBeenCalledWith(
                'camp',
                expect.objectContaining({ soundId: 'b' })
            )
        );
    });
});
