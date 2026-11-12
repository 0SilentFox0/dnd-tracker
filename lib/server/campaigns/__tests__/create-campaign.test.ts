import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => {
    const tx = {
        campaign: { create: vi.fn() },
        campaignSourceSync: { create: vi.fn() },
        campaignContentHide: { createMany: vi.fn() },
    };

    return {
        tx,
        db: {
            campaign: { create: vi.fn(), findUnique: vi.fn() },
            $transaction: vi.fn(async (cb: (t: unknown) => unknown) => cb(tx)),
        },
        importBundle: vi.fn(),
    };
});

vi.mock('@/lib/db', () => ({ prisma: m.db }));
vi.mock('@/lib/server/templates/import-bundle', () => ({
    importBundle: m.importBundle,
}));

import {
    createCampaignFromBundle,
    loadTemplateForUser,
} from '@/lib/server/campaigns/create-campaign';
import { type Bundle, TemplateLeakError } from '@/lib/server/templates/bundle';

const bundle = {
    formatVersion: 1,
    settings: {
        maxLevel: 12,
        xpMultiplier: 3,
        allowPlayerEdit: false,
        friendlyFire: true,
    },
    rules: {},
} as Bundle;

const clash = () =>
    new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: '6',
        meta: { target: ['inviteCode'] },
    });

describe('createCampaignFromBundle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        m.importBundle.mockResolvedValue({
            idMap: new Map([['a', 'b']]),
            warnings: ['w'],
            hashes: {},
        });
    });

    it('credits з бандла записуються в кампанію; бандл без поля credits не задає', async () => {
        m.tx.campaign.create.mockResolvedValue({ id: 'c1' });

        await createCampaignFromBundle({
            userId: 'u1',
            name: 'N',
            bundle: { ...bundle, credits: 'SRD 5.2' },
        });
        await createCampaignFromBundle({ userId: 'u1', name: 'N', bundle });

        expect(m.tx.campaign.create.mock.calls[0][0].data).toMatchObject({
            credits: 'SRD 5.2',
        });
        expect(m.tx.campaign.create.mock.calls[1][0].data).not.toHaveProperty(
            'credits'
        );
    });

    it('без бандла створює кампанію й DM-учасника без транзакції', async () => {
        m.db.campaign.create.mockResolvedValue({ id: 'c1' });

        const res = await createCampaignFromBundle({
            userId: 'u1',
            name: 'N',
            bundle: null,
        });

        expect(res).toEqual({ campaign: { id: 'c1' }, warnings: [] });
        expect(m.db.campaign.create.mock.calls[0][0].data).toMatchObject({
            dmUserId: 'u1',
            kind: 'campaign',
            visibility: 'private',
            members: { create: { userId: 'u1', role: 'dm' } },
        });
        expect(m.importBundle).not.toHaveBeenCalled();
    });

    it('без бандла у rules зберігається лише defaultAttacks', async () => {
        m.db.campaign.create.mockResolvedValue({ id: 'c1' });

        const defaultAttacks = {
            meleeName: 'Удар',
            rangedName: 'Постріл',
            weaponName: 'Зброя',
        };

        await createCampaignFromBundle({
            userId: 'u1',
            name: 'N',
            bundle: null,
            defaultAttacks,
        });

        expect(m.db.campaign.create.mock.calls[0][0].data.rules).toEqual({
            defaultAttacks,
        });
    });

    it('з бандлом: кампанія, імпорт і перевірка витоку в одній транзакції', async () => {
        m.tx.campaign.create.mockResolvedValue({ id: 'c1' });

        const res = await createCampaignFromBundle({
            userId: 'u1',
            name: 'N',
            bundle,
            createdFromId: 't1',
        });

        expect(res.warnings).toEqual(['w']);
        expect(m.tx.campaign.create.mock.calls[0][0].data).toMatchObject({
            maxLevel: 12,
            xpMultiplier: 3,
            friendlyFire: true,
            createdFromId: 't1',
        });
        expect(m.importBundle).toHaveBeenCalledWith(
            m.tx,
            bundle,
            'c1',
            undefined
        );
        expect(m.tx.campaignSourceSync.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    campaignId: 'c1',
                    sourceCampaignId: 't1',
                }),
            })
        );
    });

    it('з layer: база в кампанії, hides копіюються, стан синхронізації не створюється', async () => {
        m.tx.campaign.create.mockResolvedValue({ id: 'c1' });

        const layer = {
            sourceId: 't1',
            baseVersion: 3,
            overrides: { a: 'h' },
            hides: [{ table: 'spells', id: 'x' }],
        };

        await createCampaignFromBundle({
            userId: 'u1',
            name: 'N',
            bundle,
            createdFromId: 't1',
            sourceVersion: 9,
            layer,
        });

        expect(m.tx.campaign.create.mock.calls[0][0].data).toMatchObject({
            baseSourceId: 't1',
            baseVersion: 3,
            createdFromId: 't1',
        });
        expect(m.importBundle).toHaveBeenCalledWith(m.tx, bundle, 'c1', layer);
        expect(m.tx.campaignContentHide.createMany).toHaveBeenCalledWith({
            data: [{ campaignId: 'c1', table: 'spells', id: 'x' }],
        });
        expect(m.tx.campaignSourceSync.create).not.toHaveBeenCalled();
    });

    it('без layer база не записується і hides не чіпаються', async () => {
        m.tx.campaign.create.mockResolvedValue({ id: 'c1' });

        await createCampaignFromBundle({
            userId: 'u1',
            name: 'N',
            bundle,
            createdFromId: 't1',
        });

        expect(m.tx.campaign.create.mock.calls[0][0].data).not.toHaveProperty(
            'baseSourceId'
        );
        expect(m.tx.campaignContentHide.createMany).not.toHaveBeenCalled();
    });

    it('sourceVersion записується в стан синхронізації', async () => {
        m.tx.campaign.create.mockResolvedValue({ id: 'c1' });

        await createCampaignFromBundle({
            userId: 'u1',
            name: 'N',
            bundle,
            createdFromId: 't1',
            sourceVersion: 4,
        });

        expect(m.tx.campaignSourceSync.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ sourceVersion: 4 }),
            })
        );
    });

    it('без createdFromId стан синхронізації не створюється', async () => {
        m.tx.campaign.create.mockResolvedValue({ id: 'c1' });

        await createCampaignFromBundle({ userId: 'u1', name: 'N', bundle });

        expect(m.tx.campaignSourceSync.create).not.toHaveBeenCalled();
    });

    it('колізія коду запрошення — повтор, не більше 5 спроб', async () => {
        m.tx.campaign.create.mockRejectedValue(clash());

        await expect(
            createCampaignFromBundle({ userId: 'u1', name: 'N', bundle })
        ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
        expect(m.db.$transaction).toHaveBeenCalledTimes(5);
    });

    it('TemplateLeakError пробрасується без повтору', async () => {
        m.tx.campaign.create.mockResolvedValue({ id: 'c1' });
        m.importBundle.mockRejectedValue(new TemplateLeakError('leak'));

        await expect(
            createCampaignFromBundle({ userId: 'u1', name: 'N', bundle })
        ).rejects.toBeInstanceOf(TemplateLeakError);
        expect(m.db.$transaction).toHaveBeenCalledTimes(1);
    });

    it('settings з форми перекривають бандл, undefined — ні', async () => {
        m.tx.campaign.create.mockResolvedValue({ id: 'c1' });

        await createCampaignFromBundle({
            userId: 'u1',
            name: 'N',
            bundle,
            settings: { maxLevel: 5, allowPlayerEdit: undefined },
        });

        expect(m.tx.campaign.create.mock.calls[0][0].data).toMatchObject({
            maxLevel: 5,
            allowPlayerEdit: false,
        });
    });
});

describe('loadTemplateForUser', () => {
    const load = (row: unknown) => {
        m.db.campaign.findUnique.mockResolvedValue(row);

        return loadTemplateForUser('u1', 't1');
    };

    it.each([
        ['немає рядка', null, { ok: false, status: 404 }],
        [
            'звичайна кампанія',
            { kind: 'campaign', visibility: 'official', members: [] },
            { ok: false, status: 404 },
        ],
        [
            'чужий приватний',
            { kind: 'template', visibility: 'private', members: [] },
            { ok: false, status: 403 },
        ],
        [
            'гравець приватного',
            {
                kind: 'template',
                visibility: 'private',
                members: [{ role: 'player' }],
            },
            { ok: false, status: 403 },
        ],
    ])('%s', async (_n, row, expected) => {
        expect(await load(row)).toEqual(expected);
    });

    it('офіційний — будь-кому, приватний — DM', async () => {
        expect(
            (
                await load({
                    kind: 'template',
                    visibility: 'official',
                    members: [],
                })
            ).ok
        ).toBe(true);
        expect(
            (
                await load({
                    kind: 'template',
                    visibility: 'private',
                    members: [{ role: 'dm' }],
                })
            ).ok
        ).toBe(true);
    });
});
