// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LinkDialog } from '../LinkDialog';

import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';

const mocks = vi.hoisted(() => ({
    importLink: vi.fn(),
    create: vi.fn(),
    discard: vi.fn(),
    decode: vi.fn(),
}));

vi.mock('@/lib/hooks/soundboard', () => ({
    useLibraryMutations: () => ({
        importLink: { mutateAsync: mocks.importLink },
        create: { mutateAsync: mocks.create },
        discard: { mutateAsync: mocks.discard },
    }),
}));

vi.mock('@/lib/utils/soundboard/decode-duration', () => ({
    decodeDurationMs: mocks.decode,
}));

vi.unmock('next-intl');

async function submit(url: string) {
    const onClose = vi.fn();

    await renderWithIntl(<LinkDialog open onClose={onClose} />, {
        locale: 'en',
        namespaces: ['common', 'soundboard', 'validation'],
    });

    fireEvent.change(screen.getByLabelText('Audio URL'), {
        target: { value: url },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    return onClose;
}

describe('LinkDialog', () => {
    beforeEach(() => {
        Object.values(mocks).forEach((m) => m.mockReset());
        mocks.importLink.mockResolvedValue({
            path: 'u/x.mp3',
            url: 'https://cdn/x.mp3',
        });
        mocks.discard.mockResolvedValue({ ok: true });
        mocks.create.mockResolvedValue({});
    });

    afterEach(cleanup);

    it('discards the stored object and creates no row for an 11 s sound', async () => {
        mocks.decode.mockResolvedValue(11_000);

        const onClose = await submit('https://example.com/a.mp3');

        expect(
            await screen.findByText('The sound is longer than 10 s')
        ).toBeTruthy();
        expect(mocks.discard).toHaveBeenCalledWith('u/x.mp3');
        expect(mocks.create).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('creates a link sound within the limit', async () => {
        mocks.decode.mockResolvedValue(4_200);

        const onClose = await submit('https://example.com/a.mp3');

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(mocks.create).toHaveBeenCalledWith({
            path: 'u/x.mp3',
            durationMs: 4_200,
            source: 'link',
            sourceUrl: 'https://example.com/a.mp3',
        });
        expect(mocks.discard).not.toHaveBeenCalled();
    });
});
