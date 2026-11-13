import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getResponseJson } from './helpers';

const db = vi.hoisted(() => ({
    $transaction: async (callback: (tx: object) => unknown) =>
        callback({
            $queryRaw: async () => [{ id: 'c1' }],
            campaign: { update: async () => ({ contentVersion: 1 }) },
        }),
    campaign: {
        findUnique: vi.fn(async () => ({ rules: { system: { key: 'homm' } } })),
    },
    race: { findMany: vi.fn() },
    spell: { count: vi.fn() },
    unit: { findMany: vi.fn(), createMany: vi.fn() },
}));

const revalidateTag = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('next/cache', () => ({ revalidateTag }));
vi.mock('@/lib/utils/api/api-auth', () => ({
    requireDM: vi.fn(async () => ({ userId: 'dm' })),
}));

import { POST } from '@/app/api/campaigns/[id]/units/import/route';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

const post = (body: unknown) =>
    POST(
        new Request('http://x', { method: 'POST', body: JSON.stringify(body) }),
        { params: Promise.resolve({ id: 'c1' }) }
    ) as Promise<NextResponse>;

describe('POST units/import', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        db.campaign.findUnique.mockResolvedValue({
            rules: { system: { key: 'homm' } },
        });
        db.race.findMany.mockResolvedValue([{ id: 'r1', name: 'Гобліни' }]);
        db.unit.findMany.mockResolvedValue([]);
        db.spell.count.mockResolvedValue(1);
        db.unit.createMany.mockImplementation(
            async ({ data }: { data: unknown[] }) => ({ count: data.length })
        );
    });

    it('Traits у homm/dnd5e — 400 і нічого не створено; у wfrp — створено з abilities і characteristics', async () => {
        const ward = {
            id: 'ward',
            name: 'Ward 9+',
            trigger: { event: 'passive' },
            effects: [{ kind: 'wfrpWard', value: 9 }],
        };

        for (const rules of [
            { system: { key: 'homm' } },
            { system: { key: 'dnd5e' } },
        ]) {
            db.campaign.findUnique.mockResolvedValue({ rules } as never);

            const res = await post({
                units: [{ name: 'Shade', abilities: [ward] }],
            });

            expect(res.status).toBe(422);
        }

        expect(db.unit.createMany).not.toHaveBeenCalled();

        db.campaign.findUnique.mockResolvedValue({
            rules: WFRP_RULES,
        } as never);

        const ok = await post({
            units: [
                {
                    name: 'Shade',
                    abilities: [ward],
                    characteristics: { base: { ws: 45 }, move: 6 },
                },
            ],
        });

        expect(ok.status).toBe(200);
        expect(db.unit.createMany.mock.calls[0][0].data[0]).toMatchObject({
            abilities: [ward],
            characteristics: {
                base: expect.objectContaining({ ws: 45 }),
                move: 6,
            },
        });
    });

    it('wfrp: невалідні characteristics — 400; неповні добудовуються дефолтами', async () => {
        db.campaign.findUnique.mockResolvedValue({
            rules: WFRP_RULES,
        } as never);

        const bad = await post({
            units: [
                {
                    name: 'Shade',
                    characteristics: { base: { ws: 'x' }, move: 'fast' },
                },
            ],
        });

        expect(bad.status).toBe(400);
        expect(db.unit.createMany).not.toHaveBeenCalled();

        const ok = await post({
            units: [{ name: 'Shade', characteristics: { base: { ws: 45 } } }],
        });

        expect(ok.status).toBe(200);
        expect(
            db.unit.createMany.mock.calls[0][0].data[0].characteristics
        ).toMatchObject({
            base: expect.objectContaining({ ws: 45, bs: expect.any(Number) }),
            move: expect.any(Number),
        });
    });

    it('звіт з невідомими расами, атаки з усіма полями, інвалідує units', async () => {
        const attack = {
            name: 'Лук',
            type: 'ranged',
            targetType: 'aoe',
            attackBonus: 4,
            damageType: 'piercing',
            damageDice: '1d6',
            maxTargets: 2,
            damageDistribution: [60, 40],
            guaranteedDamage: 1,
        };

        const res = await post({
            units: [
                { name: 'Лучник', raceName: 'гобліни', attacks: [attack] },
                { name: 'Привид', raceName: 'Нежить' },
            ],
        });

        expect(res.status).toBe(200);
        expect(await getResponseJson(res)).toEqual({
            imported: 2,
            total: 2,
            skipped: 0,
            unknownRaces: ['Нежить'],
        });
        expect(db.unit.createMany.mock.calls[0][0].data[0]).toMatchObject({
            raceId: 'r1',
            attacks: [attack],
        });
        expect(revalidateTag).toHaveBeenCalledWith('units-c1', { expire: 0 });
    });

    it('gridSize імпортується', async () => {
        await post({ units: [{ name: 'Огр', gridSize: 2 }] });

        expect(db.unit.createMany.mock.calls[0][0].data[0]).toMatchObject({
            gridSize: 2,
        });
    });

    it('невалідний avatar — 400, нічого не створено', async () => {
        const res = await post({
            units: [{ name: 'X', avatar: 'data:image/png;base64,AAA' }],
        });

        expect(res.status).toBe(400);
        expect(db.unit.createMany).not.toHaveBeenCalled();
    });

    it('чужі id заклинань у knownSpells — 400, нічого не створено', async () => {
        db.spell.count.mockResolvedValue(0);

        const res = await post({
            units: [{ name: 'Маг', knownSpells: ['foreign'] }],
        });

        expect(res.status).toBe(400);
        expect(db.unit.createMany).not.toHaveBeenCalled();
    });
});
