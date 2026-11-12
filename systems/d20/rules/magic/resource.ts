import { API_ERRORS } from '@/lib/constants/api-errors';
import { isFiveE } from '@/lib/utils/battle/attack/ability';
import {
    resolveChosenSlot,
    spellNeedsSlot,
    spellSlotKey,
} from '@/lib/utils/battle/spell/slot';
import type {
    CastResourceChoice,
    CastResourceGate,
    RuleSystemMagicResource,
} from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';

function canCastWithSlot(
    caster: BattleParticipant,
    { level, slotKey }: CastResourceChoice
): CastResourceGate {
    if (!spellNeedsSlot(level)) return { ok: true };

    if (slotKey) {
        const chosen = resolveChosenSlot(caster, level, slotKey);

        return chosen.ok ? { ok: true, castLevel: chosen.castLevel } : chosen;
    }

    const slot = caster.spellcasting.spellSlots[spellSlotKey(caster, level)];

    return slot && slot.current > 0
        ? { ok: true }
        : { ok: false, error: API_ERRORS.BATTLE_NO_FREE_SLOT_TO_CAST };
}

function spendSlot(
    caster: BattleParticipant,
    { level, slotKey }: CastResourceChoice
): BattleParticipant {
    if (!spellNeedsSlot(level)) return caster;

    const key = slotKey ?? spellSlotKey(caster, level);

    const spent = caster.spellcasting.spellSlots[key];

    if (!spent) return caster;

    return {
        ...caster,
        spellcasting: {
            ...caster.spellcasting,
            spellSlots: {
                ...caster.spellcasting.spellSlots,
                [key]: { ...spent, current: spent.current - 1 },
            },
        },
    };
}

export const D20_SPELL_RESOURCE: RuleSystemMagicResource = {
    picksSlot: isFiveE,
    canCast: canCastWithSlot,
    spend: spendSlot,
};
