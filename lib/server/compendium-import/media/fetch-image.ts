import { createHash } from "node:crypto";

import { MEDIA_LIMITS, type MediaReason } from "./types";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { safeFetchBuffer, SafeFetchError, sniffImageMime } from "@/lib/utils/api/safe-fetch";

export type ImageMime = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

export type FetchedImage =
  | { ok: true; bytes: Buffer; mime: ImageMime; sha256: string }
  | { ok: false; reason: MediaReason; params?: { status?: number }; retryable: boolean };

const USER_AGENT = "DnDTrackerImport/1.0 (+compendium image mirror)";

const FETCH_ERRORS: Record<string, { reason: MediaReason; retryable: boolean }> = {
  [API_ERRORS.SAFE_FETCH_INVALID_URL]: { reason: "MEDIA_INVALID_URL", retryable: false },
  [API_ERRORS.SAFE_FETCH_HTTPS_ONLY]: { reason: "MEDIA_HTTPS_ONLY", retryable: false },
  [API_ERRORS.SAFE_FETCH_INTERNAL_URL]: { reason: "MEDIA_PRIVATE_HOST", retryable: false },
  [API_ERRORS.SAFE_FETCH_TIMEOUT]: { reason: "MEDIA_TIMEOUT", retryable: true },
  [API_ERRORS.SAFE_FETCH_DNS_FAILED]: { reason: "MEDIA_DNS", retryable: true },
  [API_ERRORS.SAFE_FETCH_TOO_LARGE]: { reason: "MEDIA_TOO_LARGE", retryable: false },
  [API_ERRORS.SAFE_FETCH_TOO_MANY_REDIRECTS]: { reason: "MEDIA_REDIRECTS", retryable: false },
  [API_ERRORS.SAFE_FETCH_FAILED]: { reason: "MEDIA_FETCH_FAILED", retryable: true },
};

const fail = (reason: MediaReason, retryable = false, status?: number): FetchedImage => ({
  ok: false,
  reason,
  retryable,
  ...(status === undefined ? {} : { params: { status } }),
});

function declaredTypeAllowed(contentType: string | null): boolean {
  const type = contentType?.split(";")[0].trim().toLowerCase();

  if (!type || type === "application/octet-stream") return true;

  return type.startsWith("image/") && type !== "image/svg+xml";
}

export async function fetchImportImage(url: string, fetchBuffer: typeof safeFetchBuffer = safeFetchBuffer): Promise<FetchedImage> {
  let res: Awaited<ReturnType<typeof safeFetchBuffer>>;

  try {
    res = await fetchBuffer(url, { maxBytes: MEDIA_LIMITS.bytes, headers: { "User-Agent": USER_AGENT } });
  } catch (e) {
    const mapped = e instanceof SafeFetchError ? FETCH_ERRORS[e.message] : undefined;

    return mapped ? fail(mapped.reason, mapped.retryable) : fail("MEDIA_FETCH_FAILED", true);
  }

  if (res.status !== 200) return fail("MEDIA_HTTP_STATUS", res.status === 429 || res.status >= 500, res.status);

  if (!declaredTypeAllowed(res.contentType)) return fail("MEDIA_BAD_FORMAT");

  const mime = sniffImageMime(res.body) as ImageMime | null;

  if (!mime) return fail("MEDIA_BAD_FORMAT");

  return { ok: true, bytes: res.body, mime, sha256: createHash("sha256").update(res.body).digest("hex") };
}
