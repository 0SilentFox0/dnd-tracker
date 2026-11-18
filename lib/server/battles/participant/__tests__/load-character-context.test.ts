import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    campaign: vi.fn(),
    artifacts: vi.fn(),
    skill: vi.fn(),
    skillTree: vi.fn(),
    artifactSets: vi.fn(),
    classes: vi.fn(),
    feats: vi.fn(),
    backgrounds: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
    prisma: {
        campaign: { findUnique: mocks.campaign },
        artifact: { findMany: mocks.artifacts },
        skill: { findFirst: mocks.skill },
        skillTree: { findFirst: mocks.skillTree },
        skillTreeProgress: { findUnique: vi.fn(async () => null) },
        artifactSet: { findMany: mocks.artifactSets },
    },
}));
vi.mock('@/lib/cache/reference-data', () => ({
    getCachedClasses: mocks.classes,
    getCachedFeats: mocks.feats,
    getCachedBackgrounds: mocks.backgrounds,
}));

import '@/lib/server/systems/registry';
import { loadCharacterContext } from '@/lib/server/battles/participant/load-character-context';
import type { CharacterFromPrisma } from '@/lib/utils/battle/types/participant';
import { sorcerer } from '@/lib/utils/characters/choices/__tests__/fixtures';
import { parseRules } from '@/lib/utils/rules/schema';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

const character = {
    id: 'ch',
    campaignId: 'own-campaign',
    race: 'Elf',
    classes: [{ classId: sorcerer.id, level: 4 }],
    backgroundId: 'bg',
    feats: [{ id: 'f', source: 'origin' }],
    raceChoices: {},
} as unknown as CharacterFromPrisma;

const background = {
    id: 'bg',
    campaignId: character.campaignId,
    name: 'Scholar',
    icon: null,
    description: null,
    choices: [],
    skillProficiencies: ['arcana'],
    toolProficiencies: [],
    originFeatId: 'f',
    equipmentText: null,
};

const feat = {
    id: 'f',
    campaignId: character.campaignId,
    name: 'Own feat',
    icon: null,
    description: null,
    type: 'origin',
    repeatable: false,
    prerequisite: {},
    choices: [],
    abilities: [],
};

const settings = {
    maxLevel: 20,
    rules: parseRules({
        system: { key: 'dnd5e' },
        classes: { enabled: true },
    }),
};

describe('loadCharacterContext choice refs', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mocks.campaign.mockResolvedValue({ races: [] });
        mocks.skillTree.mockResolvedValue(null);
        mocks.classes.mockResolvedValue([
            { ...sorcerer, campaignId: character.campaignId },
        ]);
        mocks.feats.mockResolvedValue([feat]);
        mocks.backgrounds.mockResolvedValue([background]);
    });

    it('loads needed refs once, scoped to the character campaign', async () => {
        const { context } = await loadCharacterContext(character, settings);

        expect(context.featsById?.f.name).toBe('Own feat');
        expect(context.backgroundsById?.bg.originFeatId).toBe('f');
        expect(mocks.feats).toHaveBeenCalledExactlyOnceWith('own-campaign');
        expect(mocks.backgrounds).toHaveBeenCalledExactlyOnceWith(
            'own-campaign'
        );
        expect(mocks.campaign).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ where: { id: 'own-campaign' } })
        );
        expect(mocks.artifacts).not.toHaveBeenCalled();
    });

    it('returns explicit empty maps when refs are unneeded', async () => {
        const { context } = await loadCharacterContext(
            { ...character, feats: [], backgroundId: null },
            settings
        );

        expect(context.featsById).toEqual({});
        expect(context.backgroundsById).toEqual({});
        expect(mocks.feats).not.toHaveBeenCalled();
        expect(mocks.backgrounds).not.toHaveBeenCalled();
    });

    it('a missing background stays absent instead of becoming a fallback read', async () => {
        mocks.backgrounds.mockResolvedValue([]);
        mocks.feats.mockResolvedValue([]);

        const { context } = await loadCharacterContext(character, settings);

        expect(context.backgroundsById).toEqual({});
        expect(context.featsById).toEqual({});
        expect(mocks.backgrounds).toHaveBeenCalledExactlyOnceWith(
            'own-campaign'
        );
    });

    it('unknown classes keep HOMM fallback and do not load unused background/feats', async () => {
        const { context } = await loadCharacterContext(
            { ...character, classes: [{ classId: 'missing', level: 4 }] },
            settings
        );

        expect(context.featsById).toEqual({});
        expect(context.backgroundsById).toEqual({});
        expect(mocks.feats).not.toHaveBeenCalled();
        expect(mocks.backgrounds).not.toHaveBeenCalled();
    });

    it('race choices can need feats without class mode', async () => {
        mocks.campaign.mockResolvedValue({
            races: [
                {
                    id: 'elf',
                    name: 'Elf',
                    choices: [
                        {
                            id: 'gift',
                            label: 'Gift',
                            level: 1,
                            count: 1,
                            kind: 'feat',
                        },
                    ],
                },
            ],
        });

        const { context } = await loadCharacterContext(
            {
                ...character,
                classes: [],
                backgroundId: null,
                raceChoices: { gift: [{ id: 'f' }] },
            },
            { ...settings, rules: parseRules({ system: { key: 'homm' } }) }
        );

        expect(context.featsById?.f.name).toBe('Own feat');
        expect(context.backgroundsById).toEqual({});
        expect(mocks.classes).not.toHaveBeenCalled();
        expect(mocks.backgrounds).not.toHaveBeenCalled();
    });
});

describe('loadCharacterContext WFRP talents', () => {
    it('loads the campaign feats when the hero owns talents', async () => {
        vi.resetAllMocks();
        mocks.campaign.mockResolvedValue({ races: [] });
        mocks.skillTree.mockResolvedValue(null);
        mocks.feats.mockResolvedValue([feat]);

        const hero = {
            campaignId: 'own-campaign',
            race: 'Human',
            classes: [],
            feats: [],
            raceChoices: {},
            characteristics: { talents: { f: 1 } },
        } as unknown as CharacterFromPrisma;

        const { context } = await loadCharacterContext(hero, {
            maxLevel: 20,
            rules: WFRP_RULES,
        });

        expect(context.featsById?.f.name).toBe('Own feat');
        expect(mocks.feats).toHaveBeenCalledExactlyOnceWith('own-campaign');
    });
});

describe('loadCharacterContext module slices', () => {
    const withArtifact = {
        ...character,
        classes: [],
        backgroundId: null,
        feats: [],
        inventory: { equipped: { ring: 'a1' } },
    } as unknown as CharacterFromPrisma;

    beforeEach(() => {
        vi.resetAllMocks();
        mocks.campaign.mockResolvedValue({ races: [] });
        mocks.skillTree.mockResolvedValue(null);
        mocks.artifacts
            .mockResolvedValueOnce([{ id: 'a1', setId: 's1' }])
            .mockResolvedValue([
                { id: 'a1', setId: 's1' },
                { id: 'a2', setId: 's1' },
            ]);
        mocks.artifactSets.mockResolvedValue([
            {
                id: 's1',
                name: 'Set',
                setBonus: null,
                icon: null,
                abilities: [],
            },
        ]);
    });

    it('without modules ext is empty and the campaign is read once', async () => {
        const { context } = await loadCharacterContext(withArtifact, {
            maxLevel: 20,
            rules: parseRules({ system: { key: 'dnd5e' } }),
        });

        expect(context.ext).toEqual({});
        expect(mocks.campaign).toHaveBeenCalledTimes(1);
    });

    it('on homm (both modules) the slices land in ext and the joined set is not left on the artifact row', async () => {
        const { context } = await loadCharacterContext(withArtifact, {
            maxLevel: 20,
            rules: parseRules({
                system: { key: 'homm' },
                items: { enabled: true },
            }),
        });

        expect(context.ext).toEqual({
            skilltrees: {
                treeByRace: { Elf: null },
                mainSkills: [],
                progress: { ch: undefined },
            },
            artifactsets: {
                artifactSetsById: {
                    s1: {
                        id: 's1',
                        name: 'Set',
                        setBonus: null,
                        icon: null,
                        abilities: [],
                    },
                },
                artifactSetMemberIds: { s1: ['a1', 'a2'] },
            },
        });
        expect(context.artifactsById?.a1).toEqual({ id: 'a1', setId: 's1' });
        expect(mocks.campaign).toHaveBeenCalledTimes(1);
        expect(mocks.artifacts).toHaveBeenCalledTimes(2);
    });
});

describe('loadCharacterContext personal skill without the skilltrees module', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        mocks.campaign.mockResolvedValue({ races: [] });
        mocks.skillTree.mockResolvedValue(null);
        mocks.artifacts.mockResolvedValue([]);
        mocks.classes.mockResolvedValue([]);
        mocks.feats.mockResolvedValue([]);
        mocks.backgrounds.mockResolvedValue([]);
    });

    const withPersonal = {
        ...character,
        classes: [],
        backgroundId: null,
        feats: [],
        personalSkillId: 'ps1',
    } as unknown as CharacterFromPrisma;

    it('still resolves the personal skill into skillsById', async () => {
        mocks.skill.mockResolvedValue({ id: 'ps1', name: 'Rage' });

        const { context } = await loadCharacterContext(withPersonal, {
            maxLevel: 20,
            rules: parseRules({ system: { key: 'dnd5e' } }),
        });

        expect(context.skillsById?.ps1).toEqual({ id: 'ps1', name: 'Rage' });
        expect(mocks.skill).toHaveBeenCalledWith({
            where: { id: 'ps1', campaignId: 'own-campaign' },
        });
    });

    it('does not query again when the module already loaded it', async () => {
        const { context } = await loadCharacterContext(
            { ...withPersonal, personalSkillId: null } as never,
            { maxLevel: 20, rules: parseRules({ system: { key: 'dnd5e' } }) }
        );

        expect(context.skillsById).toEqual({});
        expect(mocks.skill).not.toHaveBeenCalled();
    });
});
