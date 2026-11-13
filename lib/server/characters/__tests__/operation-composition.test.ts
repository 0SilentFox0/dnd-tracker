import { NextResponse } from 'next/server';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ContentError } from '@/lib/server/content/errors';
import { parseRules } from '@/lib/utils/rules/schema';

const h = vi.hoisted(() => ({
    campaign: { findUnique: vi.fn() },
    character: { findUnique: vi.fn(), findMany: vi.fn() },
    $queryRaw: vi.fn(),
    access: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: { ...h, $transaction: (fn: (db: typeof h) => unknown) => fn(h) },
}));
vi.mock('@/lib/utils/api/api-auth', () => ({
    requireCampaignAccess: h.access,
    requireDM: h.access,
}));

type Registry = typeof import('@/lib/server/characters/operations/registry');

type Progression = typeof import('@/lib/server/characters/progression-service');

let operations: Registry['CHARACTER_OPERATIONS'];

let runCharacterProgression: Progression['runCharacterProgression'];

beforeAll(async () => {
    await import('@/lib/server/systems/registry');
    operations = (await import('@/lib/server/characters/operations/registry'))
        .CHARACTER_OPERATIONS;
    runCharacterProgression = (
        await import('@/lib/server/characters/progression-service')
    ).runCharacterProgression;
}, 30_000);

const campaignOf = (system: object) => ({
    id: 'camp',
    kind: 'standard',
    maxLevel: 20,
    allowPlayerEdit: false,
    rules: parseRules({ system }),
    members: [{ userId: 'dm', role: 'dm' }],
});

const accessOf = (system: object) => ({
    userId: 'dm',
    isDM: true,
    campaign: campaignOf(system),
});

const hero = {
    id: 'hero',
    campaignId: 'camp',
    controlledBy: 'dm',
    inventory: null,
};

const actor = {
    campaignId: 'camp',
    userId: 'dm',
    isDM: true,
    via: 'session' as const,
    scopes: null,
};

const gateOf = (key: string, system: object) =>
    operations[key].gate({
        campaignId: 'camp',
        characterId: 'hero',
        access: accessOf(system) as never,
    });

beforeEach(() => {
    vi.clearAllMocks();
    h.character.findUnique.mockResolvedValue(hero);
    h.$queryRaw.mockResolvedValue([{ id: 'camp' }]);
});

describe('one composition gate for every system operation', () => {
    it('advance is 404 in bare dnd5e and open in wfrp', async () => {
        const hidden = await gateOf('advance', { key: 'dnd5e' });

        expect(hidden).toBeInstanceOf(NextResponse);
        expect((hidden as NextResponse).status).toBe(404);
        expect(await gateOf('advance', { key: 'wfrp' })).not.toBeInstanceOf(
            NextResponse
        );
    });

    it('is checked by registry key: advance.undo (operation name advance-undo) passes in wfrp', async () => {
        expect(operations['advance.undo'].name).toBe('advance-undo');
        expect(
            await gateOf('advance.undo', { key: 'wfrp' })
        ).not.toBeInstanceOf(NextResponse);

        const hidden = await gateOf('advance.undo', { key: 'dnd5e' });

        expect((hidden as NextResponse).status).toBe(404);
    });

    it('progression passes in homm and is hidden without skilltrees', async () => {
        expect(await gateOf('progression', { key: 'homm' })).not.toBeInstanceOf(
            NextResponse
        );

        const hidden = await gateOf('progression', { key: 'dnd5e' });

        expect((hidden as NextResponse).status).toBe(404);
    });

    it('answers a non-member with the access 403, not the composition 404', async () => {
        h.access.mockResolvedValue(
            NextResponse.json({ error: 'errors.forbidden' }, { status: 403 })
        );

        const gate = await operations.advance.gate({
            campaignId: 'camp',
            characterId: 'hero',
        });

        expect((gate as NextResponse).status).toBe(403);
    });

    it('the assistant gets ContentError 404 for advance in dnd5e', async () => {
        h.campaign.findUnique.mockResolvedValue(campaignOf({ key: 'dnd5e' }));

        const error = await runCharacterProgression(actor, 'advance', {
            characterId: 'hero',
            kind: 'skill',
            key: 'dodge',
        }).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(ContentError);
        expect((error as ContentError).status).toBe(404);
    });
});
