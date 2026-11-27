import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/server/inventory/log', () => ({
    writeInventoryLog: vi.fn(),
}));

import { grantStartingKit } from '../grant-kit';

import { writeInventoryLog } from '@/lib/server/inventory/log';

const row = (id: string, slug: string, slot: string) => ({
    id,
    slug,
    slot,
    name: slug,
    icon: null,
    rarity: 'common',
    description: null,
    bonuses: {},
    modifiers: [],
    systemStats: { item: { unique: false } },
});

const rows = [
    row('a-dagger', 'srd_dagger', 'weapon'),
    row('a-leather', 'srd_leather-armor', 'armor'),
];

function makeTx() {
    const update = vi.fn();

    const tx = {
        artifact: { findMany: vi.fn().mockResolvedValue(rows) },
        characterInventory: {
            upsert: vi.fn().mockResolvedValue({
                equipped: {},
                stash: [],
                items: [],
                gold: 0,
                silver: 0,
                copper: 0,
                attuned: [],
            }),
            update,
        },
    };

    return { tx, update };
}

const ctx = {
    campaignId: 'c1',
    characterId: 'h1',
    actorUserId: 'u1',
    classesEnabled: true,
};

describe('grantStartingKit', () => {
    it('grants gear, equips weapon and armor, adds gold, writes the log', async () => {
        const { tx, update } = makeTx();

        const { skipped } = await grantStartingKit(tx as never, ctx, {
            items: [
                { artifact: 'srd_dagger', quantity: 2 },
                { artifact: 'srd_leather-armor', quantity: 1 },
            ],
            gp: 5,
        });

        expect(skipped).toEqual([]);

        const data = update.mock.calls[0][0].data;

        expect(data.equipped).toMatchObject({
            weapon: 'a-dagger',
            armor: 'a-leather',
        });
        expect(data.stash).toEqual([]);
        expect(data.gold).toBe(5);

        const entries = vi.mocked(writeInventoryLog).mock.calls.at(-1)![1];

        expect(entries.length).toBe(5);
        expect(entries.every((e) => e.note !== null)).toBe(true);
    });

    it('reports a missing slug and still grants the rest', async () => {
        const { tx, update } = makeTx();

        const { skipped } = await grantStartingKit(tx as never, ctx, {
            items: [
                { artifact: 'srd_dagger', quantity: 1 },
                { artifact: 'srd_gone-sword', quantity: 1 },
            ],
            gp: 0,
        });

        expect(skipped).toEqual(['gone sword']);
        expect(update.mock.calls[0][0].data.equipped).toMatchObject({
            weapon: 'a-dagger',
        });
    });

    it('does nothing for an empty kit', async () => {
        const { tx, update } = makeTx();

        await grantStartingKit(tx as never, ctx, { items: [], gp: 0 });

        expect(update).not.toHaveBeenCalled();
    });
});
