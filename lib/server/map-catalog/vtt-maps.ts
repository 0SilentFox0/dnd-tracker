import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    safeFetchBuffer,
    SafeFetchError,
    type SafeFetchResult,
} from '@/lib/utils/api/safe-fetch';
import type { MapCatalogEntry } from '@/types/map-catalog';

const OWNER = 'mbround18';

const REPOSITORY = 'vtt-maps';

const BRANCH = 'main';

const TREE_URL = `https://api.github.com/repos/${OWNER}/${REPOSITORY}/git/trees/${BRANCH}?recursive=1`;

const MAX_TREE_BYTES = 12 * 1024 * 1024;

const CACHE_MS = 60 * 60 * 1000;

type FetchBuffer = typeof safeFetchBuffer;

interface GitTreeEntry {
    path?: unknown;
    type?: unknown;
}

interface CatalogOptions {
    fetchBuffer?: FetchBuffer;
    now?: () => number;
}

export class MapCatalogError extends Error {
    constructor(
        message: string,
        readonly status: 413 | 502,
        readonly code: 'MAP_CATALOG_TOO_LARGE' | 'MAP_CATALOG_UNAVAILABLE'
    ) {
        super(message);
        this.name = 'MapCatalogError';
    }
}

function safeMapPath(path: unknown): path is string {
    if (typeof path !== 'string' || !path.startsWith('maps/')) return false;

    const parts = path.split('/');

    return (
        parts.length >= 3 &&
        parts.every(
            (part) =>
                part.length > 0 &&
                part !== '.' &&
                part !== '..' &&
                !/%2e/i.test(part) &&
                !/[\\\u0000-\u001f\u007f]/.test(part)
        )
    );
}

function encodedPath(path: string): string {
    return path.split('/').map(encodeURIComponent).join('/');
}

function displayName(filePath: string): string {
    return filePath
        .slice(filePath.lastIndexOf('/') + 1)
        .replace(/\.dd2vtt$/i, '')
        .replace(/[-_]+/g, ' ')
        .trim();
}

function toEntry(filePath: string): MapCatalogEntry {
    const parts = filePath.split('/');

    return {
        id: filePath,
        category: parts.slice(1, -1).join(' / '),
        name: displayName(filePath),
        filePath,
        sourceUrl: `https://github.com/${OWNER}/${REPOSITORY}/blob/${BRANCH}/${encodedPath(filePath)}`,
        downloadUrl: `https://raw.githubusercontent.com/${OWNER}/${REPOSITORY}/${BRANCH}/${encodedPath(filePath)}`,
        license: 'CC-BY-SA-4.0',
        attribution: `${OWNER}/${REPOSITORY}`,
    };
}

function isTooLarge(error: unknown): boolean {
    return (
        error instanceof SafeFetchError &&
        error.message === API_ERRORS.SAFE_FETCH_TOO_LARGE
    );
}

function failedFetch(result: SafeFetchResult): never {
    if (result.status === 413)
        throw new MapCatalogError(
            'The VTT map catalog response is too large.',
            413,
            'MAP_CATALOG_TOO_LARGE'
        );

    throw new MapCatalogError(
        'The VTT map catalog source is temporarily unavailable.',
        502,
        'MAP_CATALOG_UNAVAILABLE'
    );
}

export function createVttMapCatalog({
    fetchBuffer = safeFetchBuffer,
    now = Date.now,
}: CatalogOptions = {}) {
    let entries: MapCatalogEntry[] | null = null;

    let expiresAt = 0;

    async function list(): Promise<MapCatalogEntry[]> {
        if (entries && now() < expiresAt) return entries;

        let response: SafeFetchResult;

        try {
            response = await fetchBuffer(TREE_URL, {
                maxBytes: MAX_TREE_BYTES,
                headers: {
                    Accept: 'application/vnd.github+json',
                    'User-Agent': 'dnd-combat-tracker-map-catalog',
                },
            });
        } catch (error) {
            if (isTooLarge(error))
                throw new MapCatalogError(
                    'The VTT map catalog response is too large.',
                    413,
                    'MAP_CATALOG_TOO_LARGE'
                );

            throw new MapCatalogError(
                'The VTT map catalog source is temporarily unavailable.',
                502,
                'MAP_CATALOG_UNAVAILABLE'
            );
        }

        if (response.status < 200 || response.status >= 300)
            return failedFetch(response);

        let parsed: unknown;

        try {
            parsed = JSON.parse(response.body.toString('utf8'));
        } catch {
            throw new MapCatalogError(
                'The VTT map catalog response is invalid.',
                502,
                'MAP_CATALOG_UNAVAILABLE'
            );
        }

        if (
            typeof parsed !== 'object' ||
            parsed === null ||
            !('tree' in parsed) ||
            !Array.isArray(parsed.tree) ||
            ('truncated' in parsed && parsed.truncated === true)
        )
            throw new MapCatalogError(
                'The VTT map catalog response is incomplete.',
                502,
                'MAP_CATALOG_UNAVAILABLE'
            );

        const next = (parsed.tree as GitTreeEntry[])
            .flatMap((entry) =>
                entry.type === 'blob' &&
                typeof entry.path === 'string' &&
                entry.path.toLowerCase().endsWith('.dd2vtt') &&
                safeMapPath(entry.path)
                    ? [toEntry(entry.path)]
                    : []
            )
            .sort(
                (a, b) =>
                    a.category.localeCompare(b.category) ||
                    a.name.localeCompare(b.name)
            );

        entries = next;
        expiresAt = now() + CACHE_MS;

        return next;
    }

    return { list };
}

const vttMapCatalog = createVttMapCatalog();

export const listVttMapCatalog = vttMapCatalog.list;
