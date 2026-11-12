import { describe, expect, it, vi } from 'vitest';

const referenced = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: { marker: 'db' } }));
vi.mock('@/lib/server/systems/registry', () => ({
    systemContentRefs: () => [
        { kind: 'feats', reason: 'r', error: 'errors.test', referenced },
        { kind: 'artifacts', reason: 'r', referenced },
    ],
}));

import { unreferencedGuard } from '@/lib/server/content/referenced';

describe('unreferencedGuard', () => {
    it('409 with the source error while a module references the row', async () => {
        referenced.mockResolvedValue(new Set(['f1']));

        await expect(
            unreferencedGuard('c1', 'feats', 'f1')()
        ).rejects.toMatchObject({ status: 409, message: 'errors.test' });
        expect(referenced).toHaveBeenCalledWith({ marker: 'db' }, 'c1');
    });

    it('passes when the id is not referenced', async () => {
        referenced.mockResolvedValue(new Set(['other']));

        await expect(
            unreferencedGuard('c1', 'feats', 'f1')()
        ).resolves.toBeUndefined();
    });

    it('ignores kinds without a source or without an error key', async () => {
        referenced.mockClear();

        await unreferencedGuard('c1', 'artifacts', 'a1')();
        await unreferencedGuard('c1', 'spells', 's1')();

        expect(referenced).not.toHaveBeenCalled();
    });
});
