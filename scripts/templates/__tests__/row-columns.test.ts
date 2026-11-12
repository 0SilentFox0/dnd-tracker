import { describe, expect, it } from 'vitest';

import { rowSchemaIssues } from '../lib/row-columns';

describe('rowSchemaIssues', () => {
    it('accepts a youtube track and a tree, reports bad rows', () => {
        expect(
            rowSchemaIssues('tracks', {
                title: 'T',
                kind: 'youtube',
                youtubeId: 'abc',
                durationSec: 10,
                sortOrder: 1,
            })
        ).toEqual([]);
        expect(
            rowSchemaIssues('tracks', { title: '', kind: 'radio' }).length
        ).toBeGreaterThan(0);
        expect(
            rowSchemaIssues('skillTrees', {
                race: 'Humans',
                skills: { mainSkills: [{ id: 'racial' }] },
            })
        ).toEqual([]);
        expect(
            rowSchemaIssues('skillTrees', {
                race: 'Humans',
                skills: { mainSkills: [] },
            }).length
        ).toBeGreaterThan(0);
        expect(rowSchemaIssues('spells', { anything: 1 })).toEqual([]);
    });
});
