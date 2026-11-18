import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const storage = vi.hoisted(() => ({
    listBuckets: vi.fn(),
    createBucket: vi.fn(),
    updateBucket: vi.fn(),
    createSignedUploadUrl: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: () => ({
        storage: {
            listBuckets: storage.listBuckets,
            createBucket: storage.createBucket,
            updateBucket: storage.updateBucket,
            from: () => ({
                createSignedUploadUrl: storage.createSignedUploadUrl,
                getPublicUrl: (path: string) => ({
                    data: {
                        publicUrl: `https://p.supabase.co/storage/v1/object/public/battle-maps/${path}`,
                    },
                }),
            }),
        },
    }),
}));
vi.mock('@/lib/utils/api/as-dm', () => ({
    withDM: (_id: string, _action: string, handler: () => unknown) => handler(),
}));

// ensureBucket memoizes per module instance, so each test imports a fresh route
const call = async (body: unknown) => {
    const { POST } = await import('../route');

    return POST(
        new Request('https://app.test/api/x', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ id: 'camp1' }) }
    );
};

describe('background-upload ticket against the storage boundary', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://p.supabase.co');
        storage.listBuckets.mockResolvedValue({
            data: [{ name: 'battle-maps' }],
            error: null,
        });
        storage.updateBucket.mockResolvedValue({ error: null });
        storage.createSignedUploadUrl.mockImplementation(
            async (path: string) => ({ data: { path, token: 't' }, error: null })
        );
    });

    it('issues a ticket under the campaign prefix with the matching extension', async () => {
        const res = await call({ size: 100, contentType: 'image/jpeg' });

        expect(res.status).toBe(200);

        const body = await res.json();

        expect(body.path).toMatch(/^camp1\/[a-f0-9]{32}\.jpg$/);
        expect(body.contentType).toBe('image/jpeg');
    });

    it('rejects non-allowlisted types', async () => {
        expect((await call({ size: 100, contentType: 'text/html' })).status).toBe(
            400
        );
        expect(storage.createSignedUploadUrl).not.toHaveBeenCalled();
    });

    it('never leaks the raw Supabase error text', async () => {
        storage.createSignedUploadUrl.mockResolvedValue({
            data: null,
            error: { message: 'secret-service-role-detail' },
        });

        const res = await call({ size: 100, contentType: 'image/png' });

        expect(res.status).toBe(500);
        expect(JSON.stringify(await res.json())).not.toContain('secret');
    });

    it('hides bucket provisioning errors too', async () => {
        storage.listBuckets.mockResolvedValue({
            data: null,
            error: { message: 'jwt malformed: eyJhbGciOi' },
        });

        const res = await call({ size: 100, contentType: 'image/png' });

        expect(res.status).toBe(500);
        expect(JSON.stringify(await res.json())).not.toContain('jwt');
    });
});
