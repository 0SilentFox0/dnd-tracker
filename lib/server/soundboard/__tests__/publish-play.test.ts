import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/utils/common/logger', () => ({ logger: { error: vi.fn() } }));

const h = vi.hoisted(() => ({
    findFirst: vi.fn(),
    trigger: vi.fn(async () => undefined),
}));

vi.mock('@/lib/db', () => ({
    prisma: { battleScene: { findFirst: h.findFirst } },
}));
vi.mock('@/lib/pusher/server', () => ({ pusherServer: { name: 'pusher' } }));
vi.mock('@/lib/pusher/safe-trigger', () => ({ safePusherTrigger: h.trigger }));

import { publishSoundPlay } from '../publish-play';

import { SOUNDBOARD_PLAY_EVENT } from '@/lib/constants/soundboard';

const event = { soundId: 'builtin:bell', nonce: 'n1', volume: 1 };

describe('publishSoundPlay', () => {
    beforeEach(() => vi.clearAllMocks());

    it('publishes to the show and battle channels during a battle', async () => {
        h.findFirst.mockResolvedValue({ id: 'b1' });

        await publishSoundPlay('c1', event);

        expect(h.trigger.mock.calls.map((c) => c[1])).toEqual([
            'private-show-c1',
            'private-battle-b1',
        ]);
        expect(h.trigger.mock.calls[0][2]).toBe(SOUNDBOARD_PLAY_EVENT);
        expect(h.trigger.mock.calls[0][3]).toEqual(event);
    });

    it('publishes only to the show channel without a battle', async () => {
        h.findFirst.mockResolvedValue(null);

        await publishSoundPlay('c1', event);

        expect(h.trigger).toHaveBeenCalledTimes(1);
    });

    it('still publishes to the show channel when the battle lookup fails', async () => {
        h.findFirst.mockRejectedValue(new Error('db down'));

        await expect(publishSoundPlay('c1', event)).resolves.toBeUndefined();

        expect(h.trigger.mock.calls.map((c) => c[1])).toEqual([
            'private-show-c1',
        ]);
    });
});
