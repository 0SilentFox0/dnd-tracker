import { value } from '../characteristics/derive';
import type { EditionProfile } from '../edition';
import { weaponSkillTarget } from '../edition/attack-skill';
import { hasQuality } from '../equipment/qualities';
import { qualityDefence, qualityWraps } from '../equipment/quality-effects';
import { REACH_RANK } from '../equipment/weapon-profile';
import { ATTACK_SLOT } from '../slots';
import { parryVsBiggerSl } from '../traits/size';
import { hasTalent } from '../traits/talents';
import { defensiveSl } from './defensive';
import { participantChars, participantStats } from './participant';
import { canonWeaponUse } from './weapon-use';

import { AttackType } from '@/lib/constants/battle';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const OFF_HAND_SL = -2;

const SHIELD_SL = 1;

const REACH_SL = 1;

const WRAP_SL = -1;

export interface CanonDefence {
    parryTarget: number;
    sl: { parry: number; dodge: number };
    /** Wielded weapon that makes the parry, absent when bare-handed */
    weapon?: BattleAttack;
}

const refsOf = (attack: BattleAttack) => {
    const slot = ATTACK_SLOT.read(attack.system);

    return {
        slot,
        refs: { qualities: slot?.qualities ?? [], flaws: slot?.flaws ?? [] },
    };
};

/** Canon defence modifiers (p300, p304-306): shield, Defensive/Unbalanced, Wrap, reach and the off-hand penalty for the best parrying weapon */
export function canonDefence(
    defender: BattleParticipant,
    attack: BattleAttack,
    edition: Pick<EditionProfile, 'attackTarget' | 'sizeModel'>,
    attacker?: BattleParticipant
): CanonDefence {
    const chars = participantChars(defender);

    const ws = value(chars, 'ws');

    const shield =
        (participantStats(defender)?.shield ?? 0) > 0 ? SHIELD_SL : 0;

    const incoming = refsOf(attack);

    const wrap = qualityWraps(incoming.refs, 'canon') ? WRAP_SL : 0;

    const attackerReach = incoming.slot?.reach;

    const ambidextrous = hasTalent(defender, 'ambidextrous');

    const candidates = (defender.battleData.attacks ?? [])
        .filter((a) => attackKindOf(a.type) !== AttackType.RANGED)
        .map((a) => {
            const { slot } = refsOf(a);

            const { refs, target: groupTarget } = canonWeaponUse(defender, a);

            const { bonus, penalty } = qualityDefence(refs, 'canon');

            const longer =
                attackerReach &&
                slot?.reach &&
                REACH_RANK[slot.reach] > REACH_RANK[attackerReach]
                    ? REACH_SL
                    : 0;

            const offHand =
                slot?.hand === 'off' &&
                !hasQuality(refs.qualities, 'parry') &&
                !ambidextrous
                    ? OFF_HAND_SL
                    : 0;

            const target =
                edition.attackTarget === 'skill'
                    ? (groupTarget ??
                      weaponSkillTarget(chars, 'melee', slot?.group) ??
                      ws)
                    : ws;

            const sl =
                Math.max(shield, bonus) + penalty + longer + offHand + wrap;

            return { weapon: a, target, sl };
        });

    const score = (c: { target: number; sl: number }) =>
        Math.floor(c.target / 10) + c.sl;

    const best = candidates.reduce<(typeof candidates)[number] | undefined>(
        (a, b) => (!a || score(b) > score(a) ? b : a),
        undefined
    );

    const bigger =
        attacker && edition.sizeModel === 'canon'
            ? parryVsBiggerSl(defender, attacker)
            : 0;

    const stance = defensiveSl(defender);

    return {
        parryTarget: best?.target ?? ws,
        sl: {
            parry: (best?.sl ?? shield + wrap) + bigger + stance.parry,
            dodge: shield + stance.dodge,
        },
        ...(best && { weapon: best.weapon }),
    };
}
