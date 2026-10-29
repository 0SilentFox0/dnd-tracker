import { findParticipant, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import type { ActionFlow } from "@/lib/utils/battle/common/action-flow";
import { grantCastsOf } from "@/lib/utils/battle/spell/cast/state";
import { castPoolKey } from "@/lib/utils/items/pools";
import type { SpellEffect } from "@/lib/utils/spells/model/schema";
import type { BattleParticipant, SpellGrant } from "@/types/battle";

interface GrantCastInput {
  flow: ActionFlow;
  effects: SpellEffect[];
  casterId: string;
  targetIds: string[];
  spell: { id: string; name: string };
  castId: string;
  round: number;
  concentrationOf?: SpellGrant["concentrationOf"];
}

function withGrant(p: BattleParticipant, grant: SpellGrant, pool?: { key: string; label: string; max: number }): BattleParticipant {
  const kept = (p.spellcasting.grants ?? []).filter((g) => g.key !== grant.key);

  return {
    ...p,
    spellcasting: { ...p.spellcasting, grants: [...kept, grant] },
    ...(pool && { battleData: { ...p.battleData, pools: { ...p.battleData.pools, [pool.key]: { label: pool.label, max: pool.max, rest: null } } } }),
  };
}

export function applyGrantCasts({ flow, effects, casterId, targetIds, spell, castId, round, concentrationOf }: GrantCastInput): void {
  for (const { effect, index } of grantCastsOf(effects)) {
    const holders = effect.target === "eventTarget" ? targetIds : [casterId];

    const poolKey = castPoolKey(castId, index);

    const grant: SpellGrant = {
      spellId: spell.id,
      key: `cast:${castId}:${index}`,
      label: effect.label,
      inline: effect.cast,
      castCost: effect.cost,
      expiresRound: round + effect.duration.rounds,
      ...(effect.uses && { pool: poolKey, cost: 1 }),
      ...(!effect.uses && { cost: 0 }),
      ...(concentrationOf && { concentrationOf }),
    };

    for (const id of holders) {
      const holder = findParticipant(flow.ps, id);

      if (!holder) continue;

      flow.ps = replaceParticipant(flow.ps, withGrant(holder, grant, effect.uses ? { key: poolKey, label: effect.label, max: effect.uses } : undefined));
      flow.messages.push(`✨ ${holder.basicInfo.name}: «${effect.label}» — підкаст на ${effect.duration.rounds} р.`);
    }
  }
}
