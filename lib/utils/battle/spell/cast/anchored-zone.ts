import { findParticipant, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { effectSource, upsertTimedEffect } from "@/lib/utils/abilities/engine/effects/timed-effects";
import type { ActionFlow } from "@/lib/utils/battle/common/action-flow";
import { anchoredZonesOf } from "@/lib/utils/battle/spell/cast/state";
import type { SpellEffect } from "@/lib/utils/spells/model/schema";
import type { ResolvedAbility } from "@/types/abilities";

interface AnchoredZoneInput {
  flow: ActionFlow;
  effects: SpellEffect[];
  casterId: string;
  targetIds: string[];
  ability: ResolvedAbility;
  spellId: string;
  saveDc: number;
  round: number;
}

export function applyAnchoredZones({ flow, effects, casterId, targetIds, ability, spellId, saveDc, round }: AnchoredZoneInput): void {
  for (const { effect, index } of anchoredZonesOf(effects)) {
    for (const id of targetIds) {
      const holder = findParticipant(flow.ps, id);

      if (!holder) continue;

      const next = upsertTimedEffect(
        holder,
        {
          timedKey: `${ability.key}#${index}@${casterId}`,
          name: ability.name,
          type: "buff",
          rounds: effect.duration.rounds,
          stackable: false,
          source: effectSource(findParticipant(flow.ps, casterId), ability),
          anchoredZone: {
            casterId,
            spellId,
            spellName: ability.name,
            dc: saveDc,
            radiusFeet: effect.radiusFeet,
            side: effect.side,
            ...(effect.excludeBearer && { excludeBearer: true }),
            ...(effect.onEnter && { onEnter: effect.onEnter }),
            ...(effect.onTurnStart && { onTurnStart: effect.onTurnStart }),
            ...(effect.endsWhenStartOutside && { endsWhenStartOutside: true }),
          },
        },
        round,
      );

      flow.ps = replaceParticipant(flow.ps, next);
      flow.messages.push(`✨ ${holder.basicInfo.name}: «${ability.name}» — аура ${effect.radiusFeet} фт`);
    }
  }
}
