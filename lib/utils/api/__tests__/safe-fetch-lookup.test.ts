import { createServer, request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it, vi } from 'vitest';

import { pinnedLookup } from '@/lib/utils/api/safe-fetch';

describe('pinnedLookup', () => {
    it('answers a single address when all is false', () => {
        const cb = vi.fn();

        pinnedLookup('93.184.216.34', 4)('h', { all: false }, cb);
        expect(cb).toHaveBeenCalledWith(null, '93.184.216.34', 4);
    });

    it('answers an array when all is true', () => {
        const cb = vi.fn();

        pinnedLookup('93.184.216.34', 4)('h', { all: true }, cb);
        expect(cb).toHaveBeenCalledWith(null, [
            { address: '93.184.216.34', family: 4 },
        ]);
    });

    it('works with the real node socket connect path (autoSelectFamily passes all: true)', async () => {
        const server = createServer((_req, res) => res.end('ok'));

        await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));

        const { port } = server.address() as AddressInfo;

        try {
            const body = await new Promise<string>((resolve, reject) => {
                request(
                    {
                        host: 'pinned.invalid',
                        port,
                        lookup: pinnedLookup('127.0.0.1', 4),
                    },
                    (res) => {
                        let data = '';

                        res.on('data', (c) => (data += c));
                        res.on('end', () => resolve(data));
                    }
                )
                    .on('error', reject)
                    .end();
            });

            expect(body).toBe('ok');
        } finally {
            server.close();
        }
    });
});
