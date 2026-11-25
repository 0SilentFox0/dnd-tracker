import { describe, expect, it } from 'vitest';

import {
    cellAtScreenPoint,
    cellCenter,
    cellPolygon,
    cellScreenPoint,
    edgeAtScreenPoint,
    fitMapBox,
    fitMapView,
    mapSize,
    playableBounds,
    screenToUnit,
    tokenBox,
    UNIT,
    viewCellPx,
    visibleGridWindow,
} from '../layout';

import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';

describe('квадрати', () => {
    it('розмір карти й центр клітинки', () => {
        expect(mapSize({ cols: 20, rows: 12 })).toEqual({
            width: 20 * UNIT,
            height: 12 * UNIT,
        });
        expect(cellCenter({ x: 2, y: 1 })).toEqual({
            x: 2.5 * UNIT,
            y: 1.5 * UNIT,
        });
        expect(cellPolygon({ x: 0, y: 0 }).split(' ')).toHaveLength(4);
    });

    it('токен 2×2 — центр на стику чотирьох клітинок, діаметр ~2 клітинки', () => {
        const p = createMockParticipant();

        const big = {
            ...p,
            combatStats: { ...p.combatStats, gridSize: 2 },
            battleData: { ...p.battleData, position: { x: 3, y: 3 } },
        };

        const box = tokenBox(big);

        expect(box?.cx).toBe(4 * UNIT);
        expect(box?.cy).toBe(4 * UNIT);
        expect(box?.size).toBeGreaterThan(1.5 * UNIT);
    });

    it('учасник без позиції — без токена', () => {
        expect(tokenBox(createMockParticipant())).toBeNull();
    });
});

describe('fitMapBox', () => {
    it('широкий контейнер — обмежує висота', () => {
        expect(
            fitMapBox({ width: 1000, height: 300 }, { cols: 20, rows: 12 })
        ).toEqual({ width: 500, height: 300 });
    });

    it('високий контейнер — обмежує ширина', () => {
        expect(
            fitMapBox({ width: 300, height: 1000 }, { cols: 20, rows: 12 })
        ).toEqual({ width: 300, height: 180 });
    });

    it('висока карта 20×40 у широкому контейнері', () => {
        expect(
            fitMapBox({ width: 1000, height: 500 }, { cols: 20, rows: 40 })
        ).toEqual({ width: 250, height: 500 });
    });
});

describe('fitMapView cover', () => {
    it('fills both axes of the available box', () => {
        const v = fitMapView(
            { width: 1000, height: 600 },
            { cols: 20, rows: 10 },
            { cover: 0.25 }
        );

        expect(v.width).toBe(1200);

        expect(v.height).toBe(600);
    });

    it('falls back to contain when too much would be cropped', () => {
        const v = fitMapView(
            { width: 1000, height: 1000 },
            { cols: 10, rows: 15 },
            { cover: 0.25 }
        );

        expect(v.height).toBe(1000);
    });
});

describe('fitMapView', () => {
    const wide = { cols: 20, rows: 12 };

    it('без rotatable не повертає навіть у портретному контейнері', () => {
        expect(fitMapView({ width: 300, height: 600 }, wide)).toEqual({
            width: 300,
            height: 180,
            rotated: false,
            grow: 1,
        });
    });

    it('широка карта в портретному контейнері — повернута, рамка з переставленими сторонами', () => {
        expect(
            fitMapView({ width: 300, height: 600 }, wide, { rotatable: true })
        ).toEqual({ width: 300, height: 500, rotated: true, grow: 1 });
    });

    it('широка карта в широкому контейнері — без повороту', () => {
        expect(
            fitMapView({ width: 600, height: 300 }, wide, { rotatable: true })
        ).toEqual({ width: 500, height: 300, rotated: false, grow: 1 });
    });

    it('bothWays: висока карта в широкому контейнері — повернута; без bothWays — ні', () => {
        expect(
            fitMapView(
                { width: 600, height: 300 },
                { cols: 12, rows: 20 },
                { bothWays: true }
            )
        ).toEqual({ width: 500, height: 300, rotated: true, grow: 1 });
        expect(
            fitMapView({ width: 600, height: 300 }, { cols: 12, rows: 20 })
                .rotated
        ).toBe(false);
    });

    it('taller: карта розтягується по ширині до заданої надвисоти', () => {
        expect(
            fitMapView({ width: 600, height: 300 }, wide, { taller: 1.4 })
        ).toEqual({ width: 600, height: 360, rotated: false, grow: 1 });
    });

    it('майже квадратна карта — поворот майже нічого не дає, лишається як є', () => {
        expect(
            fitMapView(
                { width: 300, height: 600 },
                { cols: 11, rows: 10 },
                { rotatable: true }
            ).rotated
        ).toBe(false);
    });

    it('висока карта в портретному контейнері — без повороту', () => {
        expect(
            fitMapView(
                { width: 300, height: 600 },
                { cols: 10, rows: 20 },
                { rotatable: true }
            ).rotated
        ).toBe(false);
    });

    it('портретний контейнер, що стиснувся під панеллю наведення, — карта лишається повернутою', () => {
        expect(
            fitMapView(
                { width: 382, height: 426 },
                { cols: 15, rows: 9 },
                { rotatable: true }
            ).rotated
        ).toBe(true);
    });

    it('fillWidth: повернута карта на всю ширину, висота більша за доступну', () => {
        expect(
            fitMapView({ width: 300, height: 400 }, wide, {
                rotatable: true,
                fillWidth: true,
            })
        ).toEqual({ width: 300, height: 500, rotated: true, grow: 1 });
    });

    it('fillWidth без повороту: ширина екрана, висота за пропорцією', () => {
        expect(
            fitMapView({ width: 600, height: 100 }, wide, { fillWidth: true })
        ).toEqual({ width: 600, height: 360, rotated: false, grow: 1 });
    });

    it('порожній контейнер — без повороту', () => {
        expect(
            fitMapView({ width: 0, height: 0 }, wide, { rotatable: true })
        ).toEqual({ width: 0, height: 0, rotated: false, grow: 1 });
    });

    it('minCell: дрібні клітинки — рамка росте до мінімальної клітинки зі збереженням пропорцій', () => {
        expect(
            fitMapView({ width: 300, height: 200 }, wide, { minCell: 32 })
        ).toEqual({ width: 640, height: 384, rotated: false, grow: 640 / 300 });
    });

    it('minCell: клітинки й так достатні — рамка не змінюється', () => {
        expect(
            fitMapView({ width: 1000, height: 600 }, wide, { minCell: 32 })
        ).toEqual({ width: 1000, height: 600, rotated: false, grow: 1 });
    });

    it('grow: 1 без minCell і > 1, коли клітинка менша за minCell', () => {
        const avail = { width: 300, height: 200 };

        expect(fitMapView(avail, wide).grow).toBe(1);
        expect(fitMapView(avail, wide, { minCell: 10 }).grow).toBe(1);
        expect(fitMapView(avail, wide, { minCell: 30 }).grow).toBeCloseTo(2, 9);
    });

    it('minCell: порожній контейнер не роздувається', () => {
        expect(
            fitMapView({ width: 0, height: 0 }, wide, { minCell: 32 })
        ).toEqual({ width: 0, height: 0, rotated: false, grow: 1 });
    });
});

describe('cellAtScreenPoint', () => {
    const map = { cols: 4, rows: 2 };

    it('зсув і масштаб: 100 px на клітинку, сітка з (100, 50)', () => {
        const ctm = { a: 1, b: 0, c: 0, d: 1, e: 100, f: 50 };

        expect(cellAtScreenPoint(map, ctm, 100, 50)).toEqual({ x: 0, y: 0 });
        expect(cellAtScreenPoint(map, ctm, 499, 249)).toEqual({ x: 3, y: 1 });
        expect(
            cellAtScreenPoint(map, { ...ctm, a: 0.5, d: 0.5 }, 260, 110)
        ).toEqual({ x: 3, y: 1 });
    });

    it('поворот на 90° за годинниковою: верхній рядок карти — праворуч', () => {
        const ctm = { a: 0, b: 1, c: -1, d: 0, e: 200, f: 0 };

        expect(cellAtScreenPoint(map, ctm, 190, 10)).toEqual({ x: 0, y: 0 });
        expect(cellAtScreenPoint(map, ctm, 10, 10)).toEqual({ x: 0, y: 1 });
        expect(cellAtScreenPoint(map, ctm, 190, 390)).toEqual({ x: 3, y: 0 });
    });

    it('поза сіткою або вироджена матриця — null', () => {
        const ctm = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

        expect(cellAtScreenPoint(map, ctm, 400, 10)).toBeNull();
        expect(cellAtScreenPoint(map, ctm, -1, 10)).toBeNull();
        expect(cellAtScreenPoint(map, { ...ctm, a: 0, d: 0 }, 0, 0)).toBeNull();
    });
});

describe('playableBounds', () => {
    it('без неігрових клітинок — уся карта', () => {
        expect(playableBounds({ cols: 4, rows: 3 })).toEqual({
            x: 0,
            y: 0,
            cols: 4,
            rows: 3,
        });
    });

    it('поля по краях відкидаються, дірка всередині лишається', () => {
        const blocked = [
            '0:0',
            '1:0',
            '2:0',
            '3:0',
            '0:1',
            '0:2',
            '0:3',
            '3:3',
            '2:2',
        ];

        expect(playableBounds({ cols: 4, rows: 4, blocked })).toEqual({
            x: 1,
            y: 1,
            cols: 3,
            rows: 3,
        });
    });

    it('уся карта неігрова — повертає всю карту', () => {
        expect(
            playableBounds({ cols: 2, rows: 1, blocked: ['0:0', '1:0'] })
        ).toEqual({ x: 0, y: 0, cols: 2, rows: 1 });
    });
});

describe('playableBounds oracle', () => {
    function oracle(cols: number, rows: number, blocked: string[]) {
        const set = new Set(blocked);

        let x0 = cols,
            y0 = rows,
            x1 = -1,
            y1 = -1;

        for (let y = 0; y < rows; y++)
            for (let x = 0; x < cols; x++) {
                if (set.has(`${x}:${y}`)) continue;

                x0 = Math.min(x0, x);
                y0 = Math.min(y0, y);
                x1 = Math.max(x1, x);
                y1 = Math.max(y1, y);
            }

        return x1 < 0
            ? { x: 0, y: 0, cols, rows }
            : { x: x0, y: y0, cols: x1 - x0 + 1, rows: y1 - y0 + 1 };
    }

    it('збігається зі скануванням усієї карти на випадкових масках', () => {
        let seed = 7;

        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

        for (let i = 0; i < 50; i++) {
            const cols = 1 + Math.floor(rnd() * 12);

            const rows = 1 + Math.floor(rnd() * 12);

            const density = rnd();

            const blocked: string[] = [];

            for (let y = 0; y < rows; y++)
                for (let x = 0; x < cols; x++)
                    if (rnd() < density) blocked.push(`${x}:${y}`);

            expect(playableBounds({ cols, rows, blocked })).toEqual(
                oracle(cols, rows, blocked)
            );
        }
    });

    it('повністю заблокована карта — уся карта, результат кешується', () => {
        const blocked = ['0:0', '1:0', '0:1', '1:1'];

        const first = playableBounds({ cols: 2, rows: 2, blocked });

        expect(first).toEqual({ x: 0, y: 0, cols: 2, rows: 2 });
        expect(playableBounds({ cols: 2, rows: 2, blocked })).toBe(first);
    });
});

describe('edgeAtScreenPoint', () => {
    const map = { cols: 4, rows: 3 };

    it('вертикальне ребро між сусідніми клітинками в рядку', () => {
        expect(edgeAtScreenPoint(map, 2 * UNIT + 5, 1.5 * UNIT)).toBe('1:1:e');
    });

    it('горизонтальне ребро між рядками', () => {
        expect(edgeAtScreenPoint(map, 1.5 * UNIT, 2 * UNIT - 8)).toBe('1:1:s');
    });

    it('біля кута перемагає ближча вісь', () => {
        expect(edgeAtScreenPoint(map, 2 * UNIT + 4, 1 * UNIT + 12)).toBe(
            '1:1:e'
        );
        expect(edgeAtScreenPoint(map, 2 * UNIT + 12, 1 * UNIT + 4)).toBe(
            '2:0:s'
        );
    });

    it('центр клітинки, зовнішній край і позамежжя дають null', () => {
        expect(edgeAtScreenPoint(map, 1.5 * UNIT, 1.5 * UNIT)).toBeNull();
        expect(edgeAtScreenPoint(map, 2, 1.5 * UNIT)).toBeNull();
        expect(edgeAtScreenPoint(map, 4 * UNIT, 1.5 * UNIT)).toBeNull();
        expect(edgeAtScreenPoint(map, -5, 50)).toBeNull();
        expect(edgeAtScreenPoint(map, 5 * UNIT, 50)).toBeNull();
    });
});

describe('screenToUnit', () => {
    it('знімає зсув і масштаб матриці', () => {
        const ctm = { a: 2, b: 0, c: 0, d: 2, e: 10, f: 20 };

        expect(screenToUnit(ctm, 210, 120)).toEqual({ x: 100, y: 50 });
    });

    it('вироджена матриця — null', () => {
        expect(
            screenToUnit({ a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 }, 1, 1)
        ).toBeNull();
    });
});

describe('cellScreenPoint', () => {
    const map = { cols: 20, rows: 12 };

    const cases = {
        одинична: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
        'зум 2 і зсув': { a: 2, b: 0, c: 0, d: 2, e: 40, f: -15 },
        'поворот 90°': { a: 0, b: 1, c: -1, d: 0, e: 1200, f: 0 },
    };

    for (const [name, ctm] of Object.entries(cases)) {
        it(`обернена до cellAtScreenPoint: ${name}`, () => {
            for (const p of [
                { x: 0, y: 0 },
                { x: 7, y: 3 },
                { x: 19, y: 11 },
            ]) {
                const s = cellScreenPoint(ctm, p);

                expect(cellAtScreenPoint(map, ctm, s.x, s.y)).toEqual(p);
            }
        });
    }
});

describe('visibleGridWindow', () => {
    const id = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

    it('viewport усередині карти: кратне 16 і містить viewport', () => {
        const win = visibleGridWindow({
            viewport: {
                left: 20 * UNIT,
                top: 20 * UNIT,
                right: 25 * UNIT,
                bottom: 24 * UNIT,
            },
            ctm: id,
            cols: 200,
            rows: 200,
        });

        expect(win.x % 16).toBe(0);
        expect(win.y % 16).toBe(0);
        expect((win.x + win.cols) % 16).toBe(0);
        expect(win.x).toBeLessThanOrEqual(20);
        expect(win.x + win.cols).toBeGreaterThanOrEqual(25);
        expect(win.y).toBeLessThanOrEqual(20);
        expect(win.y + win.rows).toBeGreaterThanOrEqual(24);
    });

    it('viewport поза картою обрізано', () => {
        const win = visibleGridWindow({
            viewport: { left: -5000, top: -5000, right: 99999, bottom: 99999 },
            ctm: id,
            cols: 40,
            rows: 30,
        });

        expect(win).toEqual({ x: 0, y: 0, cols: 40, rows: 30 });
    });

    it('працює з поворотом', () => {
        const ctm = { a: 0, b: 1, c: -1, d: 0, e: 100 * UNIT, f: 0 };

        const win = visibleGridWindow({
            viewport: {
                left: 90 * UNIT,
                top: 10 * UNIT,
                right: 95 * UNIT,
                bottom: 14 * UNIT,
            },
            ctm,
            cols: 200,
            rows: 200,
        });

        // unit x = (y - f)/UNIT = 10..14, unit y = (e - x)/UNIT = 5..10
        expect(win.x).toBeLessThanOrEqual(10);
        expect(win.x + win.cols).toBeGreaterThanOrEqual(14);
        expect(win.y).toBeLessThanOrEqual(5);
        expect(win.y + win.rows).toBeGreaterThanOrEqual(10);
    });
});

describe('fitMapView alwaysRotate', () => {
    const portraitBox = { width: 400, height: 800 };

    it('turns a mildly landscape map in a portrait box only when alwaysRotate', () => {
        const map = { cols: 11, rows: 10 };

        expect(fitMapView(portraitBox, map, { rotatable: true }).rotated).toBe(
            false
        );
        expect(
            fitMapView(portraitBox, map, {
                rotatable: true,
                alwaysRotate: true,
            }).rotated
        ).toBe(true);
    });

    it('does not turn a square or portrait map', () => {
        expect(
            fitMapView(
                portraitBox,
                { cols: 10, rows: 10 },
                { rotatable: true, alwaysRotate: true }
            ).rotated
        ).toBe(false);
    });
});

describe('viewCellPx', () => {
    it('divides by rows when the view is rotated', () => {
        const win = { cols: 40, rows: 20 };

        expect(viewCellPx({ width: 400, rotated: false }, win)).toBe(10);
        expect(viewCellPx({ width: 400, rotated: true }, win)).toBe(20);
    });
});
