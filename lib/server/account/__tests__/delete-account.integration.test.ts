import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
    afterAll,
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { deleteAccount } from '@/lib/server/account/delete-account';
import { AccountDeleteBlockedError } from '@/lib/server/account/template-guard';
import { defaultPipelineDeps } from '@/lib/server/battles/pipeline-deps';
import { reassignUserParticipants } from '@/lib/server/battles/reassign-user-participants';
import { loadBattle } from '@/lib/server/battles/store/load-battle';
import {
    isLocalDevDatabaseEnv,
    singleConnectionDatabaseUrl,
} from '@/lib/server/test-support/local-db';
import { hashEmail } from '@/lib/utils/admin/email-hash';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { splitParticipant } from '@/lib/utils/battle/store/split-participant';
import { hashJson } from '@/lib/utils/battle/store/stable-json';
import { parseRules } from '@/lib/utils/rules/schema';

const db = new PrismaClient({
    datasources: {
        db: { url: singleConnectionDatabaseUrl('DATABASE_URL') },
    },
    log: [],
});

const tag = randomUUID().slice(0, 8);

const id = (name: string) => `del-${tag}-${name}`;

const user = (name: string) =>
    db.user.create({
        data: {
            id: id(name),
            email: `${id(name)}@example.test`,
            displayName: name,
        },
    });

const campaign = (
    name: string,
    dm: string,
    extra: Record<string, unknown> = {}
) =>
    db.campaign.create({
        data: {
            id: id(name),
            name,
            inviteCode: id(`inv-${name}`),
            dmUserId: id(dm),
            ...extra,
        },
    });

const member = (campaignName: string, userName: string, role: string) =>
    db.campaignMember.create({
        data: { campaignId: id(campaignName), userId: id(userName), role },
    });

const deps = () => ({
    removeAuthUser: vi.fn().mockResolvedValue(undefined),
    removeFiles: vi.fn().mockResolvedValue(undefined),
    planStorage: vi.fn().mockResolvedValue([]),
    reassignParticipants: vi
        .fn()
        .mockResolvedValue({ battleIds: [], failedBattleIds: [] }),
});

const suiteStart = new Date();

const cleanup = async () => {
    await db.accountDeletion.deleteMany({
        where: { deletedAt: { gte: suiteStart } },
    });
    await db.campaign.deleteMany({
        where: { id: { startsWith: `del-${tag}` } },
    });
    await db.user.deleteMany({ where: { id: { startsWith: `del-${tag}` } } });
};

describe.skipIf(!isLocalDevDatabaseEnv())('deleteAccount', () => {
    beforeEach(cleanup);

    afterAll(async () => {
        await cleanup();
        await db.$disconnect();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('logs a self deletion with campaign count and hashed email', async () => {
        vi.stubEnv('ADMIN_HASH_SECRET', 'test-secret');
        await user('a');
        await campaign('c1', 'a');
        await campaign('c2', 'a');
        await member('c1', 'a', 'dm');
        await member('c2', 'a', 'dm');

        await deleteAccount(id('a'), deps());

        const rows = await db.accountDeletion.findMany({
            where: { deletedAt: { gte: suiteStart } },
        });

        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            by: 'self',
            campaigns: 2,
            accountAgeDays: 0,
        });
        expect(rows[0].emailHash).toBe(
            hashEmail(`${id('a')}@example.test`, 'test-secret')
        );
    });

    it('stores a null emailHash without the secret and honours by=admin', async () => {
        vi.stubEnv('ADMIN_HASH_SECRET', '');
        await user('a');

        await deleteAccount(id('a'), deps(), { by: 'admin' });

        const rows = await db.accountDeletion.findMany({
            where: { deletedAt: { gte: suiteStart } },
        });

        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ by: 'admin', emailHash: null });
    });

    it('writes nothing for a missing user', async () => {
        await deleteAccount(id('ghost'), deps());

        expect(
            await db.accountDeletion.count({
                where: { deletedAt: { gte: suiteStart } },
            })
        ).toBe(0);
    });

    it('removes the DM account with its campaign, keeps the player user', async () => {
        await user('a');
        await user('b');
        await campaign('c1', 'a');
        await member('c1', 'a', 'dm');
        await member('c1', 'b', 'player');
        await db.character.create({
            data: {
                campaignId: id('c1'),
                type: 'pc',
                controlledBy: id('b'),
                name: 'Hero',
                class: 'fighter',
                race: 'human',
            },
        });
        await db.battleScene.create({
            data: { campaignId: id('c1'), name: 'Fight', ownerUserId: id('a') },
        });
        await db.scenarioPage.create({
            data: { campaignId: id('c1'), kind: 'scene', title: 'Intro' },
        });
        await db.soundLibraryItem.create({
            data: {
                userId: id('a'),
                url: 'https://example.test/s.mp3',
                durationMs: 1000,
                source: 'upload',
            },
        });

        const d = deps();

        const result = await deleteAccount(id('a'), d);

        expect(result).toEqual({ deletedCampaigns: 1 });
        expect(
            await db.campaign.findUnique({ where: { id: id('c1') } })
        ).toBeNull();
        expect(await db.user.findUnique({ where: { id: id('a') } })).toBeNull();
        expect(
            await db.user.findUnique({ where: { id: id('b') } })
        ).not.toBeNull();
        expect(
            await db.campaignMember.count({ where: { userId: id('b') } })
        ).toBe(0);
        expect(
            await db.soundLibraryItem.count({ where: { userId: id('a') } })
        ).toBe(0);
        expect(d.removeAuthUser).toHaveBeenCalledWith(id('a'));
        expect(d.removeFiles).toHaveBeenCalledOnce();
    });

    it('keeps heroes in other campaigns and hands them to that DM', async () => {
        await user('a');
        await user('c');
        await campaign('cc', 'c');
        await member('cc', 'c', 'dm');
        await member('cc', 'a', 'player');

        const hero = await db.character.create({
            data: {
                campaignId: id('cc'),
                type: 'pc',
                controlledBy: id('a'),
                name: 'Guest',
                class: 'wizard',
                race: 'elf',
            },
        });

        await deleteAccount(id('a'), deps());

        const after = await db.character.findUniqueOrThrow({
            where: { id: hero.id },
        });

        expect(after.controlledBy).toBe(id('c'));
        expect(
            await db.campaign.findUnique({ where: { id: id('cc') } })
        ).not.toBeNull();
        expect(await db.user.findUnique({ where: { id: id('a') } })).toBeNull();
    });

    it('hands participants of the user in other active battles to the DM', async () => {
        await user('a');
        await user('c');
        await campaign('cc', 'c', {
            rules: parseRules({ system: { key: 'dnd5e' } }),
        });
        await member('cc', 'c', 'dm');
        await member('cc', 'a', 'player');

        const battle = await db.battleScene.create({
            data: { campaignId: id('cc'), name: 'Fight', status: 'active' },
        });

        const base = createMockParticipant();

        const mine = createMockParticipant({
            basicInfo: {
                ...base.basicInfo,
                id: id('p-mine'),
                battleId: battle.id,
                name: 'Mine',
                controlledBy: id('a'),
            },
        });

        const theirs = createMockParticipant({
            basicInfo: {
                ...base.basicInfo,
                id: id('p-other'),
                battleId: battle.id,
                name: 'Other',
                controlledBy: id('c'),
            },
        });

        const stored = [mine, theirs].map((p, i) =>
            splitParticipant(p, { orderIndex: i, isPending: false })
        );

        for (const s of stored)
            await db.battleParticipant.create({
                data: {
                    ...s.columns,
                    battleId: battle.id,
                    snapshot: s.snapshot as object,
                    state: s.state as object,
                    snapshotHash: s.snapshotHash,
                },
            });

        const publish = vi.fn();

        const d = {
            ...deps(),
            reassignParticipants: (userId: string) =>
                reassignUserParticipants(userId, {
                    ...defaultPipelineDeps,
                    publish,
                    onLeftActive: vi.fn(),
                }),
        };

        await deleteAccount(id('a'), d);

        const rows = await db.battleParticipant.findMany({
            where: { battleId: battle.id },
            orderBy: { orderIndex: 'asc' },
        });

        expect(rows.map((r) => r.controlledBy)).toEqual(['dm', id('c')]);

        for (const [i, r] of rows.entries()) {
            expect(r.snapshotHash).toBe(hashJson(r.snapshot));
            expect(r.snapshotHash).toBe(stored[i].snapshotHash);
        }

        const scene = await db.battleScene.findUniqueOrThrow({
            where: { id: battle.id },
        });

        expect(scene.status).toBe('active');
        expect(scene.version).toBeGreaterThan(battle.version);
        expect(publish).toHaveBeenCalled();

        const loaded = await loadBattle(db as never, {
            battleId: battle.id,
            campaignId: id('cc'),
            userId: id('c'),
        });

        expect(
            loaded?.participants.map((p) => p.basicInfo.controlledBy)
        ).toEqual(['dm', id('c')]);

        await expect(reassignUserParticipants(id('a'))).resolves.toEqual({
            battleIds: [],
            failedBattleIds: [],
        });
    });

    it('blocks when another user campaign depends on the template', async () => {
        await user('a');
        await user('c');
        await campaign('t', 'a', { kind: 'template' });
        await campaign('d', 'c', { createdFromId: id('t') });

        const d = deps();

        const err = await deleteAccount(id('a'), d).catch((e) => e);

        expect(err).toBeInstanceOf(AccountDeleteBlockedError);
        expect(err.templateIds).toEqual([id('t')]);
        expect(
            await db.accountDeletion.count({
                where: { deletedAt: { gte: suiteStart } },
            })
        ).toBe(0);
        expect(
            await db.user.findUnique({ where: { id: id('a') } })
        ).not.toBeNull();
        expect(
            await db.campaign.findUnique({ where: { id: id('t') } })
        ).not.toBeNull();
        expect(d.removeAuthUser).not.toHaveBeenCalled();
    });

    it('does not block on templates used only by own campaigns', async () => {
        await user('a');
        await campaign('t', 'a', { kind: 'template' });
        await campaign('own', 'a', { createdFromId: id('t') });

        await expect(deleteAccount(id('a'), deps())).resolves.toEqual({
            deletedCampaigns: 2,
        });
        expect(await db.user.findUnique({ where: { id: id('a') } })).toBeNull();
    });

    it('removes the published base rows of an owned template', async () => {
        await user('a');
        await campaign('t', 'a', { kind: 'template' });
        await db.spellBase.create({
            data: {
                id: id('sp'),
                name: 'Bolt',
                type: 'attack',
                damageType: 'fire',
                sourceCampaignId: id('t'),
                validFrom: 1,
            },
        });

        await deleteAccount(id('a'), deps());

        expect(
            await db.spellBase.count({
                where: { sourceCampaignId: id('t') },
            })
        ).toBe(0);
    });

    it('is idempotent once the users row is gone', async () => {
        const d = deps();

        await expect(deleteAccount(id('ghost'), d)).resolves.toEqual({
            deletedCampaigns: 0,
        });
        expect(d.removeAuthUser).toHaveBeenCalledWith(id('ghost'));
    });

    it('still resolves and removes the auth user when file cleanup throws', async () => {
        await user('a');

        const d = deps();

        d.removeFiles.mockRejectedValue(new Error('storage down'));
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        await expect(deleteAccount(id('a'), d)).resolves.toBeDefined();
        expect(d.removeAuthUser).toHaveBeenCalledWith(id('a'));
    });
});
