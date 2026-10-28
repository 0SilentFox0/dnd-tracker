import { type HitDiceEntry, restoreHitDice } from "./hit-dice";
import { compactResources } from "./hp";

import { PACT_KEY } from "@/lib/utils/spells/slot-keys";
import type { CharacterResources } from "@/types/characters";

export type RestAction = "short" | "long" | "close";

function withoutKey<T>(record: Record<string, T> | undefined, drop: (key: string, value: T) => boolean): Record<string, T> | undefined {
  return record && Object.fromEntries(Object.entries(record).filter(([k, v]) => !drop(k, v)));
}

export function applyRest(action: RestAction, r: CharacterResources, opts: { pool: HitDiceEntry[]; longRestHitDice: "half" | "all" }): CharacterResources {
  if (action === "close") return compactResources({ ...r, shortRestOpen: undefined });

  if (r.dead) return r;

  if (action === "short") {
    return compactResources({
      ...r,
      slotsSpent: withoutKey(r.slotsSpent, (k) => k === PACT_KEY),
      charges: withoutKey(r.charges, (_k, c) => c.rest === "short"),
      shortRestOpen: true,
    });
  }

  return compactResources({
    hitDiceSpent: restoreHitDice(r.hitDiceSpent, opts.pool, opts.longRestHitDice),
    exhaustion: Math.max(0, (r.exhaustion ?? 0) - 1),
    charges: withoutKey(r.charges, (_k, c) => c.rest !== null),
  });
}
