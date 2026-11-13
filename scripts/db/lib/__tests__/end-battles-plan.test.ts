import { describe, expect, it, vi } from 'vitest';

import {
    type ActiveSceneRow,
    endScenes,
    formatScene,
    missingSceneIds,
    parseArgs,
    selectScenes,
    summarize,
} from '@/scripts/db/lib/end-battles-plan';

const scene = (
    id: string,
    campaignId: string,
    campaignName: string
): ActiveSceneRow => ({
    id,
    name: `Бій ${id}`,
    status: 'active',
    round: 3,
    turnIndex: 2,
    version: 7,
    eventSeq: 40,
    campaignId,
    campaignName,
    dmUserId: 'dm',
    participants: 5,
    pending: 1,
});

const rows = [
    scene('a', 'c1', 'Alpha'),
    scene('b', 'c1', 'Alpha'),
    scene('c', 'c2', 'Beta'),
];

describe('parseArgs', () => {
    it('is dry-run by default', () => {
        expect(parseArgs([])).toEqual({
            apply: false,
            allowRemote: false,
            sceneIds: [],
            campaigns: [],
        });
    });

    it('reads flags and comma lists', () => {
        const a = parseArgs([
            '--apply',
            '--allow-remote',
            '--scene',
            'a,b',
            '--campaign',
            'Alpha',
        ]);

        expect(a).toMatchObject({
            apply: true,
            allowRemote: true,
            sceneIds: ['a', 'b'],
            campaigns: ['Alpha'],
        });
    });

    it('rejects unknown flags and missing values', () => {
        expect(() => parseArgs(['--nope'])).toThrow();
        expect(() => parseArgs(['--scene'])).toThrow();
        expect(() => parseArgs(['--scene', '--apply'])).toThrow();
    });
});

describe('selectScenes', () => {
    it('takes all active scenes without filters', () => {
        expect(
            selectScenes(rows, { sceneIds: [], campaigns: [] })
        ).toHaveLength(3);
    });

    it('never selects non-active scenes', () => {
        const prepared = { ...rows[0], status: 'prepared' };

        expect(
            selectScenes([prepared], { sceneIds: [], campaigns: [] })
        ).toEqual([]);
    });

    it('filters by scene id and by campaign id or name', () => {
        expect(
            selectScenes(rows, { sceneIds: ['b'], campaigns: [] }).map(
                (r) => r.id
            )
        ).toEqual(['b']);
        expect(
            selectScenes(rows, { sceneIds: [], campaigns: ['Alpha'] }).map(
                (r) => r.id
            )
        ).toEqual(['a', 'b']);
        expect(
            selectScenes(rows, { sceneIds: [], campaigns: ['c2'] }).map(
                (r) => r.id
            )
        ).toEqual(['c']);
        expect(
            selectScenes(rows, { sceneIds: ['a'], campaigns: ['Beta'] })
        ).toEqual([]);
    });

    it('reports requested ids that are not active', () => {
        expect(missingSceneIds(rows, { sceneIds: ['a', 'zzz'] })).toEqual([
            'zzz',
        ]);
    });
});

describe('formatScene', () => {
    it('shows ids, round/turn, participants and the status change', () => {
        const line = formatScene(rows[0]);

        expect(line).toContain('сцена a');
        expect(line).toContain('кампанія c1 «Alpha»');
        expect(line).toContain('раунд 3, хід #2');
        expect(line).toContain('учасників 5 (+1 у резерві)');
        expect(line).toContain('active -> completed');
    });
});

describe('endScenes', () => {
    it('continues after a failing scene and summarizes', async () => {
        const end = vi.fn(async (s: ActiveSceneRow) => {
            if (s.id === 'b') throw new Error('конфлікт версії');
        });

        const outcomes = await endScenes(rows, end);

        expect(end).toHaveBeenCalledTimes(3);
        expect(outcomes.map((o) => o.ok)).toEqual([true, false, true]);
        expect(summarize(outcomes)).toBe(
            'завершено 2 з 3; помилки: b (конфлікт версії)'
        );
    });
});
