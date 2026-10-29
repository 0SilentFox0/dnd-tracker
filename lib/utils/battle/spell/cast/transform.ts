import type { SpellCastState } from "@/lib/utils/battle/spell/cast/state";
import type { TransformRequest } from "@/lib/utils/battle/transform/types";
import type { SpellEffect, TransformEffect } from "@/lib/utils/spells/model/schema";

const isTransform = (e: SpellEffect): e is TransformEffect => e.kind === "transform";

/** Перетворюються цілі, яких заклинання зачепило (не пройшли кидок, не втекли від криту). */
export function transformRequests(state: SpellCastState, effects: SpellEffect[], round: number, castId: string, concentrationOf?: TransformRequest["concentrationOf"]): TransformRequest[] {
  return effects.filter(isTransform).flatMap((e) =>
    state.targetIds
      .filter((id) => {
        const outcome = state.outcomes.get(id);

        return !!outcome && !outcome.skip && !outcome.negateEffects;
      })
      .map((targetId) => ({ targetId, casterId: state.caster.basicInfo.id, unitId: e.unitId, spellId: state.spell.id, spellName: state.spell.name, castId, expiresRound: round + e.duration.rounds, ...(concentrationOf && { concentrationOf }) })),
  );
}
