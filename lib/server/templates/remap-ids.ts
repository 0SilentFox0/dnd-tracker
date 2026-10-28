export function remapIds<T>(value: T, idMap: ReadonlyMap<string, string>): T {
  if (typeof value === "string") return (idMap.get(value) ?? value) as T;

  if (Array.isArray(value)) return value.map((v) => remapIds(v, idMap)) as T;

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, remapIds(v, idMap)])) as T;
  }

  return value;
}

export function collectKeysAndStrings(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === "string") out.add(value);
  else if (Array.isArray(value)) value.forEach((v) => collectKeysAndStrings(v, out));
  else if (value && typeof value === "object" && !(value instanceof Date)) {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      collectKeysAndStrings(v, out);
    }
  }

  return out;
}
