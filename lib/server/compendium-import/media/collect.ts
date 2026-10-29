import { array, object, str } from "../adapters/shared";
import type { Compendium, JsonRecord } from "../parse";
import type { TargetKind } from "../types";
import { MEDIA_LIMITS, type MediaRef } from "./types";
import { normalizeMediaUrl } from "./url";

const FIELD_OF: Partial<Record<TargetKind, "avatar" | "icon">> = {
  units: "avatar",
  spells: "icon",
  artifacts: "icon",
  races: "icon",
  classes: "icon",
  feats: "icon",
  backgrounds: "icon",
};

const imagesOf = (fluff: unknown): unknown[] => array(object(fluff).images).map((image) => object(image).href).filter((href) => href !== undefined);

const fluffIndexes = new WeakMap<Compendium, Map<string, Map<string, unknown[]>>>();

function fluffIndex(root: Compendium, inputKind: string): Map<string, unknown[]> {
  let byKind = fluffIndexes.get(root);

  if (!byKind) fluffIndexes.set(root, byKind = new Map());

  let index = byKind.get(inputKind);

  if (!index) {
    byKind.set(inputKind, index = new Map());

    for (const fluff of array(root[`${inputKind}Fluff`]).map(object)) {
      const key = `${str(fluff.name)}|${str(fluff.source)}`;

      index.set(key, [...index.get(key) ?? [], ...imagesOf(fluff)]);
    }
  }

  return index;
}

export function fluffImages(root: Compendium, inputKind: string, row: JsonRecord): unknown[] {
  const external = fluffIndex(root, inputKind).get(`${str(row.name)}|${str(row.source)}`) ?? [];

  return [...external, ...imagesOf(row.fluff), ...imagesOf(object(row.inherits).fluff)];
}

export function collectEntryMedia(kind: TargetKind, inputKind: string, row: JsonRecord, root: Compendium, path: string, nested: boolean): MediaRef[] {
  const field = FIELD_OF[kind];

  if (!field) return [];

  const candidates: Array<{ href: unknown; path: string }> = [];

  if (kind === "units" && row.tokenHref !== undefined) candidates.push({ href: row.tokenHref, path: `${path}.tokenHref` });

  if ((kind === "spells" || kind === "artifacts") && row.foundryImg !== undefined) candidates.push({ href: row.foundryImg, path: `${path}.foundryImg` });

  fluffImages(root, inputKind, row).forEach((href, i) => candidates.push({ href, path: `${path}.fluff.images[${i}]` }));

  const seen = new Set<string>();

  let taken = false;

  const refs: MediaRef[] = [];

  for (const candidate of candidates) {
    const normalized = normalizeMediaUrl(candidate.href);

    const invalid = "reason" in normalized;

    if (!invalid) {
      if (seen.has(normalized.url)) continue;

      seen.add(normalized.url);
    }

    const url = invalid ? (typeof candidate.href === "string" ? candidate.href.slice(0, MEDIA_LIMITS.urlLength) : "") : normalized.url;

    const skip = nested ? "MEDIA_NESTED" : invalid ? normalized.reason : taken ? "MEDIA_EXTRA" : undefined;

    if (!skip) taken = true;

    refs.push({ url, role: field, path: candidate.path, ...(skip && { skip }) });
  }

  return refs;
}
