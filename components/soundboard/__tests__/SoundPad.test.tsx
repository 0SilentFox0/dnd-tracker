// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SoundPad } from '../SoundPad';

import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';
import type { Sound } from '@/types/soundboard';

const sound: Sound = {
    id: 's1',
    source: 'custom',
    name: 'Roar',
    url: 'u',
    volume: 1,
    color: null,
    icon: null,
    sortOrder: 0,
    durationMs: 1000,
};

async function setup(editing: boolean) {
    const actions = { onPlay: vi.fn(), onPreview: vi.fn(), onEdit: vi.fn() };

    await renderWithIntl(
        <SoundPad
            sound={sound}
            index={2}
            actions={actions}
            editing={editing}
        />,
        { locale: 'en', namespaces: ['common', 'soundboard'] }
    );

    return actions;
}

vi.unmock('next-intl');

describe('SoundPad', () => {
    afterEach(cleanup);

    it('plays on click and shows the pad number', async () => {
        const actions = await setup(false);

        fireEvent.click(screen.getByRole('button', { name: 'Play Roar' }));

        expect(actions.onPlay).toHaveBeenCalledWith(sound);
        expect(screen.getByText('3')).toBeTruthy();
    });

    it('previews with the secondary button', async () => {
        const actions = await setup(false);

        fireEvent.click(screen.getByRole('button', { name: /Preview Roar/ }));

        expect(actions.onPreview).toHaveBeenCalledWith(sound);
    });

    it('opens edit instead of playing in edit mode', async () => {
        const actions = await setup(true);

        fireEvent.click(screen.getByRole('button', { name: 'Edit Roar' }));

        expect(actions.onEdit).toHaveBeenCalledWith(sound);
        expect(actions.onPlay).not.toHaveBeenCalled();
    });
});
