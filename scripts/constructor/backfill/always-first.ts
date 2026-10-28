import { appendAbility } from "./append-ability";

import type { Ability } from "@/lib/utils/abilities/schema";

export const ALWAYS_FIRST_ABILITY = {
  id: "constructor-always-first",
  name: "Завжди першим",
  trigger: { event: "passive" },
  effects: [{ kind: "modifyStat", stat: "initiative", flat: 999, target: "self" }],
} as Ability;

const NAMES = ["фајдаен", "файдаен", "айвен", "iven"];

export const isAlwaysFirstName = (name: string) => NAMES.some((n) => name.toLowerCase().includes(n));

type Loose = { trigger?: { event?: unknown }; effects?: { kind?: unknown; stat?: unknown; flat?: unknown }[] };

const givesFirstInitiative = (item: unknown) => {
  const a = item as Loose | null;

  return (
    a?.trigger?.event === "passive" &&
    Array.isArray(a.effects) &&
    a.effects.some((e) => e?.kind === "modifyStat" && e.stat === "initiative" && typeof e.flat === "number" && e.flat >= 999)
  );
};

export const withAlwaysFirst = (abilities: unknown) => appendAbility(abilities, ALWAYS_FIRST_ABILITY, givesFirstInitiative);
