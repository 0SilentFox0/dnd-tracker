import { type PaintEnv, touchesBox } from './assets';

import { stampDef, type StampDef, type StampLayer } from '@/lib/constants/map-art/stamps';
import { stampAabb, stampBox } from '@/lib/utils/battle/map-art/stamp-geometry';
import type { MapArtStamp } from '@/types/battle-map';

interface ShadowParams {
    blur: number;
    dx: number;
    dy: number;
    alpha: number;
}

const SHADOWS: Record<'soft' | 'hard', ShadowParams> = {
    soft: { blur: 0.25, dx: 0.03, dy: 0.05, alpha: 0.45 },
    hard: { blur: 0.08, dx: 0.08, dy: 0.12, alpha: 0.55 },
};

export function orderedStamps(
    stamps: readonly MapArtStamp[],
    layer: StampLayer,
    lookup: (id: string) => StampDef | undefined = stampDef
): { s: MapArtStamp; def: StampDef }[] {
    return stamps
        .flatMap((s) => {
            const def = lookup(s.asset);

            return def && def.layer === layer ? [{ s, def }] : [];
        })
        .sort(
            (a, b) =>
                a.s.z - b.s.z ||
                a.s.y - b.s.y ||
                (a.s.id < b.s.id ? -1 : a.s.id > b.s.id ? 1 : 0)
        );
}

export function paintStamps(env: PaintEnv, layer: StampLayer): void {
    const { ctx, scene, k, cellPx, clip, assets } = env;

    for (const { s, def } of orderedStamps(scene.stamps, layer)) {
        const img = assets.get(def.file);

        if (!img) continue;

        const box = stampBox(s, def);

        const aabb = stampAabb(box);

        const pad = 0.5 * cellPx;

        if (!touchesBox(clip, {
            x: aabb.x0 * k,
            y: aabb.y0 * k,
            width: (aabb.x1 - aabb.x0) * k,
            height: (aabb.y1 - aabb.y0) * k,
        }, pad)) continue;

        const w = box.w * k;

        const h = box.h * k;

        ctx.save();
        ctx.translate(box.cx * k, box.cy * k);
        ctx.rotate((s.rot * Math.PI) / 180);

        if (s.flip) ctx.scale(-1, 1);

        if (layer !== 'decal' && def.shadow !== 'none') {
            const p = SHADOWS[def.shadow];

            ctx.shadowColor = `rgba(0,0,0,${p.alpha})`;
            ctx.shadowBlur = p.blur * cellPx;
            ctx.shadowOffsetX = p.dx * cellPx;
            ctx.shadowOffsetY = p.dy * cellPx;
        }

        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
    }
}
