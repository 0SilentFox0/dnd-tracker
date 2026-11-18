import { describe, expect, it } from 'vitest';

import {
    planProgressRevert,
    planSkillTreeProgress,
    type ProgressSnapshot,
    type ProgressTableRow,
    summarizeProgress,
} from '@/scripts/db/lib/backfill-skill-tree-progress-plan';

const sources = [
    { characterId: 'a', columnText: '{"t1": ["s1"]}' },
    { characterId: 'b', columnText: '{}' },
    { characterId: 'c', columnText: '{"t2": []}' },
    { characterId: 'd', columnText: '[]' },
];

describe('planSkillTreeProgress', () => {
    it('inserts only missing non-empty rows and reports divergence', () => {
        const plans = planSkillTreeProgress(sources, [
            { characterId: 'c', progressText: '{"t2": [1]}', version: 3 },
        ]);

        expect(plans.map((p) => p.action)).toEqual([
            'insert',
            'empty',
            'skipped',
            'skipped',
        ]);
        expect(plans[2].reason).toBe('divergent');
        expect(plans[3].reason).toBe('notObject');
    });

    it('treats a byte-equal existing row as present and a second run as zero inserts', () => {
        const first = planSkillTreeProgress(sources, []);

        const inserted: ProgressTableRow[] = first
            .filter((p) => p.action === 'insert')
            .map((p) => ({
                characterId: p.characterId,
                progressText: p.progressText ?? '',
                version: 1,
            }));

        const second = planSkillTreeProgress(sources, inserted);

        expect(summarizeProgress(second).insert).toBe(0);
        expect(second[0].action).toBe('present');
    });
});

describe('planProgressRevert', () => {
    const snapshot: ProgressSnapshot = {
        version: 1,
        kind: 'skill-tree-progress',
        createdAt: '',
        host: 'h',
        database: 'd',
        rows: [
            { characterId: 'a', progressText: '{"t1": ["s1"]}' },
            { characterId: 'b', progressText: '{"t": []}' },
            { characterId: 'c', progressText: '{"t": []}' },
        ],
    };

    it('deletes untouched inserts, skips missing, flags rows written since', () => {
        const current = new Map<string, ProgressTableRow>([
            [
                'a',
                {
                    characterId: 'a',
                    progressText: '{"t1": ["s1"]}',
                    version: 1,
                },
            ],
            ['c', { characterId: 'c', progressText: '{"t": []}', version: 2 }],
        ]);

        expect(
            planProgressRevert(snapshot, current).map((a) => a.action)
        ).toEqual(['delete', 'missing', 'conflict']);
    });
});
