import { wfrpState } from '../state';
import { dispelRangeYards } from './dispel';

import { cellFeetOf } from '@/lib/utils/battle/grid/cell-feet';
import { cellDistance } from '@/lib/utils/battle/grid/geometry';
import type { Ruleset } from '@/lib/utils/rules';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';

const FEET_PER_YARD = 3;

export const dispelSpotOf = (
    caster: BattleParticipant,
    mode: 'reactive' | 'persistent'
): GridPoint | undefined =>
    (mode === 'reactive' ? wfrpState(caster).lastCast?.at : undefined) ??
    caster.battleData.position;

/** Reactive: the spell's landing cell; persistent: the holder's cell. Without a map or positions the range cannot be judged and the attempt is allowed */
export function isDispelRange(
    dispeller: BattleParticipant,
    at: GridPoint | undefined,
    map: BattleMapConfig | null | undefined,
    rules: Ruleset
): boolean {
    const from = dispeller.battleData.position;

    if (!map || !from || !at) return true;

    const yards = (cellDistance(from, at) * cellFeetOf(rules)) / FEET_PER_YARD;

    return yards <= dispelRangeYards(dispeller);
}
