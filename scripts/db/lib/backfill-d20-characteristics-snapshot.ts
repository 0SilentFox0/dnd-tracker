import { renameSync, writeFileSync } from 'node:fs';

import { jsonEqual } from '@/lib/utils/battle/store/stable-json';
import { isRecord } from '@/lib/utils/common/is-record';
import {
    rowKey,
    STAT_TABLES,
    type StatTable,
} from '@/scripts/db/lib/backfill-d20-characteristics-plan';

export interface SnapshotRow {
    table: StatTable;
    id: string;
    validFrom?: number;
    before: string;
    after: string;
}

export interface CharacteristicsSnapshot {
    version: 1;
    createdAt: string;
    host: string;
    database: string;
    rows: SnapshotRow[];
}

export type RevertAction = {
    row: SnapshotRow;
    action: 'restore' | 'alreadyBefore' | 'missing' | 'conflict';
    current?: string;
};

export const snapshotKey = (row: SnapshotRow) => rowKey(row);

export function writeSnapshotAtomically(
    file: string,
    snapshot: CharacteristicsSnapshot
) {
    const temporary = `${file}.tmp-${process.pid}`;

    writeFileSync(temporary, JSON.stringify(snapshot, null, 2));
    renameSync(temporary, file);
}

export function revertPlan(
    s: CharacteristicsSnapshot,
    current: ReadonlyMap<string, string>
): RevertAction[] {
    return s.rows.map((row) => {
        const text = current.get(snapshotKey(row));

        if (text === undefined) return { row, action: 'missing' };

        let sameJson = false;

        if (text !== row.after) {
            try {
                sameJson = jsonEqual(JSON.parse(text), JSON.parse(row.after));
            } catch {
                sameJson = false;
            }
        }

        if (text === row.after || sameJson)
            return { row, action: 'restore', current: text };

        if (text === row.before)
            return { row, action: 'alreadyBefore', current: text };

        return { row, action: 'conflict', current: text };
    });
}

const isRow = (v: unknown): v is SnapshotRow =>
    isRecord(v) &&
    STAT_TABLES.includes(v.table as StatTable) &&
    typeof v.id === 'string' &&
    (v.validFrom === undefined || typeof v.validFrom === 'number') &&
    typeof v.before === 'string' &&
    typeof v.after === 'string';

export function parseSnapshot(text: string): CharacteristicsSnapshot {
    const data: unknown = JSON.parse(text);

    if (
        !isRecord(data) ||
        data.version !== 1 ||
        typeof data.createdAt !== 'string' ||
        typeof data.host !== 'string' ||
        typeof data.database !== 'string' ||
        !Array.isArray(data.rows) ||
        !data.rows.every(isRow)
    )
        throw new Error('Invalid characteristics snapshot file');

    return data as unknown as CharacteristicsSnapshot;
}

export function snapshotFileName(
    host: string,
    database: string,
    now: Date
): string {
    return `${host}-${database}-${now.toISOString().replace(/:/g, '-')}.json`;
}

export interface CliArgs {
    mode: 'dry' | 'apply' | 'revert' | 'report';
    allowRemote: boolean;
    json: boolean;
    snapshotDir: string;
    revertFile?: string;
    force: boolean;
    allowActiveBattles: boolean;
    expectSameHashes: boolean;
    expectZero: boolean;
}

export function assertNoActiveBattles(
    activeBattle: number,
    args: Pick<CliArgs, 'allowActiveBattles'>
) {
    if (activeBattle > 0 && !args.allowActiveBattles)
        throw new Error(
            `Rows in campaigns with active battles (${activeBattle}): finish the battles or add --allow-active-battles`
        );
}

export const DEFAULT_SNAPSHOT_DIR = '.migration-backup/d20-characteristics';

export function parseArgs(argv: readonly string[]): CliArgs {
    const args: CliArgs = {
        mode: 'dry',
        allowRemote: false,
        json: false,
        snapshotDir: DEFAULT_SNAPSHOT_DIR,
        force: false,
        allowActiveBattles: false,
        expectSameHashes: true,
        expectZero: false,
    };

    let apply = false;

    let report = false;

    const value = (i: number, flag: string): string => {
        const next = argv[i + 1];

        if (next === undefined || next.startsWith('--'))
            throw new Error(`Option ${flag} requires a value`);

        return next;
    };

    for (let i = 0; i < argv.length; i++) {
        const flag = argv[i];

        switch (flag) {
            case '--apply':
                apply = true;
                break;
            case '--report':
                report = true;
                break;
            case '--expect-zero':
                args.expectZero = true;
                break;
            case '--expect-same-hashes':
                args.expectSameHashes = true;
                break;
            case '--no-expect-same-hashes':
                args.expectSameHashes = false;
                break;
            case '--allow-remote':
                args.allowRemote = true;
                break;
            case '--json':
                args.json = true;
                break;
            case '--force':
                args.force = true;
                break;
            case '--allow-active-battles':
                args.allowActiveBattles = true;
                break;
            case '--revert':
                args.revertFile = value(i++, flag);
                break;
            case '--snapshot-dir':
                args.snapshotDir = value(i++, flag);
                break;
            default:
                throw new Error(`Unknown option: ${flag}`);
        }
    }

    const modes = [apply, report, args.revertFile !== undefined].filter(
        Boolean
    ).length;

    if (modes > 1)
        throw new Error(
            '--apply, --revert and --report are mutually exclusive'
        );

    if (args.force && args.revertFile === undefined)
        throw new Error('--force is allowed only with --revert');

    if (args.allowActiveBattles && !apply)
        throw new Error('--allow-active-battles is allowed only with --apply');

    if (args.expectZero && !report)
        throw new Error('--expect-zero is allowed only with --report');

    if (apply) args.mode = 'apply';
    else if (report) args.mode = 'report';
    else if (args.revertFile !== undefined) args.mode = 'revert';

    return args;
}
