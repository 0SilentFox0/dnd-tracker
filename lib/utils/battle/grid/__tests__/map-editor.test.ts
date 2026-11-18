import { describe, expect, it } from 'vitest';

import {
    applyMargins,
    clampMargins,
    hasPlayableArea,
    inferMargins,
    isPreviewSafeBackground,
    marginsBlocked,
    paintCells,
    paintDoors,
    paintEdges,
    resizeMap,
} from '../map-editor';
import { hazardDamage } from '../terrain';
import { allInteriorEdges } from '../walls';

import { MAP_LIMITS } from '@/lib/constants/map-limits';
import type { BattleMapConfig } from '@/types/battle-grid';

const base: BattleMapConfig = {
    cols: 20,
    rows: 12,
    background: null,
    opacity: 0.35,
};

const m3 = { top: 3, right: 3, bottom: 3, left: 3 };

describe('map-editor', () => {
    it('поля 3 на 20×12 → 156 клітинок', () => {
        expect(marginsBlocked(20, 12, m3)).toHaveLength(156);
    });

    it('різні поля по сторонах', () => {
        expect(
            marginsBlocked(4, 4, { top: 1, right: 0, bottom: 0, left: 0 })
        ).toHaveLength(4);
    });

    it('inferMargins відновлює 3/3/3/3 і нулі без blocked', () => {
        expect(inferMargins(applyMargins(base, m3))).toEqual(m3);
        expect(inferMargins(base)).toEqual({
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
        });
    });

    it('resizeMap відкидає blocked поза сіткою', () => {
        const map = applyMargins(base, {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
        });

        const painted = paintCells(
            map,
            [
                { x: 15, y: 2 },
                { x: 2, y: 2 },
            ],
            'blocked'
        );

        expect(resizeMap(painted, 10, 10).blocked).toEqual(['2:2']);
    });

    it('resizeMap і applyMargins знімають місцевість поза сіткою та на полях', () => {
        const map = {
            ...base,
            terrain: {
                '15:2': { kind: 'wall' as const },
                '2:2': { kind: 'hazard' as const },
                '0:5': { kind: 'wall' as const },
            },
        };

        expect(resizeMap(map, 10, 10).terrain).toEqual({
            '2:2': { kind: 'hazard' },
            '0:5': { kind: 'wall' },
        });
        expect(
            applyMargins(
                map,
                { top: 0, right: 0, bottom: 0, left: 1 },
                { top: 0, right: 0, bottom: 0, left: 0 }
            ).terrain
        ).toEqual({
            '15:2': { kind: 'wall' },
            '2:2': { kind: 'hazard' },
        });
        expect(
            resizeMap(
                { ...base, terrain: { '15:2': { kind: 'wall' } } },
                10,
                10
            )
        ).not.toHaveProperty('terrain');
    });

    it('applyMargins зберігає намальовані клітинки поза полями', () => {
        const painted = paintCells(
            applyMargins(base, m3, { top: 0, right: 0, bottom: 0, left: 0 }),
            [{ x: 10, y: 6 }],
            'blocked'
        );

        const next = applyMargins(
            painted,
            { top: 1, right: 1, bottom: 1, left: 1 },
            m3
        );

        expect(next.blocked).toContain('10:6');
        expect(next.blocked).toHaveLength(20 * 12 - 18 * 10 + 1);
        expect(next.blocked).not.toContain('2:2');
    });

    it('paintCells ставить небезпеку з підписом і шкодою', () => {
        const m: BattleMapConfig = {
            cols: 5,
            rows: 5,
            background: null,
            opacity: 0.3,
        };

        const damage = { dice: '1d6', type: 'fire' };

        expect(
            paintCells(m, [{ x: 1, y: 1 }], 'hazard', { label: 'Лава', damage })
                .terrain
        ).toEqual({ '1:1': { kind: 'hazard', label: 'Лава', damage } });
    });

    it('hazardDamage: порожні або некоректні кубики — без шкоди', () => {
        expect(hazardDamage(' 2d4+1 ', 'acid')).toEqual({
            dice: '2d4+1',
            type: 'acid',
        });
        expect(hazardDamage('', 'fire')).toBeUndefined();
        expect(hazardDamage('d6', 'fire')).toBeUndefined();
    });

    it('clampMargins лишає 2 клітинки', () => {
        expect(
            clampMargins(
                { cols: 12, rows: 4 },
                { top: 8, right: 0, bottom: 0, left: 0 }
            )
        ).toEqual({ top: 2, right: 0, bottom: 0, left: 0 });
    });

    it('hasPlayableArea шукає блок 2×2', () => {
        expect(
            hasPlayableArea({
                cols: 4,
                rows: 4,
                blocked: ['0:1', '1:0', '3:3', '2:2'],
            })
        ).toBe(true);
        expect(
            hasPlayableArea({
                cols: 4,
                rows: 4,
                blocked: ['0:1', '1:2', '2:1', '3:2', '1:0', '3:0'],
            })
        ).toBe(false);
    });

    it('isPreviewSafeBackground пропускає лише безпечні джерела', () => {
        for (const ok of [
            '/battle-maps/a.webp',
            'data:image/webp;base64,AAAA',
            'https://abc.supabase.co/storage/v1/object/public/battle-maps/x.webp',
        ])
            expect(isPreviewSafeBackground(ok)).toBe(true);

        for (const bad of [
            'h',
            'https://evil.com/a.png',
            'http://abc.supabase.co/storage/v1/object/public/x',
            '',
            null,
        ])
            expect(isPreviewSafeBackground(bad)).toBe(false);
    });
});

describe('paintEdges', () => {
    const paint = (...args: Parameters<typeof paintEdges>) =>
        paintEdges(...args).map;

    it('додає стіни й ґрати', () => {
        const a = paint(base, ['1:1:e', '2:2:s'], 'add-walls');

        expect(a.walls).toEqual(['1:1:e', '2:2:s']);
        expect(paint(a, ['3:3:e'], 'add-bars').bars).toEqual(['3:3:e']);
    });

    it('конфлікт: остання дія перемагає', () => {
        const walls = paint(base, ['1:1:e'], 'add-walls');

        const bars = paint(walls, ['1:1:e'], 'add-bars');

        expect(bars.walls).toBeUndefined();
        expect(bars.bars).toEqual(['1:1:e']);
        expect(paint(bars, ['1:1:e'], 'add-walls').bars).toBeUndefined();
    });

    it('remove чіпає лише свій вид, erase — обидва', () => {
        const both = paint(
            paint(base, ['1:1:e'], 'add-walls'),
            ['2:2:e'],
            'add-bars'
        );

        expect(paint(both, ['2:2:e'], 'remove-walls').bars).toEqual(['2:2:e']);

        const erased = paint(both, ['1:1:e', '2:2:e'], 'erase');

        expect(erased.walls).toBeUndefined();
        expect(erased.bars).toBeUndefined();
    });

    it('ребра поза картою ігноруються', () => {
        expect(paintEdges(base, ['19:0:e', '0:11:s'], 'add-walls')).toEqual({
            map: base,
            overflow: false,
        });
    });

    it('понад ліміт — overflow, карта без змін', () => {
        const big = { ...base, cols: 100, rows: 100 };

        const edges = allInteriorEdges(big).filter((e) => e.endsWith(':e'));

        const full = paintEdges(
            big,
            edges.slice(0, MAP_LIMITS.inlineMaxEdges),
            'add-walls'
        );

        expect(full.overflow).toBe(false);

        const over = paintEdges(
            full.map,
            edges.slice(
                MAP_LIMITS.inlineMaxEdges,
                MAP_LIMITS.inlineMaxEdges + 1
            ),
            'add-walls'
        );

        expect(over.overflow).toBe(true);
        expect(over.map).toBe(full.map);
    });

    it('resizeMap відкидає ребра поза новим розміром', () => {
        const map = paintEdges(base, ['2:2:e', '15:2:e'], 'add-walls').map;

        expect(resizeMap(map, 10, 12).walls).toEqual(['2:2:e']);
    });
});

describe('paintDoors', () => {
    it('ставить зачинені/замкнені двері, прибирає, витісняє стіну', () => {
        const walled = paintEdges(base, ['1:1:e'], 'add-walls').map;

        const placed = paintDoors(
            walled,
            { add: ['1:1:e', '2:2:s'], remove: [] },
            true
        ).map;

        expect(placed.doors).toEqual({
            '1:1:e': { open: false, locked: true },
            '2:2:s': { open: false, locked: true },
        });
        expect(placed.walls).toBeUndefined();

        const removed = paintDoors(placed, { add: [], remove: ['1:1:e'] }).map;

        expect(Object.keys(removed.doors ?? {})).toEqual(['2:2:s']);
        expect(
            paintDoors(removed, { add: [], remove: ['2:2:s'] }).map.doors
        ).toBeUndefined();
    });

    it('стіна заміщає двері, erase прибирає їх, resize відсікає за межами', () => {
        const door = paintDoors(base, {
            add: ['1:1:e', '18:5:e'],
            remove: [],
        }).map;

        expect(paintEdges(door, ['1:1:e'], 'add-walls').map.doors).toEqual({
            '18:5:e': { open: false },
        });
        expect(
            paintEdges(door, ['1:1:e'], 'erase').map.doors?.['1:1:e']
        ).toBeUndefined();
        expect(Object.keys(resizeMap(door, 10, 10).doors ?? {})).toEqual([
            '1:1:e',
        ]);
    });

    it('понад doorsMax — overflow', () => {
        const big = { ...base, cols: 60, rows: 60 };

        const all = Array.from(
            { length: MAP_LIMITS.doorsMax + 1 },
            (_, i) => `${i % 59}:${Math.floor(i / 59)}:e`
        );

        expect(paintDoors(big, { add: all, remove: [] }).overflow).toBe(true);
    });
});
