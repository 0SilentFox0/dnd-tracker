import { staticEffectStrength } from "@/lib/utils/abilities/engine/core/effect-strength";
import { findParticipant, isActive } from "@/lib/utils/abilities/engine/core/participants";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

const effectStrength = (e: ActiveEffect) => (e.abilityEffects ?? []).reduce((sum, s) => sum + staticEffectStrength(s), 0);

/**
 * Ефекти, що діють на учасника: зони мертвих власників не діють, однакові аури кількох власників — лише найсильніша.
 * Без списку учасників (рекурсивні формули) власника не перевіряємо.
 */
export function liveActiveEffects(p: BattleParticipant, ps?: BattleParticipant[]): ActiveEffect[] {
  const effects = p.battleData.activeEffects;

  if (!effects.some((e) => e.zone)) return effects;

  const best = new Map<string, ActiveEffect>();

  for (const e of effects) {
    if (!e.zone) continue;

    const owner = ps && findParticipant(ps, e.zone.ownerId);

    if (ps && (!owner || !isActive(owner))) continue;

    const kept = best.get(e.zone.key);

    if (!kept || effectStrength(e) > effectStrength(kept)) best.set(e.zone.key, e);
  }

  return effects.filter((e) => !e.zone || best.get(e.zone.key) === e);
}
