import { ATTACK_SLOT, type SceneMomentum } from '../slots';
import { wfrpState, withWfrpState } from '../state';
import { wfrpAttackBlocked } from './disarm';

import { AttackType } from '@/lib/constants/battle';
import { withAttacksLeft } from '@/lib/utils/battle/attack/attacks-left';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type {
    BattleAttack,
    BattleParticipant,
    ParticipantSide,
} from '@/types/battle';

export const heldBy = (m: SceneMomentum, side: ParticipantSide): boolean =>
    m[side] === true;

export function settle(
    m: SceneMomentum,
    sides: { attacker: ParticipantSide; target: ParticipantSide },
    resolved: { spent: boolean; gainedBy: 'attacker' | 'defender' | null }
): { next: SceneMomentum; gained: boolean } {
    const { attacker, target } = sides;

    const heldAttacker = heldBy(m, attacker);

    const heldDefender = heldBy(m, target);

    let next: SceneMomentum = { ...m };

    if (resolved.spent) delete next[attacker];

    if (heldDefender) delete next[target];

    if (!resolved.gainedBy) return { next, gained: false };

    const winner = resolved.gainedBy === 'attacker' ? attacker : target;

    next = { [winner]: true };

    return {
        next,
        gained: !(winner === attacker ? heldAttacker : heldDefender),
    };
}

export const hasMomentum = (p: BattleParticipant): boolean =>
    wfrpState(p).momentum === true;

export const withMomentum = (
    p: BattleParticipant,
    on: boolean
): BattleParticipant =>
    hasMomentum(p) === on
        ? p
        : withWfrpState(p, { momentum: on ? true : undefined });

/** Damage, an inflicted Condition or a failed melee test (p168) */
export const loseMomentum = (p: BattleParticipant): BattleParticipant =>
    withMomentum(p, false);

/** Momentum is spent on a second attack or Disengage; false when there is none to spend (p168) */
export function spendMomentum(p: BattleParticipant): BattleParticipant | null {
    return hasMomentum(p) ? loseMomentum(p) : null;
}

export type SecondAttackBlocker = 'none' | 'used' | 'action' | 'weapons';

/** One extra attack per turn (p167-168): after the main action, with melee weapons in both hands */
export function secondAttackBlocker(
    p: BattleParticipant,
    rules: Ruleset
): SecondAttackBlocker | null {
    if (!hasMomentum(p)) return 'none';

    if (wfrpState(p).momentumAttack) return 'used';

    if (!p.actionFlags.hasUsedAction) return 'action';

    const melee = p.battleData.attacks.filter(
        (a) => a.type === AttackType.MELEE && !wfrpAttackBlocked(p, a, rules)
    );

    const off = (a: BattleAttack) =>
        ATTACK_SLOT.read(a.system)?.offHand === true;

    return melee.some(off) && melee.some((a) => !off(a)) ? null : 'weapons';
}

export function grantSecondAttack(p: BattleParticipant): BattleParticipant {
    const spent = loseMomentum(p);

    return withAttacksLeft(withWfrpState(spent, { momentumAttack: true }), 1);
}
