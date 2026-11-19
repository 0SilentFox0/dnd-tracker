// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LinkDialog } from '../LinkDialog';

import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';

const mocks = vi.hoisted(() => ({ importLink: vi.fn() }));

vi.mock('@/lib/hooks/soundboard', () => ({
    useImportSoundLink: () => ({
        mutateAsync: mocks.importLink,
        isPending: false,
    }),
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
    beforeEach(() => mocks.importLink.mockReset());

    afterEach(cleanup);

    it('shows the too-long message and stays open', async () => {
        mocks.importLink.mockResolvedValue({ rejected: 'tooLong' });

        const onClose = await submit('https://example.com/a.mp3');

        expect(
            await screen.findByText('The sound is longer than 10 s')
        ).toBeTruthy();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('shows the invalid message when the audio cannot be read', async () => {
        mocks.importLink.mockResolvedValue({ rejected: 'invalid' });

        await submit('https://example.com/a.mp3');

        expect(
            await screen.findByText('Could not read audio from this link')
        ).toBeTruthy();
    });

    it('closes on success', async () => {
        mocks.importLink.mockResolvedValue({ rejected: null });

        const onClose = await submit('https://example.com/a.mp3');

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(mocks.importLink).toHaveBeenCalledWith(
            'https://example.com/a.mp3'
        );
    });
});
