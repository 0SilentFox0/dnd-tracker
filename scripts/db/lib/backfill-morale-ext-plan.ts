import { isRecord } from '@/lib/utils/common/is-record';
import { contentRowHash } from '@/lib/utils/content/row-hash';
import { getAtPath } from '@/lib/utils/rules/systems/stored-columns';

export const MORALE_TABLES = ['characters', 'units', 'units_base'] as const;

export type MoraleTable = (typeof MORALE_TABLES)[number];

export interface MoraleBackfillRow {
    table: MoraleTable;
    id: string;
    validFrom?: number;
    campaignId: string;
    morale: number;
    characteristicsText: string;
}

export interface MoralePlan {
    row: MoraleBackfillRow;
    action: 'write' | 'unchanged' | 'skipped';
    reason?: 'notObject' | 'divergent';
    afterText?: string;
    beforeHash?: string;
    afterHash?: string;
}

const HASH_MODEL: Record<MoraleTable, string> = {
    characters: 'Character',
    units: 'Unit',
    units_base: 'Unit',
};

const parse = (text: string): unknown => {
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
};

const hash = (row: MoraleBackfillRow, characteristics: unknown) =>
    contentRowHash(HASH_MODEL[row.table], {
        morale: row.morale,
        characteristics,
    });

export function planMoraleRow(row: MoraleBackfillRow): MoralePlan {
    const parsed = parse(row.characteristicsText);

    if (!isRecord(parsed))
        return { row, action: 'skipped', reason: 'notObject' };

    const stored = getAtPath(parsed, ['ext', 'morale', 'value']);

    if (typeof stored === 'number')
        return stored === row.morale
            ? { row, action: 'unchanged' }
            : { row, action: 'skipped', reason: 'divergent' };

    if (row.morale === 0) return { row, action: 'unchanged' };

    const ext = isRecord(parsed.ext) ? parsed.ext : {};

    const slot = isRecord(ext.morale) ? ext.morale : {};

    const characteristics = {
        ...parsed,
        ext: { ...ext, morale: { ...slot, value: row.morale } },
    };

    return {
        row,
        action: 'write',
        afterText: JSON.stringify(characteristics),
        beforeHash: hash(row, parsed),
        afterHash: hash(row, characteristics),
    };
}

export const planMorale = (rows: readonly MoraleBackfillRow[]): MoralePlan[] =>
    rows.map(planMoraleRow);

export const moraleKey = (r: MoraleBackfillRow) =>
    `${r.table}:${r.id}${r.validFrom === undefined ? '' : `@${r.validFrom}`}`;

export const hashMismatches = (plans: readonly MoralePlan[]): MoralePlan[] =>
    plans.filter((p) => p.action === 'write' && p.beforeHash !== p.afterHash);

export function assertSameMoraleHashes(plans: readonly MoralePlan[]) {
    const bad = hashMismatches(plans);

    if (bad.length > 0)
        throw new Error(
            `Hash guard: contentRowHash changes for ${bad.length} row(s): ${bad
                .slice(0, 10)
                .map((p) => moraleKey(p.row))
                .join(', ')}; nothing written`
        );
}

export function summarizeMorale(
    plans: readonly MoralePlan[],
    activeCampaigns: ReadonlySet<string>
) {
    const writes = plans.filter((p) => p.action === 'write');

    return {
        write: writes.length,
        unchanged: plans.filter((p) => p.action === 'unchanged').length,
        skipped: plans.filter((p) => p.action === 'skipped').length,
        divergent: plans.filter((p) => p.reason === 'divergent').length,
        hashMismatches: hashMismatches(plans).length,
        activeBattle: writes.filter((p) =>
            activeCampaigns.has(p.row.campaignId)
        ).length,
    };
}

export const formatMoralePlan = (p: MoralePlan): string[] =>
    p.action === 'write'
        ? [`${moraleKey(p.row)} · morale ${p.row.morale} -> ext.morale.value`]
        : p.reason
          ? [`${moraleKey(p.row)} · skipped (${p.reason})`]
          : [];

/** Rows still lacking ext.morale.value (the --report --expect-zero metric) */
export const pendingMorale = (rows: readonly MoraleBackfillRow[]): number =>
    planMorale(rows).filter((p) => p.action === 'write').length;
