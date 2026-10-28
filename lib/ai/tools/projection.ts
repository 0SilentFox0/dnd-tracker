import { AI_LIMITS } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";

/** Defense at both transports, including historical rows read by legacy tools. */
export function publicToolData(value: unknown): unknown {
  if (typeof value === "string") return value.replace(/https?:\/\/[^\s"'<>]+/gi, candidate => {
    try {
      const url = new URL(candidate);

      const sensitive = [...url.searchParams.keys()].some(key => /token|signature|credential|secret|api[-_]?key/i.test(key));

      return sensitive || url.username || url.password || url.pathname.includes("/object/sign/") ? "[приховане посилання]" : candidate;
    } catch { return candidate; }
  });

  if (value instanceof Date) return value.toJSON();

  if (Array.isArray(value)) return value.map(publicToolData);

  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, data]) => [key, publicToolData(data)]));

  return value;
}

export type ProjectionPage = { path?: string[]; offset?: number; limit?: number; force?: boolean; budget?: number };

const summary = (value: unknown): unknown => {
  if (typeof value === "string" && value.length > 500) return { type: "string", length: value.length, expandable: true };

  if (value && typeof value === "object" && JSON.stringify(value).length > 1000) return { type: Array.isArray(value) ? "array" : "object", size: Object.keys(value).length, expandable: true };

  return value;
};

/** Lossless navigation: each bounded entry has a path to its full value. */
export function project(value: unknown, { path = [], offset = 0, limit = 20, force = false, budget = 20000 }: ProjectionPage = {}): unknown {
  value = publicToolData(value);

  if (value === undefined) return null;

  let selected: unknown = value;

  for (const key of path) {
    if (!selected || typeof selected !== "object" || !Object.hasOwn(selected, key)) throw new ContentError(API_ERRORS.ASSISTANT_DATA_PATH_NOT_FOUND, 404);

    selected = (selected as Record<string, unknown>)[key];
  }

  if (!force && !path.length && !offset && JSON.stringify(selected).length < AI_LIMITS.toolResultChars - 2000) return selected;

  if (typeof selected === "string") {
    let size = Math.min(8000, selected.length - offset);

    let text = selected.slice(offset, offset + size);

    while (JSON.stringify(text).length > 8000) {
      size = Math.max(1, Math.floor(size / 2));
      text = selected.slice(offset, offset + size);
    }

    return { projection: true, path, text, total: selected.length, nextOffset: offset + text.length < selected.length ? offset + text.length : null };
  }

  if (!selected || typeof selected !== "object") return selected;

  const entries = Object.entries(selected);

  const items = [];

  for (const [key, data] of entries.slice(offset, offset + limit)) {
    const entry = { key, path: [...path, key], value: summary(data) };

    if (JSON.stringify({ path, items: [...items, entry] }).length > budget) {
      if (!items.length) throw new ContentError(API_ERRORS.ASSISTANT_DATA_KEY_TOO_LARGE, 413);

      break;
    }

    items.push(entry);
  }

  return { projection: true, path, total: entries.length, items, nextOffset: offset + items.length < entries.length ? offset + items.length : null };
}
