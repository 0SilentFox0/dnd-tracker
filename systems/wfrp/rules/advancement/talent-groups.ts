import type { Characteristics } from '../characteristics/keys';

import type { ChoiceGroup } from '@/lib/utils/characters/choices/selections';
import type { AbilitySource } from '@/types/abilities';
import type { FeatData } from '@/types/choices';

export function availableXp(
    experience: number,
    characteristics: Characteristics
): number {
    return Math.max(
        0,
        experience -
            characteristics.spentArchived -
            characteristics.ledger.reduce((sum, e) => sum + e.cost, 0)
    );
}

// Effects are per rank: the group repeats once per rank (ability scale is bound to class columns, unavailable for feats).
export function talentGroups(
    talents: Record<string, number>,
    featsById: Record<string, FeatData>
): ChoiceGroup[] {
    const groups: ChoiceGroup[] = [];

    for (const [featId, rank] of Object.entries(talents)) {
        const feat = featsById[featId];

        if (!feat || feat.abilities.length === 0) continue;

        const source: AbilitySource = {
            type: 'feat',
            id: feat.id,
            name: feat.name,
            icon: feat.icon,
        };

        for (let n = 1; n <= rank; n++)
            groups.push({
                source,
                abilities: feat.abilities.map((a) => ({
                    ...a,
                    id: `talent:${feat.id}#${n}.${a.id}`,
                })),
            });
    }

    return groups;
}
