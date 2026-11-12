import {
    BUNDLED_STATIC_ASSET,
    ICON_BUCKETS,
    SHARED_ASSET_PREFIX,
    TEMPLATE_ASSET_PREFIX,
} from '@/lib/constants/storage';

export function normalizeImageUrl(src: string): string {
    try {
        const url = new URL(src);

        if (url.hostname === 'static.wikia.nocookie.net') {
            if (
                url.pathname.includes('/revision/latest') &&
                url.searchParams.has('path-prefix')
            ) {
                return src;
            }

            if (!url.pathname.includes('/revision/')) {
                const trimmedPath = url.pathname.replace(/\/$/, '');

                url.pathname = `${trimmedPath}/revision/latest`;
            }

            if (!url.searchParams.has('path-prefix')) {
                url.searchParams.set('path-prefix', 'en');
            }
        }

        return url.toString();
    } catch {
        return src;
    }
}

const PUBLIC_OBJECT_PATH = '/storage/v1/object/public/';

/** Public Supabase Storage object URL → its parsed URL and raw `{bucket}/{path}` key. */
export function parsePublicStorageUrl(
    src: string
): { url: URL; key: string } | null {
    try {
        const url = new URL(src);

        return url.pathname.startsWith(PUBLIC_OBJECT_PATH)
            ? { url, key: url.pathname.slice(PUBLIC_OBJECT_PATH.length) }
            : null;
    } catch {
        return null;
    }
}

/** Decoded object path inside `bucket` of a public Storage URL. */
export function bucketObjectPath(src: string, bucket: string): string | null {
    const key = parsePublicStorageUrl(src)?.key;

    if (!key?.startsWith(`${bucket}/`)) return null;

    try {
        return decodeURIComponent(key.slice(bucket.length + 1));
    } catch {
        return null;
    }
}

/** Already on our project Storage (host of NEXT_PUBLIC_SUPABASE_URL). */
export function isHostedOnProjectStorage(url: string): boolean {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;

    const parsed = base ? parsePublicStorageUrl(url)?.url : undefined;

    if (!base || !parsed) return false;

    try {
        return (
            parsed.protocol === 'https:' && parsed.host === new URL(base).host
        );
    } catch {
        return false;
    }
}

export function sharedAssetPath(
    setKey: string,
    fileHash: string,
    ext: string
): string {
    const slug = setKey
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    return `${SHARED_ASSET_PREFIX}${slug || 'set'}/${fileHash}${ext}`;
}

export const templateAssetPath = (
    templateKey: string,
    kind: string,
    slug: string,
    sha8: string
): string =>
    `${TEMPLATE_ASSET_PREFIX}${templateKey}/${kind}/${slug}-${sha8}.webp`;

/** Template icon on our project Storage under `sets/` or `templates/` (immutable, shared between campaigns). */
export function isSharedAssetUrl(url: string): boolean {
    const key = isHostedOnProjectStorage(url)
        ? parsePublicStorageUrl(url)?.key
        : undefined;

    if (!key) return false;

    const slash = key.indexOf('/');

    return (
        (ICON_BUCKETS as readonly string[]).includes(key.slice(0, slash)) &&
        [SHARED_ASSET_PREFIX, TEMPLATE_ASSET_PREFIX].some((prefix) =>
            key.slice(slash + 1).startsWith(prefix)
        )
    );
}

export function isBundledStaticAsset(src: string): boolean {
    return BUNDLED_STATIC_ASSET.test(src);
}

export function isSupabaseStorageUrl(src: string): boolean {
    const url = parsePublicStorageUrl(src)?.url;

    return url?.protocol === 'https:' && url.hostname.endsWith('.supabase.co');
}

export function isHttpUrl(src: string): boolean {
    try {
        const { protocol } = new URL(src.trim());

        return protocol === 'https:' || protocol === 'http:';
    } catch {
        return false;
    }
}
