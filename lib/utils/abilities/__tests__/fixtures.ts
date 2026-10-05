import { ParticipantSide } from "@/lib/constants/battle";
import type { Rng } from "@/lib/utils/abilities/engine/types";
import type { Ability } from "@/lib/utils/abilities/schema";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type { AbilitySource, ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant } from "@/types/battle";

export function makeParticipant(opts: {
  id: string;
  side?: ParticipantSide;
  hp?: number;
  maxHp?: number;
  abilities?: ResolvedAbility[];
  level?: number;
}): BattleParticipant {
  const base = createMockParticipant();

  return {
    ...base,
    basicInfo: { ...base.basicInfo, id: opts.id, name: opts.id, side: opts.side ?? ParticipantSide.ALLY },
    abilities: { ...base.abilities, level: opts.level ?? 1 },
    combatStats: { ...base.combatStats, currentHp: opts.hp ?? 20, maxHp: opts.maxHp ?? 20 },
    battleData: { ...base.battleData, resolvedAbilities: opts.abilities ?? [] },
  };
}

export function resolved(ability: Omit<Ability, "id" | "name"> & Partial<Ability>, source: Partial<AbilitySource> = {}): ResolvedAbility {
  const full = { id: "a", name: "Вміння", ...ability } as Ability;

  const src: AbilitySource = { type: "skill", id: "s1", name: full.name, ...source };

  return { ...full, source: src, key: `${src.type}:${src.id}:${full.id}` };
}

export function seq(...values: number[]): Rng {
  let i = 0;

  return () => values[i++ % values.length];
}
