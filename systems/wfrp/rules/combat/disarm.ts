import { conditionLevel } from '../conditions/levels';
import { editionOf } from '../edition';
import { ATTACK_SLOT } from '../slots';
import { wfrpState } from '../state';
import { sidedMarker } from './location';

import { AttackType } from '@/lib/constants/battle';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const BOW_GROUP = 'bow';

const hasMarker = (p: BattleParticipant, type: string) =>
    p.battleData.activeEffects.some((e) =>
        e.effects.some((x) => x.type === type)
    );

const disarmedHand = (p: BattleParticipant, hand: 'main' | 'off') =>
    hand === 'off'
        ? hasMarker(p, sidedMarker('disarmed', 'left'))
        : hasMarker(p, 'disarmed') ||
          hasMarker(p, sidedMarker('disarmed', 'right'));

/** Canon5e: a Blinded shooter cannot make Ranged attacks (p185), a disarmed arm leaves the weapon of that hand (or any two-handed one, a bow included) unusable, a bare `disarmed` marker counts as the main hand (p164); after a Momentum second attack the hand of the first one is closed (p167) */
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

    if (
        edition.conditionModel === 'sl' &&
        attackKindOf(attack.type) === AttackType.RANGED &&
        conditionLevel(attacker, 'blinded') > 0
    )
        return true;

    const slot = ATTACK_SLOT.read(attack.system);

    if (
        edition.hitLocationModel === 'side' &&
        slot?.group === BOW_GROUP &&
        (disarmedHand(attacker, 'main') || disarmedHand(attacker, 'off'))
    )
        return true;

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
