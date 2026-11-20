import { editionOf } from '../edition';
import { ATTACK_SLOT } from '../slots';
import { wfrpState } from '../state';
import { sidedMarker } from './location';

import { AttackType } from '@/lib/constants/battle';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const hasMarker = (p: BattleParticipant, type: string) =>
    p.battleData.activeEffects.some((e) =>
        e.effects.some((x) => x.type === type)
    );

const disarmedHand = (p: BattleParticipant, hand: 'main' | 'off') =>
    hand === 'off'
        ? hasMarker(p, sidedMarker('disarmed', 'left'))
        : hasMarker(p, 'disarmed') ||
          hasMarker(p, sidedMarker('disarmed', 'right'));

/** Canon5e: a disarmed arm leaves the weapon of that hand (or any two-handed one) unusable, a bare `disarmed` marker counts as the main hand (p164); after a Momentum second attack the hand of the first one is closed (p167) */
export function wfrpAttackBlocked(
    attacker: BattleParticipant,
    attack: BattleAttack,
    rules: Ruleset
): boolean {
    const edition = editionOf(rules);

    if (
        edition.momentumModel === 'participant' &&
        wfrpState(attacker).moveMode === 'charge' &&
        attack.type !== AttackType.MELEE
    )
        return true;

    const slot = ATTACK_SLOT.read(attack.system);

    const hand = slot?.hand;

    if (!hand) return false;

    const sided = edition.hitLocationModel === 'side';

    if (
        sided &&
        (slot?.twoHanded
            ? disarmedHand(attacker, 'main') || disarmedHand(attacker, 'off')
            : disarmedHand(attacker, hand))
    )
        return true;

    const state = wfrpState(attacker);

    return (
        edition.momentumModel === 'participant' &&
        state.momentumAttack === true &&
        state.lastHand === hand
    );
}
