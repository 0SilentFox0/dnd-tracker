import { isRecord } from '@/lib/utils/common/is-record';

export interface InspirationBackfillRow {
    id: string;
    campaignId: string;
    inspiration: boolean;
    updatedAt: string;
    characteristicsText: string;
}

export interface InspirationPlan {
    row: InspirationBackfillRow;
    action: 'write' | 'unchanged' | 'skipped';
    afterText?: string;
}

const parse = (text: string): unknown => {
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
};

const hasAvailable = (characteristics: unknown): boolean => {
    if (!isRecord(characteristics) || !isRecord(characteristics.ext))
        return false;

    const own = characteristics.ext.inspiration;

    return isRecord(own) && typeof own.available === 'boolean';
};

export function planInspirationRow(
    row: InspirationBackfillRow
): InspirationPlan {
    if (!row.inspiration) return { row, action: 'unchanged' };

    const parsed = parse(row.characteristicsText);

    if (!isRecord(parsed)) return { row, action: 'skipped' };

    if (hasAvailable(parsed)) return { row, action: 'unchanged' };

    const ext = isRecord(parsed.ext) ? parsed.ext : {};

    const own = isRecord(ext.inspiration) ? ext.inspiration : {};

    const characteristics = {
        ...parsed,
        ext: { ...ext, inspiration: { ...own, available: true } },
    };

    return { row, action: 'write', afterText: JSON.stringify(characteristics) };
}

export const planInspiration = (
    rows: readonly InspirationBackfillRow[]
): InspirationPlan[] => rows.map(planInspirationRow);

/** Compare-and-swap precondition applied by the UPDATE: both the timestamp and the stored text are unchanged */
export const casMatches = (
    planned: InspirationBackfillRow,
    current: { updatedAt: string; characteristicsText: string }
): boolean =>
    planned.updatedAt === current.updatedAt &&
    planned.characteristicsText === current.characteristicsText;

export function summarizeInspiration(plans: readonly InspirationPlan[]) {
    const count = (a: InspirationPlan['action']) =>
        plans.filter((p) => p.action === a).length;

    return {
        write: count('write'),
        unchanged: count('unchanged'),
        skipped: count('skipped'),
    };
}

export const formatInspirationPlan = (p: InspirationPlan): string[] =>
    p.action === 'write'
        ? [
              `characters:${p.row.id} · inspiration=true -> ext.inspiration.available`,
          ]
        : p.action === 'skipped'
          ? [
                `characters:${p.row.id} · skipped (characteristics is not an object)`,
            ]
          : [];
