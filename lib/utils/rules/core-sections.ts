import { sectionItems } from './section-items';
import type { RulesSection, SectionsContribution } from './sections';

import { isRecord } from '@/lib/utils/common/is-record';

const mergeEncounters: NonNullable<RulesSection['merge']> = (
    current,
    patch
) => {
    const next = { ...current, ...patch };

    if (isRecord(patch.unitGroups)) {
        const unitGroups: Record<string, unknown> = isRecord(
            current.unitGroups
        )
            ? { ...current.unitGroups }
            : {};

        for (const [key, appearance] of Object.entries(patch.unitGroups)) {
            if (isRecord(appearance))
                unitGroups[key] = {
                    ...(isRecord(unitGroups[key]) ? unitGroups[key] : {}),
                    ...appearance,
                };
        }

        next.unitGroups = unitGroups;
    }

    return { next };
};

export const CORE_SECTIONS: SectionsContribution = {
    sections: {
        system: {
            owner: 'core',
            mechanic: false,
            items: sectionItems('system', ['key']),
        },
        defaultAttacks: {
            owner: 'core',
            mechanic: true,
            items: sectionItems('defaultAttacks', [
                'meleeName',
                'rangedName',
                'weaponName',
            ]),
        },
        spellIngredients: {
            owner: 'core',
            mechanic: true,
            items: sectionItems('spellIngredients', ['enabled', 'autoPay']),
        },
        outOfCombat: {
            owner: 'core',
            mechanic: true,
            items: sectionItems('outOfCombat', ['persistResources', 'xp']),
        },
        encounters: {
            owner: 'core',
            mechanic: true,
            items: sectionItems('encounters', ['balance', 'unitGroups']),
            merge: mergeEncounters,
        },
        items: {
            owner: 'core',
            mechanic: true,
            items: sectionItems('items', ['enabled']),
        },
    },
};
