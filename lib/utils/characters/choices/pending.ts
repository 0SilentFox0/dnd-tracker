import {
    choiceIssue,
    featPrerequisiteMet,
} from '@/lib/utils/characters/choices/validate';
import type {
    ChoiceRefs,
    PickVisit,
} from '@/lib/utils/characters/choices/walk';
import type {
    Choice,
    ChoiceIssue,
    ChoicePick,
    FeatData,
} from '@/types/choices';

export function resolvedPickCount(
    choice: Choice,
    picks: readonly ChoicePick[],
    featsById?: Readonly<Record<string, FeatData>>
): number {
    if (choice.kind === 'option')
        return picks.filter((p) => choice.options?.some((o) => o.id === p.id))
            .length;

    if (choice.kind === 'feat' && featsById)
        return picks.filter(
            (p) => featsById[p.id] || choice.options?.some((o) => o.id === p.id)
        ).length;

    return picks.length;
}

const resolved = (v: PickVisit, refs: Pick<ChoiceRefs, 'featsById'>): number =>
    resolvedPickCount(v.choice, v.picks, refs.featsById);

const unreachable = (v: PickVisit): boolean => {
    const rule = v.choice.spells;

    return (
        v.choice.kind === 'spell' &&
        !!rule &&
        rule.maxLevel === 'slots' &&
        v.maxSlotLevel !== undefined &&
        rule.minLevel > v.maxSlotLevel
    );
};

type PendingRefs = Pick<ChoiceRefs, 'featsById'> &
    Partial<Pick<ChoiceRefs, 'spellsById'>> & {
        hero?: Parameters<typeof featPrerequisiteMet>[1];
    };

/** how many picks the campaign can actually offer; Infinity when it is not bounded by a list */
function availableCount(v: PickVisit, refs: PendingRefs): number {
    const { choice } = v;

    if (choice.kind === 'spell' && choice.spells && refs.spellsById) {
        const { lists, minLevel, maxLevel } = choice.spells;

        const max = maxLevel === 'slots' ? (v.maxSlotLevel ?? 0) : maxLevel;

        return Object.values(refs.spellsById).filter(
            (s) =>
                s.level >= minLevel &&
                s.level <= max &&
                (lists.length === 0 || s.lists.some((l) => lists.includes(l)))
        ).length;
    }

    if (choice.kind === 'feat') {
        const types = choice.featTypes ?? [];

        return (
            (choice.options?.length ?? 0) +
            Object.values(refs.featsById).filter(
                (f) =>
                    types.includes(f.type) &&
                    (!refs.hero || featPrerequisiteMet(f, refs.hero))
            ).length
        );
    }

    return Infinity;
}

const missing = (
    v: PickVisit,
    refs: PendingRefs,
    capToAvailable = false
): number => {
    if (!v.open || unreachable(v)) return 0;

    const target = capToAvailable
        ? Math.min(v.target, availableCount(v, refs))
        : v.target;

    return Math.max(0, target - resolved(v, refs));
};

export const pendingCount = (
    visits: readonly PickVisit[],
    refs: Pick<ChoiceRefs, 'featsById'>
): number => visits.reduce((sum, v) => sum + missing(v, refs), 0);

/** for requireComplete: a choice the campaign cannot fill (fewer options than count) never blocks */
export const pendingIssues = (
    visits: readonly PickVisit[],
    refs: PendingRefs
): ChoiceIssue[] =>
    visits
        .filter((v) => missing(v, refs, true) > 0)
        .map((v) => choiceIssue(v.path, 'CHOICE_INCOMPLETE', v.choice.label));

const isBackgroundVisit = (v: PickVisit): boolean =>
    v.path.startsWith('backgroundChoices.') ||
    v.path.startsWith('backgroundFeatPicks.');

export function backgroundOpenCount(
    visits: readonly PickVisit[],
    refs: Pick<ChoiceRefs, 'featsById'>
): { count: number; key: string | null } {
    const own = visits.filter(isBackgroundVisit);

    const key =
        own
            .find((v) => pendingCount([v], refs) > 0)
            ?.path.split('.')
            .slice(0, 2)
            .join('.') ?? null;

    return { count: pendingCount(own, refs), key };
}
