import { describe, expect, it } from 'vitest';

import { mapPath, subtreeMapIds, treeDepth, treeOrder } from '../tree';

import type { WorldMapSummary } from '@/types/world';

const m = (id: string, parentMapId: string | null): WorldMapSummary => ({
    id,
    name: id,
    parentMarkerId: null,
    parentMapId,
    imageUrl: '',
    width: 1,
    height: 1,
});

describe('mapPath', () => {
    it('від кореня до міста', () => {
        expect(
            mapPath(
                [m('world', null), m('kingdom', 'world'), m('city', 'kingdom')],
                'city'
            ).map((x) => x.id)
        ).toEqual(['world', 'kingdom', 'city']);
    });

    it('невідомий id → []', () => {
        expect(mapPath([m('a', null)], 'zzz')).toEqual([]);
    });

    it('цикл не зависає', () => {
        expect(mapPath([m('a', 'b'), m('b', 'a')], 'a').length).toBe(2);
    });

    it('обрив ланцюга → відомий хвіст', () => {
        expect(mapPath([m('b', 'gone')], 'b').map((x) => x.id)).toEqual(['b']);
    });
});

describe('subtreeMapIds', () => {
    it('глибина 3 з двома гілками', () => {
        const maps = [
            m('r', null),
            m('a', 'r'),
            m('b', 'r'),
            m('a1', 'a'),
            m('a1x', 'a1'),
            m('other', null),
        ];

        expect(subtreeMapIds(maps, 'r').sort()).toEqual([
            'a',
            'a1',
            'a1x',
            'b',
            'r',
        ]);
        expect(subtreeMapIds(maps, 'a').sort()).toEqual(['a', 'a1', 'a1x']);
    });
});

describe('treeOrder', () => {
    it('depth-first, siblings keep input order', () => {
        const maps = [
            m('b', 'r'),
            m('a1', 'a'),
            m('r', null),
            m('a', 'r'),
            m('x', null),
        ];

        expect(treeOrder(maps).map((x) => x.id)).toEqual([
            'r',
            'b',
            'a',
            'a1',
            'x',
        ]);
    });

    it('orphans become roots, cycles are dropped without hanging', () => {
        expect(
            treeOrder([m('o', 'gone'), m('c1', 'c2'), m('c2', 'c1')]).map(
                (x) => x.id
            )
        ).toEqual(['o']);
    });
});

describe('treeDepth', () => {
    it('counts ancestors', () => {
        const maps = [m('r', null), m('a', 'r'), m('b', 'a')];

        expect(treeDepth(maps, 'r')).toBe(0);
        expect(treeDepth(maps, 'b')).toBe(2);
    });
});
