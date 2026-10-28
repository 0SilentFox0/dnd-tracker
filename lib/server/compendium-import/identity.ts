import { createHash } from "node:crypto";

import { byteLength, CompendiumError, normalized } from "./parse";
import type { Edition } from "./types";

export function canonicalKey(kind: string, name: string, source: string, edition: Edition, parent: readonly string[] = []): string {
  const key = JSON.stringify([1, normalized(kind), normalized(source), edition, normalized(name), parent.map(normalized)]);

  if (byteLength(key) > 2000) throw new CompendiumError("IDENTITY_SIZE");

  return key;
}

export const digest = (value: unknown): string => createHash("sha256").update(stableJson(value)).digest("hex");
export const nestedId = (value: string): string => `import-${digest(value).slice(0, 24)}`;

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;

  if (value && typeof value === "object") return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(",")}}`;

  return JSON.stringify(value) ?? "null";
}
