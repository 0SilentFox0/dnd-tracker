import { describe, expect, it } from 'vitest';

import {
    compareKeys,
    flatten,
    formatTable,
    percentOf,
    topPrefixes,
} from '../report-core';

describe('flatten', () => {
    it('joins nested keys with dots and skips non-strings', () => {
        expect(
            flatten({ a: { b: 'x', c: { d: 'y' } }, e: 'z', f: [1] })
        ).toEqual({
            'a.b': 'x',
            'a.c.d': 'y',
            e: 'z',
        });
    });
});

describe('compareKeys', () => {
    it('reports missing, orphans and empty values against the base', () => {
        const result = compareKeys(['a', 'b', 'c'], { a: 'x', c: ' ', z: 'q' });

        expect(result).toEqual({
            total: 3,
            present: 2,
            missing: ['b'],
            orphans: ['z'],
            empty: ['c'],
        });
    });
});

describe('percentOf', () => {
    it('rounds to one decimal and treats an empty base as complete', () => {
        expect(percentOf(1, 3)).toBe(33.3);
        expect(percentOf(0, 0)).toBe(100);
    });
});

describe('topPrefixes', () => {
    it('groups by prefix depth, biggest first, limited', () => {
        expect(topPrefixes(['a.x.1', 'a.x.2', 'a.y', 'b.z'], 2, 2)).toEqual([
            ['a.x', 2],
            ['a.y', 1],
        ]);
    });
});

describe('formatTable', () => {
    it('aligns columns', () => {
        expect(
            formatTable([
                ['n', 'v'],
                ['abc', '1'],
            ])
        ).toBe('n    v\nabc  1');
    });
});
