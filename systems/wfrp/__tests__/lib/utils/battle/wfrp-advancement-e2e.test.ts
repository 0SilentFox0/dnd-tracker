import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCachedFeats = vi.hoisted(() => vi.fn(async () => [] as unknown[]));

vi.mock('@/lib/cache/reference-data', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getCachedFeats,
}));

import { ParticipantSide } from '@/lib/constants/battle';
import { collectModifiers } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import { createBattleParticipantFromCharacter } from '@/lib/utils/battle/participant/from-character';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { DEFAULT_CHARACTERISTICS } from '@/systems/wfrp/rules/characteristics/keys';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import type { FeatData } from '@/types/choices';

const strikeTalent: FeatData = {
    id: 'f-strike',
    name: 'Strike Mighty Blow',
    icon: null,
    type: 'general',
    prerequisite: {},
    repeatable: false,
    description: null,
    abilities: [
        {
            id: 'blow',
            name: 'Blow',
            trigger: { event: 'passive' },
            effects: [
                {
                    kind: 'modifyStat',
                    stat: 'attackBonus',
                    attackKind: 'melee',
                    flat: { formula: '10' },
                },
            ],
        },
    ],
    choices: [],
};

const base = {
    id: 'ch1',
    campaignId: 'c1',
    name: 'Hero',
    race: '',
    class: '',
    level: 1,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    armorClass: 10,
    speed: 30,
    initiative: 10,
    morale: 0,
    controlledBy: 'u1',
    immunities: [],
    knownSpells: [],
    equipment: {},
    skillTreeProgress: {},
    personalSkillId: null,
    archetype: null,
    classes: [],
    raceChoices: {},
    feats: [],
    skills: {},
};

const build = (
    character: object,
    rules: typeof WFRP_RULES,
    featsById?: Record<string, FeatData>
) =>
    createBattleParticipantFromCharacter(
        { ...base, ...character } as never,
        'b1',
        ParticipantSide.ALLY,
        undefined,
        {
            skillTreeByRace: {},
            mainSkills: [],
            spells: [],
            allSkills: [],
            racesByName: {},
            campaign: { maxLevel: 20 },
            skillsById: {},
            artifactsById: {},
            artifactSetsById: {},
            artifactSetMemberIds: {},
            rules,
            classesById: {},
            ...(featsById && { featsById }),
        } as never
    );

const withTalents = (talents: Record<string, number>) => ({
    characteristics: { ...DEFAULT_CHARACTERISTICS, talents },
});

const meleeBonus = (p: Awaited<ReturnType<typeof build>>) =>
    collectModifiers([p], p.basicInfo.id, {
        stat: 'attackBonus',
        attackKind: 'melee',
    }).flat;

describe('wfrp talents feed battle ability groups', () => {
    beforeEach(() => {
        getCachedFeats.mockReset().mockResolvedValue([]);
        vi.spyOn(Date, 'now').mockReturnValue(1793016000000);
    });

    it('rank 2 yields two prefixed ability copies and a summed bonus', async () => {
        const p = await build(withTalents({ 'f-strike': 2 }), WFRP_RULES, {
            'f-strike': strikeTalent,
        });

        const ids = p.battleData.resolvedAbilities
            .map((a) => a.id)
            .filter((id) => id.startsWith('talent:'));

        expect(ids).toHaveLength(2);
        expect(ids.some((id) => id.includes('#1.'))).toBe(true);
        expect(ids.some((id) => id.includes('#2.'))).toBe(true);
        expect(meleeBonus(p)).toBe(20);
    });

    it('a talent missing from the catalogue is skipped without an error', async () => {
        const p = await build(
            withTalents({ 'f-gone': 1, 'f-strike': 1 }),
            WFRP_RULES,
            { 'f-strike': strikeTalent }
        );

        expect(meleeBonus(p)).toBe(10);

        const orphan = await build(
            withTalents({ 'f-gone': 3 }),
            WFRP_RULES,
            {}
        );

        expect(
            orphan.battleData.resolvedAbilities.some((a) =>
                a.id.startsWith('talent:')
            )
        ).toBe(false);
    });

    it('feats are not loaded when the hero has no talents', async () => {
        await build(withTalents({}), WFRP_RULES);

        expect(getCachedFeats).not.toHaveBeenCalled();
    });

    it('feats come from the campaign cache when no preloaded map is given', async () => {
        getCachedFeats.mockResolvedValue([
            { ...strikeTalent, campaignId: 'c1', xpCost: 10, maxRank: 3 },
        ]);

        const p = await build(withTalents({ 'f-strike': 1 }), WFRP_RULES);

        expect(getCachedFeats).toHaveBeenCalledTimes(1);
        expect(meleeBonus(p)).toBe(10);
    });

    it('dnd5e hero with the same feat in Character.feats and stray talents: no talent groups, no feat query', async () => {
        const p = await build(
            {
                feats: [{ id: 'f-strike', source: 'dm' }],
                ...withTalents({ 'f-strike': 2 }),
            },
            DEFAULT_RULES as never,
            { 'f-strike': strikeTalent }
        );

        expect(
            p.battleData.resolvedAbilities.some((a) =>
                a.id.startsWith('talent:')
            )
        ).toBe(false);
        expect(meleeBonus(p)).toBe(0);
        expect(getCachedFeats).not.toHaveBeenCalled();
    });
});
