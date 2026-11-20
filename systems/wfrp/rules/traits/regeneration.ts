import { critWoundsOf } from '../combat/critical';
import { wfrpState, withWfrpState } from '../state';
import { REGEN_CRIT_ROLL, REGEN_REVIVE_FROM } from './constants';

import { removeEffects } from '@/lib/utils/battle/conditions/query';
import type { BattleParticipant } from '@/types/battle';

const CRIT_KEY = /^wfrp:crit:([^:]+):/;

export const withFireWounds = (
    p: BattleParticipant,
    amount: number
): BattleParticipant =>
    amount > 0
        ? withWfrpState(p, {
              fireWounds: (wfrpState(p).fireWounds ?? 0) + amount,
          })
        : p;

/** Regeneration never lifts Wounds above the maximum less what fire took (p358) */
export const regenCeiling = (p: BattleParticipant): number =>
    Math.max(0, p.combatStats.maxHp - (wfrpState(p).fireWounds ?? 0));

/** Heals the last Critical Wound: its counter and its markers go (p358) */
function healLastCrit(p: BattleParticipant): BattleParticipant {
    const last = [...p.battleData.activeEffects]
        .reverse()
        .map((e) => CRIT_KEY.exec(e.abilityKey ?? '')?.[1])
        .find(Boolean);

    const stripped = last
        ? removeEffects(p, (e) => CRIT_KEY.exec(e.abilityKey ?? '')?.[1] === last)
              .participant
        : p;

    return withWfrpState(stripped, {
        critWounds: Math.max(0, critWoundsOf(p) - 1),
    });
}

/** One Regeneration step on a d10 (p358): Wounds back, and on a 10 a Critical Wound heals */
export function regenerateOnRoll(
    p: BattleParticipant,
    roll: number
): { participant: BattleParticipant; healed: number; critHealed: boolean } {
    const current = p.combatStats.currentHp;

    const gain = current > 0 ? roll : roll >= REGEN_REVIVE_FROM ? 1 : 0;

    const hp = Math.max(current, Math.min(regenCeiling(p), current + gain));

    const hpDone: BattleParticipant =
        hp === current
            ? p
            : { ...p, combatStats: { ...p.combatStats, currentHp: hp } };

    const critHealed = roll === REGEN_CRIT_ROLL && critWoundsOf(p) > 0;

    return {
        participant: critHealed ? healLastCrit(hpDone) : hpDone,
        healed: hp - current,
        critHealed,
    };
}
