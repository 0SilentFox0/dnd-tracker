import { MAP_LIMITS } from '@/lib/constants/map-limits';

const MAX_JSON_CHARS = 12 * 1024 * 1024;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const MAX_IMAGE_SIDE = 2400;

const GEOMETRY_TOLERANCE = 0.16;

export type UvttImport = {
    image: string;
    imageWidth: number;
    imageHeight: number;
    cols: number;
    rows: number;
    backgroundCols: number;
    walls: string[];
    doors: Record<string, { open: boolean }>;
};

export class UvttImportError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UvttImportError';
    }
}

function record(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

function finite(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function base64Image(value: unknown): { src: string; bytes: number; width: number; height: number } {
    if (typeof value !== 'string' || value.length === 0)
        throw new UvttImportError('The UVTT file has no embedded map image.');

    const match = /^data:image\/(png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);

    const payload = match?.[2] ?? (value.startsWith('data:') ? null : value);

    if (!payload || payload.length > Math.ceil((MAX_IMAGE_BYTES * 4) / 3))
        throw new UvttImportError('The embedded image is invalid or larger than 8 MiB.');

    let binary: string;

    try {
        binary = atob(payload);
    } catch {
        throw new UvttImportError('The embedded map image is not valid base64.');
    }

    const bytes = binary.length;

    if (!bytes || bytes > MAX_IMAGE_BYTES)
        throw new UvttImportError('The embedded image is invalid or larger than 8 MiB.');

    const data = Uint8Array.from(binary, (char) => char.charCodeAt(0));

    let width = 0;

    let height = 0;

    let mime = match ? `image/${match[1]}` : '';

    if (data.length >= 24 && data[0] === 0x89 && data[1] === 0x50) {
        mime = 'image/png';

        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

        width = view.getUint32(16);
        height = view.getUint32(20);
    } else if (data.length >= 30 && String.fromCharCode(...data.slice(0, 4)) === 'RIFF' && String.fromCharCode(...data.slice(8, 12)) === 'WEBP') {
        mime = 'image/webp';

        const kind = String.fromCharCode(...data.slice(12, 16));

        if (kind === 'VP8X' && data.length >= 30) {
            width = 1 + data[24] + (data[25] << 8) + (data[26] << 16);
            height = 1 + data[27] + (data[28] << 8) + (data[29] << 16);
        } else if (kind === 'VP8 ' && data.length >= 30 && data[23] === 0x9d && data[24] === 0x01 && data[25] === 0x2a) {
            width = (data[26] | (data[27] << 8)) & 0x3fff;
            height = (data[28] | (data[29] << 8)) & 0x3fff;
        } else if (kind === 'VP8L' && data.length >= 25 && data[20] === 0x2f) {
            width = 1 + data[21] + ((data[22] & 0x3f) << 8);
            height = 1 + (data[22] >> 6) + (data[23] << 2) + ((data[24] & 0x0f) << 10);
        }
    }

    if (!width || !height || width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE)
        throw new UvttImportError('The embedded image must be a PNG or WebP no larger than 2400 × 2400 pixels.');

    return { src: `data:${mime};base64,${payload}`, bytes, width, height };
}

function edgeAt(a: [number, number], b: [number, number], cols: number, rows: number): string[] {
    if ([...a, ...b].some((n, i) => n < -GEOMETRY_TOLERANCE || n > (i % 2 === 0 ? cols : rows) + GEOMETRY_TOLERANCE))
        throw new UvttImportError('A wall or portal extends outside the map grid.');

    const dx = b[0] - a[0];

    const dy = b[1] - a[1];

    const edges: string[] = [];

    if (Math.abs(dx) <= GEOMETRY_TOLERANCE && Math.abs(a[0] - Math.round(a[0])) <= GEOMETRY_TOLERANCE) {
        const xLine = Math.round((a[0] + b[0]) / 2);

        if (xLine <= 0 || xLine >= cols || Math.abs(dx) > GEOMETRY_TOLERANCE || Math.abs(a[1] - b[1]) < 0.001)
            throw new UvttImportError('A wall or portal lies outside the supported grid edges.');

        const start = Math.max(0, Math.floor(Math.min(a[1], b[1])));

        const end = Math.min(rows, Math.ceil(Math.max(a[1], b[1])));

        for (let y = start; y < end; y++) edges.push(`${xLine - 1}:${y}:e`);

        return edges;
    }

    if (Math.abs(dy) <= GEOMETRY_TOLERANCE && Math.abs(a[1] - Math.round(a[1])) <= GEOMETRY_TOLERANCE) {
        const yLine = Math.round((a[1] + b[1]) / 2);

        if (yLine <= 0 || yLine >= rows || Math.abs(dy) > GEOMETRY_TOLERANCE || Math.abs(a[0] - b[0]) < 0.001)
            throw new UvttImportError('A wall or portal lies outside the supported grid edges.');

        const start = Math.max(0, Math.floor(Math.min(a[0], b[0])));

        const end = Math.min(cols, Math.ceil(Math.max(a[0], b[0])));

        for (let x = start; x < end; x++) edges.push(`${x}:${yLine - 1}:s`);

        return edges;
    }

    throw new UvttImportError('Diagonal or off-grid walls are not supported by the map editor.');
}

function segments(value: unknown, cols: number, rows: number, ppi: number, origin: [number, number]): string[] {
    if (!Array.isArray(value)) throw new UvttImportError('Wall geometry is missing or invalid.');

    const result = new Set<string>();

    for (const line of value) {
        if (!Array.isArray(line) || line.length < 4 || line.length % 2 !== 0 || !line.every(finite))
            throw new UvttImportError('A line of sight must contain pairs of finite coordinates.');

        const points: [number, number][] = [];

        for (let i = 0; i < line.length; i += 2)
            points.push([(line[i] - origin[0]) / ppi, (line[i + 1] - origin[1]) / ppi]);
        for (let i = 1; i < points.length; i++)
            for (const edge of edgeAt(points[i - 1], points[i], cols, rows)) result.add(edge);

        if (result.size > MAP_LIMITS.libraryMaxEdges)
            throw new UvttImportError('The file contains more walls than this map can store.');
    }

    return [...result];
}

export function parseUvtt(text: string): UvttImport {
    if (text.length > MAX_JSON_CHARS) throw new UvttImportError('The UVTT file is larger than 12 MiB.');

    let parsed: unknown;

    try { parsed = JSON.parse(text); } catch { throw new UvttImportError('The selected file is not valid JSON.'); }

    const root = record(parsed);

    const resolution = record(root?.resolution);

    const size = record(resolution?.map_size);

    const originRaw = resolution?.map_origin;

    const origin: [number, number] = Array.isArray(originRaw) && originRaw.length >= 2 && finite(originRaw[0]) && finite(originRaw[1])
        ? [originRaw[0], originRaw[1]] : [0, 0];

    const ppi = resolution?.pixels_per_grid;

    if (!root || !resolution || !size || !finite(size.x) || !finite(size.y) || !finite(ppi) || ppi <= 0)
        throw new UvttImportError('The UVTT file is missing valid resolution or pixels-per-grid data.');

    const cols = Math.round(size.x);

    const rows = Math.round(size.y);

    if (Math.abs(cols - size.x) > 0.001 || Math.abs(rows - size.y) > 0.001 || cols < MAP_LIMITS.minSide || rows < MAP_LIMITS.minSide || cols > MAP_LIMITS.photoMaxSide || rows > MAP_LIMITS.photoMaxSide)
        throw new UvttImportError(`Map dimensions must be between ${MAP_LIMITS.minSide} and ${MAP_LIMITS.photoMaxSide} cells.`);

    const image = base64Image(root.image);

    const backgroundCols = image.width / ppi;

    if (!Number.isFinite(backgroundCols) || backgroundCols <= 0 || backgroundCols > 200)
        throw new UvttImportError('Pixels-per-grid produces an unsupported background scale.');

    const walls = segments(root.line_of_sight ?? [], cols, rows, ppi, origin);

    const objects = segments(root.objects_line_of_sight ?? [], cols, rows, ppi, origin);

    for (const edge of objects) if (!walls.includes(edge)) walls.push(edge);

    const doors: Record<string, { open: boolean }> = {};

    if (root.portals !== undefined && !Array.isArray(root.portals))
        throw new UvttImportError('Portal data is invalid.');

    for (const portal of (root.portals ?? []) as unknown[]) {
        const data = record(portal);

        const bounds = data?.bounds;

        if (!Array.isArray(bounds) || bounds.length !== 4 || !bounds.every(finite))
            throw new UvttImportError('A portal is missing valid bounds.');

        const edges = edgeAt(
            [(bounds[0] - origin[0]) / ppi, (bounds[1] - origin[1]) / ppi],
            [(bounds[2] - origin[0]) / ppi, (bounds[3] - origin[1]) / ppi],
            cols, rows
        );

        if (edges.length !== 1) throw new UvttImportError('A portal must fit on one map edge.');

        doors[edges[0]] = { open: data?.closed === false };

        if (Object.keys(doors).length > MAP_LIMITS.doorsMax)
            throw new UvttImportError('The file contains more doors than this map can store.');
    }

    const wallSet = new Set(walls);

    for (const edge of Object.keys(doors)) wallSet.delete(edge);

    return { image: image.src, imageWidth: image.width, imageHeight: image.height, cols, rows, backgroundCols, walls: [...wallSet], doors };
}
