export type TileChunkErrorCode =
    | 'INVALID_CHUNK_SIZE'
    | 'INVALID_VERSION'
    | 'INVALID_DATA'
    | 'INVALID_RUN'
    | 'CHUNK_OVERFLOW'
    | 'CHUNK_UNDERFLOW';

export class TileChunkError extends Error {
    constructor(
        readonly code: TileChunkErrorCode,
        message: string
    ) {
        super(message);
        this.name = 'TileChunkError';
    }
}

const CHUNK_CELLS = 16 * 16;

const PREFIX = 'r1:';

const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function fail(code: TileChunkErrorCode, message: string): never {
    throw new TileChunkError(code, message);
}

function toBase64(bytes: Uint8Array): string {
    let binary = '';

    for (const byte of bytes) binary += String.fromCharCode(byte);

    return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
    if (!value || !BASE64.test(value))
        fail('INVALID_DATA', 'Tile chunk must contain valid base64 data');

    try {
        const binary = atob(value);

        return Uint8Array.from(binary, (char) => char.charCodeAt(0));
    } catch {
        return fail('INVALID_DATA', 'Tile chunk must contain valid base64 data');
    }
}

export function encodeTileChunk(cells: Uint16Array): string {
    if (!(cells instanceof Uint16Array) || cells.length !== CHUNK_CELLS)
        fail('INVALID_CHUNK_SIZE', `Tile chunks must contain ${CHUNK_CELLS} cells`);

    const runs: number[] = [];

    for (let start = 0; start < cells.length; ) {
        const tileId = cells[start];

        let end = start + 1;

        while (end < cells.length && cells[end] === tileId) end++;

        runs.push(end - start, tileId);
        start = end;
    }

    const bytes = new Uint8Array(runs.length * 2);

    for (let i = 0; i < runs.length; i++) {
        bytes[i * 2] = runs[i] & 0xff;
        bytes[i * 2 + 1] = runs[i] >>> 8;
    }

    return `${PREFIX}${toBase64(bytes)}`;
}

export function decodeTileChunk(data: string): Uint16Array {
    if (!data.startsWith(PREFIX))
        fail('INVALID_VERSION', 'Unsupported tile chunk encoding version');

    const bytes = fromBase64(data.slice(PREFIX.length));

    if (bytes.length % 4 !== 0)
        fail('INVALID_DATA', 'Tile chunk run data must be a sequence of Uint16 pairs');

    const cells = new Uint16Array(CHUNK_CELLS);

    let cursor = 0;

    for (let i = 0; i < bytes.length; i += 4) {
        const runLength = bytes[i] | (bytes[i + 1] << 8);

        const tileId = bytes[i + 2] | (bytes[i + 3] << 8);

        if (runLength === 0) fail('INVALID_RUN', 'Tile chunk run length cannot be zero');

        if (cursor + runLength > CHUNK_CELLS)
            fail('CHUNK_OVERFLOW', 'Tile chunk expands past 256 cells');

        cells.fill(tileId, cursor, cursor + runLength);
        cursor += runLength;
    }

    if (cursor !== CHUNK_CELLS)
        fail('CHUNK_UNDERFLOW', 'Tile chunk must expand to exactly 256 cells');

    return cells;
}
