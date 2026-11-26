import { type PaintEnv,touches, wallTexture } from './assets';

import { type WallRun,wallRuns } from '@/lib/utils/battle/map-art/wall-runs';

export const WALL_THICKNESS = 0.25;

interface Seg {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    material: string;
}

const AO_SIDE = 0.3;

function segmentsOf(run: WallRun, k: number): Seg[] {
    const pts = run.points;

    const count = run.closed ? pts.length : pts.length - 1;

    return Array.from({ length: Math.max(0, count) }, (_, i) => {
        const a = pts[i];

        const b = pts[(i + 1) % pts.length];

        return { x0: a.x * k, y0: a.y * k, x1: b.x * k, y1: b.y * k, material: run.material };
    });
}

export function paintWalls(env: PaintEnv): void {
    const { ctx, scene, grid, k, cellPx, clip, patterns } = env;

    const { runs, joints } = wallRuns(scene, grid);

    const t = WALL_THICKNESS * cellPx;

    const pad = cellPx + t;

    const visible = (s: Seg) =>
        touches(
            clip,
            Math.min(s.x0, s.x1),
            Math.min(s.y0, s.y1),
            Math.max(s.x0, s.x1),
            Math.max(s.y0, s.y1),
            pad
        );

    const segs = runs.flatMap((r) => segmentsOf(r, k)).filter(visible);

    if (!segs.length) return;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 0.15 * cellPx;
    ctx.shadowOffsetX = 0.04 * cellPx;
    ctx.shadowOffsetY = 0.06 * cellPx;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = t;
    ctx.lineCap = 'butt';
    ctx.beginPath();

    for (const s of segs) {
        ctx.moveTo(s.x0, s.y0);
        ctx.lineTo(s.x1, s.y1);
    }

    ctx.stroke();
    ctx.restore();

    const aoWidth = t + 2 * AO_SIDE * cellPx;

    const edge = (AO_SIDE * cellPx) / aoWidth;

    for (const s of segs) {
        const len = Math.hypot(s.x1 - s.x0, s.y1 - s.y0);

        ctx.save();
        ctx.translate(s.x0, s.y0);
        ctx.rotate(Math.atan2(s.y1 - s.y0, s.x1 - s.x0));

        const g = ctx.createLinearGradient(0, -aoWidth / 2, 0, aoWidth / 2);

        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(edge, 'rgba(0,0,0,0.35)');
        g.addColorStop(1 - edge, 'rgba(0,0,0,0.35)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, -aoWidth / 2, len, aoWidth);
        ctx.restore();
    }

    const angleAt = new Map<string, number>();

    const vkey = (x: number, y: number) => `${Math.round(x)}:${Math.round(y)}`;

    for (const s of segs) {
        const angle = Math.atan2(s.y1 - s.y0, s.x1 - s.x0);

        if (!angleAt.has(vkey(s.x0, s.y0))) angleAt.set(vkey(s.x0, s.y0), angle);

        if (!angleAt.has(vkey(s.x1, s.y1))) angleAt.set(vkey(s.x1, s.y1), angle);
    }

    for (const s of segs) {
        const texture = wallTexture(s.material);

        const pattern = texture ? patterns.get(texture) : null;

        if (!pattern) continue;

        ctx.save();
        ctx.translate(s.x0, s.y0);
        ctx.rotate(Math.atan2(s.y1 - s.y0, s.x1 - s.x0));
        ctx.fillStyle = pattern;
        ctx.fillRect(0, -t / 2, Math.hypot(s.x1 - s.x0, s.y1 - s.y0), t);
        ctx.restore();
    }

    for (const j of joints) {
        const x = j.at.x * k;

        const y = j.at.y * k;

        if (!touches(clip, x, y, x, y, pad)) continue;

        const texture = wallTexture(j.material);

        const pattern = texture ? patterns.get(texture) : null;

        if (!pattern) continue;

        const angle = angleAt.get(vkey(x, y)) ?? 0;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = pattern;

        if (j.kind === 'corner' || j.kind === 'tee') {
            const side = 1.3 * t;

            ctx.fillRect(-side / 2, -side / 2, side, side);
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = 'rgb(204,204,204)';
            ctx.fillRect(-side / 2, -side / 2, side, side);
        } else ctx.fillRect(-t / 4, -t / 2, t / 2, t);

        ctx.restore();
    }
}
