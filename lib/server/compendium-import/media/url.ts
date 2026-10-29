import { MEDIA_LIMITS, type MediaReason } from "./types";

export function normalizeMediaUrl(href: unknown): { url: string } | { reason: MediaReason } {
  let raw = href;

  if (href !== null && typeof href === "object") {
    const record = href as Record<string, unknown>;

    if (record.type === "internal") return { reason: "MEDIA_INTERNAL_PATH" };

    raw = record.url;
  }

  if (typeof raw !== "string" || raw.length === 0 || raw.length > MEDIA_LIMITS.urlLength) return { reason: "MEDIA_INVALID_URL" };

  let parsed: URL;

  try {
    parsed = new URL(raw.trim());
  } catch {
    return { reason: "MEDIA_INVALID_URL" };
  }

  if (parsed.protocol !== "https:") return { reason: "MEDIA_HTTPS_ONLY" };

  if (parsed.href.length > MEDIA_LIMITS.urlLength) return { reason: "MEDIA_INVALID_URL" };

  return { url: parsed.href };
}
