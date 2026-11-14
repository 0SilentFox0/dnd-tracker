import { describe, expect, it } from 'vitest';

import {
    cameraBounds,
    centerOn,
    clampCamera,
    easeCamera,
    fitAllCamera,
    type Frame,
    inComfort,
    needsCamera,
    panBy,
    tapZoom,
    zoomAround,
} from '../camera';

const frame: Frame = {
    avail: { width: 400, height: 300 },
    content: { width: 200, height: 300 },
    bounds: { min: 1, max: 4 },
};

describe('межі й zoom', () => {
    it('cameraBounds і tapZoom', () => {
        expect(cameraBounds(15)).toEqual({ min: 1, max: 6 });
        expect(cameraBounds(100).max).toBe(1);
        expect(tapZoom(15)).toBe(2);
        expect(tapZoom(100)).toBe(1);
    });

    it('needsCamera за grow', () => {
        const v = { width: 1, height: 1, rotated: false };

        expect(needsCamera({ ...v, grow: 1 })).toBe(false);
        expect(needsCamera({ ...v, grow: 1.5 })).toBe(true);
    });
});

describe('clampCamera', () => {
    it('центрує по вузькій осі', () => {
        expect(fitAllCamera(frame)).toEqual({ zoom: 1, x: 100, y: 0 });
    });

    it('затискає біля всіх країв', () => {
        const z = { zoom: 2, x: 0, y: 0 };

        expect(clampCamera({ ...z, x: 50, y: 50 }, frame)).toEqual({
            zoom: 2,
            x: 0,
            y: 0,
        });
        expect(clampCamera({ ...z, x: -999, y: -999 }, frame)).toEqual({
            zoom: 2,
            x: 0,
            y: -300,
        });

        const wide: Frame = { ...frame, content: { width: 600, height: 400 } };

        expect(clampCamera({ zoom: 1, x: 10, y: 10 }, wide)).toEqual({
            zoom: 1,
            x: 0,
            y: 0,
        });
        expect(clampCamera({ zoom: 1, x: -999, y: -999 }, wide)).toEqual({
            zoom: 1,
            x: -200,
            y: -100,
        });
    });

    it('zoom поза межами затискається', () => {
        expect(clampCamera({ zoom: 10, x: 0, y: 0 }, frame).zoom).toBe(4);
        expect(clampCamera({ zoom: 0.2, x: 0, y: 0 }, frame).zoom).toBe(1);
    });
});

describe('centerOn', () => {
    it('центр карти опиняється рівно в центрі екрана', () => {
        const cam = centerOn({ x: 100, y: 150 }, 2, frame);

        expect(100 * cam.zoom + cam.x).toBeCloseTo(200, 9);
        expect(150 * cam.zoom + cam.y).toBeCloseTo(150, 9);
    });

    it('точка біля краю затискається', () => {
        expect(centerOn({ x: 0, y: 0 }, 2, frame)).toEqual({
            zoom: 2,
            x: 0,
            y: 0,
        });
    });
});

describe('zoomAround', () => {
    const cam = { zoom: 2, x: -50, y: -100 };

    it('точка під курсором лишається на місці', () => {
        const s = { x: 120, y: 90 };

        const next = zoomAround(cam, 1.5, s, frame);

        expect((s.x - cam.x) / cam.zoom).toBeCloseTo(
            (s.x - next.x) / next.zoom,
            9
        );
        expect((s.y - cam.y) / cam.zoom).toBeCloseTo(
            (s.y - next.y) / next.zoom,
            9
        );
    });

    it('на межі zoom не рухає камеру', () => {
        const max = { zoom: 4, x: -300, y: -500 };

        expect(zoomAround(max, 2, { x: 10, y: 10 }, frame)).toEqual(max);
    });
});

describe('panBy', () => {
    const big: Frame = { ...frame, content: { width: 600, height: 400 } };

    it('зсуває і затискає', () => {
        expect(panBy({ zoom: 1, x: -10, y: -10 }, -5, -5, big)).toEqual({
            zoom: 1,
            x: -15,
            y: -15,
        });
        expect(panBy({ zoom: 1, x: -10, y: -10 }, 999, 999, big)).toEqual({
            zoom: 1,
            x: 0,
            y: 0,
        });
    });
});

describe('easeCamera', () => {
    const from = { zoom: 1, x: 0, y: 0 };

    const to = { zoom: 3, x: -400, y: -250 };

    it('t=0 → from, t=1 → to', () => {
        const a = easeCamera(from, to, 0, frame.avail);

        const b = easeCamera(from, to, 1, frame.avail);

        expect(a.zoom).toBeCloseTo(from.zoom, 9);
        expect(a.x).toBeCloseTo(from.x, 9);
        expect(a.y).toBeCloseTo(from.y, 9);
        expect(b.zoom).toBeCloseTo(to.zoom, 9);
        expect(b.x).toBeCloseTo(to.x, 9);
        expect(b.y).toBeCloseTo(to.y, 9);
    });

    it('zoom монотонний', () => {
        let prev = 0;

        for (let i = 0; i <= 10; i++) {
            const z = easeCamera(from, to, i / 10, frame.avail).zoom;

            expect(z).toBeGreaterThanOrEqual(prev);
            prev = z;
        }
    });
});

describe('inComfort', () => {
    const cam = { zoom: 1, x: 0, y: 0 };

    it('межа margin включно', () => {
        expect(inComfort(cam, { x: 80, y: 60 }, frame, 0.2)).toBe(true);
        expect(inComfort(cam, { x: 79, y: 150 }, frame, 0.2)).toBe(false);
        expect(inComfort(cam, { x: 320, y: 240 }, frame, 0.2)).toBe(true);
        expect(inComfort(cam, { x: 321, y: 150 }, frame, 0.2)).toBe(false);
    });
});
