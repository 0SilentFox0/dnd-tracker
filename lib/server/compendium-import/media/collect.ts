import { array, object, str } from "../adapters/shared";
import type { Compendium, JsonRecord } from "../parse";
import type { TargetKind } from "../types";
import { MEDIA_LIMITS, type MediaReason, type MediaRef, type MediaRole } from "./types";

const FIELD_OF: Partial<Record<TargetKind, "avatar" | "icon">> = {
  units: "avatar",
  spells: "icon",
  artifacts: "icon",
  races: "icon",
  classes: "icon",
  feats: "icon",
  backgrounds: "icon",
};

export function normalizeMediaUrl(href: unknown): { url: string } | { reason: MediaReason } {
  let raw = href;

  if (href !== null && typeof href === "object") {
    const record = object(href);

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

const imagesOf = (fluff: unknown): unknown[] => array(object(fluff).images).map((image) => object(image).href).filter((href) => href !== undefined);

export function fluffImages(root: Compendium, inputKind: string, row: JsonRecord): unknown[] {
  const name = str(row.name);

  const source = str(row.source);

  const external = array(root[`${inputKind}Fluff`]).map(object).filter((fluff) => str(fluff.name) === name && str(fluff.source) === source).flatMap((fluff) => imagesOf(fluff));

  return [...external, ...imagesOf(row.fluff), ...imagesOf(object(row.inherits).fluff)];
}

export function collectEntryMedia(kind: TargetKind, inputKind: string, row: JsonRecord, root: Compendium, path: string, nested: boolean): MediaRef[] {
  const field = FIELD_OF[kind];

  if (!field) return [];

  const candidates: Array<{ href: unknown; path: string }> = [];

  if (kind === "units" && row.tokenHref !== undefined) candidates.push({ href: row.tokenHref, path: `${path}.tokenHref` });

  if ((kind === "spells" || kind === "artifacts") && row.foundryImg !== undefined) candidates.push({ href: row.foundryImg, path: `${path}.foundryImg` });

  fluffImages(root, inputKind, row).forEach((href, i) => candidates.push({ href, path: `${path}.fluff.images[${i}]` }));

  const role: MediaRole = field;

  const seen = new Set<string>();

  let taken = false;

  const refs: MediaRef[] = [];

  for (const candidate of candidates) {
    const normalized = normalizeMediaUrl(candidate.href);

    if ("reason" in normalized) {
      refs.push({ url: typeof candidate.href === "string" ? candidate.href.slice(0, MEDIA_LIMITS.urlLength) : "", role, path: candidate.path, skip: nested ? "MEDIA_NESTED" : normalized.reason });

      continue;
    }

    if (seen.has(normalized.url)) continue;

    seen.add(normalized.url);

    if (nested) refs.push({ url: normalized.url, role, path: candidate.path, skip: "MEDIA_NESTED" });
    else if (taken) refs.push({ url: normalized.url, role, path: candidate.path, skip: "MEDIA_EXTRA" });
    else {
      taken = true;
      refs.push({ url: normalized.url, role, path: candidate.path });
    }
  }

  return refs;
}
