import type { PositionedGraph } from './layout';

export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}

const PAD = 50;

const MIN_W = 120;

const MAX_W = 20000;

const MAX_FIT_W = 2400;

const MIN_FIT_W = 900;

export const FALLBACK_ASPECT = 4 / 3;

export const WHEEL_K = 0.0015;

export function fitBox(graph: PositionedGraph, aspect: number): Box {
    const { bounds } = graph;

    const w0 = bounds.w + PAD * 2;

    const h0 = bounds.h + PAD * 2;

    const full = Math.max(w0, h0 * aspect, MIN_FIT_W);

    if (full <= MAX_FIT_W)
        return {
            x: bounds.minX + bounds.w / 2 - full / 2,
            y: bounds.minY + bounds.h / 2 - full / aspect / 2,
            w: full,
            h: full / aspect,
        };

    const weight = graph.nodes.reduce((s, n) => s + 1 + n.degree, 0);

    const cx =
        graph.nodes.reduce((s, n) => s + n.x * (1 + n.degree), 0) / weight;

    const cy =
        graph.nodes.reduce((s, n) => s + n.y * (1 + n.degree), 0) / weight;

    return {
        x: cx - MAX_FIT_W / 2,
        y: cy - MAX_FIT_W / aspect / 2,
        w: MAX_FIT_W,
        h: MAX_FIT_W / aspect,
    };
}

export function zoomBox(box: Box, factor: number, cx: number, cy: number): Box {
    const w = Math.min(MAX_W, Math.max(MIN_W, box.w * factor));

    const k = w / box.w;

    return {
        x: cx - (cx - box.x) * k,
        y: cy - (cy - box.y) * k,
        w,
        h: box.h * k,
    };
}
