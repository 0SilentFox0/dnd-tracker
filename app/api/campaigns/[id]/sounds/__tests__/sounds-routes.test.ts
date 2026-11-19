import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PLAY_RATE_LIMIT } from '@/lib/constants/soundboard';
import * as store from '@/lib/server/soundboard/library-store';
import { publishSoundPlay } from '@/lib/server/soundboard/publish-play';
import * as apiAuth from '@/lib/utils/api/api-auth';
import { checkRateLimit } from '@/lib/utils/api/rate-limit';

vi.mock('next/server', async (orig) => ({
    ...(await orig<typeof import('next/server')>()),
    after: (cb: () => unknown) => void cb(),
}));
vi.mock('@/lib/utils/api/api-auth', () => ({
    requireDM: vi.fn(),
}));
vi.mock('@/lib/server/soundboard/library-store', () => ({
    findPlayableFor: vi.fn(),
}));
vi.mock('@/lib/server/soundboard/publish-play', () => ({
    publishSoundPlay: vi.fn(),
}));
vi.mock('@/lib/utils/api/rate-limit', async (orig) => ({
    ...(await orig<typeof import('@/lib/utils/api/rate-limit')>()),
    checkRateLimit: vi.fn(),
}));

const forbidden = () => NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

const ctx = () => ({ params: Promise.resolve({ id: 'camp' }) });

const req = (method: string, body?: unknown) =>
    new Request('http://x', {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
    });

const asDM = () =>
    vi
        .mocked(apiAuth.requireDM)
        .mockResolvedValue({ userId: 'dm', isDM: true } as never);

const asPlayer = () =>
    vi.mocked(apiAuth.requireDM).mockResolvedValue(forbidden());

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        count: 1,
        limit: 20,
        retryAfterSeconds: 10,
    });
});

describe('player is rejected', () => {
    it('play -> 403', async () => {
        asPlayer();

        const { POST } = await import(
            '@/app/api/campaigns/[id]/sounds/play/route'
        );

        const res = await POST(req('POST', { soundId: 'builtin:bell', nonce: 'n' }), ctx());

        expect(res.status).toBe(403);
        expect(publishSoundPlay).not.toHaveBeenCalled();
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

    it('sound not owned by the DM -> 404', async () => {
        vi.mocked(store.findPlayableFor).mockResolvedValue(null);

        expect((await play('nope')).status).toBe(404);
        expect(publishSoundPlay).not.toHaveBeenCalled();
    });

    it('rate limited -> 429', async () => {
        vi.mocked(store.findPlayableFor).mockResolvedValue({ volume: 1, url: 'u' });
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

    it('custom sound publishes its url', async () => {
        vi.mocked(store.findPlayableFor).mockResolvedValue({
            volume: 0.5,
            url: 'https://cdn/s.mp3',
        });

        const res = await play('s1');

        expect(res.status).toBe(200);
        expect(store.findPlayableFor).toHaveBeenCalledWith('dm', 's1');
        expect(publishSoundPlay).toHaveBeenCalledTimes(1);
        expect(publishSoundPlay).toHaveBeenCalledWith('camp', {
            soundId: 's1',
            nonce: 'n1',
            volume: 0.5,
            url: 'https://cdn/s.mp3',
        });
    });

    it('builtin publishes no url', async () => {
        vi.mocked(store.findPlayableFor).mockResolvedValue({
            volume: 1,
            url: '/sfx/bell.mp3',
        });

        await play();

        expect(publishSoundPlay).toHaveBeenCalledWith('camp', {
            soundId: 'builtin:bell',
            nonce: 'n1',
            volume: 1,
        });
    });
});
