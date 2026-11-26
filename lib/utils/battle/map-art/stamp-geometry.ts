import type { StampDef } from '@/lib/constants/map-art/stamps';
import { UNIT } from '@/lib/utils/battle/grid/layout';
import type { MapArtStamp } from '@/types/battle-map';

export interface StampBox {
    cx: number;
    cy: number;
    w: number;
    h: number;
    rot: number;
}

const rad = (deg: number): number => (deg * Math.PI) / 180;

export function stampBox(
    s: MapArtStamp,
    def: Pick<StampDef, 'cols' | 'rows'>
): StampBox {
    return {
        cx: s.x,
        cy: s.y,
        w: def.cols * UNIT * s.scale,
        h: def.rows * UNIT * s.scale,
        rot: s.rot,
    };
}

export function stampCorners(b: StampBox): [number, number][] {
    const cos = Math.cos(rad(b.rot));

    const sin = Math.sin(rad(b.rot));

    const hw = b.w / 2;

    const hh = b.h / 2;

    return (
        [
            [-hw, -hh],
            [hw, -hh],
            [hw, hh],
            [-hw, hh],
        ] as const
    ).map(([u, v]): [number, number] => [
        b.cx + u * cos - v * sin,
        b.cy + u * sin + v * cos,
    ]);
}

export function stampAabb(b: StampBox): {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
} {
    const corners = stampCorners(b);

    const xs = corners.map((c) => c[0]);

    const ys = corners.map((c) => c[1]);

    return {
        x0: Math.min(...xs),
        y0: Math.min(...ys),
        x1: Math.max(...xs),
        y1: Math.max(...ys),
    };
}

export function toStampLocal(
    b: StampBox,
    p: { x: number; y: number }
): { u: number; v: number } {
    const cos = Math.cos(rad(-b.rot));

    const sin = Math.sin(rad(-b.rot));

    const dx = p.x - b.cx;

    const dy = p.y - b.cy;

    return {
        u: (dx * cos - dy * sin) / b.w + 0.5,
        v: (dx * sin + dy * cos) / b.h + 0.5,
    };
}
