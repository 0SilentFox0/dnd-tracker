import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { PLAY_RATE_LIMIT } from '@/lib/constants/soundboard';
import { publishSoundPlay } from '@/lib/server/soundboard/publish-play';
import * as store from '@/lib/server/soundboard/sound-store';
import * as apiAuth from '@/lib/utils/api/api-auth';
import { ContentError } from '@/lib/utils/api/content-error';
import { checkRateLimit } from '@/lib/utils/api/rate-limit';

vi.mock('next/server', async (orig) => ({
    ...(await orig<typeof import('next/server')>()),
    after: (cb: () => unknown) => void cb(),
}));
vi.mock('@/lib/utils/api/api-auth', () => ({
    requireCampaignAccess: vi.fn(),
    requireDM: vi.fn(),
}));
vi.mock('@/lib/server/soundboard/sound-store', () => ({
    listSounds: vi.fn(),
    soundsEtag: vi.fn(() => 'v1'),
    createSound: vi.fn(),
    updateSound: vi.fn(),
    deleteSound: vi.fn(),
    reorderSounds: vi.fn(),
    setHiddenBuiltin: vi.fn(),
    findPlayable: vi.fn(),
}));
vi.mock('@/lib/server/soundboard/publish-play', () => ({
    publishSoundPlay: vi.fn(),
}));
vi.mock('@/lib/supabase/soundboard-storage', () => ({
    createSoundUploadTicket: vi.fn(),
}));
vi.mock('@/lib/utils/api/rate-limit', async (orig) => ({
    ...(await orig<typeof import('@/lib/utils/api/rate-limit')>()),
    checkRateLimit: vi.fn(),
}));

const forbidden = () => NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

const ctx = (extra: Record<string, string> = {}) => ({
    params: Promise.resolve({ id: 'camp', soundId: '', ...extra }),
});

const req = (method: string, body?: unknown, headers?: HeadersInit) =>
    new Request('http://x', {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    });

const asDM = () =>
    vi
        .mocked(apiAuth.requireDM)
        .mockResolvedValue({ userId: 'dm', isDM: true } as never);

const asPlayer = () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(forbidden());
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({
        userId: 'p',
        isDM: false,
    } as never);
};

const LIST = { sounds: [], hiddenBuiltin: [] };

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(store.listSounds).mockResolvedValue(LIST);
    vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        count: 1,
        limit: 20,
        retryAfterSeconds: 10,
    });
});

describe('player is rejected on every write', () => {
    beforeEach(asPlayer);

    it.each([
        ['sounds', 'POST', { path: 'p', name: 'n' }, {}],
        ['sounds/upload-url', 'POST', { name: 'a.mp3', size: 1, contentType: 'audio/mpeg' }, {}],
        ['sounds/[soundId]', 'PATCH', { name: 'x' }, { soundId: 's' }],
        ['sounds/[soundId]', 'DELETE', undefined, { soundId: 's' }],
        ['sounds/order', 'PUT', { ids: [] }, {}],
        ['sounds/hidden', 'PUT', { ids: [] }, {}],
        ['sounds/play', 'POST', { soundId: 'builtin:bell', nonce: 'n' }, {}],
    ])('%s %s -> 403', async (path, method, body, extra) => {
        const mod = await import(`@/app/api/campaigns/[id]/${path}/route`);

        const res = await mod[method](req(method, body), ctx(extra));

        expect(res.status).toBe(403);
        expect(store.createSound).not.toHaveBeenCalled();
        expect(publishSoundPlay).not.toHaveBeenCalled();
    });
});

describe('GET sounds', () => {
    it('returns the list with an ETag, then 304 on If-None-Match', async () => {
        vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue({
            userId: 'p',
            isDM: false,
        } as never);

        const { GET } = await import('@/app/api/campaigns/[id]/sounds/route');

        const first = await GET(req('GET'), ctx());

        const etag = first.headers.get('ETag') ?? '';

        expect(first.status).toBe(200);
        expect(await first.json()).toEqual(LIST);

        const second = await GET(req('GET', undefined, { 'if-none-match': etag }), ctx());

        expect(second.status).toBe(304);
        expect(store.listSounds).toHaveBeenCalledTimes(2);
    });
});

describe('POST sounds', () => {
    it('over the limit -> 400', async () => {
        asDM();
        vi.mocked(store.createSound).mockRejectedValue(
            new ContentError(API_ERRORS.SOUND_LIMIT, 400)
        );

        const { POST } = await import('@/app/api/campaigns/[id]/sounds/route');

        const res = await POST(req('POST', { path: 'camp/a.mp3', name: 'n' }), ctx());

        expect(res.status).toBe(400);
        expect((await res.json()).error).toContain(API_ERRORS.SOUND_LIMIT);
    });
});

describe('[soundId]', () => {
    it('cross-campaign id -> 404', async () => {
        asDM();
        vi.mocked(store.deleteSound).mockRejectedValue(
            new ContentError(API_ERRORS.SOUND_NOT_FOUND, 404)
        );

        const { DELETE } = await import(
            '@/app/api/campaigns/[id]/sounds/[soundId]/route'
        );

        const res = await DELETE(req('DELETE'), ctx({ soundId: 'other' }));

        expect(res.status).toBe(404);
    });
});

describe('POST sounds/play', () => {
    const play = async (soundId = 'builtin:bell') => {
        const { POST } = await import(
            '@/app/api/campaigns/[id]/sounds/play/route'
        );

        return POST(req('POST', { soundId, nonce: 'n1' }), ctx());
    };

    beforeEach(asDM);

    it('unknown id -> 404', async () => {
        vi.mocked(store.findPlayable).mockResolvedValue(null);

        expect((await play('nope')).status).toBe(404);
        expect(publishSoundPlay).not.toHaveBeenCalled();
    });

    it('rate limited -> 429', async () => {
        vi.mocked(store.findPlayable).mockResolvedValue({ volume: 1 });
        vi.mocked(checkRateLimit).mockResolvedValue({
            allowed: false,
            count: 21,
            limit: 20,
            retryAfterSeconds: 3,
        });

        expect((await play()).status).toBe(429);
        expect(checkRateLimit).toHaveBeenCalledWith({
            userId: 'dm',
            scope: 'soundboard-play',
            ...PLAY_RATE_LIMIT,
        });
        expect(publishSoundPlay).not.toHaveBeenCalled();
    });

    it('valid -> 200 and publishes once', async () => {
        vi.mocked(store.findPlayable).mockResolvedValue({ volume: 0.5 });

        const res = await play();

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true });
        expect(publishSoundPlay).toHaveBeenCalledTimes(1);
        expect(publishSoundPlay).toHaveBeenCalledWith('camp', {
            soundId: 'builtin:bell',
            nonce: 'n1',
            volume: 0.5,
        });
    });
});
