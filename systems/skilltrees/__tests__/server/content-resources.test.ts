import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
    mainSkill: {
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
        deleteMany: vi.fn(),
    },
    skill: {
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        deleteMany: vi.fn(),
    },
    spell: { count: vi.fn() },
    spellGroup: { count: vi.fn() },
}));

const h = vi.hoisted(() => ({
    detach: vi.fn(),
    effects: vi.fn(),
    skillsList: vi.fn(),
    cachedMainSkills: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: db }));
vi.mock('@/lib/server/content/detach-refs', () => ({
    detachRefs: h.detach,
}));
vi.mock('@/lib/server/content/traits-guard', async (original) => ({
    ...(await original<object>()),
    assertCampaignEffects: h.effects,
}));
vi.mock('@/lib/server/skills/read-skills-list', () => ({
    readSkillsList: h.skillsList,
}));
vi.mock('@/lib/cache/reference-data', () => ({
    getCachedMainSkills: h.cachedMainSkills,
}));

import { API_ERRORS } from '@/lib/constants/api-errors';
import type { Actor } from '@/lib/utils/api/actor';
import { mainSkillsResource } from '@/systems/skilltrees/server/content/main-skills';
import { skillsResource } from '@/systems/skilltrees/server/content/skills';

const actor: Actor = {
    campaignId: 'c1',
    userId: 'u',
    isDM: true,
    via: 'session',
    scopes: null,
};

describe('mainSkillsResource', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        db.spellGroup.count.mockResolvedValue(1);
        db.mainSkill.create.mockImplementation(async ({ data }) => data);
        db.mainSkill.update.mockImplementation(async ({ data }) => data);
    });

    it('create stores campaign-scoped defaults for omitted fields', async () => {
        const row = await mainSkillsResource.create(actor, {
            name: 'Attack',
            color: 'red',
        } as never);

        expect(row).toEqual({
            campaignId: 'c1',
            name: 'Attack',
            color: 'red',
            icon: null,
            isEnableInSkillTree: false,
            spellGroupId: null,
            role: null,
        });
    });

    it('create rejects a spell group of another campaign', async () => {
        db.spellGroup.count.mockResolvedValue(0);

        await expect(
            mainSkillsResource.create(actor, {
                name: 'Magic',
                color: 'blue',
                spellGroupId: 'foreign',
            } as never)
        ).rejects.toMatchObject({
            message: API_ERRORS.FOREIGN_SPELL_GROUP,
            status: 400,
        });
        expect(db.mainSkill.create).not.toHaveBeenCalled();
    });

    it('update clears the spell group on an empty value and leaves it on omission', async () => {
        const existing = { id: 'm1' } as never;

        const cleared = await mainSkillsResource.update(actor, existing, {
            spellGroupId: '',
        } as never);

        const untouched = await mainSkillsResource.update(actor, existing, {
            name: 'New',
        } as never);

        expect(cleared).toMatchObject({ spellGroupId: null });
        expect(untouched).toMatchObject({
            name: 'New',
            spellGroupId: undefined,
        });
    });

    it('remove detaches skills from the branch before deleting it', async () => {
        const order: string[] = [];

        h.detach.mockImplementation(async () => void order.push('detach'));
        db.mainSkill.deleteMany.mockImplementation(
            async () => void order.push('delete')
        );

        await mainSkillsResource.remove(actor, { id: 'm1' } as never);

        expect(order).toEqual(['detach', 'delete']);
        expect(h.detach).toHaveBeenCalledWith(
            expect.anything(),
            'c1',
            'mainSkill',
            ['m1']
        );
        expect(db.mainSkill.deleteMany).toHaveBeenCalledWith({
            where: { id: 'm1', campaignId: 'c1' },
        });
    });

    it('find is scoped to the actor campaign', async () => {
        db.mainSkill.findFirst.mockResolvedValue(null);

        expect(
            await mainSkillsResource.find(actor, 'other', 'read')
        ).toBeNull();
        expect(db.mainSkill.findFirst).toHaveBeenCalledWith({
            where: { id: 'other', campaignId: 'c1' },
        });
    });
});

describe('skillsResource', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        db.spell.count.mockResolvedValue(2);
        db.spellGroup.count.mockResolvedValue(1);
        db.mainSkill.count.mockResolvedValue(1);
        db.skill.create.mockImplementation(async ({ data }) => data);
        db.skill.update.mockImplementation(async ({ data }) => data);
    });

    const input = (over: object = {}) => ({
        basicInfo: { name: 'Bash', description: '', icon: '' },
        spellData: {},
        mainSkillData: {},
        ...over,
    });

    it('create flattens the grouped input and nulls empty values', async () => {
        const row = await skillsResource.create(
            actor,
            input({ appearanceDescription: '' }) as never
        );

        expect(row).toMatchObject({
            campaignId: 'c1',
            name: 'Bash',
            description: null,
            icon: null,
            image: null,
            appearanceDescription: null,
            spellId: null,
            spellGroupId: null,
            grantedSpellId: null,
            mainSkillId: null,
            spellNewSpellId: null,
        });
        expect(row).not.toHaveProperty('abilities');
    });

    it('create mirrors the granted spell into the legacy new-spell column', async () => {
        const row = await skillsResource.create(
            actor,
            input({
                spellData: { grantedSpellId: 'g', spellId: 's' },
                mainSkillData: { mainSkillId: 'm' },
            }) as never
        );

        expect(row).toMatchObject({
            grantedSpellId: 'g',
            spellNewSpellId: 'g',
            spellId: 's',
            mainSkillId: 'm',
        });
    });

    it('create validates the abilities against the campaign system', async () => {
        const abilities = [{ id: 'a' }];

        await skillsResource.create(actor, input({ abilities }) as never);

        expect(h.effects).toHaveBeenCalledWith(actor, abilities);
    });

    it('create rejects foreign spells and branches before writing', async () => {
        db.spell.count.mockResolvedValue(0);

        await expect(
            skillsResource.create(
                actor,
                input({ spellData: { spellId: 'x' } }) as never
            )
        ).rejects.toMatchObject({ message: API_ERRORS.FOREIGN_SPELL });

        db.spell.count.mockResolvedValue(1);
        db.mainSkill.count.mockResolvedValue(0);

        await expect(
            skillsResource.create(
                actor,
                input({ mainSkillData: { mainSkillId: 'x' } }) as never
            )
        ).rejects.toMatchObject({ message: API_ERRORS.FOREIGN_MAIN_SKILL });
        expect(db.skill.create).not.toHaveBeenCalled();
    });

    it('update only changes what the patch carries', async () => {
        const row = await skillsResource.update(
            actor,
            { id: 's1', abilities: null } as never,
            {
                basicInfo: { name: 'Renamed' },
                mainSkillData: { mainSkillId: null },
            } as never
        );

        expect(row).toEqual({
            name: 'Renamed',
            mainSkill: { disconnect: true },
        });
    });

    it('update passes the stored effect owners so legacy abilities stay valid', async () => {
        await skillsResource.update(
            actor,
            { id: 's1', abilities: [{ id: 'old' }] } as never,
            { abilities: [{ id: 'new' }] } as never
        );

        expect(h.effects).toHaveBeenCalledWith(
            actor,
            [{ id: 'new' }],
            expect.any(Array)
        );
    });

    it('list by branch returns the light projection of that branch only', async () => {
        db.skill.findMany.mockResolvedValue([{ id: 's1' }]);

        const rows = await skillsResource.list(
            actor,
            new URLSearchParams({ mainSkillId: 'm1' })
        );

        expect(rows).toEqual([{ id: 's1' }]);
        expect(db.skill.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { campaignId: 'c1', mainSkillId: 'm1' },
            })
        );
        expect(h.skillsList).not.toHaveBeenCalled();
    });

    it('list without a filter reads the full campaign list', async () => {
        h.skillsList.mockResolvedValue([{ id: 'all' }]);

        expect(await skillsResource.list(actor, new URLSearchParams())).toEqual(
            [{ id: 'all' }]
        );
        expect(h.skillsList).toHaveBeenCalledWith('c1');
    });

    it('find includes spell relations only for reads', async () => {
        db.skill.findFirst.mockResolvedValue(null);

        await skillsResource.find(actor, 's1', 'read');
        await skillsResource.find(actor, 's1', 'write');

        const [read, write] = db.skill.findFirst.mock.calls.map((c) => c[0]);

        expect(read.include).toEqual({
            spell: true,
            spellGroup: true,
            grantedSpell: true,
        });
        expect(write).not.toHaveProperty('include');
    });

    it('removeAll deletes the campaign skills and reports the count', async () => {
        db.skill.deleteMany.mockResolvedValue({ count: 7 });

        expect(await skillsResource.removeAll?.(actor)).toBe(7);
        expect(db.skill.deleteMany).toHaveBeenCalledWith({
            where: { campaignId: 'c1' },
        });
    });
});
