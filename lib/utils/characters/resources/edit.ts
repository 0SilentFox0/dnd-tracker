import { compactResources, withHp } from "./hp";

import { isConsumablePool } from "@/lib/utils/items/pools";
import type { AbilityPool } from "@/types/battle";
import type { CharacterResources, ResourcesEditBody } from "@/types/characters";

export function editResources(r: CharacterResources, patch: ResourcesEditBody, maxHp?: number, pools: Record<string, AbilityPool> = {}): CharacterResources {
  if (patch.reset) return {};

  let next: CharacterResources = { ...r };

  if (patch.tempHp !== undefined) next.tempHp = patch.tempHp;

  if (patch.exhaustion !== undefined) next.exhaustion = patch.exhaustion;

  if (patch.hp !== undefined) next = maxHp === undefined ? { ...next, hp: patch.hp } : withHp(next, patch.hp, maxHp);

  if (patch.dead === true) next = { ...next, dead: true, hp: 0, tempHp: undefined };

  if (patch.dead === false) next = { ...next, dead: undefined, ...(next.hp === 0 && { hp: 1 }) };

  if (patch.charges) {
    const charges = { ...next.charges };

    for (const [key, used] of Object.entries(patch.charges)) {
      const pool = pools[key];

      if (!pool || isConsumablePool(key)) continue;

      const n = Math.min(pool.max, Math.max(0, used));

      if (n === 0) delete charges[key];
      else charges[key] = { used: n, rest: pool.rest };
    }

    next = { ...next, charges };
  }

  return compactResources(next);
}
