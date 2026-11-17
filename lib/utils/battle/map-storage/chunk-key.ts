import { MAP_LIMITS } from '@/lib/constants/map-limits';

export const CHUNK_SIDE = MAP_LIMITS.chunk;

export const CHUNK_CELLS = CHUNK_SIDE * CHUNK_SIDE;

const CHUNK_KEY = /^(\d+):(\d+)$/;

export function chunkKey(cx: number, cy: number): string {
    return `${cx}:${cy}`;
}

export function parseChunkKey(key: string): { cx: number; cy: number } | null {
    const match = CHUNK_KEY.exec(key);

    return match ? { cx: Number(match[1]), cy: Number(match[2]) } : null;
}
