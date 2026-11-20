import { editionOf } from '../edition';
import { ATTACK_SLOT } from '../slots';
import { sidedMarker } from './location';

import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const hasMarker = (p: BattleParticipant, type: string) =>
    p.battleData.activeEffects.some((e) =>
        e.effects.some((x) => x.type === type)
    );

/** Canon5e: a disarmed arm (Critical Wound to it) leaves the weapon of that hand unusable; the main hand is the right one, a bare `disarmed` marker counts as such (p164) */
export function wfrpAttackBlocked(
    attacker: BattleParticipant,
    attack: BattleAttack,
    rules: Ruleset
): boolean {
    if (editionOf(rules).hitLocationModel !== 'side') return false;

    const slot = ATTACK_SLOT.read(attack.system);

    if (!slot?.hand) return false;

    return slot?.offHand
        ? hasMarker(attacker, sidedMarker('disarmed', 'left'))
        : hasMarker(attacker, 'disarmed') ||
              hasMarker(attacker, sidedMarker('disarmed', 'right'));
}
