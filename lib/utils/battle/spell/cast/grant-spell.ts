import { textRef } from '@/lib/i18n/text-ref';
import {
    findParticipant,
    replaceParticipant,
} from '@/lib/utils/abilities/engine/core/participants';
import type { ActionFlow } from '@/lib/utils/battle/common/action-flow';
import { withGrant } from '@/lib/utils/battle/spell/cast/grant-cast';
import { grantSpellsOf } from '@/lib/utils/battle/spell/cast/state';
import { castPoolKey } from '@/lib/utils/items/pools';
import type { SpellEffect } from '@/lib/utils/spells/model/schema';
import type { SpellGrant } from '@/types/battle';

interface GrantSpellInput {
    flow: ActionFlow;
    effects: SpellEffect[];
    casterId: string;
    spell: { id: string; name: string };
    picked?: { id: string; name: string; level: number };
    optionIndex?: number;
    castId: string;
    round: number;
}

export function applyGrantSpells({
    flow,
    effects,
    casterId,
    spell,
    picked,
    optionIndex,
    castId,
    round,
}: GrantSpellInput): void {
    for (const { effect, index } of grantSpellsOf(effects)) {
        if (
            !picked ||
            (effect.onOption !== undefined && effect.onOption !== optionIndex)
        )
            continue;

        const holder = findParticipant(flow.ps, casterId);

        if (!holder) continue;

        const poolKey = castPoolKey(castId, index);

        const grant: SpellGrant = {
            spellId: picked.id,
            key: `grantSpell:${castId}:${index}`,
            label: picked.name,
            via: 'slotOrGrant',
            pool: poolKey,
            cost: 1,
            noAction: true,
            expiresRound: round + effect.duration.rounds - 1,
        };

        flow.ps = replaceParticipant(
            flow.ps,
            withGrant(holder, grant, {
                key: poolKey,
                label: picked.name,
                max: 1,
            })
        );
        flow.messages.push(
            textRef('battleLog.spellFx.grantSpell', {
                holder: holder.basicInfo.name,
                spell: spell.name,
                granted: picked.name,
            })
        );
    }
}
