import { isDeepStrictEqual } from 'node:util';

import { expectedDifferenceFor } from '@/lib/utils/rules/parse-parity-expected';
import { safeParseRules } from '@/lib/utils/rules/schema';
import { legacyParseRules } from '@/scripts/db/lib/legacy-rules-parse';

export type RulesDifference = {
    path: string;
    legacy: unknown;
    next: unknown;
    byDesign?: string;
};

export type RulesReport = {
    id: string;
    source: 'campaign' | 'template';
    system: string;
    differences: RulesDifference[];
};

const isPlain = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);

export function diffRules(raw: unknown): {
    system: string;
    differences: RulesDifference[];
} {
    const legacy: Record<string, unknown> = { ...legacyParseRules(raw) };

    const parsed = safeParseRules(raw);

    if (!parsed.ok)
        return {
            system: (legacy.system as { key: string }).key,
            differences: [
                {
                    path: 'system',
                    legacy: legacy.system,
                    next: parsed.error,
                },
            ],
        };

    const next = parsed.rules;

    const nextRecord = next as unknown as Record<string, unknown>;

    const differences: RulesDifference[] = [];

    for (const section of new Set([
        ...Object.keys(legacy),
        ...Object.keys(nextRecord),
    ])) {
        const before = legacy[section];

        const after = nextRecord[section];

        if (isDeepStrictEqual(before, after)) continue;

        if (!isPlain(before) || !isPlain(after)) {
            differences.push({
                path: section,
                legacy: before,
                next: after,
                byDesign: expectedDifferenceFor(section, raw, next)?.reason,
            });
            continue;
        }

        for (const item of new Set([
            ...Object.keys(before),
            ...Object.keys(after),
        ])) {
            if (!isDeepStrictEqual(before[item], after[item]))
                differences.push({
                    path: `${section}.${item}`,
                    legacy: before[item],
                    next: after[item],
                    byDesign: expectedDifferenceFor(
                        `${section}.${item}`,
                        raw,
                        next
                    )?.reason,
                });
        }
    }

    return { system: next.system.key, differences };
}

export function reportRules(
    id: string,
    source: RulesReport['source'],
    raw: unknown
): RulesReport {
    return { id, source, ...diffRules(raw) };
}

export function summarize(reports: RulesReport[]) {
    const perPath = new Map<
        string,
        { byDesign: number; unexplained: number }
    >();

    let byDesign = 0;

    let unexplained = 0;

    for (const report of reports) {
        for (const difference of report.differences) {
            const entry = perPath.get(difference.path) ?? {
                byDesign: 0,
                unexplained: 0,
            };

            if (difference.byDesign) {
                entry.byDesign++;
                byDesign++;
            } else {
                entry.unexplained++;
                unexplained++;
            }

            perPath.set(difference.path, entry);
        }
    }

    return {
        total: reports.length,
        byDesign,
        unexplained,
        perPath: Object.fromEntries(
            [...perPath].sort(([a], [b]) => a.localeCompare(b))
        ),
    };
}
