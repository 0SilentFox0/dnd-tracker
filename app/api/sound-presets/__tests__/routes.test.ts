import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_ERRORS } from '@/lib/constants/api-errors';
import * as presets from '@/lib/server/soundboard/preset-store';
import * as apiAuth from '@/lib/utils/api/api-auth';
import { ContentError } from '@/lib/utils/api/content-error';

vi.mock('@/lib/utils/api/api-auth', () => ({ requireAuth: vi.fn() }));
vi.mock('@/lib/server/soundboard/preset-store', () => ({
    createPreset: vi.fn(),
    updatePreset: vi.fn(),
    deletePreset: vi.fn(),
    reorderPresets: vi.fn(),
}));

const ctx = { params: Promise.resolve({ id: 'p1' }) };

const req = (method: string, body?: unknown) =>
    new Request('http://x', {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
    });

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireAuth).mockResolvedValue({ userId: 'u1' });
});

describe('unauthenticated', () => {
    beforeEach(() => {
        vi.mocked(apiAuth.requireAuth).mockResolvedValue(
            NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
        );
    });

    it.each([
        ['', 'POST', { name: 'n' }],
        ['/[id]', 'PATCH', { name: 'n' }],
        ['/[id]', 'DELETE', undefined],
        ['/order', 'PUT', { ids: [] }],
    ])('%s %s -> 401', async (path, method, body) => {
        const mod = await import(`@/app/api/sound-presets${path}/route`);

        expect((await mod[method](req(method, body), ctx)).status).toBe(401);
        expect(presets.createPreset).not.toHaveBeenCalled();
    });
});

describe('presets', () => {
    it('POST creates -> 201', async () => {
        vi.mocked(presets.createPreset).mockResolvedValue({} as never);

        const { POST } = await import('@/app/api/sound-presets/route');

        expect((await POST(req('POST', { name: 'n' }))).status).toBe(201);
        expect(presets.createPreset).toHaveBeenCalledWith('u1', 'n');
    });

    it("PATCH another user's preset -> 404", async () => {
        vi.mocked(presets.updatePreset).mockRejectedValue(
            new ContentError(API_ERRORS.PRESET_NOT_FOUND, 404)
        );

        const { PATCH } = await import('@/app/api/sound-presets/[id]/route');

        expect((await PATCH(req('PATCH', { name: 'x' }), ctx)).status).toBe(404);
    });

    it('PATCH with 8 slots -> 400, nothing saved', async () => {
        const { PATCH } = await import('@/app/api/sound-presets/[id]/route');

        const res = await PATCH(
            req('PATCH', { slots: Array.from({ length: 8 }, () => null) }),
            ctx
        );

        expect(res.status).toBe(400);
        expect(presets.updatePreset).not.toHaveBeenCalled();
    });

    it('PUT order reorders for the session user', async () => {
        const { PUT } = await import('@/app/api/sound-presets/order/route');

        const res = await PUT(req('PUT', { ids: ['b', 'a'] }));

        expect(res.status).toBe(200);
        expect(presets.reorderPresets).toHaveBeenCalledWith('u1', ['b', 'a']);
    });
});
