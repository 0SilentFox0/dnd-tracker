import { AttackType } from '@/lib/constants/battle';
import { isAdjacentOnMap } from '@/lib/utils/battle/grid/adjacency';
import { isOnMap } from '@/lib/utils/battle/grid/occupancy';
import type {
    BattleAttack,
    BattleMapConfig,
    BattleParticipant,
} from '@/types/battle';

/** Суміжна атака: на мапі — за клітинками, без мапи — ближня. */
export function isAdjacentAttack(
    attacker: BattleParticipant,
    target: BattleParticipant,
    attack: BattleAttack,
    map?: BattleMapConfig | null
): boolean {
    return isOnMap(attacker) && isOnMap(target)
        ? isAdjacentOnMap(map, attacker, target)
        : attack.type === AttackType.MELEE;
}
