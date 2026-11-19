// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SoundEditDialog } from '../SoundEditDialog';

import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';
import type { LibrarySound, SoundPreset } from '@/types/soundboard';

const mocks = vi.hoisted(() => ({
    confirm: vi.fn().mockResolvedValue(true),
    remove: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/hooks/soundboard', () => ({
    useLibraryMutations: () => ({
        update: { mutateOk: vi.fn(), isPending: false },
        remove: { mutateOk: mocks.remove },
    }),
}));

vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<typeof import('@/lib/hooks/common')>()),
    useConfirm: () => mocks.confirm,
}));

vi.unmock('next-intl');

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

const presets: SoundPreset[] = [
    {
        id: 'p1',
        name: 'Camp',
        slots: ['s1', ...Array(8).fill(null)],
        sortOrder: 0,
    },
    {
        id: 'p2',
        name: 'soundboard.starter.battle',
        slots: ['s1', ...Array(8).fill(null)],
        sortOrder: 1,
    },
    { id: 'p3', name: 'Other', slots: Array(9).fill(null), sortOrder: 2 },
];

describe('SoundEditDialog', () => {
    afterEach(cleanup);

    it('names the presets that use the sound when deleting', async () => {
        await renderWithIntl(
            <SoundEditDialog
                sound={sound}
                presets={presets}
                onClose={vi.fn()}
            />,
            { locale: 'en', namespaces: ['common', 'soundboard'] }
        );

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

        await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('s1'));
        expect(mocks.confirm.mock.calls[0][0].title).toContain('Camp, Battle');
        expect(mocks.confirm.mock.calls[0][0].title).not.toContain('Other');
    });
});
