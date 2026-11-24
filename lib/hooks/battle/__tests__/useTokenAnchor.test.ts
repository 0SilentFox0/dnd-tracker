// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { anchorRect } from '../useTokenAnchor';

const el = (r: { left: number; top: number; width: number; height: number }) =>
    ({ getBoundingClientRect: () => r }) as unknown as Element;

const stage = el({ left: 0, top: 0, width: 800, height: 600 });

describe('anchorRect', () => {
    it('keeps the token rect when it is inside the stage', () => {
        const a = anchorRect(
            el({ left: 100, top: 120, width: 40, height: 40 }),
            stage
        );

        expect(a.inView).toBe(true);

        expect(a.box).toEqual({ left: 100, top: 120, width: 40, height: 40 });
    });

    it('clamps an off-screen token to the stage edge as a point', () => {
        const a = anchorRect(
            el({ left: 1200, top: 300, width: 40, height: 40 }),
            stage
        );

        expect(a.inView).toBe(false);

        expect(a.box).toEqual({ left: 800, top: 320, width: 0, height: 0 });
    });

    it('treats a partially visible token as in view', () => {
        const a = anchorRect(
            el({ left: 780, top: 100, width: 40, height: 40 }),
            stage
        );

        expect(a.inView).toBe(true);
    });

    it('is always in view without a stage', () => {
        const a = anchorRect(
            el({ left: -500, top: 0, width: 10, height: 10 }),
            null
        );

        expect(a.inView).toBe(true);
    });
});
