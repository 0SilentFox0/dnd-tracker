import { hexMapSize, hexPointToCell } from '@/lib/utils/battle/grid/hex';
import type { GridKind } from '@/types/battle-grid';

// Clear level per cell: how much of the cloud a destination-out pass removes.
export const CLEAR_VISIBLE = 255;

export const CLEAR_EXPLORED = 133;

export const CLEAR_HIDDEN = 31;

const MASK_PX_PER_CELL = 4;

const HEX_COL_RATIO = 0.75;

const HEX_W_RATIO = 2 / Math.sqrt(3);

/** Pixel size of a hex mask: row height `px` (even, >= 2), column step 0.75 of the cell width, height (rows + 0.5) cells. */
export function hexMaskSize(cols: number, rows: number, px: number) {
    const h = Math.max(2, px + (px % 2));

    const w = h * HEX_W_RATIO;

    return {
        px: h,
        width: Math.ceil(HEX_COL_RATIO * w * cols + 0.25 * w),
        height: Math.ceil(h * (rows + (cols > 1 ? 0.5 : 0))),
    };
}

export interface FogMask {
    key: string;
    cols: number;
    rows: number;
    px: number;
    width: number;
    height: number;
    data: Uint8ClampedArray;
}

const CACHE_SIZE = 4;

const cache = new Map<string, FogMask>();

function eachCell(
    keys: ReadonlySet<string>,
    cols: number,
    rows: number,
    fn: (x: number, y: number) => void
) {
    for (const key of keys) {
        const at = key.indexOf(':');

        const x = Number(key.slice(0, at));

        const y = Number(key.slice(at + 1));

        if (
            Number.isInteger(x) &&
            Number.isInteger(y) &&
            x >= 0 &&
            y >= 0 &&
            x < cols &&
            y < rows
        )
            fn(x, y);
    }
}

/** `visible === null` means nothing is fogged. */
export function cellLevels(
    cols: number,
    rows: number,
    visible: ReadonlySet<string> | null,
    explored: ReadonlySet<string>
) {
    const levels = new Uint8Array(cols * rows);

    if (visible === null) return levels.fill(CLEAR_VISIBLE);

    levels.fill(CLEAR_HIDDEN);
    eachCell(explored, cols, rows, (x, y) => {
        levels[y * cols + x] = CLEAR_EXPLORED;
    });
    eachCell(visible, cols, rows, (x, y) => {
        levels[y * cols + x] = CLEAR_VISIBLE;
    });

    return levels;
}

function maskKey(levels: Uint8Array, cols: number, rows: number) {
    let hash = 2166136261;

    for (let i = 0; i < levels.length; i++) {
        hash = Math.imul(hash ^ levels[i], 16777619);
    }

    return `${cols}x${rows}:${(hash >>> 0).toString(36)}`;
}

export function cellsToMask(
    cols: number,
    rows: number,
    visible: ReadonlySet<string> | null,
    explored: ReadonlySet<string>,
    px = MASK_PX_PER_CELL,
    grid: GridKind = 'square'
): FogMask {
    const levels = cellLevels(cols, rows, visible, explored);

    const hex = grid === 'hex' ? hexMaskSize(cols, rows, px) : null;

    if (hex) px = hex.px;

    const key = `${grid === 'hex' ? 'hex:' : ''}${maskKey(levels, cols, rows)}@${px}`;

    const hit = cache.get(key);

    if (hit) {
        cache.delete(key);
        cache.set(key, hit);

        return hit;
    }

    const width = hex ? hex.width : cols * px;

    const height = hex ? hex.height : rows * px;

    const data = new Uint8ClampedArray(width * height * 4);

    if (hex) {
        const unit = hexMapSize(cols, rows);

        for (let y = 0; y < height; y++)
            for (let x = 0; x < width; x++) {
                const cell = hexPointToCell(
                    ((x + 0.5) / width) * unit.width,
                    ((y + 0.5) / height) * unit.height
                );

                const cx = Math.min(cols - 1, Math.max(0, cell.x));

                const cy = Math.min(rows - 1, Math.max(0, cell.y));

                data[(y * width + x) * 4 + 3] = levels[cy * cols + cx];
            }
    } else {
        for (let y = 0; y < height; y++) {
            const row = Math.floor(y / px) * cols;

            for (let x = 0; x < width; x++)
                data[(y * width + x) * 4 + 3] =
                    levels[row + Math.floor(x / px)];
        }
    }

    const mask = { key, cols, rows, px, width, height, data };

    cache.set(key, mask);

    if (cache.size > CACHE_SIZE) cache.delete([...cache.keys()][0]);

    return mask;
}

export function diffAdded(
    prev: ReadonlySet<string>,
    next: ReadonlySet<string>
): string[] {
    const added: string[] = [];

    for (const key of next) if (!prev.has(key)) added.push(key);

    return added;
}
