import { MAP_LIMITS } from '@/lib/constants/map-limits';

const MAX_JSON_CHARS = 96 * 1024 * 1024;

const MAX_IMAGE_BYTES = 72 * 1024 * 1024;

const MAX_IMAGE_SIDE = 12_000;

const MAX_IMAGE_PIXELS = 120_000_000;

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

function point(value: unknown): [number, number] | null {
    if (Array.isArray(value) && finite(value[0]) && finite(value[1]))
        return [value[0], value[1]];

    const coordinates = record(value);

    return coordinates && finite(coordinates.x) && finite(coordinates.y)
        ? [coordinates.x, coordinates.y]
        : null;
}

function points(value: unknown): [number, number][] | null {
    if (!Array.isArray(value)) return null;

    if (value.length >= 4 && value.length % 2 === 0 && value.every(finite)) {
        const result: [number, number][] = [];

        for (let i = 0; i < value.length; i += 2)
            result.push([value[i], value[i + 1]]);

        return result;
    }

    const result = value.map(point);

    return result.length >= 2 && result.every((p) => p !== null)
        ? (result as [number, number][])
        : null;
}

function base64Image(value: unknown): {
    src: string;
    bytes: number;
    width: number;
    height: number;
} {
    if (typeof value !== 'string' || value.length === 0)
        throw new UvttImportError('The UVTT file has no embedded map image.');

    const match = /^data:image\/(png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
        value
    );

    const payload = match?.[2] ?? (value.startsWith('data:') ? null : value);

    if (!payload || payload.length > Math.ceil((MAX_IMAGE_BYTES * 4) / 3))
        throw new UvttImportError(
            'The embedded image is invalid or larger than 72 MiB.'
        );

    let binary: string;

    try {
        binary = atob(payload);
    } catch {
        throw new UvttImportError(
            'The embedded map image is not valid base64.'
        );
    }

    const bytes = binary.length;

    if (!bytes || bytes > MAX_IMAGE_BYTES)
        throw new UvttImportError(
            'The embedded image is invalid or larger than 72 MiB.'
        );

    const data = Uint8Array.from(binary, (char) => char.charCodeAt(0));

    let width = 0;

    let height = 0;

    let mime = match ? `image/${match[1]}` : '';

    if (data.length >= 24 && data[0] === 0x89 && data[1] === 0x50) {
        mime = 'image/png';

        const view = new DataView(
            data.buffer,
            data.byteOffset,
            data.byteLength
        );

        width = view.getUint32(16);
        height = view.getUint32(20);
    } else if (
        data.length >= 30 &&
        String.fromCharCode(...data.slice(0, 4)) === 'RIFF' &&
        String.fromCharCode(...data.slice(8, 12)) === 'WEBP'
    ) {
        mime = 'image/webp';

        const kind = String.fromCharCode(...data.slice(12, 16));

        if (kind === 'VP8X' && data.length >= 30) {
            width = 1 + data[24] + (data[25] << 8) + (data[26] << 16);
            height = 1 + data[27] + (data[28] << 8) + (data[29] << 16);
        } else if (
            kind === 'VP8 ' &&
            data.length >= 30 &&
            data[23] === 0x9d &&
            data[24] === 0x01 &&
            data[25] === 0x2a
        ) {
            width = (data[26] | (data[27] << 8)) & 0x3fff;
            height = (data[28] | (data[29] << 8)) & 0x3fff;
        } else if (kind === 'VP8L' && data.length >= 25 && data[20] === 0x2f) {
            width = 1 + data[21] + ((data[22] & 0x3f) << 8);
            height =
                1 +
                (data[22] >> 6) +
                (data[23] << 2) +
                ((data[24] & 0x0f) << 10);
        }
    }

    if (
        !width ||
        !height ||
        width > MAX_IMAGE_SIDE ||
        height > MAX_IMAGE_SIDE ||
        width * height > MAX_IMAGE_PIXELS
    )
        throw new UvttImportError(
            'The embedded image dimensions exceed 12000 px per side or 120 MP.'
        );

    return { src: `data:${mime};base64,${payload}`, bytes, width, height };
}

function edgeAt(
    a: [number, number],
    b: [number, number],
    cols: number,
    rows: number,
    snapSingleEdge = false
): string[] {
    if (
        [...a, ...b].some(
            (n, i) =>
                n < -GEOMETRY_TOLERANCE ||
                n > (i % 2 === 0 ? cols : rows) + GEOMETRY_TOLERANCE
        )
    )
        throw new UvttImportError(
            'A wall or portal extends outside the map grid.'
        );

    const dx = b[0] - a[0];

    const dy = b[1] - a[1];

    const edges: string[] = [];

    if (
        Math.abs(dx) <= GEOMETRY_TOLERANCE &&
        Math.abs(a[0] - Math.round(a[0])) <= GEOMETRY_TOLERANCE
    ) {
        const xLine = Math.round((a[0] + b[0]) / 2);

        if (
            xLine <= 0 ||
            xLine >= cols ||
            Math.abs(dx) > GEOMETRY_TOLERANCE ||
            Math.abs(a[1] - b[1]) < 0.001
        )
            throw new UvttImportError(
                'A wall or portal lies outside the supported grid edges.'
            );

        let start = Math.max(0, Math.floor(Math.min(a[1], b[1])));

        let end = Math.min(rows, Math.ceil(Math.max(a[1], b[1])));

        if (snapSingleEdge && end - start > 1 && Math.abs(b[1] - a[1]) <= 1 + GEOMETRY_TOLERANCE) {
            start = Math.floor((a[1] + b[1]) / 2);
            end = start + 1;
        }

        for (let y = start; y < end; y++) edges.push(`${xLine - 1}:${y}:e`);

        return edges;
    }

    if (
        Math.abs(dy) <= GEOMETRY_TOLERANCE &&
        Math.abs(a[1] - Math.round(a[1])) <= GEOMETRY_TOLERANCE
    ) {
        const yLine = Math.round((a[1] + b[1]) / 2);

        if (
            yLine <= 0 ||
            yLine >= rows ||
            Math.abs(dy) > GEOMETRY_TOLERANCE ||
            Math.abs(a[0] - b[0]) < 0.001
        )
            throw new UvttImportError(
                'A wall or portal lies outside the supported grid edges.'
            );

        let start = Math.max(0, Math.floor(Math.min(a[0], b[0])));

        let end = Math.min(cols, Math.ceil(Math.max(a[0], b[0])));

        if (snapSingleEdge && end - start > 1 && Math.abs(b[0] - a[0]) <= 1 + GEOMETRY_TOLERANCE) {
            start = Math.floor((a[0] + b[0]) / 2);
            end = start + 1;
        }

        for (let x = start; x < end; x++) edges.push(`${x}:${yLine - 1}:s`);

        return edges;
    }

    throw new UvttImportError(
        'Diagonal or off-grid walls are not supported by the map editor.'
    );
}

function segments(
    value: unknown,
    cols: number,
    rows: number,
    ppi: number,
    origin: [number, number]
): string[] {
    if (!Array.isArray(value))
        throw new UvttImportError('Wall geometry is missing or invalid.');

    const result = new Set<string>();

    for (const line of value) {
        const linePoints = points(line);

        const pixelCoordinates =
            Array.isArray(line) && line.every(finite);

        if (!linePoints)
            throw new UvttImportError(
                'A line of sight must contain at least two valid points.'
            );

        const gridPoints = linePoints.map(([x, y]) => [
            (x - origin[0]) / (pixelCoordinates ? ppi : 1),
            (y - origin[1]) / (pixelCoordinates ? ppi : 1),
        ]) as [number, number][];

        for (let i = 1; i < gridPoints.length; i++)
            for (const edge of edgeAt(
                gridPoints[i - 1],
                gridPoints[i],
                cols,
                rows
            ))
                result.add(edge);

        if (result.size > MAP_LIMITS.libraryMaxEdges)
            throw new UvttImportError(
                'The file contains more walls than this map can store.'
            );
    }

    return [...result];
}

export function parseUvtt(text: string): UvttImport {
    if (text.length > MAX_JSON_CHARS)
        throw new UvttImportError('The UVTT file is larger than 96 MiB.');

    let parsed: unknown;

    try {
        parsed = JSON.parse(text);
    } catch {
        throw new UvttImportError('The selected file is not valid JSON.');
    }

    const root = record(parsed);

    const resolution = record(root?.resolution);

    const size = record(resolution?.map_size);

    const originRaw = resolution?.map_origin;

    const origin = point(originRaw) ?? [0, 0];

    const ppi = resolution?.pixels_per_grid;

    if (
        !root ||
        !resolution ||
        !size ||
        !finite(size.x) ||
        !finite(size.y) ||
        !finite(ppi) ||
        ppi <= 0
    )
        throw new UvttImportError(
            'The UVTT file is missing valid resolution or pixels-per-grid data.'
        );

    const cols = Math.round(size.x);

    const rows = Math.round(size.y);

    if (
        Math.abs(cols - size.x) > 0.001 ||
        Math.abs(rows - size.y) > 0.001 ||
        cols < MAP_LIMITS.minSide ||
        rows < MAP_LIMITS.minSide ||
        cols > MAP_LIMITS.tileMaxSide ||
        rows > MAP_LIMITS.tileMaxSide
    )
        throw new UvttImportError(
            `Map dimensions must be between ${MAP_LIMITS.minSide} and ${MAP_LIMITS.tileMaxSide} cells.`
        );

    const image = base64Image(root.image);

    const backgroundCols = image.width / ppi;

    if (
        !Number.isFinite(backgroundCols) ||
        backgroundCols <= 0 ||
        backgroundCols > 200
    )
        throw new UvttImportError(
            'Pixels-per-grid produces an unsupported background scale.'
        );

    const walls = segments(root.line_of_sight ?? [], cols, rows, ppi, origin);

    const objects = segments(
        root.objects_line_of_sight ?? [],
        cols,
        rows,
        ppi,
        origin
    );

    for (const edge of objects) if (!walls.includes(edge)) walls.push(edge);

    const doors: Record<string, { open: boolean }> = {};

    if (root.portals !== undefined && !Array.isArray(root.portals))
        throw new UvttImportError('Portal data is invalid.');

    for (const portal of (root.portals ?? []) as unknown[]) {
        const data = record(portal);

        const boundsRaw = data?.bounds;

        const bounds = points(boundsRaw);

        const pixelCoordinates =
            Array.isArray(boundsRaw) && boundsRaw.every(finite);

        if (!bounds || bounds.length !== 2)
            throw new UvttImportError('A portal is missing valid bounds.');

        const edges = edgeAt(
            [
                (bounds[0][0] - origin[0]) / (pixelCoordinates ? ppi : 1),
                (bounds[0][1] - origin[1]) / (pixelCoordinates ? ppi : 1),
            ],
            [
                (bounds[1][0] - origin[0]) / (pixelCoordinates ? ppi : 1),
                (bounds[1][1] - origin[1]) / (pixelCoordinates ? ppi : 1),
            ],
            cols,
            rows,
            true
        );

        if (edges.length !== 1)
            throw new UvttImportError('A portal must fit on one map edge.');

        doors[edges[0]] = { open: data?.closed === false };

        if (Object.keys(doors).length > MAP_LIMITS.doorsMax)
            throw new UvttImportError(
                'The file contains more doors than this map can store.'
            );
    }

    const wallSet = new Set(walls);

    for (const edge of Object.keys(doors)) wallSet.delete(edge);

    return {
        image: image.src,
        imageWidth: image.width,
        imageHeight: image.height,
        cols,
        rows,
        backgroundCols,
        walls: [...wallSet],
        doors,
    };
}
