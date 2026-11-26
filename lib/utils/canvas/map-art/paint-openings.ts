import { openingSprite, type PaintEnv,touches } from './assets';
import { WALL_THICKNESS } from './paint-walls';

import { edgeOnGrid, edgeSegment } from '@/lib/utils/battle/grid/edge-keys';

export function paintOpenings(env: PaintEnv): void {
    const { ctx, scene, grid, k, cellPx, clip, assets } = env;

    const t = WALL_THICKNESS * cellPx;

    for (const [key, opening] of Object.entries(scene.openings)) {
        if (opening.kind === 'door' || !edgeOnGrid(grid, key)) continue;

        const sprite = openingSprite(opening.material);

        const image = sprite ? assets.get(sprite) : undefined;

        if (!image) continue;

        const [p, q] = edgeSegment(grid, key);

        const x0 = p.x * k;

        const y0 = p.y * k;

        const x1 = q.x * k;

        const y1 = q.y * k;

        if (
            !touches(clip, Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1), cellPx)
        )
            continue;

        const len = Math.hypot(x1 - x0, y1 - y0);

        ctx.save();
        ctx.translate((x0 + x1) / 2, (y0 + y1) / 2);
        ctx.rotate(Math.atan2(y1 - y0, x1 - x0));
        ctx.drawImage(image, -len / 2, -t / 2, len, t);
        ctx.restore();
    }
}
