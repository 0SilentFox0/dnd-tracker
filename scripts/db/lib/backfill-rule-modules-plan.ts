import { isRecord } from '@/lib/utils/common/is-record';
import { sectionSchemas } from '@/lib/utils/rules/section-shapes';
import {
    FALLBACK_SYSTEM_KEY,
    kindOf,
    PRESETS,
} from '@/lib/utils/rules/systems/catalog';
import { SYSTEM_META, type SystemMeta } from '@/lib/utils/rules/systems/meta';

export type RulesTable = 'campaigns' | 'battle_scenes';

export interface RulesRow {
    table: RulesTable;
    id: string;
    campaignId: string;
    label: string;
    status?: string;
    text: string;
}

export type SkipReason = 'invalidSystem' | 'notObject';

export interface RowPlan {
    row: Omit<RulesRow, 'text'>;
    action: 'write' | 'unchanged' | 'skip';
    skip?: SkipReason;
    beforeText: string;
    added: string[];
    afterJson?: Record<string, unknown>;
}

/** Frozen list: later modules added to presets must not be backfilled by this one-off script */
export const NEW_MODULES: readonly string[] = [
    'deathsaves',
    'inspiration',
    'lair',
    'offhand',
    'opportunity',
];

export const FALLBACK_BASE = PRESETS[FALLBACK_SYSTEM_KEY].base;

const sortedUnique = (ids: readonly string[]): string[] =>
    [...new Set(ids)].sort();

export const isD20Preset = (key: string) =>
    (SYSTEM_META as readonly SystemMeta[]).some(
        (m) =>
            kindOf(m) === 'preset' &&
            m.preset?.base === FALLBACK_BASE &&
            (m.keys as readonly string[]).includes(key)
    );

const base = (row: RulesRow) => {
    const { text: _text, ...rest } = row;

    return { row: rest, beforeText: row.text, added: [] as string[] };
};

export function planRow(row: RulesRow): RowPlan {
    let raw: unknown;

    try {
        raw = JSON.parse(row.text);
    } catch {
        return { ...base(row), action: 'skip', skip: 'notObject' };
    }

    if (!isRecord(raw))
        return { ...base(row), action: 'skip', skip: 'notObject' };

    const system = sectionSchemas.system.safeParse(raw.system);

    if (!system.success || !isRecord(raw.system))
        return { ...base(row), action: 'skip', skip: 'invalidSystem' };

    const { key, modules } = system.data;

    if (!modules || !isD20Preset(key))
        return { ...base(row), action: 'unchanged' };

    const added = NEW_MODULES.filter((id) => !modules.includes(id));

    if (added.length === 0) return { ...base(row), action: 'unchanged' };

    return {
        ...base(row),
        action: 'write',
        added,
        afterJson: {
            ...raw,
            system: {
                ...raw.system,
                modules: sortedUnique([...modules, ...NEW_MODULES]),
            },
        },
    };
}

export const planAll = (rows: readonly RulesRow[]): RowPlan[] =>
    rows.map(planRow);

export interface PlanSummary {
    write: number;
    unchanged: number;
    skipped: Record<SkipReason, number>;
    activeBattle: number;
}

export function summarizePlans(plans: readonly RowPlan[]): PlanSummary {
    const summary: PlanSummary = {
        write: 0,
        unchanged: 0,
        skipped: { invalidSystem: 0, notObject: 0 },
        activeBattle: 0,
    };

    for (const p of plans) {
        if (p.action === 'write') summary.write++;
        else if (p.action === 'unchanged') summary.unchanged++;
        else if (p.skip) summary.skipped[p.skip]++;

        if (p.action === 'write' && p.row.status === 'active')
            summary.activeBattle++;
    }

    return summary;
}

export function formatPlan(p: RowPlan): string[] {
    if (p.action === 'unchanged') return [];

    const where = `${p.row.table} ${p.row.id} (${p.row.label})`;

    return p.action === 'skip'
        ? [`пропуск ${where}: ${p.skip}`]
        : [`${where}: +${p.added.join(',')}`];
}
