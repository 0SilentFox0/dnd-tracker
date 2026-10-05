import { createHash } from "node:crypto";

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
        .map((k) => [k, normalize((value as Record<string, unknown>)[k])]),
    );
  }

  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function hashJson(value: unknown): string {
  return createHash("sha1").update(stableStringify(value)).digest("hex");
}
