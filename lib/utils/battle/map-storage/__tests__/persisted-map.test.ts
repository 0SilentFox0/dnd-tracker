import { describe, expect, it } from 'vitest';

import { composeEffectiveMap } from '../effective-map';
import { clientMapOf, persistedMap } from '../persisted-map';

import type { BattleMapConfig, BattleMapState } from '@/types/battle-grid';

const stored: BattleMapConfig = {
    cols: 8,
    rows: 8,
    background: null,
    opacity: 0.3,
    walls: ['1:1:e', '2:2:s'],
    bars: ['3:3:e'],
};

const state: BattleMapState = { removedEdges: ['1:1:e'], doors: {} };

const meta = () => ({
    map: composeEffectiveMap(stored, state),
    mapRef: null,
    mapBase: { walls: stored.walls, bars: stored.bars },
});

describe('persistedMap: inline з removedEdges', () => {
    it('нерелевантна мутація лишає базові стіни (без запікання)', () => {
        const m = meta();

        const out = persistedMap(m, { ...m.map!, terrain: {} }, state);

        expect(out.walls).toBe(stored.walls);
        expect(out.bars).toBe(stored.bars);
    });

    it('map-walls: додане ребро + видалені лишаються віднімними', () => {
        const m = meta();

        const out = persistedMap(
            m,
            { ...m.map!, walls: [...m.map!.walls!, '5:5:e'] },
            state
        );

        expect(out.walls).toEqual(['2:2:s', '5:5:e', '1:1:e']);
    });

    it('додане поверх видаленого ребра: стан його звільнив, ребро в сховищі', () => {
        const m = meta();

        const out = persistedMap(
            m,
            { ...m.map!, walls: [...m.map!.walls!, '1:1:e'] },
            { removedEdges: [], doors: {} }
        );

        expect(new Set(out.walls)).toEqual(new Set(['1:1:e', '2:2:s']));
    });

    it('linked: ребра не пишуться', () => {
        const out = persistedMap(
            { ...meta(), mapRef: { mapId: 'm', version: 1 } },
            stored,
            null
        );

        expect(out).not.toHaveProperty('walls');
        expect(out).not.toHaveProperty('bars');
    });
});

describe('clientMapOf', () => {
    it('inline: базові ребра, linked: шапка', () => {
        expect(clientMapOf(meta())?.walls).toEqual(stored.walls);
        expect(
            clientMapOf({ ...meta(), mapRef: { mapId: 'm', version: 1 } })
        ).not.toHaveProperty('walls');
    });
});

describe('persistedMap: двері', () => {
    const withDoors: BattleMapConfig = {
        ...stored,
        doors: { '4:4:e': { open: false } },
    };

    const doorState: BattleMapState = {
        removedEdges: [],
        doors: { '4:4:e': { open: true } },
    };

    it('пише базові двері, не ефективні', () => {
        const m = {
            map: composeEffectiveMap(withDoors, doorState),
            mapRef: null,
            mapBase: { walls: stored.walls, bars: stored.bars },
        };

        const out = persistedMap(m, { ...m.map, terrain: {} }, doorState);

        expect(out.doors).toBe(withDoors.doors);
    });

    it('linked: заголовок із базовими дверима', () => {
        const m = {
            map: composeEffectiveMap(withDoors, doorState),
            mapRef: { mapId: 'm', version: 1 },
        };

        expect(persistedMap(m, m.map, doorState).doors).toBe(withDoors.doors);
    });
});
