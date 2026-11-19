// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SoundUploader } from '../SoundUploader';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { SOUND_NAME_MAX } from '@/lib/constants/soundboard';
import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';

const mutateAsync = vi.fn();

const notify = vi.fn();

const duration = vi.hoisted(() => ({ seconds: 2 as number | null }));

vi.mock('@/lib/hooks/soundboard', () => ({
    useSoundMutations: () => ({ upload: { mutateAsync } }),
}));
vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<typeof import('@/lib/hooks/common')>()),
    useNotify: () => notify,
}));
vi.mock('@/lib/utils/audio/read-duration', () => ({
    readAudioDuration: () => Promise.resolve(duration.seconds),
}));

vi.unmock('next-intl');

async function pick(name: string) {
    await renderWithIntl(<SoundUploader campaignId="c" />, {
        locale: 'en',
        namespaces: ['common', 'soundboard', 'validation'],
    });

    const input = screen.getByLabelText('Sound file');

    fireEvent.change(input, {
        target: {
            files: [new File(['x'], name, { type: 'audio/mpeg' })],
        },
    });
}

describe('SoundUploader', () => {
    beforeEach(() => {
        mutateAsync.mockReset();
        notify.mockReset();
        duration.seconds = 2;
    });

    afterEach(cleanup);

    it('truncates a long name to the limit', async () => {
        await pick(`${'a'.repeat(SOUND_NAME_MAX + 20)}.mp3`);

        await waitFor(() => expect(mutateAsync).toHaveBeenCalled());

        expect(mutateAsync.mock.calls[0][0].name).toHaveLength(SOUND_NAME_MAX);
    });

    it('falls back to a non-empty name', async () => {
        await pick('.mp3');

        await waitFor(() => expect(mutateAsync).toHaveBeenCalled());

        expect(mutateAsync.mock.calls[0][0].name).toBe('Sound');
    });

    it('rejects a too-long clip before requesting a ticket', async () => {
        duration.seconds = 30;
        await pick('long.mp3');

        await waitFor(() => expect(notify).toHaveBeenCalled());

        expect(mutateAsync).not.toHaveBeenCalled();
        expect(API_ERRORS.SOUND_FILE_INVALID).toBeTruthy();
        expect(String(notify.mock.calls[0][0])).toMatch(/10 s/);
    });
});
