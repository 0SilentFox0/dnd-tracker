// @vitest-environment happy-dom
import { useRef } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGridWindow } from '../useGridWindow';

import type { GridWindow } from '@/lib/utils/battle/grid';
import { UNIT } from '@/lib/utils/battle/grid';

const flush = () => act(() => new Promise((r) => setTimeout(r, 5)));

const SIZE = { width: 100 * UNIT, height: 100 * UNIT };

let ctm: {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
} | null;

let renders = 0;

let seen: GridWindow | null = null;

function Probe({ zoom = 1 }: { zoom?: number }) {
    const svgRef = useRef<SVGSVGElement>(null);

    const viewportRef = useRef<HTMLDivElement>(null);

    renders++;
    seen = useGridWindow({
        svgRef,
        viewportRef,
        deps: { zoom, offset: { x: 0, y: 0 }, size: SIZE, pxPerUnit: 1 },
    });

    return (
        <div ref={viewportRef} data-scroll="" style={{}}>
            <svg
                ref={(el) => {
                    if (el) {
                        el.getScreenCTM = () => ctm as unknown as DOMMatrix;
                        (svgRef as { current: SVGSVGElement | null }).current =
                            el;
                    }
                }}
            />
        </div>
    );
}

beforeEach(() => {
    renders = 0;
    seen = null;
    ctm = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) =>
        setTimeout(cb, 0)
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
        () =>
            ({
                left: 0,
                top: 0,
                right: 800,
                bottom: 600,
                width: 800,
                height: 600,
            }) as DOMRect
    );
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('useGridWindow', () => {
    it('measures the visible window in chunks on mount', async () => {
        render(<Probe />);
        await flush();

        expect(seen).toEqual({ x: 0, y: 0, cols: 32, rows: 32 });
    });

    it('is null without a CTM', async () => {
        ctm = null;
        render(<Probe />);
        await flush();

        expect(seen).toBeNull();
    });

    it('a scroll across a chunk boundary produces a new window; a small one does not rerender', async () => {
        const { container } = render(<Probe />);

        await flush();

        const scroller = container.querySelector('[data-scroll]') as Element;

        const before = renders;

        ctm = { a: 1, b: 0, c: 0, d: 1, e: -100, f: 0 };
        scroller.dispatchEvent(new Event('scroll'));
        await flush();
        expect(renders).toBe(before);

        ctm = { a: 1, b: 0, c: 0, d: 1, e: -2000, f: 0 };
        scroller.dispatchEvent(new Event('scroll'));
        await flush();
        expect(renders).toBeGreaterThan(before);
        expect(seen).toEqual({ x: 0, y: 0, cols: 48, rows: 32 });
    });
});
