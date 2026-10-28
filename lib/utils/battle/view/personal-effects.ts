import { mergeEffectsForDisplay } from "./effect-summary";

import { appliesTo, auraKey, isAuraTarget } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { staticEffectStrength } from "@/lib/utils/abilities/engine/core/effect-strength";
import { isActive, resolvedAbilitiesOf } from "@/lib/utils/abilities/engine/core/participants";
import { liveActiveEffects } from "@/lib/utils/abilities/engine/effects/zone-effects";
import { evaluateCondition } from "@/lib/utils/abilities/registry/conditions";
import { isStaticEffect } from "@/lib/utils/abilities/schema/kinds";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

/**
 * Пасивні персональні вміння героїв, що діють на `p` (свої — на себе, аури — на союзників чи ворогів),
 * як постійні ефекти для чипів: у activeEffects їх немає, бо вони не мають тривалості.
 */
export function personalPassiveEffects(p: BattleParticipant, order: BattleParticipant[]): ActiveEffect[] {
  const out: ActiveEffect[] = [];

  const auras = new Map<string, { effect: ActiveEffect; strength: number }>();

  for (const owner of order) {
    if (!isActive(owner)) continue;

    const ally = owner.basicInfo.side === p.basicInfo.side;

    for (const a of resolvedAbilitiesOf(owner)) {
      if (!a.source.personal || a.trigger.event !== "passive") continue;

      if (a.condition && !evaluateCondition(a.condition, { owner, event: null, participants: order })) continue;

      const hits = a.effects.filter(isStaticEffect).filter((e) => appliesTo(e.target, owner, p));

      if (hits.length === 0) continue;

      const build = (abilityEffects: typeof hits, suffix = ""): ActiveEffect => ({
        id: `personal:${owner.basicInfo.id}:${a.key}${suffix}`,
        name: a.name,
        type: ally ? "buff" : "debuff",
        duration: 0,
        permanent: true,
        appliedAt: { round: 0, timestamp: new Date(0) },
        effects: [],
        abilityEffects,
        source: { participantId: owner.basicInfo.id, name: owner.basicInfo.name, abilityName: a.source.name, personal: true },
      });

      const auraHits = hits.filter((e) => isAuraTarget(e.target));

      const ownHits = hits.filter((e) => !isAuraTarget(e.target));

      if (auraHits.length === 0) {
        out.push(build(hits));

        continue;
      }

      if (ownHits.length > 0) out.push(build(ownHits, ":own"));

      const key = auraKey(a);

      const strength = auraHits.reduce((sum, e) => sum + staticEffectStrength(e, owner), 0);

      if (strength > (auras.get(key)?.strength ?? -1)) auras.set(key, { effect: build(auraHits), strength });
    }
  }

  return [...out, ...[...auras.values()].map((x) => x.effect)];
}

/** Ефекти для показу: персональні пасивки + ті, що діють (без зон мертвих власників), злиті по вміннях. */
export function displayEffects(p: BattleParticipant, order: BattleParticipant[]): ActiveEffect[] {
  if (!isActive(p)) return [];

  return mergeEffectsForDisplay([...personalPassiveEffects(p, order), ...liveActiveEffects(p, order)]);
}
