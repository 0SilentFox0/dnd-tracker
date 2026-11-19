// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SoundPad } from '../SoundPad';

import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';
import type { LibrarySound } from '@/types/soundboard';

const sound: LibrarySound = {
    id: 's1',
    source: 'library',
    name: 'Roar',
    icon: 'volume-2',
    color: null,
    volume: 1,
    url: 'u',
    durationMs: 1000,
};

async function setup(opts: {
    replacing: boolean;
    sound?: LibrarySound | null;
}) {
    const actions = {
        onPlay: vi.fn(),
        onPreview: vi.fn(),
        onReplace: vi.fn(),
    };

    await renderWithIntl(
        <SoundPad
            sound={opts.sound === undefined ? sound : opts.sound}
            index={2}
            actions={actions}
            replacing={opts.replacing}
        />,
        { locale: 'en', namespaces: ['common', 'soundboard'] }
    );

    return actions;
}

vi.unmock('next-intl');

describe('SoundPad', () => {
    afterEach(cleanup);

    it('plays on click and shows the pad number', async () => {
        const actions = await setup({ replacing: false });

        fireEvent.click(screen.getByRole('button', { name: 'Play Roar' }));

        expect(actions.onPlay).toHaveBeenCalledWith(sound);
        expect(screen.getByText('3')).toBeTruthy();
    });

    it('previews with the secondary button', async () => {
        const actions = await setup({ replacing: false });

        fireEvent.click(screen.getByRole('button', { name: /Preview Roar/ }));

        expect(actions.onPreview).toHaveBeenCalledWith(sound);
    });

    it('asks to replace the slot instead of playing in replace mode', async () => {
        const actions = await setup({ replacing: true });

        fireEvent.click(screen.getByRole('button', { name: 'Replace slot 3' }));

        expect(actions.onReplace).toHaveBeenCalledWith(2);
        expect(actions.onPlay).not.toHaveBeenCalled();
    });

    it('renders an inert placeholder for an empty slot', async () => {
        const actions = await setup({ replacing: false, sound: null });

        fireEvent.click(screen.getByRole('img', { name: 'Empty slot 3' }));

        expect(actions.onPlay).not.toHaveBeenCalled();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('lets an empty slot be filled in replace mode', async () => {
        const actions = await setup({ replacing: true, sound: null });

        fireEvent.click(screen.getByRole('button', { name: 'Replace slot 3' }));

        expect(actions.onReplace).toHaveBeenCalledWith(2);
    });
});
