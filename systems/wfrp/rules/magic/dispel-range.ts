import { dispelRangeYards } from './dispel';

import { cellFeetOf } from '@/lib/utils/battle/grid/cell-feet';
import { cellDistance } from '@/lib/utils/battle/grid/geometry';
import type { Ruleset } from '@/lib/utils/rules';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

const FEET_PER_YARD = 3;

/** Without a map or positions the range cannot be judged and the attempt is allowed */
export function isDispelRange(
    dispeller: BattleParticipant,
    target: BattleParticipant,
    map: BattleMapConfig | null | undefined,
    rules: Ruleset
): boolean {
    const from = dispeller.battleData.position;

    const to = target.battleData.position;

    if (!map || !from || !to) return true;

    const yards = (cellDistance(from, to) * cellFeetOf(rules)) / FEET_PER_YARD;

    return yards <= dispelRangeYards(dispeller);
}
