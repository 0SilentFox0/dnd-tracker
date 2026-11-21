import { conditionLevel } from '../../conditions/levels';
import { REACH_RANK } from '../../equipment/weapon-profile';
import { ATTACK_SLOT } from '../../slots';
import { calledShotMod } from './ranged';
import type { AttackMod, AttackModSource } from './types';

import { cellKey, difficultSet } from '@/lib/utils/battle/grid/geometry';

const HIGH_GROUND_SL = 1;

const ENCLOSED_AVERAGE_SL = -1;

const ENCLOSED_LONG_SL = -2;

export const enclosedSl = (
    reach: keyof typeof REACH_RANK | undefined
): number => {
    const rank = REACH_RANK[reach ?? 'average'];

    if (rank > REACH_RANK.average) return ENCLOSED_LONG_SL;

    return rank === REACH_RANK.average ? ENCLOSED_AVERAGE_SL : 0;
};

export const meleeMods: AttackModSource = ({ ctx, kind, input }) => {
    if (kind !== 'melee') return [];

    const { attacker, target, attack, map } = ctx;

    const mods: AttackMod[] = [...calledShotMod(input?.calledShot)];

    if (input?.highGround)
        mods.push({
            key: 'highGround',
            sl:
                input.highGround === 'attacker'
                    ? HIGH_GROUND_SL
                    : -HIGH_GROUND_SL,
        });

    const at = attacker.battleData.position;

    if (input?.badFooting || (map && at && difficultSet(map).has(cellKey(at))))
        mods.push({ key: 'difficult', sl: -1 });

    if (conditionLevel(attacker, 'prone') > 0)
        mods.push({ key: 'proneSelf', sl: -1 });

    if (conditionLevel(target, 'entangled') > 0)
        mods.push({ key: 'entangled', sl: 1 });

    if (input?.enclosed)
        mods.push({
            key: 'enclosed',
            sl: enclosedSl(ATTACK_SLOT.read(attack.system)?.reach),
        });

    return mods;
};
