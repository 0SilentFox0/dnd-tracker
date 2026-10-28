import type { CharacterResources } from "@/types/characters";

export function currentHp(r: CharacterResources, maxHp: number): number {
  return Math.min(maxHp, Math.max(0, r.hp ?? maxHp));
}

export function withHp(r: CharacterResources, hp: number, maxHp: number): CharacterResources {
  const { hp: _old, ...rest } = r;

  return hp >= maxHp ? rest : { ...rest, hp: Math.max(0, hp) };
}

const isEmptyObject = (v: unknown) => typeof v === "object" && v !== null && Object.keys(v).length === 0;

export function compactResources(r: CharacterResources): CharacterResources {
  return Object.fromEntries(
    Object.entries(r).filter(([k, v]) => v !== undefined && v !== false && !isEmptyObject(v) && !((k === "exhaustion" || k === "tempHp") && v === 0)),
  ) as CharacterResources;
}
