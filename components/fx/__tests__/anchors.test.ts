// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resolvePoints as resolve } from '@/components/fx/runtime/anchors';
import type { FxSpec } from '@/lib/utils/battle/fx';

const spec = (over: Partial<FxSpec> = {}): FxSpec => ({
    key: 'k',
    archetype: 'bolt',
    element: 'fire',
    actorId: 'a',
    actorSide: 'ally',
    targetIds: ['t'],
    hit: true,
    critical: false,
    ...over,
});

// The points behind `targets`, which most cases check.
function resolvePoints(...args: Parameters<typeof resolve>) {
    const r = resolve(...args);

    return r && { ...r, to: r.targets.map((t) => t.at) };
}

type Rect = { x: number; y: number; w: number; h: number };

const domRect = (rect: Rect) => () =>
    ({
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        right: rect.x + rect.w,
        bottom: rect.y + rect.h,
        x: rect.x,
        y: rect.y,
        toJSON: () => ({}),
    }) as DOMRect;

function anchor(
    id: string,
    rect: Rect,
    track = false,
    parent: HTMLElement = document.body
) {
    const el = document.createElement('span');

    el.dataset.fxParticipant = id;

    if (track) el.dataset.fxAnchor = 'track';

    el.getBoundingClientRect = domRect(rect);
    parent.appendChild(el);

    return el;
}

/** Обгортка карти на телефоні: прокручуваний div → [data-fx-clip] */
function mapClip(viewport: Rect, scrolls: boolean) {
    const scroller = document.createElement('div');

    const clip = document.createElement('div');

    clip.dataset.fxClip = '';
    clip.getBoundingClientRect = domRect({ ...viewport, h: viewport.h * 3 });
    scroller.appendChild(clip);
    scroller.getBoundingClientRect = domRect(viewport);
    Object.defineProperty(scroller, 'clientHeight', { value: viewport.h });
    Object.defineProperty(scroller, 'scrollHeight', {
        value: scrolls ? viewport.h * 3 : viewport.h,
    });
    document.body.appendChild(scroller);

    return clip;
}

beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('innerWidth', 1000);
    vi.stubGlobal('innerHeight', 800);
});

describe('resolvePoints', () => {
    it('uses actor and target centres', () => {
        anchor('a', { x: 0, y: 0, w: 40, h: 40 });
        anchor('t', { x: 500, y: 100, w: 40, h: 40 });

        expect(resolvePoints(spec())).toMatchObject({
            from: { x: 20, y: 20 },
            to: [{ x: 520, y: 120 }],
        });
    });

    it('no visible target → null', () => {
        anchor('a', { x: 0, y: 0, w: 40, h: 40 });
        anchor('t', { x: 0, y: 0, w: 0, h: 0 });

        expect(resolvePoints(spec())).toBeNull();
    });

    it('hidden enemy actor comes from the top edge', () => {
        anchor('t', { x: 500, y: 600, w: 40, h: 40 });

        expect(resolvePoints(spec({ actorSide: 'enemy' }))?.from).toEqual({
            x: 520,
            y: -20,
        });
    });

    it('prefers a row anchor over the initiative track', () => {
        anchor('t', { x: 10, y: 10, w: 20, h: 20 }, true);
        anchor('t', { x: 500, y: 300, w: 40, h: 40 });
        anchor('a', { x: 0, y: 0, w: 40, h: 40 });

        expect(resolvePoints(spec())?.to).toEqual([{ x: 520, y: 320 }]);
    });

    it('drops targets that are not visible but keeps the rest', () => {
        anchor('a', { x: 0, y: 0, w: 40, h: 40 });
        anchor('t1', { x: 500, y: 100, w: 40, h: 40 });

        expect(resolvePoints(spec({ targetIds: ['t1', 't2'] }))?.to).toEqual([
            { x: 520, y: 120 },
        ]);
    });

    it('токен, прокручений за край прокручуваної карти, — поза екраном, хоч і у вікні', () => {
        const clip = mapClip({ x: 0, y: 100, w: 400, h: 500 }, true);

        anchor('a', { x: 10, y: 200, w: 40, h: 40 }, false, clip);
        anchor('t', { x: 10, y: 650, w: 40, h: 40 }, false, clip);

        expect(resolvePoints(spec())).toBeNull();
        expect(
            resolvePoints(spec({ targetIds: ['a'], actorId: 't' }))?.from
        ).toEqual({ x: 30, y: 820 });
    });

    it('карта не прокручується — межа вікна, як раніше', () => {
        const clip = mapClip({ x: 0, y: 100, w: 400, h: 500 }, false);

        anchor('a', { x: 10, y: 200, w: 40, h: 40 }, false, clip);
        anchor('t', { x: 10, y: 650, w: 40, h: 40 }, false, clip);

        expect(resolvePoints(spec())?.to).toEqual([{ x: 30, y: 670 }]);
    });
});

function ranked(
    id: string,
    rect: Rect,
    kind: 'map' | 'detail' | 'track' | null,
    parent: HTMLElement = document.body
) {
    const el = anchor(id, rect, false, parent);

    if (kind) el.dataset.fxAnchor = kind;

    return el;
}

describe('ранжування якорів', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('токен карти важливіший за рядок, плитку деталей і трек — незалежно від порядку в DOM', () => {
        ranked('t', { x: 10, y: 10, w: 20, h: 20 }, 'track');
        ranked('t', { x: 40, y: 10, w: 20, h: 20 }, 'detail');
        ranked('t', { x: 70, y: 10, w: 20, h: 20 }, null);
        ranked('t', { x: 100, y: 10, w: 20, h: 20 }, 'map');

        expect(resolvePoints(spec())?.to[0]).toEqual({ x: 110, y: 20 });
    });

    it('рядок важливіший за плитку деталей', () => {
        ranked('t', { x: 40, y: 10, w: 20, h: 20 }, 'detail');
        ranked('t', { x: 70, y: 10, w: 20, h: 20 }, null);

        expect(resolvePoints(spec())?.to[0]).toEqual({ x: 80, y: 20 });
    });
});

describe('відсікання за [data-fx-clip]', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    function clipBox(rect: Rect) {
        const clip = document.createElement('div');

        clip.dataset.fxClip = '';
        clip.getBoundingClientRect = domRect(rect);
        document.body.appendChild(clip);

        return clip;
    }

    it('токен, відсунутий зумом за межі карти, невидимий — береться рядок', () => {
        const clip = clipBox({ x: 0, y: 0, w: 300, h: 200 });

        ranked('t', { x: 400, y: 50, w: 20, h: 20 }, 'map', clip);
        ranked('t', { x: 500, y: 300, w: 20, h: 20 }, null);

        expect(resolvePoints(spec())?.to[0]).toEqual({ x: 510, y: 310 });
    });

    it('токен усередині видимої частини карти лишається першим', () => {
        const clip = clipBox({ x: 0, y: 0, w: 300, h: 200 });

        ranked('t', { x: 100, y: 50, w: 20, h: 20 }, 'map', clip);
        ranked('t', { x: 500, y: 300, w: 20, h: 20 }, null);

        expect(resolvePoints(spec())?.to[0]).toEqual({ x: 110, y: 60 });
    });

    it('постріл: from — токен стрільця на карті, to — токен цілі', () => {
        const clip = clipBox({ x: 0, y: 0, w: 300, h: 200 });

        ranked('a', { x: 10, y: 10, w: 20, h: 20 }, 'map', clip);
        ranked('a', { x: 500, y: 300, w: 20, h: 20 }, null);
        ranked('t', { x: 200, y: 100, w: 20, h: 20 }, 'map', clip);

        const points = resolvePoints(spec({ archetype: 'ranged' }));

        expect(points?.from).toEqual({ x: 20, y: 20 });
        expect(points?.to[0]).toEqual({ x: 210, y: 110 });
    });
});

describe('точка шаблону', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

    function grid(
        ctm: Partial<typeof ID> | null,
        parent: HTMLElement = document.body,
        size = { cols: 10, rows: 8 }
    ) {
        const svg = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'svg'
        ) as SVGSVGElement;

        svg.setAttribute('data-fx-grid', '');
        svg.setAttribute('data-cols', String(size.cols));
        svg.setAttribute('data-rows', String(size.rows));
        svg.getScreenCTM = () => (ctm ? ({ ...ID, ...ctm } as DOMMatrix) : null);
        parent.appendChild(svg);

        return svg;
    }

    const area = (at: { x: number; y: number }, over: Partial<FxSpec> = {}) =>
        spec({ archetype: 'area', at, ...over });

    it('без повороту: центр клітинки з CTM', () => {
        anchor('t', { x: 10, y: 10, w: 20, h: 20 });
        grid({ a: 0.5, d: 0.5, e: 100, f: 50 });

        expect(resolvePoints(area({ x: 4, y: 2 }))?.at).toEqual({
            x: 100 + 0.5 * 450,
            y: 50 + 0.5 * 250,
        });
    });

    it('поворот на 90 градусів', () => {
        anchor('t', { x: 10, y: 10, w: 20, h: 20 });
        grid({ a: 0, b: 1, c: -1, d: 0, e: 900, f: 0 });

        expect(resolvePoints(area({ x: 4, y: 2 }))?.at).toEqual({
            x: 900 - 250,
            y: 450,
        });
    });

    it('зум і панорама: точка зсувається разом із CTM', () => {
        anchor('t', { x: 10, y: 10, w: 20, h: 20 });
        grid({ a: 1, d: 1, e: -200, f: 30 });

        expect(resolvePoints(area({ x: 4, y: 2 }))?.at).toEqual({
            x: 250,
            y: 280,
        });
    });

    it('клітинка поза cols/rows: at відсутнє', () => {
        anchor('t', { x: 10, y: 10, w: 20, h: 20 });
        grid({});

        expect(resolvePoints(area({ x: 10, y: 0 }))?.at).toBeUndefined();
        expect(resolvePoints(area({ x: 0, y: -1 }))?.at).toBeUndefined();
    });

    it('дві копії карти: береться видима', () => {
        anchor('t', { x: 10, y: 10, w: 20, h: 20 });
        grid({ e: 5000 });
        grid({ e: 100 });

        expect(resolvePoints(area({ x: 0, y: 0 }))?.at).toEqual({
            x: 150,
            y: 50,
        });
    });

    it('клітинка за межами видимої частини карти: at відсутнє', () => {
        const clip = mapClip({ x: 0, y: 0, w: 300, h: 200 }, true);

        anchor('t', { x: 10, y: 10, w: 20, h: 20 }, false, clip);
        grid({ f: 500 }, clip);

        expect(resolvePoints(area({ x: 4, y: 2 }))?.at).toBeUndefined();
    });

    it('точка поза вікном: at відсутнє', () => {
        anchor('t', { x: 10, y: 10, w: 20, h: 20 });
        grid({ e: 2000 });

        expect(resolvePoints(area({ x: 0, y: 0 }))?.at).toBeUndefined();
    });

    it('каст у порожню зону: ціль — точка клітинки; точку не видно — FX немає', () => {
        anchor('a', { x: 10, y: 10, w: 20, h: 20 });
        grid({ e: 100, f: 100 });

        const empty = area({ x: 4, y: 2 }, { targetIds: [] });

        expect(resolvePoints(empty)).toMatchObject({
            from: { x: 20, y: 20 },
            targets: [{ at: { x: 550, y: 350 }, el: null }],
            at: { x: 550, y: 350 },
        });
        expect(resolvePoints({ ...empty, at: { x: 9, y: 9 } })).toBeNull();
    });
});
