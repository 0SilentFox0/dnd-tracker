import { textRef } from "@/lib/i18n/text-ref";
import { findParticipant, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { effectSource, upsertTimedEffect } from "@/lib/utils/abilities/engine/effects/timed-effects";
import type { ActionFlow } from "@/lib/utils/battle/common/action-flow";
import { hitRidersOf } from "@/lib/utils/battle/spell/cast/state";
import type { SpellEffect } from "@/lib/utils/spells/model/schema";
import type { ResolvedAbility } from "@/types/abilities";

interface HitRiderInput {
  flow: ActionFlow;
  effects: SpellEffect[];
  casterId: string;
  targetIds: string[];
  ability: ResolvedAbility;
  saveDc: number;
  round: number;
}

export function applyHitRiders({ flow, effects, casterId, targetIds, ability, saveDc, round }: HitRiderInput): void {
  for (const { effect, index } of hitRidersOf(effects)) {
    const holders = effect.target === "eventTarget" ? targetIds : [casterId];

    for (const id of holders) {
      const holder = findParticipant(flow.ps, id);

      if (!holder) continue;

      const owner = findParticipant(flow.ps, casterId);

      const next = upsertTimedEffect(
        holder,
        {
          timedKey: `${ability.key}#${index}@${casterId}`,
          name: ability.name,
          type: "buff",
          rounds: effect.duration.rounds,
          stackable: false,
          source: effectSource(owner, ability),
          ...(effect.expireAtTurnEnd && { until: "turnEnd" as const }),
          hitRider: {
            attackKind: effect.attackKind,
            extraDice: effect.extraDice,
            damageType: effect.damageType,
            chargesLeft: effect.charges,
            casterId,
            ...(effect.consumeOnMiss && { consumeOnMiss: true }),
            ...(effect.save && { save: { ability: effect.save.ability, dc: saveDc, onFail: effect.save.onFail } }),
          },
        },
        round,
      );

      flow.ps = replaceParticipant(flow.ps, next);
      flow.messages.push(textRef("battleLog.spellFx.riderCharges", { holder: holder.basicInfo.name, ability: ability.name, charges: effect.charges, dice: effect.extraDice, type: effect.damageType }));
    }
  }
}
