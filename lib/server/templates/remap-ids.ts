import { isRecord } from "@/lib/utils/common/is-record";
import { itemRef, parseItemRef, refArtifactIds } from "@/lib/utils/items/ref";

export function remapIds<T>(value: T, idMap: ReadonlyMap<string, string>): T {
  if (typeof value === "string") {
    const parsed = parseItemRef(value);

    if (parsed && (parsed.propertyId || parsed.param)) return (idMap.get(value) ?? itemRef(idMap.get(parsed.baseId) ?? parsed.baseId, parsed.propertyId ? idMap.get(parsed.propertyId) ?? parsed.propertyId : null, parsed.param)) as T;

    return (idMap.get(value) ?? value) as T;
  }

  if (Array.isArray(value)) return value.map((v) => remapIds(v, idMap)) as T;

  if (value && typeof value === "object" && !(value instanceof Date)) {
    if (isRecord(value) && value.type === "itemStats" && typeof value.value === "string") {
      try {
        return { ...value, value: JSON.stringify(remapIds(JSON.parse(value.value), idMap)) } as T;
      } catch { /* legacy malformed records remain unchanged */ }
    }

    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, remapIds(v, idMap)])) as T;
  }

  return value;
}

export function collectKeysAndStrings(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === "string") {
    out.add(value);
    for (const id of refArtifactIds(value)) out.add(id);
  }
  else if (Array.isArray(value)) value.forEach((v) => collectKeysAndStrings(v, out));
  else if (value && typeof value === "object" && !(value instanceof Date)) {
    if (isRecord(value) && value.type === "itemStats" && typeof value.value === "string") {
      try { collectKeysAndStrings(JSON.parse(value.value), out); } catch { /* legacy malformed records have no refs */ }
    }

    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      collectKeysAndStrings(v, out);
    }
  }

  return out;
}
