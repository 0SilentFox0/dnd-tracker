import { sectionItems } from '@/lib/utils/rules/section-items';
import {
    CRITICALS_ORDER_MESSAGE,
    INITIATIVE_ORDER_MESSAGE,
} from '@/lib/utils/rules/section-shapes';
import type { SectionsContribution } from '@/lib/utils/rules/sections';

export const D20_SECTIONS: SectionsContribution = {
    sections: {
        criticals: {
            owner: 'd20',
            mechanic: true,
            items: sectionItems('criticals'),
            refine: (v) =>
                typeof v.critOn !== 'number' ||
                typeof v.fumbleOn !== 'number' ||
                v.fumbleOn < v.critOn,
            refineMessage: CRITICALS_ORDER_MESSAGE,
        },
        formulas: {
            owner: 'd20',
            mechanic: true,
            items: sectionItems('formulas'),
        },
        initiative: {
            owner: 'd20',
            mechanic: true,
            items: sectionItems('initiative'),
            refine: (v) =>
                typeof v.heroMin !== 'number' ||
                typeof v.heroMax !== 'number' ||
                v.heroMin <= v.heroMax,
            refineMessage: INITIATIVE_ORDER_MESSAGE,
        },
        saves: { owner: 'd20', mechanic: true, items: sectionItems('saves') },
        deathSaves: {
            owner: 'd20',
            mechanic: true,
            items: sectionItems('deathSaves'),
        },
        concentration: {
            owner: 'd20',
            mechanic: true,
            items: sectionItems('concentration'),
        },
        conditions: {
            owner: 'd20',
            mechanic: true,
            items: sectionItems('conditions'),
        },
        actions: {
            owner: 'd20',
            mechanic: true,
            items: sectionItems('actions', [
                'enabled',
                'opportunityAttacks',
                'variant',
            ]),
        },
        classes: {
            owner: 'd20',
            mechanic: true,
            items: sectionItems('classes'),
        },
    },
    extend: {
        outOfCombat: sectionItems('outOfCombat', [
            'longRestHitDice',
            'inspiration',
        ]),
        encounters: sectionItems('encounters', ['edition', 'autoXp']),
        items: sectionItems('items', ['attunementLimit']),
    },
};
