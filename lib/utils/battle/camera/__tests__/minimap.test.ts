import { describe, expect, it } from 'vitest';

import { fitAllCamera,type Frame } from '../camera';
import { minimapPointToContent, minimapViewport } from '../minimap';

const frame: Frame = {
    avail: { width: 400, height: 300 },
    content: { width: 200, height: 300 },
    bounds: { min: 1, max: 4 },
};

describe('minimapViewport', () => {
    it('повна карта — весь прямокутник', () => {
        expect(minimapViewport(fitAllCamera(frame), frame)).toEqual({
            x: 0,
            y: 0,
            w: 1,
            h: 1,
        });
    });

    it('наближення — менша частина, обрізана до 0..1', () => {
        const v = minimapViewport({ zoom: 2, x: -100, y: -150 }, frame);

        expect(v).toEqual({ x: 0.25, y: 0.25, w: 0.75, h: 0.5 });
    });
});

describe('minimapPointToContent', () => {
    it('круговий тест із viewport', () => {
        const p = minimapPointToContent(0.25, 0.5, frame);

        expect(p).toEqual({ x: 50, y: 150 });
        expect(p.x / frame.content.width).toBe(0.25);
        expect(p.y / frame.content.height).toBe(0.5);
    });
});
