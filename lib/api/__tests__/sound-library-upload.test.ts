import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ request: vi.fn(), ticket: vi.fn() }));

vi.mock('../client', () => ({ request: h.request }));
vi.mock('../upload-audio-file', () => ({ uploadAudioViaTicket: h.ticket }));
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }));

import { uploadLibrarySoundFile } from '../sound-library';

const file = new File([new Uint8Array(10)], 'a.mp3', { type: 'audio/mpeg' });

describe('uploadLibrarySoundFile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        h.ticket.mockResolvedValue({ path: 'u1/a.mp3' });
    });

    it('discards the uploaded object and rethrows when create fails', async () => {
        h.request
            .mockRejectedValueOnce(new Error('soundLimit'))
            .mockResolvedValueOnce({ ok: true });

        await expect(
            uploadLibrarySoundFile(file, { durationMs: 500 })
        ).rejects.toThrow('soundLimit');

        expect(h.request).toHaveBeenLastCalledWith(
            '/api/sound-library/discard',
            expect.objectContaining({
                body: JSON.stringify({ path: 'u1/a.mp3' }),
            })
        );
    });

    it('keeps the object when create succeeds', async () => {
        h.request.mockResolvedValueOnce({ id: 's1' });

        await expect(
            uploadLibrarySoundFile(file, { durationMs: 500 })
        ).resolves.toEqual({ id: 's1' });
        expect(h.request).toHaveBeenCalledTimes(1);
    });
});
