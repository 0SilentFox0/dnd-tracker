import { choiceIssue } from '@/lib/utils/characters/choices/validate';
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

const missing = (v: PickVisit, refs: Pick<ChoiceRefs, 'featsById'>): number =>
    v.open && !unreachable(v) ? Math.max(0, v.target - resolved(v, refs)) : 0;

export const pendingCount = (
    visits: readonly PickVisit[],
    refs: Pick<ChoiceRefs, 'featsById'>
): number => visits.reduce((sum, v) => sum + missing(v, refs), 0);

export const pendingIssues = (
    visits: readonly PickVisit[],
    refs: Pick<ChoiceRefs, 'featsById'>
): ChoiceIssue[] =>
    visits
        .filter((v) => missing(v, refs) > 0)
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
