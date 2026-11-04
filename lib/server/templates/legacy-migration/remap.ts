import { remapIds } from "@/lib/server/templates/remap-ids";
import { isRecord } from "@/lib/utils/common/is-record";

const CUID_TOKEN = /c[a-z0-9]{24}/g;

/** `remapIds` for values plus object keys (e.g. `skillTreeProgress` is keyed by tree id). */
export function remapDeep<T>(value: T, map: ReadonlyMap<string, string>): T {
  if (typeof value === "string") return remapIds(value, map);

  if (Array.isArray(value)) return value.map((v) => remapDeep(v, map)) as T;

  if (value && typeof value === "object" && !(value instanceof Date)) {
    if (isRecord(value) && value.type === "itemStats" && typeof value.value === "string") {
      try {
        return { ...value, value: JSON.stringify(remapDeep(JSON.parse(value.value), map)) } as T;
      } catch { /* legacy malformed records remain unchanged */ }
    }

    return Object.fromEntries(Object.entries(value).map(([k, v]) => [map.get(k) ?? k, remapDeep(v, map)])) as T;
  }

  return value;
}

export const cuidTokens = (text: string): string[] => text.match(CUID_TOKEN) ?? [];

export const residualKind = (value: string, token: string): "exact" | "composite" => (value === token ? "exact" : "composite");
