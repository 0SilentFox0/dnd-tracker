import { AttackType } from '@/lib/constants/battle';
import { isAdjacent, isOnMap } from '@/lib/utils/battle/grid/occupancy';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

/** Суміжна атака: на мапі — за клітинками, без мапи — ближня. */
export function isAdjacentAttack(
    attacker: BattleParticipant,
    target: BattleParticipant,
    attack: BattleAttack
): boolean {
    return isOnMap(attacker) && isOnMap(target)
        ? isAdjacent(attacker, target)
        : attack.type === AttackType.MELEE;
}
