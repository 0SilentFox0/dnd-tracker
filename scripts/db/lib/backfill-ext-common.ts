import { renameSync, writeFileSync } from 'node:fs';

import { jsonEqual } from '@/lib/utils/battle/store/stable-json';
import { isRecord } from '@/lib/utils/common/is-record';

export interface ExtCliArgs {
    mode: 'dry' | 'apply' | 'revert' | 'report';
    allowRemote: boolean;
    json: boolean;
    snapshotDir: string;
    revertFile?: string;
    force: boolean;
    expectSameHashes: boolean;
    expectZero: boolean;
    table?: string;
}

export interface ExtSnapshotRow {
    table: string;
    id: string;
    validFrom?: number;
    before: string;
    after: string;
}

export interface ExtSnapshot {
    version: 1;
    kind: string;
    createdAt: string;
    host: string;
    database: string;
    rows: ExtSnapshotRow[];
}

export type RevertAction = {
    row: ExtSnapshotRow;
    action: 'restore' | 'alreadyBefore' | 'missing' | 'conflict';
    current?: string;
};

export const extRowKey = (r: {
    table: string;
    id: string;
    validFrom?: number;
}) => `${r.table}:${r.id}${r.validFrom === undefined ? '' : `@${r.validFrom}`}`;

export function parseExtArgs(
    argv: readonly string[],
    tables?: readonly string[]
): ExtCliArgs {
    const args: ExtCliArgs = {
        mode: 'dry',
        allowRemote: false,
        json: false,
        snapshotDir: '.migration-backup/ext-backfill',
        force: false,
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
            case '--revert':
                args.revertFile = value(i++, flag);
                break;
            case '--snapshot-dir':
                args.snapshotDir = value(i++, flag);
                break;
            case '--table':
                if (!tables) throw new Error(`Unknown option: ${flag}`);

                args.table = value(i++, flag);
                break;
            default:
                throw new Error(`Unknown option: ${flag}`);
        }
    }

    if (tables && args.mode === 'dry' && args.revertFile === undefined) {
        if (!args.table || !tables.includes(args.table))
            throw new Error(`--table must be one of: ${tables.join(', ')}`);
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

    if (args.expectZero && !report)
        throw new Error('--expect-zero is allowed only with --report');

    if (apply) args.mode = 'apply';
    else if (report) args.mode = 'report';
    else if (args.revertFile !== undefined) args.mode = 'revert';

    return args;
}

export function writeSnapshotAtomically(file: string, snapshot: ExtSnapshot) {
    const temporary = `${file}.tmp-${process.pid}`;

    writeFileSync(temporary, JSON.stringify(snapshot, null, 2));
    renameSync(temporary, file);
}

export function parseExtSnapshot(text: string, kind: string): ExtSnapshot {
    const data: unknown = JSON.parse(text);

    const isRow = (v: unknown) =>
        isRecord(v) &&
        typeof v.table === 'string' &&
        typeof v.id === 'string' &&
        (v.validFrom === undefined || typeof v.validFrom === 'number') &&
        typeof v.before === 'string' &&
        typeof v.after === 'string';

    if (
        !isRecord(data) ||
        data.version !== 1 ||
        data.kind !== kind ||
        typeof data.createdAt !== 'string' ||
        typeof data.host !== 'string' ||
        typeof data.database !== 'string' ||
        !Array.isArray(data.rows) ||
        !data.rows.every(isRow)
    )
        throw new Error(`Invalid ${kind} snapshot file`);

    return data as unknown as ExtSnapshot;
}

export const extSnapshotFileName = (
    kind: string,
    host: string,
    database: string,
    now: Date
) => `${kind}-${host}-${database}-${now.toISOString().replace(/:/g, '-')}.json`;

const sameText = (a: string, b: string) => {
    if (a === b) return true;

    try {
        return jsonEqual(JSON.parse(a), JSON.parse(b));
    } catch {
        return false;
    }
};

export function planExtRevert(
    snapshot: ExtSnapshot,
    current: ReadonlyMap<string, string>
): RevertAction[] {
    return snapshot.rows.map((row) => {
        const text = current.get(extRowKey(row));

        if (text === undefined) return { row, action: 'missing' };

        if (sameText(text, row.after))
            return { row, action: 'restore', current: text };

        if (text === row.before)
            return { row, action: 'alreadyBefore', current: text };

        return { row, action: 'conflict', current: text };
    });
}

/** Rows of a snapshot that a revert would write; the same restore the DB revert issues, applied to an in-memory store */
export function applyExtRevert(
    snapshot: ExtSnapshot,
    store: Map<string, string>,
    force: boolean
): number {
    const actions = planExtRevert(snapshot, store);

    if (!force && actions.some((a) => a.action === 'conflict'))
        throw new Error('Conflict: row changed after apply');

    let restored = 0;

    for (const { row, action } of actions) {
        if (action !== 'restore' && action !== 'conflict') continue;

        store.set(extRowKey(row), row.before);
        restored++;
    }

    return restored;
}
