import { beforeEach, describe, expect, it, vi } from 'vitest';

import { verifyApiToken } from '../api-tokens';

const db = vi.hoisted(() => ({
    locale: null as string | null | undefined,
    kind: 'campaign',
    dmUserId: 'u',
    memberRole: 'dm' as string | null,
    scopes: [] as string[],
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: {
        apiToken: {
            findUnique: async () => ({
                id: 't',
                campaignId: 'c',
                userId: 'u',
                revokedAt: null,
                scopes: db.scopes,
                campaign: { kind: db.kind, dmUserId: db.dmUserId },
            }),
            updateMany: async () => ({ count: 1 }),
        },
        campaignMember: {
            findMany: async () =>
                db.memberRole ? [{ role: db.memberRole }] : [],
        },
        user: {
            findUnique: async () =>
                db.locale === undefined ? null : { locale: db.locale },
        },
    },
}));

describe('verifyApiToken locale', () => {
    beforeEach(() => {
        db.locale = null;
        db.kind = 'campaign';
        db.dmUserId = 'u';
        db.memberRole = 'dm';
        db.scopes = [];
    });

    it.each([
        ['uk', 'uk'],
        ['en', 'en'],
        ['fr', 'en'],
        [null, 'en'],
        [undefined, 'en'],
    ])('owner locale %s -> %s', async (stored, expected) => {
        db.locale = stored;

        expect((await verifyApiToken('dndt_x'))?.locale).toBe(expected);
    });

    it('allows the Demo owner token without inventing DM membership', async () => {
        db.kind = 'demo';
        db.memberRole = null;
        db.scopes = ['ai', 'content:write', 'scenario:read', 'battles:read'];
        expect(await verifyApiToken('dndt_x')).toMatchObject({
            userId: 'u',
            scopes: ['scenario:read', 'battles:read'],
        });
    });

    it('rejects a Demo token owned by someone other than the campaign owner', async () => {
        db.kind = 'demo';
        db.dmUserId = 'another-user';
        db.memberRole = null;
        expect(await verifyApiToken('dndt_x')).toBeNull();
    });
});
