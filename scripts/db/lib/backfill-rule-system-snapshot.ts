import { isRecord } from '@/lib/utils/common/is-record';
import type { RulesTable } from '@/scripts/db/lib/backfill-rule-system-plan';

export interface SnapshotRow {
    table: RulesTable;
    id: string;
    before: string;
    after: string;
}

export interface RuleSystemSnapshot {
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

export const snapshotKey = (row: Pick<SnapshotRow, 'table' | 'id'>) =>
    `${row.table}:${row.id}`;

export function revertPlan(
    s: RuleSystemSnapshot,
    current: ReadonlyMap<string, string>
): RevertAction[] {
    return s.rows.map((row) => {
        const text = current.get(snapshotKey(row));

        if (text === undefined) return { row, action: 'missing' };

        if (text === row.after)
            return { row, action: 'restore', current: text };

        if (text === row.before)
            return { row, action: 'alreadyBefore', current: text };

        return { row, action: 'conflict', current: text };
    });
}

const isRow = (v: unknown): v is SnapshotRow =>
    isRecord(v) &&
    (v.table === 'campaigns' || v.table === 'battle_scenes') &&
    typeof v.id === 'string' &&
    typeof v.before === 'string' &&
    typeof v.after === 'string';

export function parseSnapshot(text: string): RuleSystemSnapshot {
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
        throw new Error('Невалідний файл знімка правил');

    return data as unknown as RuleSystemSnapshot;
}

export function snapshotFileName(
    host: string,
    database: string,
    now: Date
): string {
    return `${host}-${database}-${now.toISOString().replace(/:/g, '-')}.json`;
}

export interface CliArgs {
    mode: 'dry' | 'apply' | 'revert';
    allowRemote: boolean;
    json: boolean;
    snapshotDir: string;
    revertFile?: string;
    skipModules: Set<string>;
    force: boolean;
}

export const DEFAULT_SNAPSHOT_DIR = '.migration-backup/rule-system';

export function parseArgs(argv: readonly string[]): CliArgs {
    const args: CliArgs = {
        mode: 'dry',
        allowRemote: false,
        json: false,
        snapshotDir: DEFAULT_SNAPSHOT_DIR,
        skipModules: new Set(),
        force: false,
    };

    let apply = false;

    const value = (i: number, flag: string): string => {
        const next = argv[i + 1];

        if (next === undefined || next.startsWith('--'))
            throw new Error(`Опція ${flag} потребує значення`);

        return next;
    };

    for (let i = 0; i < argv.length; i++) {
        const flag = argv[i];

        switch (flag) {
            case '--apply':
                apply = true;
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
            case '--revert':
                args.revertFile = value(i++, flag);
                break;
            case '--snapshot-dir':
                args.snapshotDir = value(i++, flag);
                break;
            case '--skip-modules':
                for (const id of value(i++, flag).split(','))
                    if (id.trim()) args.skipModules.add(id.trim());

                break;
            default:
                throw new Error(`Невідома опція: ${flag}`);
        }
    }

    if (apply && args.revertFile !== undefined)
        throw new Error('--apply і --revert разом не підтримуються');

    if (args.force && args.revertFile === undefined)
        throw new Error('--force дозволено лише з --revert');

    if (apply) args.mode = 'apply';
    else if (args.revertFile !== undefined) args.mode = 'revert';

    return args;
}
