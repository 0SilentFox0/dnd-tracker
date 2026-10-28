import { compactResources, withHp } from "./hp";

import type { CharacterResources, ResourcesEditBody } from "@/types/characters";

export function editResources(r: CharacterResources, patch: ResourcesEditBody, maxHp?: number): CharacterResources {
  if (patch.reset) return {};

  let next: CharacterResources = { ...r };

  if (patch.tempHp !== undefined) next.tempHp = patch.tempHp;

  if (patch.exhaustion !== undefined) next.exhaustion = patch.exhaustion;

  if (patch.hp !== undefined) next = maxHp === undefined ? { ...next, hp: patch.hp } : withHp(next, patch.hp, maxHp);

  if (patch.dead === true) next = { ...next, dead: true, hp: 0, tempHp: undefined };

  if (patch.dead === false) next = { ...next, dead: undefined, ...(next.hp === 0 && { hp: 1 }) };

  return compactResources(next);
}
