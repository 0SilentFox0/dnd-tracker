import { z } from 'zod';

import { CUSTOM_CONDITION_KEY_RE } from '@/lib/utils/abilities/schema/kinds';
import { isRecord } from '@/lib/utils/common/is-record';
import { sectionItems } from '@/lib/utils/rules/section-items';
import {
    CRITICALS_ORDER_MESSAGE,
    INITIATIVE_ORDER_MESSAGE,
} from '@/lib/utils/rules/section-shapes';
import {
    RulesMergeError,
    type RulesSection,
    type SectionsContribution,
} from '@/lib/utils/rules/sections';

const customKey = (c: unknown) => (isRecord(c) ? String(c.key) : undefined);

const mergeConditions: NonNullable<RulesSection['merge']> = (
    current,
    patch,
    whole
) => {
    const removed = new Set(
        Array.isArray(whole.removeCustomConditions)
            ? whole.removeCustomConditions.map(String)
            : []
    );

    const added = Array.isArray(patch.custom) ? patch.custom : undefined;

    const keptOf = (list: unknown) =>
        Array.isArray(list) ? (list as unknown[]) : [];

    if (added?.some((c) => removed.has(customKey(c) ?? '')))
        throw new RulesMergeError({
            code: 'custom',
            message: 'validation.rulesCustomConflict',
            path: ['removeCustomConditions'],
            input: whole.removeCustomConditions,
        });

    const next = { ...current, ...patch };

    if (added) {
        const incoming = new Set(added.map(customKey));

        next.custom = [
            ...keptOf(current.custom).filter(
                (c) => !incoming.has(customKey(c))
            ),
            ...added,
        ];
    }

    if (removed.size)
        next.custom = keptOf(next.custom).filter(
            (c) => !removed.has(customKey(c) ?? '')
        );

    return { next, touched: removed.size ? ['custom'] : undefined };
};

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
            patchExtras: {
                removeCustomConditions: z
                    .array(z.string().regex(CUSTOM_CONDITION_KEY_RE))
                    .min(1)
                    .max(50)
                    .optional(),
            },
            merge: mergeConditions,
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
