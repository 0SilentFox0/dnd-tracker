import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const runBattleMutation = vi.hoisted(() => vi.fn());

vi.mock('@/lib/server/battles/run-mutation', () => ({ runBattleMutation }));

import { POST } from '../route';

const ROOT = path.resolve(__dirname, '../../../../../../../..');

describe('POST battles/[battleId]/map-fog', () => {
    it('runs the map-fog operation for the battle in the path', async () => {
        const response = new Response(null, { status: 200 });

        runBattleMutation.mockResolvedValue(response);

        const req = new Request('http://x', { method: 'POST', body: '{}' });

        const params = { id: 'c1', battleId: 'b1' };

        expect(await POST(req, { params: Promise.resolve(params) })).toBe(
            response
        );
        expect(runBattleMutation).toHaveBeenCalledWith(req, {
            params,
            operation: 'map-fog',
        });
    });
});

describe('battle client operations', () => {
    it('every client path has a route handler', () => {
        const client = fs.readFileSync(
            path.join(ROOT, 'lib/api/battle-ops.ts'),
            'utf8'
        );

        const paths = [...client.matchAll(/path: '\/([a-z-]+)'/g)].map(
            (m) => m[1]
        );

        const dir = path.join(ROOT, 'app/api/campaigns/[id]/battles/[battleId]');

        expect(paths).toContain('map-fog');
        expect(
            paths.filter((p) => !fs.existsSync(path.join(dir, p, 'route.ts')))
        ).toEqual([]);
    });
});
