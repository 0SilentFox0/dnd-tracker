import { describe, expect, it } from 'vitest';

import { filterPages, indexStats } from '../index-filter';

import type { ScenarioPageSummary } from '@/types/scenario';

const page = (over: Partial<ScenarioPageSummary>): ScenarioPageSummary => ({
    id: 'x',
    kind: 'scene',
    arc: null,
    title: 'x',
    subtitle: null,
    status: 'draft',
    sortOrder: 0,
    characterId: null,
    version: 0,
    updatedAt: '',
    ...over,
});

const pages = [
    page({ id: 'a', title: 'Монастир Світла', arc: 'Арка перша' }),
    page({
        id: 'b',
        title: 'Викрадення',
        subtitle: 'Ніч у таборі',
        status: 'ready',
    }),
    page({ id: 'h', kind: 'hero', title: 'Годрик', status: 'played' }),
];

describe('filterPages', () => {
    it('empty query keeps everything', () => {
        expect(filterPages(pages, '  ')).toBe(pages);
    });

    it('matches title, subtitle and arc case-insensitively', () => {
        expect(filterPages(pages, 'монастир').map((p) => p.id)).toEqual(['a']);
        expect(filterPages(pages, 'НІЧ').map((p) => p.id)).toEqual(['b']);
        expect(filterPages(pages, 'арка').map((p) => p.id)).toEqual(['a']);
        expect(filterPages(pages, 'zzz')).toEqual([]);
    });
});

describe('indexStats', () => {
    it('counts pages, scenes and statuses', () => {
        expect(indexStats(pages)).toEqual({
            total: 3,
            scenes: 2,
            ready: 1,
            played: 1,
        });
    });
});
