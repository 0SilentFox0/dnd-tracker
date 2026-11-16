import { beforeEach, describe, expect, it, vi } from 'vitest';

const ticket = vi.hoisted(() => vi.fn());

vi.mock('@/lib/server/battle-maps/background-upload', () => ({
    createBattleMapBackgroundUploadTicket: ticket,
}));
vi.mock('@/lib/utils/api/as-dm', () => ({
    withDM: (_id: string, _action: string, handler: () => unknown) => handler(),
}));

import { POST } from '../route';

const request = (body: unknown) =>
    new Request('https://app.test/api/campaigns/c/maps/background-upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });

describe('battle map background upload ticket', () => {
    beforeEach(() => vi.clearAllMocks());
    it('issues a campaign scoped ticket for supported image types', async () => {
        ticket.mockResolvedValue({
            ok: true,
            value: { bucket: 'battle-maps', path: 'c/image.webp' },
        });

        const response = await POST(
            request({ size: 100, contentType: 'image/webp' }),
            {
                params: Promise.resolve({ id: 'c' }),
            }
        );

        expect(response.status).toBe(200);
        expect(ticket).toHaveBeenCalledWith('c', 'image/webp');
    });

    it('rejects unsupported formats and oversized uploads', async () => {
        expect(
            (
                await POST(request({ size: 100, contentType: 'image/gif' }), {
                    params: Promise.resolve({ id: 'c' }),
                })
            ).status
        ).toBe(400);
        expect(
            (
                await POST(
                    request({
                        size: 9 * 1024 * 1024,
                        contentType: 'image/png',
                    }),
                    {
                        params: Promise.resolve({ id: 'c' }),
                    }
                )
            ).status
        ).toBe(400);
        expect(ticket).not.toHaveBeenCalled();
    });
});
