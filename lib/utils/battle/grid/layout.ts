import { blockedSet, cellKey, footprint } from './geometry';
import { sizeOf } from './occupancy';

import { MAP_LIMITS } from '@/lib/constants/map-limits';
import type {
    BattleMapConfig,
    BattleParticipant,
    GridPoint,
} from '@/types/battle';

export const UNIT = 100;

const R = UNIT / 2;

export function mapSize(map: Pick<BattleMapConfig, 'cols' | 'rows'>): {
    width: number;
    height: number;
} {
    return { width: map.cols * UNIT, height: map.rows * UNIT };
}

/** a…f екранної матриці SVG (`svg.getScreenCTM()`), яка вже містить зум, зсув і поворот карти */
export interface ScreenMatrix {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
}

export function cellAtScreenPoint(
    map: Pick<BattleMapConfig, 'cols' | 'rows'>,
    ctm: ScreenMatrix,
    clientX: number,
    clientY: number
): GridPoint | null {
    const det = ctm.a * ctm.d - ctm.b * ctm.c;

    if (!det) return null;

    const dx = clientX - ctm.e;

    const dy = clientY - ctm.f;

    const x = Math.floor((ctm.d * dx - ctm.c * dy) / det / UNIT);

    const y = Math.floor((ctm.a * dy - ctm.b * dx) / det / UNIT);

    return x >= 0 && y >= 0 && x < map.cols && y < map.rows ? { x, y } : null;
}

export function screenToUnit(
    ctm: ScreenMatrix,
    clientX: number,
    clientY: number
): { x: number; y: number } | null {
    const det = ctm.a * ctm.d - ctm.b * ctm.c;

    if (!det) return null;

    const dx = clientX - ctm.e;

    const dy = clientY - ctm.f;

    return {
        x: (ctm.d * dx - ctm.c * dy) / det,
        y: (ctm.a * dy - ctm.b * dx) / det,
    };
}

export function cellScreenPoint(
    ctm: ScreenMatrix,
    p: GridPoint
): { x: number; y: number } {
    const ux = (p.x + 0.5) * UNIT;

    const uy = (p.y + 0.5) * UNIT;

    return {
        x: ctm.a * ux + ctm.c * uy + ctm.e,
        y: ctm.b * ux + ctm.d * uy + ctm.f,
    };
}

const EDGE_TOLERANCE = 0.35;

/** Ребро, найближче до точки в одиницях карти (UNIT на клітинку); `null` — поза межами, на зовнішньому краї або далі за `tolerance` клітинки. */
export function edgeAtScreenPoint(
    map: Pick<BattleMapConfig, 'cols' | 'rows'>,
    x: number,
    y: number,
    tolerance = EDGE_TOLERANCE
): string | null {
    const fx = x / UNIT;

    const fy = y / UNIT;

    if (fx < 0 || fy < 0 || fx > map.cols || fy > map.rows) return null;

    const vx = Math.round(fx);

    const hy = Math.round(fy);

    const dVertical = Math.abs(fx - vx);

    const dHorizontal = Math.abs(fy - hy);

    const vertical = dVertical <= dHorizontal;

    if (Math.min(dVertical, dHorizontal) > tolerance) return null;

    if (vertical) {
        const row = Math.min(Math.floor(fy), map.rows - 1);

        return vx > 0 && vx < map.cols ? `${vx - 1}:${row}:e` : null;
    }

    const col = Math.min(Math.floor(fx), map.cols - 1);

    return hy > 0 && hy < map.rows ? `${col}:${hy - 1}:s` : null;
}

export function cellCenter(p: GridPoint): { x: number; y: number } {
    return { x: (p.x + 0.5) * UNIT, y: (p.y + 0.5) * UNIT };
}

export function cellPolygon(p: GridPoint): string {
    const c = cellCenter(p);

    const corners = [
        [c.x - R, c.y - R],
        [c.x + R, c.y - R],
        [c.x + R, c.y + R],
        [c.x - R, c.y + R],
    ];

    return corners.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

export function tokenBox(
    p: BattleParticipant
): { cx: number; cy: number; size: number } | null {
    const anchor = p.battleData.position;

    if (!anchor) return null;

    const size = sizeOf(p);

    const cells = footprint(anchor, size).map(cellCenter);

    const cx = cells.reduce((s, c) => s + c.x, 0) / cells.length;

    const cy = cells.reduce((s, c) => s + c.y, 0) / cells.length;

    return { cx, cy, size: size * UNIT * 0.86 };
}

export function fitMapBox(
    avail: { width: number; height: number },
    map: Pick<BattleMapConfig, 'cols' | 'rows'>
): { width: number; height: number } {
    const ratio = map.cols / map.rows;

    return {
        width: Math.min(avail.width, avail.height * ratio),
        height: Math.min(avail.height, avail.width / ratio),
    };
}

export interface MapView {
    width: number;
    height: number;
    rotated: boolean;
}

// карта лягає вертикально, лише коли вона помітно ширша, ніж висока
const ROTATE_MIN_RATIO = 1.15;

/** найменша клітинка на екрані, яку ще можна влучно тапнути пальцем */
export const MIN_TAP_CELL_PX = 30;

/**
 * рамка карти на екрані; rotated — карта повернута на 90° за годинниковою, width/height уже переставлені;
 * fillWidth — рамка на всю ширину, висота може перевищити доступну (тоді її прокручують);
 * minCell — рамка росте, щоб клітинка була не меншою, і тоді прокручується в обидва боки
 */
export function fitMapView(
    avail: { width: number; height: number },
    map: Pick<BattleMapConfig, 'cols' | 'rows'>,
    {
        rotatable = false,
        bothWays = false,
        fillWidth = false,
        taller = 1,
        minCell = 0,
    }: {
        rotatable?: boolean;
        bothWays?: boolean;
        fillWidth?: boolean;
        taller?: number;
        minCell?: number;
    } = {}
): MapView {
    // за орієнтацією, а не за виграшем площі: інакше карта перекидається, коли панель знизу росте
    const landscapeMapInPortrait =
        avail.height > avail.width && map.cols >= map.rows * ROTATE_MIN_RATIO;

    const portraitMapInLandscape =
        bothWays &&
        avail.width > avail.height &&
        map.rows >= map.cols * ROTATE_MIN_RATIO;

    const rotated =
        (rotatable && landscapeMapInPortrait) || portraitMapInLandscape;

    const shown = rotated ? { cols: map.rows, rows: map.cols } : map;

    const box = fillWidth
        ? {
              width: avail.width,
              height: (avail.width * shown.rows) / shown.cols,
          }
        : fitMapBox(
              { width: avail.width, height: avail.height * taller },
              shown
          );

    const grow =
        box.width > 0 ? Math.max(1, (minCell * shown.cols) / box.width) : 1;

    return { width: box.width * grow, height: box.height * grow, rotated };
}

export type GridWindow = { x: number; y: number; cols: number; rows: number };

/** найменший прямокутник з усіма ігровими клітинками; стіни ігрові, неігрові лише blocked */
export function playableBounds(
    map: Pick<BattleMapConfig, 'cols' | 'rows' | 'blocked'>
): GridWindow {
    const blocked = blockedSet(map);

    let x0 = map.cols,
        y0 = map.rows,
        x1 = -1,
        y1 = -1;

    for (let y = 0; y < map.rows; y++) {
        for (let x = 0; x < map.cols; x++) {
            if (blocked.has(cellKey({ x, y }))) continue;

            x0 = Math.min(x0, x);
            y0 = Math.min(y0, y);
            x1 = Math.max(x1, x);
            y1 = Math.max(y1, y);
        }
    }

    return x1 < 0
        ? { x: 0, y: 0, cols: map.cols, rows: map.rows }
        : { x: x0, y: y0, cols: x1 - x0 + 1, rows: y1 - y0 + 1 };
}

export interface RectLike {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export function visibleGridWindow(
    input: { viewport: RectLike; ctm: ScreenMatrix; cols: number; rows: number },
    margin: number = MAP_LIMITS.chunk
): GridWindow {
    const { viewport, ctm, cols, rows } = input;

    const corners = [
        [viewport.left, viewport.top],
        [viewport.right, viewport.top],
        [viewport.left, viewport.bottom],
        [viewport.right, viewport.bottom],
    ].map(([x, y]) => screenToUnit(ctm, x, y));

    if (corners.some((c) => !c)) return { x: 0, y: 0, cols, rows };

    const xs = corners.map((c) => (c ? c.x / UNIT : 0));

    const ys = corners.map((c) => (c ? c.y / UNIT : 0));

    const chunk = MAP_LIMITS.chunk;

    const x0 = Math.max(
        0,
        Math.floor((Math.min(...xs) - margin) / chunk) * chunk
    );

    const y0 = Math.max(
        0,
        Math.floor((Math.min(...ys) - margin) / chunk) * chunk
    );

    const x1 = Math.min(
        cols,
        Math.ceil((Math.max(...xs) + margin) / chunk) * chunk
    );

    const y1 = Math.min(
        rows,
        Math.ceil((Math.max(...ys) + margin) / chunk) * chunk
    );

    return {
        x: Math.min(x0, cols),
        y: Math.min(y0, rows),
        cols: Math.max(0, x1 - Math.min(x0, cols)),
        rows: Math.max(0, y1 - Math.min(y0, rows)),
    };
}
