export function normalizeImageUrl(src: string): string {
  try {
    const url = new URL(src);

    if (url.hostname === "static.wikia.nocookie.net") {
      if (
        url.pathname.includes("/revision/latest") &&
        url.searchParams.has("path-prefix")
      ) {
        return src;
      }

      if (!url.pathname.includes("/revision/")) {
        const trimmedPath = url.pathname.replace(/\/$/, "");

        url.pathname = `${trimmedPath}/revision/latest`;
      }

      if (!url.searchParams.has("path-prefix")) {
        url.searchParams.set("path-prefix", "en");
      }
    }

    return url.toString();
  } catch {
    return src;
  }
}

const PUBLIC_OBJECT_PATH = "/storage/v1/object/public/";

/** Public Supabase Storage object URL → its parsed URL and raw `{bucket}/{path}` key. */
export function parsePublicStorageUrl(src: string): { url: URL; key: string } | null {
  try {
    const url = new URL(src);

    return url.pathname.startsWith(PUBLIC_OBJECT_PATH) ? { url, key: url.pathname.slice(PUBLIC_OBJECT_PATH.length) } : null;
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
    return parsed.protocol === "https:" && parsed.host === new URL(base).host;
  } catch {
    return false;
  }
}

export function isSupabaseStorageUrl(src: string): boolean {
  const url = parsePublicStorageUrl(src)?.url;

  return url?.protocol === "https:" && url.hostname.endsWith(".supabase.co");
}

export function isHttpUrl(src: string): boolean {
  try {
    const { protocol } = new URL(src.trim());

    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}
