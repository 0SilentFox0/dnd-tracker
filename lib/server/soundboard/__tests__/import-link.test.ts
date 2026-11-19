import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const h = vi.hoisted(() => ({
    count: vi.fn(),
    fetch: vi.fn(),
    upload: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
    prisma: { soundLibraryItem: { count: h.count } },
}));
vi.mock('@/lib/utils/net/safe-fetch', () => ({ safeFetchBytes: h.fetch }));
vi.mock('@/lib/supabase/soundboard-storage', () => ({
    uploadSoundBytes: h.upload,
}));

import { importSoundFromLink } from '../import-link';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { MAX_LIBRARY_SOUNDS } from '@/lib/constants/soundboard';

describe('importSoundFromLink', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        h.count.mockResolvedValue(0);
    });

    it('rejects HTML served as audio/mpeg and uploads nothing', async () => {
        h.fetch.mockResolvedValue({
            ok: true,
            value: {
                bytes: new TextEncoder().encode('<html>nope</html>'),
                contentType: 'audio/mpeg',
            },
        });

        await expect(
            importSoundFromLink('u1', { url: 'https://x.example/a.mp3' })
        ).rejects.toMatchObject({ message: API_ERRORS.SOUND_FILE_INVALID });
        expect(h.upload).not.toHaveBeenCalled();
    });

    it('stores sniffed audio under the user prefix', async () => {
        h.fetch.mockResolvedValue({
            ok: true,
            value: {
                bytes: new Uint8Array([0x49, 0x44, 0x33, 4]),
                contentType: 'application/octet-stream',
            },
        });
        h.upload.mockResolvedValue({
            ok: true,
            value: { path: 'u1/a.mp3', url: 'https://s/u1/a.mp3' },
        });

        await expect(
            importSoundFromLink('u1', { url: 'https://x.example/a' })
        ).resolves.toEqual({ path: 'u1/a.mp3', url: 'https://s/u1/a.mp3' });
        expect(h.upload.mock.calls[0].slice(0, 2)).toEqual(['u1', 'mp3']);
    });

    it('passes through a generic fetch failure key', async () => {
        h.fetch.mockResolvedValue({
            ok: false,
            message: API_ERRORS.SOUND_LINK_INVALID,
        });

        await expect(
            importSoundFromLink('u1', { url: 'http://localhost/a' })
        ).rejects.toMatchObject({
            message: API_ERRORS.SOUND_LINK_INVALID,
            status: 400,
        });
    });

    it('checks the library limit before fetching', async () => {
        h.count.mockResolvedValue(MAX_LIBRARY_SOUNDS);

        await expect(
            importSoundFromLink('u1', { url: 'https://x.example/a' })
        ).rejects.toMatchObject({ message: API_ERRORS.SOUND_LIMIT });
        expect(h.fetch).not.toHaveBeenCalled();
    });
});
