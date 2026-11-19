// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SoundTile } from '../SoundTile';

import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';
import type { LibrarySound } from '@/types/soundboard';

vi.unmock('next-intl');

const base: LibrarySound = {
    id: 'x',
    source: 'library',
    name: 'Roar',
    icon: 'volume-2',
    color: null,
    volume: 1,
    url: 'u',
    durationMs: 1,
};

const actions = { onPreview: vi.fn(), onEdit: vi.fn() };

const mount = (sound: LibrarySound) =>
    renderWithIntl(<SoundTile sound={sound} actions={actions} />, {
        locale: 'en',
        namespaces: ['common', 'soundboard'],
    });

describe('SoundTile', () => {
    afterEach(cleanup);

    it('lets a library sound be edited', async () => {
        await mount(base);

        expect(screen.getByRole('button', { name: 'Edit Roar' })).toBeTruthy();
    });

    it('keeps builtin sounds read-only with a badge', async () => {
        await mount({
            ...base,
            id: 'builtin:bell',
            source: 'builtin',
            name: null,
            nameKey: 'soundboard.builtin.bell',
        });

        expect(screen.getByText('Built-in')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /^Edit/ })).toBeNull();
        expect(
            screen.getByRole('button', { name: /Preview Bell/ })
        ).toBeTruthy();
    });
});
