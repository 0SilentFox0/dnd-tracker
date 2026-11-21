import { SPELL_POWER } from './spell-damage';

import { jsonEqual } from '@/lib/utils/battle/store/stable-json';

export const SPELL_COLUMNS = [
    'dice',
    'damageBonus',
    'casting',
    'executionMode',
    'targeting',
    'spellEffects',
] as const;

export type SpellColumn = (typeof SPELL_COLUMNS)[number];

export interface SpellColumns {
    dice: number;
    damageBonus: number | null;
    casting: unknown;
    executionMode: string;
    targeting: unknown;
    spellEffects: unknown;
}

export interface DbSpell extends SpellColumns {
    id: string;
    campaignId: string;
    name: string;
}

export type SpellPlanAction = 'write' | 'current' | 'divergent';

export interface SpellPlan {
    row: DbSpell;
    action: SpellPlanAction;
    after?: SpellColumns;
    differs: SpellColumn[];
}

export interface SpellPlanSummary {
    write: number;
    current: number;
    divergent: number;
    activeBattle: number;
}

const DEFAULT_TARGETING = { kind: 'enemy' };

/** Template row as the importer stores it: absent columns take their database defaults */
export function normalizeTemplateRow(
    row: Record<string, unknown>
): SpellColumns {
    return {
        dice: typeof row.dice === 'number' ? row.dice : 0,
        damageBonus:
            typeof row.damageBonus === 'number' ? row.damageBonus : null,
        casting: row.casting ?? null,
        executionMode:
            typeof row.executionMode === 'string'
                ? row.executionMode
                : 'native',
        targeting: row.targeting ?? DEFAULT_TARGETING,
        spellEffects: row.spellEffects ?? [],
    };
}

const columnsOf = (r: SpellColumns): SpellColumns => ({
    dice: r.dice,
    damageBonus: r.damageBonus ?? null,
    casting: r.casting ?? null,
    executionMode: r.executionMode,
    targeting: r.targeting ?? DEFAULT_TARGETING,
    spellEffects: r.spellEffects ?? [],
});

export const differingColumns = (
    a: SpellColumns,
    b: SpellColumns
): SpellColumn[] => {
    const x = columnsOf(a);

    const y = columnsOf(b);

    return SPELL_COLUMNS.filter((k) => !jsonEqual(x[k], y[k]));
};

/**
 * A listed spell is rewritten only when it still equals the pre-power template row (any variant listed in `olds` for its name);
 * a spell absent from `olds` had no column change, so it is either current or divergent.
 */
export function planSpellMissile(
    rows: readonly DbSpell[],
    targets: Readonly<Record<string, SpellColumns>>,
    olds: Readonly<Record<string, SpellColumns | readonly SpellColumns[]>>
): SpellPlan[] {
    const plans: SpellPlan[] = [];

    for (const row of rows) {
        const target = Object.hasOwn(SPELL_POWER, row.name)
            ? targets[row.name]
            : undefined;

        if (!target) continue;

        const toTarget = differingColumns(row, target);

        if (toTarget.length === 0) {
            plans.push({ row, action: 'current', differs: [] });
            continue;
        }

        const known = Object.hasOwn(olds, row.name)
            ? olds[row.name]
            : undefined;

        const variants = known ? [known].flat() : [];

        if (variants.some((old) => differingColumns(row, old).length === 0))
            plans.push({
                row,
                action: 'write',
                after: target,
                differs: toTarget,
            });
        else plans.push({ row, action: 'divergent', differs: toTarget });
    }

    return plans;
}

export function summarizeSpellPlans(
    plans: readonly SpellPlan[],
    activeCampaigns: ReadonlySet<string>
): SpellPlanSummary {
    const summary: SpellPlanSummary = {
        write: 0,
        current: 0,
        divergent: 0,
        activeBattle: 0,
    };

    for (const p of plans) {
        summary[p.action]++;

        if (p.action === 'write' && activeCampaigns.has(p.row.campaignId))
            summary.activeBattle++;
    }

    return summary;
}

export const formatSpellPlan = (p: SpellPlan): string =>
    `  ${p.action.padEnd(9)} ${p.row.campaignId} ${p.row.id} ${p.row.name}${p.differs.length > 0 ? ` · ${p.differs.join(',')}` : ''}`;

export interface SpellSnapshotRow {
    id: string;
    before: SpellColumns;
    after: SpellColumns;
}

export interface SpellSnapshot {
    version: 1;
    kind: 'spell-missile';
    createdAt: string;
    host: string;
    database: string;
    rows: SpellSnapshotRow[];
}

export function parseSpellSnapshot(text: string): SpellSnapshot {
    const data: unknown = JSON.parse(text);

    const d = data as Partial<SpellSnapshot> | null;

    if (
        !d ||
        d.version !== 1 ||
        d.kind !== 'spell-missile' ||
        !Array.isArray(d.rows) ||
        !d.rows.every(
            (r) => r && typeof r.id === 'string' && r.before && r.after
        )
    )
        throw new Error('Invalid spell-missile snapshot file');

    return d as SpellSnapshot;
}
