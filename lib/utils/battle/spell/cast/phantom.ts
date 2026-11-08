import type { SummonRequest } from "@/lib/utils/abilities/engine/core/types";
import type { SpellCastState } from "@/lib/utils/battle/spell/cast/state";
import type { SpellEffect } from "@/lib/utils/spells/model/schema";

export function phantomRequests(state: SpellCastState, effects: SpellEffect[], castId: string): SummonRequest[] {
  if (!effects.some((e) => e.kind === "phantom")) return [];

  return state.targetIds
    .filter((id) => {
      const outcome = state.outcomes.get(id);

      return !!outcome && !outcome.skip && !outcome.negateEffects;
    })
    .map((cloneOf) => ({ ownerId: state.caster.basicInfo.id, cloneOf, count: 1, spellId: state.spell.id, castId }));
}
