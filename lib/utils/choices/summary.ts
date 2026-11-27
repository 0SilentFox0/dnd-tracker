import type { Choice } from '@/types/choices';

export interface ChoiceSummaryItem {
    id: string;
    label: string;
    count: number;
}

export interface ChoiceSummary {
    items: ChoiceSummaryItem[];
    more: number;
}

export function summarizeChoices(
    choices: Pick<Choice, 'id' | 'label' | 'count'>[],
    limit = 2
): ChoiceSummary {
    const items = choices.slice(0, limit).map((c) => ({
        id: c.id,
        label: c.label,
        count: typeof c.count === 'number' ? c.count : 1,
    }));

    return { items, more: Math.max(0, choices.length - limit) };
}
