import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_ERRORS } from '@/lib/constants/api-errors';
import * as importLink from '@/lib/server/soundboard/import-link';
import * as library from '@/lib/server/soundboard/library-store';
import * as storage from '@/lib/supabase/soundboard-storage';
import * as apiAuth from '@/lib/utils/api/api-auth';
import { ContentError } from '@/lib/utils/api/content-error';
import { checkRateLimit } from '@/lib/utils/api/rate-limit';

vi.mock('@/lib/utils/api/api-auth', () => ({ requireAuth: vi.fn() }));
vi.mock('@/lib/server/soundboard/library-store', () => ({
    getLibrary: vi.fn(),
    libraryEtag: vi.fn(() => 'v1'),
    createLibrarySound: vi.fn(),
    updateLibrarySound: vi.fn(),
    deleteLibrarySound: vi.fn(),
    discardUploadedSound: vi.fn(),
}));
vi.mock('@/lib/utils/api/rate-limit', async (orig) => ({
    ...(await orig<typeof import('@/lib/utils/api/rate-limit')>()),
    checkRateLimit: vi.fn(),
}));
vi.mock('@/lib/server/soundboard/import-link', () => ({
    importSoundFromLink: vi.fn(),
}));
vi.mock('@/lib/supabase/soundboard-storage', () => ({
    createSoundUploadTicket: vi.fn(),
}));

const ctx = { params: Promise.resolve({ id: 's1' }) };

const req = (method: string, body?: unknown, headers?: HeadersInit) =>
    new Request('http://x', {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    });

const LIBRARY = { sounds: [], presets: [] };

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireAuth).mockResolvedValue({ userId: 'u1' });
    vi.mocked(library.getLibrary).mockResolvedValue(LIBRARY);
    vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        count: 1,
        limit: 10,
        retryAfterSeconds: 0,
    });
});

describe('unauthenticated', () => {
    beforeEach(() => {
        vi.mocked(apiAuth.requireAuth).mockResolvedValue(
            NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
        );
    });

    it.each([
        ['', 'GET', undefined],
        ['', 'POST', { path: 'p' }],
        ['/[id]', 'PATCH', { volume: 1 }],
        ['/[id]', 'DELETE', undefined],
        ['/upload-url', 'POST', {}],
        ['/import', 'POST', { url: 'https://a.b/c.mp3' }],
        ['/discard', 'POST', { path: 'p' }],
    ])('%s %s -> 401', async (path, method, body) => {
        const mod = await import(`@/app/api/sound-library${path}/route`);

        const res = await mod[method](req(method, body), ctx);

        expect(res.status).toBe(401);
        expect(library.createLibrarySound).not.toHaveBeenCalled();
    });
});

describe('GET', () => {
    it('returns the library with an ETag, then 304', async () => {
        const { GET } = await import('@/app/api/sound-library/route');

        const first = await GET(req('GET'));

        const etag = first.headers.get('ETag') ?? '';

        expect(first.status).toBe(200);
        expect(await first.json()).toEqual(LIBRARY);

        const second = await GET(
            req('GET', undefined, { 'if-none-match': etag })
        );

        expect(second.status).toBe(304);
    });
});

describe('POST', () => {
    it('creates with the session user id -> 201', async () => {
        vi.mocked(library.createLibrarySound).mockResolvedValue({} as never);

        const { POST } = await import('@/app/api/sound-library/route');

        const res = await POST(
            req('POST', {
                path: 'u1/a.mp3',
                durationMs: 500,
                source: 'link',
                sourceUrl: 'https://a.b/c.mp3',
            })
        );

        expect(res.status).toBe(201);
        expect(library.createLibrarySound).toHaveBeenCalledWith(
            'u1',
            expect.objectContaining({ source: 'link' })
        );
    });

    it('over the limit -> 400', async () => {
        vi.mocked(library.createLibrarySound).mockRejectedValue(
            new ContentError(API_ERRORS.SOUND_LIMIT, 400)
        );

        const { POST } = await import('@/app/api/sound-library/route');

        const res = await POST(
            req('POST', { path: 'u1/a.mp3', durationMs: 500, source: 'upload' })
        );

        expect(res.status).toBe(400);
    });
});

describe('[id]', () => {
    it("another user's sound -> 404", async () => {
        vi.mocked(library.deleteLibrarySound).mockRejectedValue(
            new ContentError(API_ERRORS.SOUND_NOT_FOUND, 404)
        );

        const { DELETE } = await import('@/app/api/sound-library/[id]/route');

        expect((await DELETE(req('DELETE'), ctx)).status).toBe(404);
        expect(library.deleteLibrarySound).toHaveBeenCalledWith('u1', 's1');
    });
});

describe('discard', () => {
    it('foreign path -> 403', async () => {
        vi.mocked(library.discardUploadedSound).mockRejectedValue(
            new ContentError(API_ERRORS.FORBIDDEN, 403)
        );

        const { POST } = await import('@/app/api/sound-library/discard/route');

        expect((await POST(req('POST', { path: 'other/a.mp3' }))).status).toBe(
            403
        );
    });
});

describe('intake rate limit', () => {
    beforeEach(() => {
        vi.mocked(checkRateLimit).mockResolvedValue({
            allowed: false,
            count: 11,
            limit: 10,
            retryAfterSeconds: 30,
        });
    });

    it('import -> 429 without fetching', async () => {
        const { POST } = await import('@/app/api/sound-library/import/route');

        const res = await POST(req('POST', { url: 'https://a.b/c.mp3' }));

        expect(res.status).toBe(429);
        expect(checkRateLimit).toHaveBeenCalledWith(
            expect.objectContaining({ userId: 'u1', scope: 'sound-import' })
        );
        expect(importLink.importSoundFromLink).not.toHaveBeenCalled();
    });

    it('upload-url -> 429 without issuing a ticket', async () => {
        const { POST } = await import(
            '@/app/api/sound-library/upload-url/route'
        );

        const res = await POST(
            req('POST', { name: 'a.mp3', contentType: 'audio/mpeg', size: 10 })
        );

        expect(res.status).toBe(429);
        expect(checkRateLimit).toHaveBeenCalledWith(
            expect.objectContaining({ scope: 'sound-upload' })
        );
        expect(storage.createSoundUploadTicket).not.toHaveBeenCalled();
    });
});
