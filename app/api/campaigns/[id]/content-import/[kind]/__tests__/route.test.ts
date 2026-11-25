import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const importContent = vi.hoisted(() => vi.fn());

const withHeavySlot = vi.hoisted(() => vi.fn());

vi.mock('@/lib/server/content/content-routes', () => ({
    operationRoute:
        (_op: unknown, handler: (args: unknown) => unknown) =>
        (args: unknown) =>
            handler(args),
}));
vi.mock('@/lib/server/content/import/import-content', () => ({
    importContent,
}));
vi.mock('@/lib/server/content/import/kind', () => ({
    importKindOf: (k: string) => k,
}));
vi.mock('@/lib/server/content/import/translate-report', () => ({
    translatedImport: async (r: unknown) => r,
}));
vi.mock('@/lib/server/ops/heavy-limiter', () => ({ withHeavySlot }));

import { POST } from '../route';

const call = () =>
    (POST as unknown as (a: unknown) => Promise<NextResponse>)({
        actor: { userId: 'u1' },
        params: { kind: 'feats' },
        body: { rows: [], mode: 'create', dryRun: false },
    });

beforeEach(() => vi.clearAllMocks());

describe('content-import POST', () => {
    it('runs the import inside a heavy slot', async () => {
        withHeavySlot.mockImplementation((fn: () => unknown) => fn());
        importContent.mockResolvedValue({ counts: { created: 1 } });

        const res = await call();

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ counts: { created: 1 } });
    });

    it('passes the 503 of a busy limiter through without importing', async () => {
        withHeavySlot.mockResolvedValue(
            NextResponse.json({ error: 'busy' }, { status: 503 })
        );

        const res = await call();

        expect(res.status).toBe(503);
        expect(importContent).not.toHaveBeenCalled();
    });
});
