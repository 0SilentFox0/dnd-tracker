import type { Ability } from "@/lib/utils/abilities/schema";

export type AbilityCore = Pick<Ability, "trigger" | "effects"> & Partial<Pick<Ability, "limits" | "condition" | "perform" | "params">>;

export const noteAbility = (id: string, name: string, description: string): Ability => ({ id, name, description, trigger: { event: "passive" }, effects: [{ kind: "note", text: name }] });

export const coreAbility = (id: string, name: string, description: string, core: AbilityCore): Ability => ({ id, name, description, ...core });

export function uniqueId(seen: Set<string>, id: string): string {
  let out = id;

  for (let n = 2; seen.has(out); n++) out = `${id}-${n}`;

  seen.add(out);

  return out;
}
