import '@/lib/utils/rules/systems/registry';
import { isRecord } from '@/lib/utils/common/is-record';
import { contentRowHash } from '@/lib/utils/content/row-hash';
import { DEFAULT_RULES } from '@/lib/utils/rules/defaults';
import { sectionSchemas } from '@/lib/utils/rules/section-shapes';
import {
    composition,
    FALLBACK_SYSTEM_KEY,
    PRESETS,
} from '@/lib/utils/rules/systems/catalog';
import { ruleSystemOf } from '@/lib/utils/rules/systems/lookup';

export type StatTable = 'characters' | 'units' | 'units_base';

export const STAT_TABLES: readonly StatTable[] = [
    'characters',
    'units',
    'units_base',
];

const HASH_MODEL: Record<StatTable, string> = {
    characters: 'Character',
    units: 'Unit',
    units_base: 'Unit',
};

export interface CampaignFact {
    id: string;
    text: string;
    activeBattle: boolean;
}

export interface StatRow {
    table: StatTable;
    id: string;
    validFrom?: number;
    campaignId: string;
    label: string;
    characteristicsText: string;
    columns: Record<string, number>;
    activeBattle: boolean;
    orphan?: boolean;
}

export type SkipReason = 'notObject';

export interface RowPlan {
    row: Omit<StatRow, 'characteristicsText' | 'columns'>;
    action: 'write' | 'unchanged' | 'skip';
    skip?: SkipReason;
    beforeText: string;
    columns: Record<string, number>;
    added: string[];
    divergent: string[];
    afterJson?: Record<string, unknown>;
    beforeHash?: string;
    afterHash?: string;
}

const view = () => {
    const columnView = ruleSystemOf(DEFAULT_RULES).characteristics.columnView;

    if (!columnView) throw new Error('d20 columnView is not registered');

    return columnView;
};

export const statColumns = (): readonly string[] => view().columns;

export const rowKey = (
    r: Pick<StatRow, 'table' | 'id'> & { validFrom?: number }
) => `${r.table}:${r.id}${r.validFrom === undefined ? '' : `@${r.validFrom}`}`;

export const FALLBACK_BASE = PRESETS[FALLBACK_SYSTEM_KEY].base;

export function isD20Campaign(rulesText: string): boolean {
    let raw: unknown;

    try {
        raw = JSON.parse(rulesText);
    } catch {
        return false;
    }

    if (!isRecord(raw) || raw.system === undefined) return true;

    const system = sectionSchemas.system.safeParse(raw.system);

    return system.success && composition(system.data).base === FALLBACK_BASE;
}

export const d20CampaignIds = (facts: readonly CampaignFact[]): string[] =>
    facts.filter((f) => isD20Campaign(f.text)).map((f) => f.id);

export const nonD20CampaignIds = (facts: readonly CampaignFact[]): string[] =>
    facts.filter((f) => !isD20Campaign(f.text)).map((f) => f.id);

export function statRowHash(
    table: StatTable,
    columns: Record<string, number>,
    characteristics: unknown
): string {
    return contentRowHash(HASH_MODEL[table], {
        ...columns,
        characteristics,
    });
}

const parseCharacteristics = (text: string): unknown => {
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
};

export const missingKeys = (
    characteristics: Record<string, unknown>
): string[] =>
    statColumns().filter((c) => typeof characteristics[c] !== 'number');

export const divergentKeys = (
    characteristics: Record<string, unknown>,
    columns: Record<string, number>
): string[] =>
    statColumns().filter(
        (c) =>
            c in columns &&
            typeof characteristics[c] === 'number' &&
            characteristics[c] !== columns[c]
    );

const head = (row: StatRow) => {
    const { characteristicsText: _t, columns: _c, ...rest } = row;

    return rest;
};

export function planRow(row: StatRow): RowPlan {
    const base = {
        row: head(row),
        beforeText: row.characteristicsText,
        columns: row.columns,
        added: [] as string[],
        divergent: [] as string[],
    };

    const parsed = parseCharacteristics(row.characteristicsText);

    if (!isRecord(parsed) || Array.isArray(parsed))
        return { ...base, action: 'skip', skip: 'notObject' };

    const divergent = divergentKeys(parsed, row.columns);

    const added = missingKeys(parsed).filter((c) => c in row.columns);

    if (added.length === 0) return { ...base, divergent, action: 'unchanged' };

    const characteristics = {
        ...Object.fromEntries(added.map((c) => [c, row.columns[c]])),
        ...Object.fromEntries(
            Object.entries(parsed).filter(([key]) => !added.includes(key))
        ),
    };

    return {
        ...base,
        action: 'write',
        added,
        divergent,
        afterJson: characteristics as Record<string, unknown>,
        beforeHash: statRowHash(row.table, row.columns, parsed),
        afterHash: statRowHash(row.table, row.columns, characteristics),
    };
}

export const planAll = (rows: readonly StatRow[]): RowPlan[] =>
    rows.map(planRow);

export const hashMismatches = (plans: readonly RowPlan[]): RowPlan[] =>
    plans.filter((p) => p.action === 'write' && p.beforeHash !== p.afterHash);

export function assertSameHashes(plans: readonly RowPlan[]) {
    const bad = hashMismatches(plans);

    if (bad.length > 0)
        throw new Error(
            `Hash guard: contentRowHash changes for ${bad.length} row(s): ${bad
                .slice(0, 10)
                .map((p) => rowKey(p.row))
                .join(', ')}; nothing written`
        );
}

export interface PlanSummary {
    write: number;
    unchanged: number;
    skipped: Record<SkipReason, number>;
    activeBattle: number;
    hashMismatches: number;
    divergent: number;
    byTable: Record<StatTable, number>;
}

export function summarizePlans(plans: readonly RowPlan[]): PlanSummary {
    const summary: PlanSummary = {
        write: 0,
        unchanged: 0,
        skipped: { notObject: 0 },
        activeBattle: 0,
        hashMismatches: hashMismatches(plans).length,
        divergent: plans.filter((p) => p.divergent.length > 0).length,
        byTable: { characters: 0, units: 0, units_base: 0 },
    };

    for (const p of plans) {
        if (p.action === 'write') {
            summary.write++;
            summary.byTable[p.row.table]++;

            if (p.row.activeBattle) summary.activeBattle++;
        } else if (p.action === 'unchanged') summary.unchanged++;
        else if (p.skip) summary.skipped[p.skip]++;
    }

    return summary;
}

export function formatPlan(p: RowPlan): string[] {
    const where = `${rowKey(p.row)} (${p.row.label})`;

    const divergent =
        p.divergent.length > 0
            ? [`divergent ${where}: ${p.divergent.join(',')}`]
            : [];

    if (p.action === 'unchanged') return divergent;

    return [
        ...(p.action === 'skip'
            ? [`skip ${where}: ${p.skip}`]
            : [`${where}: +${p.added.join(',')}`]),
        ...divergent,
    ];
}

export interface ReportCounts {
    rows: number;
    mismatched: number;
}

export interface ExcludedCounts {
    nonD20: Record<StatTable, number>;
    orphan: number;
}

export interface Report {
    tables: Record<StatTable, ReportCounts>;
    rows: number;
    mismatched: number;
    excluded: ExcludedCounts;
}

export function reportRows(
    rows: readonly StatRow[],
    nonD20: Record<StatTable, number> = {
        characters: 0,
        units: 0,
        units_base: 0,
    }
): Report {
    const report: Report = {
        tables: {
            characters: { rows: 0, mismatched: 0 },
            units: { rows: 0, mismatched: 0 },
            units_base: { rows: 0, mismatched: 0 },
        },
        rows: 0,
        mismatched: 0,
        excluded: { nonD20, orphan: rows.filter((r) => r.orphan).length },
    };

    for (const row of rows) {
        const parsed = parseCharacteristics(row.characteristicsText);

        const stored = isRecord(parsed) ? parsed : {};

        const differs = statColumns().some(
            (c) => c in row.columns && stored[c] !== row.columns[c]
        );

        report.tables[row.table].rows++;
        report.rows++;

        if (differs) {
            report.tables[row.table].mismatched++;
            report.mismatched++;
        }
    }

    return report;
}
