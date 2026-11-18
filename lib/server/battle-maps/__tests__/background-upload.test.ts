import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { verifyBattleMapBackground } from '../background-upload';

const name = 'b'.repeat(32);

const url = (campaign: string, ext = 'png') =>
    `https://p.supabase.co/storage/v1/object/public/battle-maps/${campaign}/${name}.${ext}`;

const bytes = (...b: number[]) => new Uint8Array([...b, ...Array(28).fill(0)]);

const respond = (body: Uint8Array, ok = true, status = 404) =>
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({
            ok,
            status: ok ? 200 : status,
            arrayBuffer: async () => body.buffer,
        }))
    );

describe('verifyBattleMapBackground', () => {
    beforeEach(() => {
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://p.supabase.co');
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });
    afterEach(() => vi.unstubAllGlobals());

    it('accepts real PNG bytes under the campaign prefix', async () => {
        respond(bytes(0x89, 0x50, 0x4e, 0x47));

        expect(await verifyBattleMapBackground('c1', url('c1'))).toBe('valid');
    });

    it('rejects HTML disguised as an image', async () => {
        respond(new TextEncoder().encode('<html><script>alert(1)</script>'));

        expect(await verifyBattleMapBackground('c1', url('c1'))).toBe('invalid');
    });

    it('rejects bytes that do not match the extension', async () => {
        respond(bytes(0xff, 0xd8, 0xff));

        expect(await verifyBattleMapBackground('c1', url('c1', 'png'))).toBe(
            'invalid'
        );
    });

    it('rejects another campaign URL without fetching', async () => {
        respond(bytes(0x89, 0x50, 0x4e, 0x47));

        expect(await verifyBattleMapBackground('c1', url('c2'))).toBe('invalid');
        expect(fetch).not.toHaveBeenCalled();
    });

    it('rejects a missing object', async () => {
        respond(bytes(0x89, 0x50, 0x4e, 0x47), false, 404);
        expect(await verifyBattleMapBackground('c1', url('c1'))).toBe('invalid');
    });

    it('reports unavailable (not invalid) on a network failure or 5xx so the file is kept', async () => {
        respond(bytes(0x89, 0x50, 0x4e, 0x47), false, 503);
        expect(await verifyBattleMapBackground('c1', url('c1'))).toBe('unavailable');

        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('x')));
        expect(await verifyBattleMapBackground('c1', url('c1'))).toBe('unavailable');
    });
});
