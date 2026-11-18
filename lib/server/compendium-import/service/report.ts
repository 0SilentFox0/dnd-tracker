import {
    type CustomConditionRule,
    deriveCustomConditions,
} from '../adapters/custom-conditions';
import { buildMediaQueue, summarizeQueue } from '../media/queue';
import { ADAPTER_VERSION, type ImportPlan } from '../plan';
import { type ImportIssue, issue, type TargetKind } from '../types';
import {
    CLASSES_RULE_PATH,
    CompendiumReport,
    ImportInput,
    RepositoryContext,
} from './types';

import { COMPENDIUM_INFO_ISSUE_CODES } from '@/lib/constants/compendium-import';
import { isRecord } from '@/lib/utils/common/is-record';
import { type JsonRecord } from '@/lib/utils/compendium-import/parse';

const CLASS_DEPENDENT_KINDS = new Set<TargetKind>([
    'races',
    'backgrounds',
    'feats',
]);

interface ClassesMode {
    enabled: boolean;
    exists: boolean;
}

export function classesModeOf(
    plan: ImportPlan,
    input: ImportInput,
    ctx: RepositoryContext
): ClassesMode | undefined {
    if (ctx.classesEnabled === undefined && ctx.hasClasses === undefined)
        return;

    const patched = isRecord(input.rulesPatch?.classes)
        ? input.rulesPatch.classes.enabled
        : undefined;

    return {
        enabled:
            typeof patched === 'boolean'
                ? patched
                : ctx.classesEnabled === true,
        exists:
            ctx.hasClasses === true ||
            plan.writes.some((w) => w.kind === 'classes'),
    };
}

export function customConditionsToOffer(
    root: JsonRecord,
    input: ImportInput,
    ctx: RepositoryContext
): CustomConditionRule[] {
    const patched =
        isRecord(input.rulesPatch?.conditions) &&
        Array.isArray(input.rulesPatch.conditions.custom)
            ? input.rulesPatch.conditions.custom
            : [];

    const known = new Set<unknown>([
        ...(ctx.customConditionKeys ?? []),
        ...patched.map((c) => (isRecord(c) ? c.key : undefined)),
    ]);

    return deriveCustomConditions(root).flatMap((d) =>
        d.rule && !known.has(d.rule.key) ? [d.rule] : []
    );
}

function reportRows(
    plan: ImportPlan,
    counts: Record<'created' | 'updated' | 'unchanged' | 'errors', number>
) {
    let rowBudget = 10_000;

    return plan.writes.map((r) => {
        if (!r.nested)
            counts[
                r.operation === 'create'
                    ? 'created'
                    : r.operation === 'update'
                      ? 'updated'
                      : 'unchanged'
            ]++;

        const shown = r.issues.slice(0, rowBudget);

        rowBudget -= shown.length;

        return {
            canonicalKey: r.key,
            kind: r.kind,
            targetId: r.localId,
            status: r.operation,
            coverage:
                r.body.executionMode === 'manual'
                    ? ('manual' as const)
                    : r.issues.length || r.notes
                      ? ('partial' as const)
                      : ('native' as const),
            issues: shown,
        };
    });
}

function categoryCounts(
    plan: ImportPlan,
    root: JsonRecord,
    embedded: Record<string, number>
) {
    return Object.fromEntries(
        Object.entries(root)
            .filter(([, v]) => Array.isArray(v))
            .map(([kind, v]) => {
                if (
                    ['book', 'bookData', 'adventure', 'adventureData'].includes(
                        kind
                    )
                ) {
                    const corpus = kind.replace(/Data$/, '');

                    const manifests = Array.isArray(root[corpus])
                        ? (root[corpus] as unknown[])
                        : [];

                    const chapters = (index: number) =>
                        plan.writes.filter(
                            (r) =>
                                r.inputKind === `${corpus}Chapter` &&
                                r.inputPath?.startsWith(
                                    `${corpus}[${index}].data[`
                                )
                        );

                    const consumed = (v as unknown[]).map((value, index) => {
                        if (!isRecord(value)) return [];

                        if (kind === corpus) return chapters(index);

                        return manifests.flatMap((manifest, mi) =>
                            isRecord(manifest) &&
                            manifest.id === value.id &&
                            (!value.source || value.source === manifest.source)
                                ? chapters(mi)
                                : []
                        );
                    });

                    const mapped = consumed.filter(
                        (rows) => rows.length > 0
                    ).length;

                    return [
                        kind,
                        {
                            present: (v as unknown[]).length,
                            mapped,
                            partial: consumed.filter((rows) =>
                                rows.some((r) => r.issues.length || r.notes)
                            ).length,
                            skipped: (v as unknown[]).length - mapped,
                        },
                    ];
                }

                const mapped = plan.writes.filter((r) => r.inputKind === kind);

                const total = mapped.length + (embedded[kind] ?? 0);

                return [
                    kind,
                    {
                        present: (v as unknown[]).length,
                        mapped: total,
                        partial: mapped.filter(
                            (r) => r.issues.length || r.notes
                        ).length,
                        skipped: Math.max(0, (v as unknown[]).length - total),
                    },
                ];
            })
    );
}

export function reportOf(
    plan: ImportPlan,
    root: JsonRecord,
    sources: JsonRecord[],
    embedded: Record<string, number> = {},
    hasCharacters?: boolean,
    classesMode?: ClassesMode,
    customRules: CustomConditionRule[] = []
): CompendiumReport {
    const counts = {
        created: 0,
        updated: 0,
        unchanged: 0,
        errors: plan.errors.length,
    };

    const unique = new Map<string, ImportIssue>();

    for (const i of [...plan.errors, ...plan.warnings])
        unique.set(`${i.code}:${i.path}`, i);

    const allIssues = [...unique.values()];

    if (hasCharacters === false)
        allIssues.push(issue('CHARACTERS_REQUIRED', 'characters', 'warning'));

    const classesMissing =
        !!classesMode &&
        (!classesMode.enabled || !classesMode.exists) &&
        plan.writes.some((w) => !w.nested && CLASS_DEPENDENT_KINDS.has(w.kind));

    if (classesMissing)
        allIssues.push(
            issue('CLASSES_MODE_REQUIRED', CLASSES_RULE_PATH, 'warning')
        );

    const issueCounts: Record<string, number> = Object.create(null);

    for (const entry of allIssues)
        issueCounts[entry.code] = (issueCounts[entry.code] ?? 0) + 1;

    const nextActions = allIssues.slice(0, 10_000);

    const rows = reportRows(plan, counts);

    const countsByCategory = categoryCounts(plan, root, embedded);

    const editionSummary: Record<string, number> = Object.create(null);

    for (const row of plan.writes)
        editionSummary[row.edition] = (editionSummary[row.edition] ?? 0) + 1;

    return {
        adapterVersion: ADAPTER_VERSION,
        counts,
        rows,
        sources,
        editionSummary,
        countsByCategory,
        issueCounts,
        omittedIssues: Math.max(0, allIssues.length - nextActions.length),
        media: summarizeQueue(buildMediaQueue(plan.writes)),
        nextActions,
        ...((classesMissing || customRules.length > 0) && {
            recommendedRulesPatch: {
                ...(classesMissing && { classes: { enabled: true } }),
                ...(customRules.length > 0 && {
                    conditions: { custom: customRules },
                }),
            },
        }),
        readyToImport: plan.errors.length === 0,
        readyToPlay:
            hasCharacters !== false &&
            !classesMissing &&
            customRules.length === 0 &&
            plan.errors.length === 0 &&
            !allIssues.some(
                (i) =>
                    !COMPENDIUM_INFO_ISSUE_CODES.has(i.code) &&
                    /MANUAL|UNRESOLVED|UNKNOWN|UNSUPPORTED/.test(i.code)
            ),
    };
}
