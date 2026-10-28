import type { DurableEffect, JsonValue } from "./types";

import "server-only";

export type EffectHandlers = Partial<Record<DurableEffect["kind"], (payload: JsonValue, key: string) => Promise<void>>>;

export async function runDurableEffects(effects: readonly DurableEffect[], handlers: EffectHandlers, previouslyCompleted: readonly string[]): Promise<{ status: "complete" | "failed"; completed: string[] }> {
  const completed = new Set(previouslyCompleted);

  let failed = false;

  for (const effect of effects) {
    if (completed.has(effect.key)) continue;

    const handler = handlers[effect.kind];

    if (!handler) { failed = true; continue; }

    try { await handler(effect.payload, effect.key); completed.add(effect.key); }
    catch { failed = true; }
  }

  return { status: failed ? "failed" : "complete", completed: [...completed] };
}
