import { findFlags } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import { withSelf } from '@/lib/utils/abilities/engine/core/participants';
import { BattleRuleError } from '@/lib/utils/battle/store/errors';
import { REJECT } from '@/lib/utils/battle/store/reject';
import type { BattleParticipant } from '@/types/battle';

export function assertMayCast(
    caster: BattleParticipant,
    participants: BattleParticipant[]
): void {
    const blocked =
        findFlags(
            withSelf(participants, caster),
            caster.basicInfo.id,
            'noSpellcasting'
        ).length > 0;

    if (blocked)
        throw new BattleRuleError('action_rejected', REJECT.cannotCast, {
            name: caster.basicInfo.name,
        });
}
