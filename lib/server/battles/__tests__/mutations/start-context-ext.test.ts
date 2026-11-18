import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/lib/server/systems/registry';

const db = vi.hoisted(() => ({
    race: { findMany: vi.fn(async () => []) },
    campaign: { findUnique: vi.fn() },
    skillTree: { findMany: vi.fn(async () => []) },
    skillTreeProgress: { findMany: vi.fn(async () => []) },
    mainSkill: { findMany: vi.fn(async () => []) },
    spell: { findMany: vi.fn(async () => []) },
    skill: { findMany: vi.fn(async () => []) },
    artifact: { findMany: vi.fn(async () => []) },
    artifactSet: { findMany: vi.fn(async () => []) },
}));

vi.mock('@/lib/db', () => ({ prisma: db }));

import { buildCampaignContextForStart } from '@/lib/server/battles/mutations/start/start-build-context';

const hero = {
    id: 'h',
    campaignId: 'c1',
    race: 'Ельф',
    skillTreeProgress: {},
    personalSkillId: null,
    inventory: null,
} as never;

describe('buildCampaignContextForStart ext', () => {
    beforeEach(() => vi.clearAllMocks());

    it('is empty and skips module reads when no module is composed', async () => {
        db.campaign.findUnique.mockResolvedValue({
            maxLevel: 20,
            rules: { system: { key: 'dnd5e' } },
        });

        const { campaignContext } = await buildCampaignContextForStart(
            'c1',
            [hero],
            []
        );

        expect(campaignContext?.ext).toEqual({});
        expect(campaignContext?.allSkills).toEqual([]);
        expect(db.skillTree.findMany).not.toHaveBeenCalled();
        expect(db.mainSkill.findMany).not.toHaveBeenCalled();
        expect(db.skill.findMany).not.toHaveBeenCalled();
    });

    it('fills the skill tree slice once per query when the module is composed', async () => {
        db.campaign.findUnique.mockResolvedValue({
            maxLevel: 20,
            rules: { system: { key: 'homm' } },
        });

        const { campaignContext } = await buildCampaignContextForStart(
            'c1',
            [hero],
            []
        );

        expect(campaignContext?.ext).toMatchObject({
            skilltrees: { treeByRace: { Ельф: null }, mainSkills: [] },
        });
        expect(db.skillTree.findMany).toHaveBeenCalledTimes(1);
        expect(db.spell.findMany).toHaveBeenCalledTimes(1);
    });
});
