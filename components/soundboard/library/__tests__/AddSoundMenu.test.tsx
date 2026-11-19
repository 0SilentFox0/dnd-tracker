// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AddSoundMenu } from '../AddSoundMenu';

import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';

const state = vi.hoisted(() => ({ supported: true }));

vi.mock('@/lib/hooks/soundboard', () => ({
    isRecorderSupported: () => state.supported,
    useSoundRecorder: () => ({
        supported: state.supported,
        state: 'idle',
        elapsedMs: 0,
        result: null,
        start: vi.fn(),
        stop: vi.fn(),
        reset: vi.fn(),
    }),
    useLibraryMutations: () => ({
        upload: { mutateAsync: vi.fn() },
        importLink: { mutateAsync: vi.fn() },
        create: { mutateAsync: vi.fn() },
        discard: { mutateAsync: vi.fn() },
    }),
}));

vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<typeof import('@/lib/hooks/common')>()),
    useNotify: () => vi.fn(),
}));

vi.unmock('next-intl');

async function openMenu() {
    await renderWithIntl(<AddSoundMenu />, {
        locale: 'en',
        namespaces: ['common', 'soundboard'],
    });

    fireEvent.keyDown(screen.getByRole('button', { name: 'Add sound' }), {
        key: 'Enter',
    });
}

describe('AddSoundMenu', () => {
    afterEach(cleanup);

    it('offers file, record and link', async () => {
        state.supported = true;
        await openMenu();

        expect(
            await screen.findByRole('menuitem', { name: 'From file' })
        ).toBeTruthy();
        expect(screen.getByRole('menuitem', { name: 'Record' })).toBeTruthy();
        expect(
            screen.getByRole('menuitem', { name: 'From link' })
        ).toBeTruthy();
    });

    it('hides the record entry when recording is unsupported', async () => {
        state.supported = false;
        await openMenu();

        expect(
            await screen.findByRole('menuitem', { name: 'From file' })
        ).toBeTruthy();
        expect(screen.queryByRole('menuitem', { name: 'Record' })).toBeNull();
    });
});
