import { describe, expect, it } from 'vitest';

import type { Translator } from '@/lib/i18n/translator';
import type { ProgressionNode } from '@/lib/utils/skills/progression';
import { nodeLabel } from '@/systems/skilltrees/rules/progression/labels';
import type { CharacterProgressionDto } from '@/types/progression';

const t = ((key: string, values?: Record<string, string>) =>
    values ? `${key}(${Object.values(values).join(',')})` : key) as Translator;

const dto = {
    skills: { s1: { name: 'Bash' } },
    branches: { atk: { name: 'Attack' } },
} as unknown as CharacterProgressionDto;

describe('nodeLabel', () => {
    it('branch level: branch name plus tier, falls back to the branch id', () => {
        const node: ProgressionNode = {
            kind: 'branchLevel',
            nodeId: 'n',
            branchId: 'atk',
            level: 'advanced',
            skillId: null,
        };

        expect(nodeLabel(node, dto, t)).toEqual({
            title: 'node.branchTier(Attack,tiers.advanced)',
            tag: 'node.tagBranchUp',
            skillName: null,
        });
        expect(nodeLabel({ ...node, branchId: 'gone' }, dto, t).title).toBe(
            'node.branchTier(gone,tiers.advanced)'
        );
    });

    it('racial: the skill name when set, otherwise the racial tag', () => {
        const node: ProgressionNode = {
            kind: 'racial',
            nodeId: 'n',
            level: 'basic',
            skillId: 's1',
        };

        expect(nodeLabel(node, dto, t)).toEqual({
            title: 'Bash',
            tag: 'node.tagRacial(tiers.basic)',
            skillName: 'Bash',
        });
        expect(nodeLabel({ ...node, skillId: null }, dto, t).title).toBe(
            'node.tagRacial(tiers.basic)'
        );
    });

    it('slot: skill name or the unknown-skill label, tagged by circle', () => {
        const node: ProgressionNode = {
            kind: 'slot',
            nodeId: 'n',
            branchId: 'atk',
            circle: 'outer',
            index: 0,
            skillId: 's1',
        };

        expect(nodeLabel(node, dto, t)).toEqual({
            title: 'Bash',
            tag: 'node.tagSkill(circles.outer)',
            skillName: 'Bash',
        });
        expect(nodeLabel({ ...node, skillId: 'missing' }, dto, t)).toEqual({
            title: 'row.unknownSkill',
            tag: 'node.tagSkill(circles.outer)',
            skillName: null,
        });
    });

    it('ultimate: skill name or the ultimate label', () => {
        const node: ProgressionNode = {
            kind: 'ultimate',
            nodeId: 'n',
            skillId: 's1',
        };

        expect(nodeLabel(node, dto, t).title).toBe('Bash');
        expect(nodeLabel({ ...node, skillId: 'missing' }, dto, t)).toEqual({
            title: 'cells.ultimate',
            tag: 'cells.ultimate',
            skillName: null,
        });
    });
});
