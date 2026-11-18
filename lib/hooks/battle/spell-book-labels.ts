import { joinLines, textRef } from '@/lib/i18n/text-ref';
import { spellSlotCostLabel } from '@/lib/utils/battle/flows';
import type { BookSpell } from '@/types/spells';
import type { LogLine } from '@/types/text';

export function slotCostLabelOf(
    s: BookSpell,
    {
        special,
        grantLabel,
        fallback,
    }: {
        special: boolean;
        grantLabel: LogLine | '' | undefined;
        fallback: Parameters<typeof spellSlotCostLabel>[1];
    }
) {
    const parts = [
        special ? textRef('battleWizards.flow.cost.special') : undefined,
        grantLabel,
    ].filter((p): p is LogLine => p !== undefined && p !== '');

    return parts.length > 0
        ? joinLines(parts, ' · ')
        : spellSlotCostLabel(s, fallback);
}
