import {
    type ArtCtx,
    blockedSprite,
    cellBox,
    type PaintEnv,
    TEXTURE_PX,
    touchesBox,
} from './assets';

import { floorMaterial } from '@/lib/constants/map-art/materials';
import {
    edgeCellsOf,
    edgeSegment,
    edgesOfCell,
} from '@/lib/utils/battle/grid/edge-keys';
import { parseCellKey } from '@/lib/utils/battle/grid/geometry';
import { HEX_H, hexCenter, hexVertices } from '@/lib/utils/battle/grid/hex';
import { gridMetrics } from '@/lib/utils/battle/grid/layout';
import { decodeFloors, type FloorChunks } from '@/lib/utils/battle/map-art/floors';
import { floorRegionSeeds } from '@/lib/utils/battle/map-art/regions';
import { CHUNK_SIDE, chunkKey } from '@/lib/utils/battle/map-storage/chunk-key';
import { seedHash } from '@/lib/utils/battle/tiles/variant';
import type { GridKind, GridPoint } from '@/types/battle-grid';

const STRIP = 0.3;

const NOISE = 0.08;

function codeAt(chunks: FloorChunks, x: number, y: number): number {
    if (x < 0 || y < 0) return 0;

    return (
        chunks[chunkKey(Math.floor(x / CHUNK_SIDE), Math.floor(y / CHUNK_SIDE))]?.[
            (y % CHUNK_SIDE) * CHUNK_SIDE + (x % CHUNK_SIDE)
        ] ?? 0
    );
}

function cellPoints(grid: GridKind, p: GridPoint): { x: number; y: number }[] {
    if (grid === 'hex') return hexVertices(p);

    const r = gridMetrics(grid).cellRect(p);

    return [
        { x: r.x, y: r.y },
        { x: r.x + r.width, y: r.y },
        { x: r.x + r.width, y: r.y + r.height },
        { x: r.x, y: r.y + r.height },
    ];
}

function addCellPath(ctx: ArtCtx, grid: GridKind, p: GridPoint, k: number): void {
    cellPoints(grid, p).forEach((v, i) => {
        if (i === 0) ctx.moveTo(v.x * k, v.y * k);
        else ctx.lineTo(v.x * k, v.y * k);
    });

    ctx.closePath();
}

function regionMatrix(value: number, s: number): DOMMatrix2DInit {
    const angle = ((value % 4) * Math.PI) / 2;

    const cos = Math.cos(angle) * s;

    const sin = Math.sin(angle) * s;

    return {
        a: cos,
        b: sin,
        c: -sin,
        d: cos,
        e: ((value >>> 4) % 256) * s,
        f: ((value >>> 12) % 256) * s,
    };
}

function paintRegions(env: PaintEnv, chunks: FloorChunks): void {
    const { ctx, map, grid, k, seed, clip, patterns, cellPx } = env;

    const seeds = floorRegionSeeds(chunks, map, seed);

    const groups = new Map<number, { code: number; cells: GridPoint[] }>();

    for (let y = 0; y < map.rows; y++)
        for (let x = 0; x < map.cols; x++) {
            const code = codeAt(chunks, x, y);

            if (!code || !touchesBox(clip, cellBox(grid, { x, y }, k))) continue;

            const value = seeds[y * map.cols + x];

            const group = groups.get(value) ?? { code, cells: [] };

            group.cells.push({ x, y });
            groups.set(value, group);
        }

    for (const [value, { code, cells }] of groups) {
        const texture = floorMaterial(code)?.texture;

        const pattern = texture
            ? patterns.get(texture, regionMatrix(value, cellPx / TEXTURE_PX))
            : null;

        if (!pattern) continue;

        ctx.fillStyle = pattern;
        ctx.beginPath();

        for (const c of cells) addCellPath(ctx, grid, c, k);

        ctx.fill();
    }
}

function paintSoftEdges(env: PaintEnv, chunks: FloorChunks): void {
    const { map, grid, k, cellPx, clip, patterns } = env;

    const metrics = gridMetrics(grid);

    for (let y = 0; y < map.rows; y++)
        for (let x = 0; x < map.cols; x++) {
            const a = { x, y };

            const code = codeAt(chunks, x, y);

            if (!code || !touchesBox(clip, cellBox(grid, a, k), cellPx)) continue;

            const texture = floorMaterial(code)?.texture;

            if (!texture) continue;

            for (const key of edgesOfCell(grid, a)) {
                const [c0, c1] = edgeCellsOf(grid, key);

                const b = c0.x === x && c0.y === y ? c1 : c0;

                if (b.x < 0 || b.y < 0 || b.x >= map.cols || b.y >= map.rows) continue;

                const other = codeAt(chunks, b.x, b.y);

                if (!other || other === code) continue;

                paintStrip(env, key, metrics.cellRect(b), texture, patterns);
            }
        }
}

function paintStrip(
    env: PaintEnv,
    key: string,
    target: { x: number; y: number; width: number; height: number },
    texture: string,
    patterns: PaintEnv['patterns']
): void {
    const { ctx, grid, k, cellPx } = env;

    const pattern = patterns.get(texture);

    if (!pattern) return;

    const [p, q] = edgeSegment(grid, key);

    const mx = ((p.x + q.x) / 2) * k;

    const my = ((p.y + q.y) / 2) * k;

    let nx = (target.x + target.width / 2) * k - mx;

    let ny = (target.y + target.height / 2) * k - my;

    const len = Math.hypot(nx, ny) || 1;

    nx /= len;
    ny /= len;

    const depth = STRIP * cellPx;

    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = pattern;
    ctx.beginPath();
    ctx.moveTo(p.x * k, p.y * k);
    ctx.lineTo(q.x * k, q.y * k);

    for (let i = 5; i >= 0; i--) {
        const t = i / 5;

        const noise = ((seedHash(`${key}:${i}`) % 1000) / 1000 - 0.5) * 2 * NOISE * cellPx;

        const off = depth + noise;

        ctx.lineTo(
            (p.x + (q.x - p.x) * t) * k + nx * off,
            (p.y + (q.y - p.y) * t) * k + ny * off
        );
    }

    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function paintBlocked(env: PaintEnv): void {
    const { ctx, scene, grid, k, clip, assets, cellPx } = env;

    for (const [key, material] of Object.entries(scene.blocked)) {
        const cell = parseCellKey(key);

        const box = cellBox(grid, cell, k);

        if (!touchesBox(clip, box)) continue;

        const sprite = material ? blockedSprite(material) : undefined;

        const image = sprite ? assets.get(sprite) : undefined;

        if (material === null || !sprite) {
            ctx.save();
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            addCellPath(ctx, grid, cell, k);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = Math.max(1, cellPx * 0.03);
            ctx.stroke();
            ctx.restore();

            continue;
        }

        if (!image) continue;

        if (grid === 'hex') {
            const c = hexCenter(cell);

            const side = HEX_H * k;

            ctx.drawImage(image, c.x * k - side / 2, c.y * k - side / 2, side, side);
        } else ctx.drawImage(image, box.x, box.y, box.width, box.height);
    }
}

export function paintFloors(env: PaintEnv): void {
    const chunks = decodeFloors(env.scene.floors);

    paintRegions(env, chunks);
    paintSoftEdges(env, chunks);
    paintBlocked(env);
}
