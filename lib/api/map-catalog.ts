import type { MapCatalogEntry } from '@/types/map-catalog';

const MAX_UVTT_BYTES = 96 * 1024 * 1024;

const RAW_ROOT = 'https://raw.githubusercontent.com/mbround18/vtt-maps/main/';

export async function getMapCatalog(): Promise<MapCatalogEntry[]> {
    const response = await fetch('/api/map-catalog');

    if (!response.ok) throw new Error('Map catalog is unavailable');

    const entries: unknown = await response.json();

    if (!Array.isArray(entries))
        throw new Error('Map catalog response is invalid');

    for (const entry of entries)
        validateMapCatalogEntry(entry as MapCatalogEntry);

    return entries as MapCatalogEntry[];
}

function expectedDownloadUrl(filePath: string): string {
    if (
        !filePath.startsWith('maps/') ||
        filePath
            .split('/')
            .some(
                (part) =>
                    !part ||
                    part === '.' ||
                    part === '..' ||
                    /%2e/i.test(part) ||
                    /[\\\u0000-\u001f\u007f]/.test(part)
            ) ||
        !filePath.toLowerCase().endsWith('.dd2vtt')
    )
        throw new Error('Invalid catalog map path');

    return RAW_ROOT + encodedPath(filePath);
}

function encodedPath(filePath: string): string {
    return filePath.split('/').map(encodeURIComponent).join('/');
}

export function validateMapCatalogEntry(entry: MapCatalogEntry): void {
    if (!entry || typeof entry !== 'object')
        throw new Error('Invalid catalog map provenance');

    const downloadUrl = expectedDownloadUrl(entry.filePath);

    const path = encodedPath(entry.filePath);

    const sourceUrl = `https://github.com/mbround18/vtt-maps/blob/main/${path}`;

    if (
        entry.id !== entry.filePath ||
        entry.downloadUrl !== downloadUrl ||
        entry.sourceUrl !== sourceUrl ||
        entry.attribution !== 'mbround18/vtt-maps' ||
        entry.license !== 'CC-BY-SA-4.0'
    )
        throw new Error('Invalid catalog map provenance');
}

export async function getMapCatalogAsset(
    entry: MapCatalogEntry
): Promise<string> {
    validateMapCatalogEntry(entry);

    const expected = expectedDownloadUrl(entry.filePath);

    const url = new URL(entry.downloadUrl);

    if (
        url.protocol !== 'https:' ||
        url.hostname !== 'raw.githubusercontent.com' ||
        url.href !== expected
    )
        throw new Error('Invalid catalog download URL');

    const response = await fetch(url, { mode: 'cors' });

    if (!response.ok)
        throw new Error(`Map download failed (${response.status})`);

    const length = Number(response.headers.get('content-length'));

    if (Number.isFinite(length) && length > MAX_UVTT_BYTES)
        throw new Error('Map file exceeds the 96 MiB limit');

    if (!response.body) throw new Error('Map download returned no data');

    const reader = response.body.getReader();

    const decoder = new TextDecoder();

    let size = 0;

    let text = '';

    try {
        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            size += value.byteLength;

            if (size > MAX_UVTT_BYTES) {
                await reader.cancel();
                throw new Error('Map file exceeds the 96 MiB limit');
            }

            text += decoder.decode(value, { stream: true });
        }
        text += decoder.decode();
    } finally {
        reader.releaseLock();
    }

    return text;
}
