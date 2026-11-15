'use client';

import { type RefObject, useEffect, useRef, useState } from 'react';

import {
    type GridWindow,
    UNIT,
    visibleGridWindow,
} from '@/lib/utils/battle/grid';

interface GridWindowOptions {
    svgRef: RefObject<SVGSVGElement | null>;
    viewportRef: RefObject<HTMLElement | null>;
    deps: {
        zoom: number;
        offset: { x: number; y: number };
        size: { width: number; height: number };
        pxPerUnit: number;
    };
}

const same = (a: GridWindow | null, b: GridWindow | null) =>
    a === b ||
    (!!a &&
        !!b &&
        a.x === b.x &&
        a.y === b.y &&
        a.cols === b.cols &&
        a.rows === b.rows);

/** Видиме вікно клітинок (квантоване до чанка); `null` без CTM — тоді рендериться все. */
export function useGridWindow({
    svgRef,
    viewportRef,
    deps,
}: GridWindowOptions): GridWindow | null {
    const [win, setWin] = useState<GridWindow | null>(null);

    const current = useRef<GridWindow | null>(null);

    const { zoom, offset, size, pxPerUnit } = deps;

    useEffect(() => {
        const viewport = viewportRef.current;

        let frame = 0;

        const measure = () => {
            frame = 0;

            const ctm = svgRef.current?.getScreenCTM?.();

            const next =
                viewport && ctm
                    ? visibleGridWindow({
                          viewport: viewport.getBoundingClientRect(),
                          ctm,
                          cols: size.width / UNIT,
                          rows: size.height / UNIT,
                      })
                    : null;

            if (same(current.current, next)) return;

            current.current = next;
            setWin(next);
        };

        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(measure);
        };

        schedule();
        viewport?.addEventListener('scroll', schedule, { passive: true });

        return () => {
            viewport?.removeEventListener('scroll', schedule);

            if (frame) cancelAnimationFrame(frame);
        };
    }, [
        svgRef,
        viewportRef,
        zoom,
        offset.x,
        offset.y,
        size.width,
        size.height,
        pxPerUnit,
    ]);

    return win;
}
