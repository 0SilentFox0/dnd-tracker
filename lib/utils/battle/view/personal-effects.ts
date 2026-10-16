import { isActive, resolvedAbilitiesOf } from "@/lib/utils/abilities/engine/participants";
import { evaluateCondition } from "@/lib/utils/abilities/registry/conditions";
import { isStaticEffect } from "@/lib/utils/abilities/schema/kinds";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

/**
 * Пасивні персональні вміння героїв, що діють на `p` (свої — на себе, аури — на союзників чи ворогів),
 * як постійні ефекти для чипів: у activeEffects їх немає, бо вони не мають тривалості.
 */
export function personalPassiveEffects(p: BattleParticipant, order: BattleParticipant[]): ActiveEffect[] {
  const out: ActiveEffect[] = [];

  for (const owner of order) {
    if (!isActive(owner)) continue;

    const ally = owner.basicInfo.side === p.basicInfo.side;

    for (const a of resolvedAbilitiesOf(owner)) {
      if (!a.source.personal || a.trigger.event !== "passive") continue;

      if (a.condition && !evaluateCondition(a.condition, { owner, event: null, participants: order })) continue;

      const hits = a.effects.filter(isStaticEffect).filter((e) => {
        const target = "target" in e ? (e.target ?? "self") : "self";

        return target === "self" ? owner.basicInfo.id === p.basicInfo.id : target === "allAllies" ? ally : target === "allEnemies" ? !ally : false;
      });

      if (hits.length === 0) continue;

      out.push({
        id: `personal:${owner.basicInfo.id}:${a.key}`,
        name: a.name,
        type: ally ? "buff" : "debuff",
        duration: 0,
        permanent: true,
        appliedAt: { round: 0, timestamp: new Date(0) },
        effects: [],
        abilityEffects: hits,
        source: { participantId: owner.basicInfo.id, name: owner.basicInfo.name, abilityName: a.source.name, personal: true },
      });
    }
  }

  return out;
}
