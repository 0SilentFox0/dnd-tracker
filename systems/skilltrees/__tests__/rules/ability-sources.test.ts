import { describe, expect, it } from 'vitest';

import type { SkillEntry } from '@/lib/utils/abilities/build/source-types';
import { SKILLTREES_ABILITY_SOURCES } from '@/systems/skilltrees/rules/ability-sources';

const hook = SKILLTREES_ABILITY_SOURCES[0];

const ability = (id: string, school?: string) => ({
    id,
    name: id,
    trigger: { event: 'bonusAction' },
    effects: [
        {
            kind: 'damageBonus',
            filter: { kind: 'magic', ...(school && { school }) },
            flat: 2,
        },
    ],
});

const entry = (over: Partial<SkillEntry> & { id: string }): SkillEntry => ({
    row: over.row ?? {
        id: over.id,
        name: over.id,
        abilities: [ability(`${over.id}-a`)],
    },
    mainSkillId: over.mainSkillId ?? null,
    level: over.level ?? null,
    levelNode: over.levelNode,
    mainSkillSpellGroupId: over.mainSkillSpellGroupId ?? null,
    personal: over.personal,
});

const collect = (skills: SkillEntry[]) =>
    hook.collect({ skills, completedSets: [] });

const schoolOf = (a: ReturnType<typeof collect>[number]) => {
    const effect = a.effects[0];

    return effect.kind === 'damageBonus' && effect.filter.kind === 'magic'
        ? effect.filter.school
        : undefined;
};

describe('skilltrees ability source', () => {
    it('is a head hook for skill sources', () => {
        expect(hook.types).toEqual(['skill']);
        expect(hook.at).toBe('head');
    });

    it('resolves a skill ability with its source and key', () => {
        const [a] = collect([entry({ id: 's1', personal: true })]);

        expect(a.key).toBe('skill:s1:s1-a');
        expect(a.source).toMatchObject({
            type: 'skill',
            id: 's1',
            icon: null,
            personal: true,
        });
        expect(a.source.line).toBeUndefined();
    });

    it('attaches the branch line only when both branch and level are known', () => {
        const [withLine] = collect([
            entry({ id: 's1', mainSkillId: 'm', level: 'expert' }),
        ]);

        const [noLevel] = collect([entry({ id: 's2', mainSkillId: 'm' })]);

        expect(withLine.source.line).toEqual({
            mainSkillId: 'm',
            level: 'expert',
        });
        expect(noLevel.source.line).toBeUndefined();
    });

    it('a higher level of the same branch replaces the lower one', () => {
        const ids = collect([
            entry({
                id: 'basic',
                mainSkillId: 'm',
                level: 'basic',
                levelNode: true,
            }),
            entry({
                id: 'expert',
                mainSkillId: 'm',
                level: 'expert',
                levelNode: true,
            }),
            entry({
                id: 'advanced',
                mainSkillId: 'm',
                level: 'advanced',
                levelNode: true,
            }),
        ]).map((a) => a.source.id);

        expect(ids).toEqual(['expert']);
    });

    it('plain slot skills of one branch all stay', () => {
        const ids = collect([
            entry({ id: 'a', mainSkillId: 'm', level: 'basic' }),
            entry({ id: 'b', mainSkillId: 'm', level: 'advanced' }),
        ]).map((a) => a.source.id);

        expect(ids.sort()).toEqual(['a', 'b']);
    });

    it('a magic damage bonus without a school inherits the skill school', () => {
        const [own] = collect([
            entry({
                id: 's1',
                row: {
                    id: 's1',
                    name: 's1',
                    spellGroupId: 'fire',
                    abilities: [ability('x')],
                },
                mainSkillSpellGroupId: 'water',
            }),
        ]);

        const [fromBranch] = collect([
            entry({ id: 's2', mainSkillSpellGroupId: 'water' }),
        ]);

        expect(schoolOf(own)).toBe('fire');
        expect(schoolOf(fromBranch)).toBe('water');
    });

    it('keeps an explicit school and leaves unschooled skills alone', () => {
        const [explicit] = collect([
            entry({
                id: 's1',
                row: {
                    id: 's1',
                    name: 's1',
                    abilities: [ability('x', 'earth')],
                },
                mainSkillSpellGroupId: 'water',
            }),
        ]);

        const [none] = collect([entry({ id: 's2' })]);

        expect(schoolOf(explicit)).toBe('earth');
        expect(schoolOf(none)).toBeUndefined();
    });

    it('a skill without abilities contributes nothing', () => {
        expect(
            collect([entry({ id: 's1', row: { id: 's1', name: 's1' } })])
        ).toEqual([]);
    });
});
