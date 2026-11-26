import {
    stampDef,
    type StampBlocks,
    type StampDef,
} from '@/lib/constants/map-art/stamps';
import { cellKey, gridOf } from '@/lib/utils/battle/grid/geometry';
import {
    UNIT,
    cellAtUnitPoint,
    cellCenter,
    gridMetrics,
} from '@/lib/utils/battle/grid/layout';
import type { MapDims } from '@/lib/utils/battle/map-art/scene';
import {
    stampAabb,
    stampBox,
    toStampLocal,
} from '@/lib/utils/battle/map-art/stamp-geometry';
import type { MapArtStamp } from '@/types/battle-map';

const EPS = 1e-6;

type Lookup = (id: string) => StampDef | undefined;

export function stampFootprintContains(
    s: MapArtStamp,
    blocks: StampBlocks,
    p: { x: number; y: number }
): boolean {
    const w = blocks.w * UNIT * s.scale;

    const h = blocks.h * UNIT * s.scale;

    const { u, v } = toStampLocal({ cx: s.x, cy: s.y, w, h, rot: s.rot }, p);

    const lu = (u - 0.5) * w;

    const lv = (v - 0.5) * h;

    if (blocks.shape === 'ellipse')
        return (lu / (w / 2)) ** 2 + (lv / (h / 2)) ** 2 < 1 - EPS;

    return Math.abs(lu) < w / 2 - EPS && Math.abs(lv) < h / 2 - EPS;
}

export function stampCells(
    stamps: readonly MapArtStamp[],
    map: MapDims,
    lookup: Lookup = stampDef
): { blocked: Set<string>; sight: Set<string> } {
    const blocked = new Set<string>();

    const sight = new Set<string>();

    const grid = gridOf(map);

    const { colStep, rowStep } = gridMetrics(grid);

    for (const s of stamps) {
        const def = lookup(s.asset);

        const blocks = def?.blocks;

        if (!def || !blocks) continue;

        const own = new Set<string>();

        const box = stampBox(s, {
            cols: blocks.w,
            rows: blocks.h,
        });

        const { x0, y0, x1, y1 } = stampAabb(box);

        const cx0 = Math.max(0, Math.floor(x0 / colStep) - 1);

        const cx1 = Math.min(map.cols - 1, Math.ceil(x1 / colStep) + 1);

        const cy0 = Math.max(0, Math.floor(y0 / rowStep) - 1);

        const cy1 = Math.min(map.rows - 1, Math.ceil(y1 / rowStep) + 1);

        for (let y = cy0; y <= cy1; y++)
            for (let x = cx0; x <= cx1; x++)
                if (
                    stampFootprintContains(
                        s,
                        blocks,
                        cellCenter({ x, y }, grid)
                    )
                )
                    own.add(cellKey({ x, y }));

        const home = cellAtUnitPoint(s, grid);

        if (home.x >= 0 && home.y >= 0 && home.x < map.cols && home.y < map.rows)
            own.add(cellKey(home));

        for (const k of own) {
            blocked.add(k);

            if (def.sight) sight.add(k);
        }
    }

    return { blocked, sight };
}

export function stampBlockedCells(
    stamps: readonly MapArtStamp[],
    map: MapDims,
    lookup?: Lookup
): Set<string> {
    return stampCells(stamps, map, lookup).blocked;
}
