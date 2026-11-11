import type { SystemOperation, SystemServer, SystemToolNote } from "./types";

import "server-only";
import type { Ruleset } from "@/lib/utils/rules/schema";
// <systems:generated>
import { WFRP_SERVER } from "@/systems/wfrp/server";
// </systems:generated>

export type { SystemSchemas, SystemServer } from "./types";

const D20_SERVER: SystemServer = { schemas: {} };

export const SYSTEM_SERVER: Readonly<Record<string, SystemServer>> = {
  homm: D20_SERVER,
  dnd5e: D20_SERVER,
  // <systems:generated>
  wfrp: WFRP_SERVER,
  // </systems:generated>
};

export const systemServerOf = (rules: Pick<Ruleset, "system">): SystemServer => {
  const { key } = rules.system;

  if (!Object.hasOwn(SYSTEM_SERVER, key)) throw new Error(`Unknown rule system: ${key}`);

  return SYSTEM_SERVER[key];
};

export const withSystemNotes = (base: string, tool: SystemToolNote): string => {
  const notes = Object.values(SYSTEM_SERVER).flatMap((s) => s.ai?.toolNotes?.[tool] ?? []);

  return notes.length > 0 ? `${base} ${notes.join(" ")}` : base;
};

export function mergeSystemOperations<T>(core: Record<string, T>, pick: (op: SystemOperation) => T): Record<string, T> {
  const merged = { ...core };

  for (const [key, op] of Object.values(SYSTEM_SERVER).flatMap((s) => Object.entries(s.operations ?? {}))) {
    if (Object.hasOwn(merged, key)) throw new Error(`Duplicate character operation: ${key}`);

    merged[key] = pick(op);
  }

  return merged;
}
