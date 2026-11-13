import { ParticipantSourceType } from '@/lib/constants/battle';
import { getHeroDamageDiceForLevel } from '@/lib/constants/hero-scaling';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import type { DamagePart } from '@/lib/utils/rules/systems/types';

/** Level dice and flat +level of a character without the 5e damage model */
export const heroLevelDamage: DamagePart = (p, attack) => {
    if (
        p.basicInfo.sourceType !== ParticipantSourceType.CHARACTER ||
        p.abilities.damageModel === '5e'
    )
        return null;

    const dice = attack.noLevelDice
        ? ''
        : getHeroDamageDiceForLevel(
              p.abilities.level,
              attackKindOf(attack.type),
              {
                  meleeDiceByLevel: p.abilities.heroDice?.melee,
                  rangedDiceByLevel: p.abilities.heroDice?.ranged,
              }
          );

    return { dice, flat: p.abilities.level };
};
